# Historial de solicitudes de descarga masiva SAT contra CoreCFDI API v1

Implementa en este sistema la consulta del historial de solicitudes de descarga masiva al SAT
registradas en CoreCFDI. Hazlo como una función/servicio reutilizable
(ej. `CoreCfdiSat.listarSolicitudes(page)`).

Requisito previo: el servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`),
que devuelve un access token vigente y renueva el token cuando hace falta.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Mostrar al usuario las solicitudes hechas al SAT y en qué estado están.
- Antes de pedir un periodo con `POST /sat/descarga-masiva/solicitar`, revisar que no exista ya
  una solicitud del mismo periodo y tipo (el SAT limita las solicitudes repetidas).
- Encontrar las solicitudes `pendiente` que hay que verificar con
  `POST /sat/descarga-masiva/verificar/{id}`.

## Petición

`GET {CORECFDI_BASE_URL}/sat/descarga-masiva/solicitudes?page=1`

Headers:

- `Accept: application/json` ← obligatorio
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}`

Parámetros de query:

| Parámetro | Obligatorio | Descripción |
|---|---|---|
| `page` | no | Número de página (default 1) |

- Cada página trae 20 solicitudes (fijo; `per_page` no tiene efecto).
- Orden: de la más reciente a la más antigua (`created_at` descendente).
- No hay filtros en el servidor: filtrar por tipo, estado o periodo del lado del cliente.

## Respuesta 200

`data` es un paginador de Laravel:

```json
{
  "success": true,
  "message": "Historial de solicitudes de descarga masiva SAT obtenido con éxito",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id": 12,
        "request_id": "a1b2c3d4-....",
        "fecha_inicio": "2026-01-01T00:00:00.000000Z",
        "fecha_fin": "2026-01-31T23:59:59.000000Z",
        "tipo": "emitido",
        "status": "pendiente",
        "error_msg": null,
        "created_at": "2026-02-01T17:20:00.000000Z",
        "updated_at": "2026-02-01T17:20:00.000000Z"
      }
    ],
    "first_page_url": "...?page=1",
    "from": 1,
    "last_page": 3,
    "last_page_url": "...?page=3",
    "links": [],
    "next_page_url": "...?page=2",
    "path": "...",
    "per_page": 20,
    "prev_page_url": null,
    "to": 20,
    "total": 45
  }
}
```

### Campos de cada solicitud

| Campo | Descripción |
|---|---|
| `id` | ID interno de CoreCFDI. Se usa en `/sat/descarga-masiva/verificar/{id}` |
| `request_id` | ID de la solicitud en el SAT (referencia y soporte) |
| `fecha_inicio`, `fecha_fin` | Periodo solicitado |
| `tipo` | `emitido` o `recibido` |
| `status` | Estado actual (ver tabla) |
| `error_msg` | Último mensaje del SAT (motivo de rechazo o error); puede ser `null` |
| `created_at`, `updated_at` | Fecha de la solicitud y de la última actualización (UTC) |

### Estados (`status`)

| Estado | Significado | Qué hacer |
|---|---|---|
| `pendiente` | El SAT aún arma los paquetes | Verificar más tarde |
| `terminada` | Paquetes listos | Descargar |
| `descargada` | Ya se descargaron e importaron los CFDI | Nada |
| `rechazada` | El SAT rechazó la solicitud | Mostrar `error_msg`; no reintentar igual |
| `vencida` | Los paquetes expiraron en el SAT | Hacer una solicitud nueva |
| `error` | Falló la verificación o descarga | Mostrar `error_msg` |

Tratar cualquier otro valor como desconocido: mostrarlo tal cual, sin romper la pantalla.

### Fechas: cuidado con la zona horaria

`fecha_inicio` y `fecha_fin` se guardan en hora de México (`America/Mexico_City`), pero la API las
devuelve con sufijo `Z` como si fueran UTC. NO convertirlas a hora local: tomar la fecha y hora
tal cual vienen (ej. `2026-01-31T23:59:59.000000Z` → 31/01/2026 23:59:59, hora de México).
`created_at` y `updated_at` sí están en UTC real.

## Errores

- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: empresa suspendida o inactiva → no reintentar, alertar.
- 429: demasiadas peticiones (60/min). Respetar `Retry-After`.
- 5xx o error de red → error claro; reintentar máximo 2 veces con backoff (es una consulta, es seguro reintentar).

## Qué debe hacer la implementación

1. `listarSolicitudes(page = 1)`: obtener el token, llamar al endpoint y devolver
   `{ items, page, lastPage, total }` a partir del paginador.
2. `listarTodas()`: recorrer páginas mientras `next_page_url` no sea `null`
   (poner un límite, ej. 50 páginas, para no quedar en bucle).
3. `existeSolicitud(fechaInicio, fechaFin, tipo)`: buscar en el historial una solicitud del mismo
   periodo y tipo con estado `pendiente`, `terminada` o `descargada`. Usarla antes de solicitar.
   Ojo: el `tipo` del historial es `emitido`/`recibido`, y en `solicitar` se envía `emitidas`/`recibidas`.
4. `pendientes()`: devolver las solicitudes con `status = pendiente` para programar su verificación.
5. En pantalla: mostrar periodo, tipo, estado (con color por estado), `error_msg` si existe y fecha
   de solicitud; con paginación.
6. No consultar este endpoint en bucle: si se usa para refrescar estados, hacerlo cada 5–10 minutos como mínimo.
7. Timeout de 30 s. Registrar en log endpoint, status y duración, sin tokens.

## Pruebas requeridas

- Página 1 con resultados → se muestran las solicitudes y los datos de paginación.
- Historial vacío → lista vacía sin errores (`data.data = []`, `total = 0`).
- `listarTodas()` recorre todas las páginas y se detiene en `next_page_url = null`.
- `existeSolicitud()` detecta un periodo ya solicitado (mapeando `emitidas` ↔ `emitido`).
- Fechas del periodo se muestran sin conversión de zona horaria.
- Estado desconocido → se muestra tal cual sin romper.
- Token expirado → se renueva y la consulta funciona.
