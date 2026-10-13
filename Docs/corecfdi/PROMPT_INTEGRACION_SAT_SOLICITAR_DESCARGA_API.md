# Solicitud de descarga masiva SAT contra CoreCFDI API v1

Implementa en este sistema la solicitud de descarga masiva de CFDI al SAT a través de CoreCFDI.
Hazlo como una función/servicio reutilizable (ej. `CoreCfdiSat.solicitarDescarga()`).

Requisitos previos:

- El servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`),
  que devuelve un access token vigente y renueva el token cuando hace falta.
- La FIEL de la empresa ya cargada en CoreCFDI con `POST /sat/fiel` (`CoreCfdiSat.configurarFiel()`).
  Sin FIEL el SAT no acepta la solicitud.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Cómo funciona la descarga masiva (proceso asíncrono)

La descarga masiva del SAT NO devuelve los XML en la misma llamada. Tiene 2 pasos:

1. **Solicitar** (este endpoint): se pide al SAT un periodo; el SAT regresa un ID de solicitud.
2. **Verificar** (`POST /sat/descarga-masiva/verificar/{id}`): consulta al SAT; cuando los paquetes
   están listos, CoreCFDI los descarga e importa los CFDI en ese mismo paso.
   El SAT puede tardar de minutos a varias horas.

CoreCFDI además verifica automáticamente las solicitudes pendientes cada 10 minutos.

Este prompt cubre solo el paso 1. Guarda el `id` que regresa para usarlo en el paso 2.

## Petición

`POST {CORECFDI_BASE_URL}/sat/descarga-masiva/solicitar`

Headers:

- `Accept: application/json` ← obligatorio
- `Content-Type: application/json`
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}`

Body:

```json
{
  "fecha_inicio": "2026-01-01",
  "fecha_fin": "2026-01-31",
  "tipo_descarga": "emitidas",
  "tipo_comprobante": null
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fecha_inicio` | fecha `YYYY-MM-DD` | sí | Inicio del periodo |
| `fecha_fin` | fecha `YYYY-MM-DD` | sí | Fin del periodo; igual o posterior a `fecha_inicio` |
| `tipo_descarga` | texto | sí | `emitidas` o `recibidas` |
| `tipo_comprobante` | texto | no | `I` Ingreso, `E` Egreso, `P` Pago, `N` Nómina. `null` = todos |

Para emitidas y recibidas del mismo periodo, hacer DOS solicitudes, una por tipo,
con una pausa de al menos 2 segundos entre ellas (el SAT rechaza solicitudes simultáneas).

## Respuestas

200 (solicitud aceptada por el SAT):

```json
{
  "success": true,
  "message": "Solicitud de descarga masiva SAT procesada",
  "data": {
    "id": 12,
    "request_id": "a1b2c3d4-....",
    "fecha_inicio": "2026-01-01 00:00:00",
    "fecha_fin": "2026-01-31 23:59:59",
    "tipo": "emitido",
    "status": "pendiente",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

- `id`: ID interno de CoreCFDI. Es el que se usa en `/sat/descarga-masiva/verificar/{id}`.
- `request_id`: ID de la solicitud en el SAT (para referencia y soporte).

422 (validación):

```json
{ "message": "...", "errors": { "fecha_fin": ["..."], "tipo_descarga": ["..."] } }
```

500 (el SAT rechazó la solicitud o no respondió):

```json
{ "success": false, "message": "Error al comunicar con el WS del SAT: ...", "errors": null }
```

401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
403: empresa suspendida o inactiva → no reintentar, alertar.
429: demasiadas peticiones (60/min). Respetar `Retry-After`.

## Reglas del SAT que debe respetar el cliente

- Las fechas se interpretan en hora del centro de México (`America/Mexico_City`).
- `fecha_fin` no puede ser futura. Si el periodo incluye el día de hoy, el servidor ajusta la hora final
  a unos minutos antes de la hora actual.
- El SAT limita las solicitudes repetidas del mismo periodo y tipo. No volver a solicitar un periodo
  que ya tiene una solicitud `pendiente` o `terminada`; consultar el historial con
  `GET /sat/descarga-masiva/solicitudes` antes de pedirlo otra vez.
- Para periodos largos o con muchos CFDI, dividir en rangos mensuales.

## Qué debe hacer la implementación

1. Validar antes de enviar:
   - formato `YYYY-MM-DD` en las dos fechas,
   - `fecha_inicio <= fecha_fin`,
   - `fecha_fin` no posterior a hoy,
   - `tipo_descarga` en `emitidas` | `recibidas`,
   - `tipo_comprobante` vacío o en `I`, `E`, `P`, `N`.
2. Revisar en el historial local (o con `GET /sat/descarga-masiva/solicitudes`) que el mismo
   periodo y tipo no esté ya solicitado.
3. Obtener el token con `CoreCfdiAuth.getAccessToken()` y enviar la petición.
4. Si responde 200:
   - guardar `id`, `request_id`, periodo, tipo y `status`,
   - programar la verificación (paso 2) para más tarde (ej. cada 5–10 minutos, sin saturar al SAT).
5. Si responde 422 → mostrar los errores por campo.
6. Si responde 500 → guardar el mensaje del SAT y mostrarlo. Reintentar como máximo 2 veces,
   con 5–10 s de espera entre intentos. Si el mensaje indica que ya existe una solicitud o se
   agotaron las solicitudes, NO reintentar.
7. Timeout de 120 s para esta petición (el SAT puede tardar en responder).
8. Registrar en log: endpoint, status, duración, periodo, tipo y `request_id`. Sin tokens.

## Pruebas requeridas

- Solicitud válida de emitidas → 200 y se guardan `id` y `request_id`.
- `fecha_fin` anterior a `fecha_inicio` → se bloquea antes de enviar (y el servidor responde 422).
- `tipo_descarga` inválido → 422 con error en ese campo.
- Periodo ya solicitado → no se envía una solicitud duplicada.
- Emitidas + recibidas del mismo periodo → dos solicitudes con pausa entre ellas.
- Error 500 del SAT → máximo 2 reintentos y se muestra el mensaje.
- Token expirado → se renueva y la solicitud funciona.
- Ningún log contiene tokens.
