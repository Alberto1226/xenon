# Verificación de solicitud de descarga masiva SAT contra CoreCFDI API v1

Implementa en este sistema la verificación de solicitudes de descarga masiva al SAT a través de CoreCFDI.
Hazlo como una función/servicio reutilizable (ej. `CoreCfdiSat.verificarSolicitud(id)`).

Requisitos previos:

- El servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`).
- La FIEL de la empresa cargada en CoreCFDI (`POST /sat/fiel`).
- Una solicitud creada con `POST /sat/descarga-masiva/solicitar` (se usa su `id` interno).

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Qué hace este endpoint

1. Consulta al SAT el estado de la solicitud.
2. Si el SAT aún no termina → actualiza el estado y responde que sigue en proceso.
3. Si el SAT ya terminó → CoreCFDI descarga los paquetes, los descomprime e importa los CFDI
   a su historial de facturas, y marca la solicitud como `descargada`.

El cliente NO descarga los XML: quedan importados en CoreCFDI y se consultan con los endpoints
de facturas (`GET /facturas`, `GET /facturas/recibidas`).

Importante: CoreCFDI ya verifica automáticamente todas las solicitudes `pendiente` cada 10 minutos.
Este endpoint sirve para forzar la verificación de una solicitud en particular (ej. botón "Verificar ahora").
Como alternativa sin llamadas extra, basta consultar `GET /sat/descarga-masiva/solicitudes`
para ver el estado actualizado.

## Petición

`POST {CORECFDI_BASE_URL}/sat/descarga-masiva/verificar/{id}`

- `{id}`: ID interno de CoreCFDI (campo `id` de la solicitud), NO el `request_id` del SAT.

Headers:

- `Accept: application/json` ← obligatorio
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}`

Sin body.

## Respuestas

200 — el SAT sigue procesando (o rechazó/venció la solicitud):

```json
{
  "success": true,
  "message": "Estatus de solicitud verificado correctamente",
  "data": {
    "solicitud": {
      "id": 12,
      "request_id": "a1b2c3d4-....",
      "fecha_inicio": "2026-01-01T00:00:00.000000Z",
      "fecha_fin": "2026-01-31T23:59:59.000000Z",
      "tipo": "emitido",
      "status": "pendiente",
      "error_msg": "Solicitud Aceptada",
      "created_at": "...",
      "updated_at": "..."
    },
    "resultado": {
      "descargada": false,
      "status": "pendiente",
      "importadas": 0,
      "actualizadas": 0,
      "errores": 0,
      "mensaje": "Solicitud Aceptada"
    }
  }
}
```

200 — paquetes descargados e importados:

```json
{
  "success": true,
  "message": "Estatus de solicitud verificado correctamente",
  "data": {
    "solicitud": { "id": 12, "status": "descargada", "error_msg": null, "...": "..." },
    "resultado": {
      "descargada": true,
      "importadas": 148,
      "actualizadas": 3,
      "errores": 0,
      "mensaje": "Descarga completada. 148 facturas importadas, 3 actualizadas."
    }
  }
}
```

### Campos de `resultado`

| Campo | Descripción |
|---|---|
| `descargada` | `true` si ya se descargaron e importaron los CFDI |
| `status` | Estado nuevo cuando no se descargó: `pendiente`, `rechazada`, `vencida` o `error` |
| `importadas` | CFDI nuevos importados |
| `actualizadas` | CFDI que ya existían y se actualizaron |
| `errores` | XML que no se pudieron importar |
| `mensaje` | Mensaje del SAT o resumen de la importación |

### Qué hacer según el estado

| Estado | Qué hacer |
|---|---|
| `pendiente` | Volver a verificar más tarde (mínimo 5–10 min) |
| `descargada` | Terminado. Mostrar el resumen y refrescar las facturas |
| `rechazada` | Mostrar `mensaje`; no volver a verificar |
| `vencida` | Los paquetes expiraron; hacer una solicitud nueva |
| `error` | Mostrar `mensaje`; se puede reintentar la verificación más tarde |

### Errores

- 404: no existe la solicitud con ese `id` en la empresa.
  ```json
  { "success": false, "message": "No se encontró la solicitud #12.", "errors": null }
  ```
- 422: la empresa no tiene FIEL configurada → pedir al usuario que la cargue.
- 500: error al consultar/descargar del SAT; la solicitud queda en `error` con el detalle en `error_msg`.
- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: empresa suspendida o inactiva → no reintentar, alertar.
- 429: demasiadas peticiones (60/min). Respetar `Retry-After`.

## Qué debe hacer la implementación

1. `verificarSolicitud(id)`:
   - no llamar si la solicitud ya está en `descargada`, `rechazada` o `vencida`,
   - obtener el token y enviar la petición,
   - actualizar el estado local con `data.solicitud.status`,
   - devolver `data.resultado`.
2. Evitar llamadas simultáneas para la misma solicitud (lock por `id`): la descarga e importación
   puede tardar y una segunda llamada duplicaría el trabajo.
3. Timeout de 300 s: cuando el SAT ya terminó, la descarga e importación de paquetes grandes tarda.
   Si hay timeout, NO reintentar de inmediato: consultar el estado con
   `GET /sat/descarga-masiva/solicitudes` unos minutos después (el servidor pudo haber terminado).
4. Si se hace sondeo automático: una verificación cada 10 minutos como mínimo por solicitud,
   y detenerlo después de 72 horas en `pendiente` (avisar al usuario).
5. Al pasar a `descargada`: mostrar "X facturas importadas, Y actualizadas" y refrescar los listados
   de facturas; si `errores > 0`, mostrar una advertencia.
6. Registrar en log: endpoint, `id`, status HTTP, estado de la solicitud y duración. Sin tokens.

## Pruebas requeridas

- Solicitud en proceso → `descargada = false`, estado `pendiente`, se programa otra verificación.
- Solicitud terminada → `descargada = true` con conteos, y se refrescan las facturas.
- Solicitud rechazada o vencida → se muestra el mensaje y se deja de verificar.
- `id` inexistente → 404 con mensaje claro.
- Empresa sin FIEL → 422 y se pide cargarla.
- Timeout → no se reintenta de inmediato; se consulta el historial después.
- Dos verificaciones simultáneas de la misma solicitud → solo se envía una.
- Token expirado → se renueva y la verificación funciona.
