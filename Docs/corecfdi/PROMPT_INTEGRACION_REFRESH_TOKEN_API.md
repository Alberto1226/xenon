# Renovación de token (refresh) contra CoreCFDI API v1

Implementa en este sistema la renovación automática del token de la API de CoreCFDI
(multitenant, tokens Sanctum). Complementa al login ya implementado (`CoreCfdiAuth.login()`):
agrega `CoreCfdiAuth.refresh()` y `CoreCfdiAuth.getAccessToken()`.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Cómo funcionan los tokens

El login entrega dos tokens:

- **access_token**: dura `expires_in_minutes` (~15 min). Es el único que se usa para llamar a la API.
- **refresh_token**: dura 30 días. Se usa SOLO en `/auth/refresh`, nunca en otros endpoints.

Ciclo:

```
login ──► access (15 min) + refresh (30 días)
            │
   access por caducar / responde 401
            │
            ▼
refresh(refresh_token) ──► access nuevo + refresh nuevo   (el refresh usado se revoca)
            │
   refresh caducado o inválido (401/403) ──► login otra vez
```

## Petición

`POST {CORECFDI_BASE_URL}/auth/refresh`

Headers:

- `Accept: application/json` ← obligatorio
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {refresh_token}` ← el REFRESH token, no el access token

Sin body.

## Respuestas

200 (éxito):

```json
{
  "success": true,
  "message": "Token renovado correctamente",
  "data": {
    "access_token": "14|nuevo...",
    "refresh_token": "15|nuevo...",
    "token_type": "Bearer",
    "expires_in_minutes": 15
  }
}
```

401: refresh token expirado, revocado o inexistente (o falta `X-Tenant`).

403 (se envió un token que no es refresh token):

```json
{ "success": false, "message": "El token proporcionado no es un Refresh Token válido.", "errors": null }
```

403 (empresa suspendida): mensaje "La empresa '...' se encuentra suspendida o inactiva."

429: demasiadas peticiones (60/min). Respetar `Retry-After`.

## Qué debe hacer la implementación

### `refresh()`

1. Enviar la petición con el `refresh_token` guardado.
2. Si responde 200:
   - reemplazar INMEDIATAMENTE los dos tokens guardados por los nuevos
     (el refresh token usado ya quedó revocado y no vuelve a servir),
   - recalcular `expires_at = ahora + expires_in_minutes` (usar el valor que llega, no asumirlo).
3. Si responde 401 o 403 (token inválido) → borrar los tokens guardados y hacer `login()`.
4. Si responde 403 por empresa suspendida → no reintentar; lanzar error y alertar.
5. Si responde 429 → esperar `Retry-After` y reintentar como máximo una vez.

### `getAccessToken()`

1. Si no hay tokens guardados → `login()`.
2. Si faltan menos de 60 s para `expires_at` → `refresh()`.
3. Devolver el `access_token` vigente.

### Interceptor HTTP (para el resto de llamadas a la API)

1. Obtener el token con `getAccessToken()` y enviarlo como `Authorization: Bearer {access_token}`.
2. Si una llamada responde 401 → hacer `refresh()` UNA vez y reintentar la petición original UNA vez.
3. Si vuelve a fallar → lanzar un error de autenticación claro (no entrar en bucle).

### Concurrencia (obligatorio)

Usar un lock/mutex en `refresh()`: si varias peticiones encuentran el token expirado al mismo
tiempo, solo una hace el refresh y las demás esperan y usan el token nuevo.
Si dos peticiones usan el mismo refresh token, la segunda recibe 401 porque la primera ya lo revocó.
Si hay varios procesos/servidores, el lock debe ser compartido (Redis, BD, etc.).

### Seguridad

- Guardar los tokens de forma segura (cache o BD cifrada), asociados al tenant.
- Nunca escribir tokens en logs; registrar solo endpoint, status y duración.

## Pruebas requeridas

- Refresh correcto reemplaza ambos tokens y actualiza `expires_at`.
- Reusar un refresh token ya usado → 401 → se hace login automáticamente.
- Enviar el access token a `/auth/refresh` → 403 → se hace login.
- Access token por caducar → `getAccessToken()` renueva antes de llamar.
- Llamada que responde 401 → refresh + un solo reintento; si falla otra vez, error sin bucle.
- Dos peticiones simultáneas con token expirado → solo se hace un refresh.
- Ningún log contiene tokens.
