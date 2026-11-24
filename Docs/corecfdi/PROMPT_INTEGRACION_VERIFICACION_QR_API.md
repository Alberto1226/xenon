# Verificación QR de un CFDI en el SAT contra CoreCFDI API v1

Implementa en este sistema la verificación QR de un CFDI registrado en CoreCFDI: obtener la liga al
verificador oficial del SAT (la misma que codifica el QR impreso del comprobante) y la imagen del QR
para mostrarla o abrirla. Hazlo como una función/servicio reutilizable (ej.
`CoreCfdiFacturas.verificacionQr(idFactura)`).

Requisito previo: el servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`),
que devuelve un access token vigente y renueva el token cuando hace falta.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Botón "Verificación QR" en el detalle o en las acciones de una factura (emitida o recibida): abre
  el verificador del SAT con los datos del CFDI ya llenados.
- Mostrar el QR en pantalla (modal) para escanearlo con el celular o imprimirlo.
- Obtener una sola factura por `id` sin descargar el listado completo.

**No consulta al SAT.** Solo arma la liga con los datos del CFDI. El SAT valida cuando el usuario
abre la liga. Para el estatus oficial (vigente/cancelado) desde el servidor, usa
`POST /facturas/{id}/sincronizar-sat`, que no forma parte de este prompt.

Si ya tienes el listado de `GET /facturas/recibidas`, cada factura trae la misma liga en `sat_url`.
Usa este endpoint cuando además necesites la imagen del QR o solo tengas el `id`.

## Petición

`GET {CORECFDI_BASE_URL}/facturas/{id}/verificacion-qr`

Headers:

- `Accept: application/json` ← obligatorio (sin él, los errores 401/404 no llegan como JSON)
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}` ← obligatorio

| Parámetro | Dónde | Descripción |
|---|---|---|
| `id` | path | `id_factura` numérico de CoreCFDI (el `id_factura` del listado). **No es el UUID** |

## Respuesta 200

```json
{
  "success": true,
  "message": "Verificación QR del CFDI generada con éxito",
  "data": {
    "id": 25,
    "uuid": "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
    "emisor_rfc": "BMN930209927",
    "receptor_rfc": "QUHJ711021UR1",
    "total": 1160.0,
    "total_formateado": "0000001160.000000",
    "sello_ultimos_8": "pEwi2g==",
    "sello_completo": true,
    "url": "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=EF34CE53-6076-4190-B8FD-EFD3274BA5F6&re=BMN930209927&rr=QUHJ711021UR1&tt=0000001160.000000&fe=pEwi2g==",
    "qr_svg": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIi..."
  }
}
```

| Campo | Descripción |
|---|---|
| `id` | `id_factura` en CoreCFDI |
| `uuid` | Folio fiscal, en mayúsculas |
| `emisor_rfc`, `receptor_rfc` | RFC de emisor y receptor, en mayúsculas |
| `total` | Total del comprobante (número) |
| `total_formateado` | Total como lo pide el SAT: 10 enteros, punto y 6 decimales (`tt` de la liga) |
| `sello_ultimos_8` | Últimos 8 caracteres del sello digital (`fe` de la liga); `null` si CoreCFDI no tiene el XML |
| `sello_completo` | `false` si falta el sello: la liga abre el verificador, pero el usuario debe capturar el sello a mano |
| `url` | Liga al verificador del SAT. Abrirla **tal cual** |
| `qr_svg` | QR de `url` en SVG como data URI, listo para `<img src>`. Puede ser `null` si no se pudo generar |

Reglas sobre `url`:

- **No la vuelvas a codificar** (`encodeURIComponent`, `URLSearchParams`, etc.). El sello trae `+`,
  `/` y `=` en texto plano a propósito, porque así lo lee el verificador del SAT para autollenar el
  formulario. Si la codificas otra vez, el SAT no reconoce el sello.
- No armes la liga en el cliente a partir de los otros campos. Usa siempre `url`.
- Ábrela en una pestaña nueva con `rel="noopener noreferrer"`.

Reglas sobre `qr_svg`:

- Úsalo directo como `src` de una imagen. No lo insertes como HTML (`innerHTML`, `dangerouslySetInnerHTML`).
- Si es `null`, genera el QR en el cliente a partir de `url` con la librería de QR que ya use este
  sistema, o muestra solo el botón de la liga.
- La imagen no se guarda en cache del lado del servidor. Si se muestra varias veces la misma
  factura en la sesión, guarda la respuesta en memoria del cliente.

## Errores

- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: empresa suspendida o usuario sin permiso `ver facturacion` → no reintentar; mostrar el `message`.
- 404: factura no encontrada (`{ "success": false, "message": "No se encontró la factura con ID #…" }`),
  o tenant no encontrado → no reintentar. Mostrar "La factura ya no existe en CoreCFDI".
- 422: la factura no tiene UUID o le falta el RFC del emisor o del receptor; no se puede armar la
  verificación. Ocultar el botón para esa factura y mostrar el `message`; no reintentar.
- 429: demasiadas peticiones (60/min). Respetar `Retry-After`.
- 5xx o error de red → error claro; reintentar máximo 2 veces con backoff (es una consulta, es seguro reintentar).

## Qué debe hacer la implementación

1. `verificacionQr(idFactura)`: validar que `idFactura` sea un entero positivo, obtener el token,
   llamar al endpoint y devolver un modelo propio
   `{ id, uuid, emisorRfc, receptorRfc, total, url, qrSvg, selloCompleto }`.
2. Botón "Verificación QR" en el detalle o en las acciones de cada factura (emitidas y recibidas):
   - Si la fila ya trae `sat_url` del listado y solo se quiere abrir el SAT, abrir `sat_url` sin
     llamar a este endpoint. Si `sat_url` es `null`, ocultar el botón.
   - Para "Ver QR": llamar al endpoint y mostrar un modal con la imagen (`qrSvg`), el UUID, los RFC,
     el total formateado con su moneda, un botón "Abrir en el SAT" (`url`) y otro "Copiar liga".
   - Si `selloCompleto` es `false`, mostrar en el modal un aviso: "El SAT pedirá capturar los
     últimos 8 caracteres del sello manualmente".
3. Mientras carga, deshabilitar el botón para no duplicar peticiones.
4. Timeout de 15 s. Registrar en log endpoint, status y duración, sin tokens ni la liga completa
   (contiene RFC y UUID).

## Pruebas requeridas

- Factura con XML → `url` con `fe` lleno, `sello_completo = true`, el modal muestra el QR.
- Factura sin XML en CoreCFDI → `sello_completo = false`, `fe` vacío en la liga, se muestra el aviso.
- `qr_svg = null` → se genera el QR en el cliente o se muestra solo la liga, sin romper.
- La liga se abre exactamente como llegó (`+`, `/` y `=` del sello sin codificar).
- `id` inexistente → 404 manejado con mensaje.
- Factura sin RFC de emisor o receptor → 422 manejado y el botón se oculta.
- `id` no numérico o ≤ 0 → bloqueado en el cliente, no se envía la petición.
- Fila del listado con `sat_url = null` → no se muestra el botón de verificación.
- Doble clic en "Ver QR" → una sola petición.
- Token expirado → se renueva y la consulta funciona.
