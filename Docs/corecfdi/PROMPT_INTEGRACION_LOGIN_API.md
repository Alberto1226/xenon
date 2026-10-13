# Login contra CoreCFDI API v1

Implementa en este sistema el login contra la API de CoreCFDI (multitenant, tokens Sanctum).
Hazlo como una función/servicio reutilizable (ej. `CoreCfdiAuth.login()`).

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}
- `CORECFDI_EMAIL` = {{usuario@empresa.com}}
- `CORECFDI_PASSWORD` = {{contraseña}} (solo en secretos/env, nunca en código ni logs)
- `CORECFDI_DEVICE_NAME` = {{nombre-de-este-sistema}}

## Petición

`POST {CORECFDI_BASE_URL}/auth/login`

Headers:

- `Accept: application/json` ← obligatorio
- `Content-Type: application/json`
- `X-Tenant: {CORECFDI_TENANT}` ← identifica la empresa

Body:

```json
{
  "email": "{CORECFDI_EMAIL}",
  "password": "{CORECFDI_PASSWORD}",
  "device_name": "{CORECFDI_DEVICE_NAME}"
}
```

## Respuestas

200 (éxito):

```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "data": {
    "access_token": "12|xxxx",
    "refresh_token": "13|yyyy",
    "token_type": "Bearer",
    "tenant_id": "...",
    "expires_in_minutes": 15,
    "user": { "id": 1, "name": "...", "email": "...", "rol_id": 1 }
  }
}
```

401 (credenciales incorrectas):

```json
{ "success": false, "message": "Credenciales de acceso incorrectas", "errors": null }
```

422 (validación):

```json
{ "message": "...", "errors": { "email": ["..."], "password": ["..."] } }
```

429: demasiados intentos (límite de 60 peticiones/min). Respetar `Retry-After`.

## Qué debe hacer la implementación

1. Enviar la petición con los headers y el body indicados.
2. Si responde 200:
   - guardar `access_token`, `refresh_token`, `tenant_id` y `user`,
   - calcular y guardar `expires_at = ahora + expires_in_minutes` (usar el valor que llega, no asumirlo),
   - guardar los tokens de forma segura (cache o BD cifrada), nunca en logs.
3. Si responde 401 → lanzar un error "credenciales incorrectas" sin reintentar.
4. Si responde 422 → lanzar un error de validación con el detalle de `errors`.
5. Si responde 429 → esperar `Retry-After` y reintentar como máximo una vez.
6. Si responde 5xx o hay error de red → error claro; reintento opcional con backoff (máx. 2).
7. Registrar en log: endpoint, status y duración, SIN contraseña ni tokens.

## Uso posterior del token

En las siguientes llamadas a la API enviar:

- `Authorization: Bearer {access_token}`
- `X-Tenant: {CORECFDI_TENANT}`
- `Accept: application/json`

## Pruebas requeridas

- Login correcto guarda los tokens y `expires_at`.
- Contraseña incorrecta → error 401 sin reintento.
- Email vacío o inválido → error 422 con detalle por campo.
- Ningún log contiene la contraseña ni los tokens.
