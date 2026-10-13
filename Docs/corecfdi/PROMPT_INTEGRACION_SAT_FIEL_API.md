# Carga de FIEL (e.firma) contra CoreCFDI API v1

Implementa en este sistema la carga de la FIEL (e.firma) de la empresa en CoreCFDI.
CoreCFDI la usa para autenticarse con el SAT (descarga masiva de CFDI).
Hazlo como una función/servicio reutilizable (ej. `CoreCfdiSat.configurarFiel()`).

Requisito previo: el servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`),
que devuelve un access token vigente y renueva el token cuando hace falta.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Petición

`POST {CORECFDI_BASE_URL}/sat/fiel`

Headers:

- `Accept: application/json` ← obligatorio
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}`
- `Content-Type: multipart/form-data` (dejar que la librería HTTP genere el `boundary`; no fijarlo a mano)

Body (multipart/form-data):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `cer_file` | archivo | sí | Certificado de la FIEL (`.cer`) |
| `key_file` | archivo | sí | Llave privada de la FIEL (`.key`) |
| `password` | texto | sí | Contraseña de la llave privada |

Enviar los archivos en binario tal cual (no en base64 ni como texto).

Ejemplo con curl:

```bash
curl -X POST "$CORECFDI_BASE_URL/sat/fiel" \
  -H "Accept: application/json" \
  -H "X-Tenant: $CORECFDI_TENANT" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "cer_file=@/ruta/fiel.cer" \
  -F "key_file=@/ruta/fiel.key" \
  -F "password=$FIEL_PASSWORD"
```

## Respuestas

200 (FIEL guardada y validada):

```json
{
  "success": true,
  "message": "Certificados FIEL/e.firma cargados y verificados con éxito",
  "data": {
    "status": "activo",
    "rfc": "EKU9003173C9",
    "valido_hasta": "2030-09-24"
  }
}
```

422 (falta un archivo o la contraseña, o el certificado o la contraseña no son válidos):

```json
{ "message": "...", "errors": { "cer_file": ["..."], "key_file": ["..."], "password": ["..."] } }
```

401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
El archivo se debe volver a adjuntar en el reintento (no reutilizar un stream ya consumido).

403: empresa suspendida o inactiva → no reintentar, alertar.

429: demasiadas peticiones (60/min). Respetar `Retry-After`.

## Qué debe hacer la implementación

1. Validar antes de enviar:
   - que existan los dos archivos y la contraseña,
   - que las extensiones sean `.cer` y `.key`,
   - que ningún archivo esté vacío.
2. Obtener el token con `CoreCfdiAuth.getAccessToken()` y enviar la petición multipart.
3. Si responde 200:
   - guardar/mostrar `rfc`, `status` y `valido_hasta`,
   - comparar el `rfc` devuelto con el RFC esperado de la empresa; si no coincide, avisar al usuario,
   - si `valido_hasta` está a menos de 30 días, mostrar una alerta de vencimiento.
4. Si responde 422 → mostrar los errores por campo (`errors`) al usuario.
5. Si responde 5xx o hay error de red → error claro. NO reintentar automáticamente más de una vez.
6. Timeout de 60 s para esta petición.

## Seguridad (obligatorio)

- La FIEL es la firma legal de la empresa ante el SAT: tratar `.cer`, `.key` y contraseña como secretos.
- NO guardar el `.key` ni la contraseña en este sistema después de enviarlos; leerlos, enviarlos y descartarlos.
  Si hay archivos temporales, borrarlos al terminar (también si hubo error).
- NUNCA registrar en logs la contraseña, el contenido de los archivos ni el body de la petición.
  Registrar solo endpoint, status, duración y el `rfc` devuelto.
- Enviar siempre por HTTPS.

## Pruebas requeridas

- FIEL válida → 200 y se muestran `rfc` y `valido_hasta`.
- Falta `key_file` → 422 con error en ese campo.
- Contraseña incorrecta → 422 con mensaje de error.
- Token expirado → se renueva, se reenvían los archivos y la carga funciona.
- RFC devuelto distinto al esperado → se muestra la advertencia.
- FIEL que vence en menos de 30 días → se muestra la alerta.
- Ningún log contiene la contraseña ni el contenido de los archivos.
- Los archivos temporales se borran tanto en éxito como en error.
