# Bóveda Fiscal (expediente 360 de un CFDI) contra CoreCFDI API v1

Implementa en este sistema la consulta y el mantenimiento del expediente de un CFDI que CoreCFDI
guarda en su Bóveda Fiscal: pagos relacionados, saldo, bitácora de comentarios, historial de
eventos y documentos adjuntos (contratos, órdenes de compra, comprobantes bancarios, etc.). Hazlo
como un servicio reutilizable (ej. `CoreCfdiBoveda`) con estas funciones:

- `expediente(idFactura)`
- `agregarComentario(idFactura, texto)`
- `subirAdjunto(idFactura, archivo, tipoDocumento)`
- `eliminarAdjunto(idAdjunto)`
- `descargarAdjunto(idAdjunto, { inline })`
- `cicloDeVida(expediente, origen)`: función local, sin llamada a la API (sección 6)
- `semaforoFiscal(expediente, origen)`: función local, sin llamada a la API (sección 7)

Requisito previo: el servicio de autenticación y el cliente HTTP compartido ya implementados
(`CoreCfdiAuth.getAccessToken()`), que envían los headers, renuevan el token y manejan 401/429.
El `id_factura` sale de los listados de facturas (`GET /facturas/recibidas` o `GET /facturas`).

CoreCFDI solo **descarga y consulta** CFDI del SAT. La Bóveda no registra pagos ni cambia el CFDI:
comentarios y adjuntos son documentación interna de la empresa, y los pagos que muestra son los
complementos de pago (REP) ya descargados.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Ver en un solo lugar todo lo que se sabe de una factura: datos fiscales, pagos REP aplicados,
  saldo pendiente, si el emisor está en la lista negra del SAT (EFOS, Art. 69-B) y si CoreCFDI
  tiene el XML y el PDF.
- Dejar notas de seguimiento ("validada por contabilidad", "pendiente de orden de compra").
- Guardar los documentos de soporte de la operación junto al CFDI (materialidad ante el SAT).
- Ver quién hizo qué y cuándo (historial de eventos).

Funciona para cualquier CFDI de la empresa, emitido o recibido. En el sistema de CoreCFDI se usa
sobre todo en **Cuentas por pagar** (facturas de proveedores).

## Headers y permisos

Todas las peticiones llevan:

- `Accept: application/json` ← obligatorio (sin él, los errores 401/422 no llegan como JSON)
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}` ← obligatorio

| Endpoint | Permiso del usuario de la API |
|---|---|
| `GET /facturas/{id}/boveda` | `ver facturacion` |
| `GET /facturas/boveda/adjuntos/{id_adjunto}/descargar` | `ver facturacion` |
| `POST /facturas/{id}/boveda/comentario` | `ver facturacion` + `crear facturacion` |
| `POST /facturas/{id}/boveda/adjuntos` | `ver facturacion` + `crear facturacion` |
| `DELETE /facturas/boveda/adjuntos/{id_adjunto}` | `ver facturacion` + `eliminar facturacion` |

`{id}` e `{id_adjunto}` son enteros. Valida que lo sean antes de llamar: un valor no numérico
provoca un 500 en el servidor, no un 404.

Comentarios, adjuntos y eventos quedan firmados con el **nombre del usuario de la API** (o `"API"`
si no tiene nombre), no con el del usuario final de este sistema. Si necesitas saber qué persona
de este sistema hizo la acción, inclúyelo en el texto del comentario (ej. `"[Juan Pérez] ..."`) y
guárdalo también en tu propio log.

## 1. Consultar el expediente

`GET {CORECFDI_BASE_URL}/facturas/{id}/boveda`

### Respuesta 200

```json
{
  "success": true,
  "message": "Expediente Bóveda Fiscal 360 devuelto con éxito",
  "data": {
    "factura": {
      "id": 40,
      "uuid": "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
      "folio": "A-1021",
      "fecha": "2026-08-15",
      "hora": "13:45:10",
      "emisor_rfc": "PEJ010203AB1",
      "emisor_nombre": "PROVEEDOR EJEMPLO SA DE CV",
      "receptor_rfc": "QUHJ711021UR1",
      "receptor_nombre": "MI EMPRESA SA DE CV",
      "subtotal": 10000.0,
      "descuento": 0.0,
      "total": 11600.0,
      "status": "vigente",
      "moneda": "MXN",
      "tipo_comprobante": "I",
      "metodo_pago": "PPD",
      "created_at": "2026-08-16 02:10:33",
      "updated_at": "2026-08-16 02:10:33"
    },
    "expediente": {
      "has_xml": true,
      "has_pdf": true,
      "pagos": [
        {
          "uuid": "0A1B2C3D-4E5F-6789-ABCD-EF0123456789",
          "folio": "P-88",
          "fecha": "2026-09-01",
          "fecha_cancelacion": null,
          "monto": 5000.0,
          "status": "vigente"
        }
      ],
      "total_pagado": 5000.0,
      "saldo_pendiente": 6600.0,
      "comentarios": [
        {
          "id": 3,
          "id_factura": 40,
          "comentario": "Validada por contabilidad",
          "usuario_nombre": "Integración ERP",
          "created_at": "2026-09-02 17:20:00",
          "updated_at": "2026-09-02 17:20:00"
        }
      ],
      "eventos": [
        {
          "id": 9,
          "id_factura": 40,
          "evento": "Documento Adjuntado",
          "descripcion": "Se subió el documento 'OC-5541.pdf' clasificado como 'Orden de Compra'.",
          "usuario_nombre": "Integración ERP",
          "created_at": "2026-09-02 17:25:12"
        },
        {
          "id": 8,
          "id_factura": 40,
          "evento": "Comentario Agregado",
          "descripcion": "Se agregó una nota a la bitácora de la Bóveda Fiscal.",
          "usuario_nombre": "Integración ERP",
          "created_at": "2026-09-02 17:20:00"
        }
      ],
      "es_efo": false,
      "efo_situacion": null,
      "adjuntos": [
        {
          "id": 12,
          "id_factura": 40,
          "tipo_documento": "Orden de Compra",
          "nombre_archivo": "OC-5541.pdf",
          "ruta_archivo": "facturas/adjuntos/40/1756833912_OC-5541.pdf",
          "usuario_nombre": "Integración ERP",
          "created_at": "2026-09-02 17:25:12",
          "updated_at": "2026-09-02 17:25:12"
        }
      ]
    }
  }
}
```

### Campos de `factura`

| Campo | Descripción |
|---|---|
| `id` | `id_factura` de CoreCFDI (el mismo que se usó en la URL) |
| `uuid`, `folio` | Folio fiscal y serie/folio. `folio` puede venir vacío o `null` |
| `fecha`, `hora` | Emisión, **hora de México**. Mostrar tal cual, sin convertir zona |
| `emisor_*`, `receptor_*` | RFC y nombre. Nombre `"Sin nombre"` si falta; RFC puede ser `null` |
| `subtotal` | **Solo la base gravada**. No recalcules el total con él |
| `descuento`, `total` | Importes del CFDI |
| `status` | `vigente` o `cancelado` |
| `moneda` | Código (`MXN`, `USD`…); `MXN` si falta |
| `tipo_comprobante` | `I`, `E`, `P`, `N`… ; `I` si falta |
| `metodo_pago` | `PUE` o `PPD` (pese al nombre, no es la forma de pago); puede ser `null` |
| `created_at`, `updated_at` | Cuándo se importó/actualizó en CoreCFDI. **UTC**, formato `YYYY-MM-DD HH:MM:SS` sin zona |

### Campos de `expediente`

| Campo | Descripción |
|---|---|
| `has_xml`, `has_pdf` | Si CoreCFDI tiene el archivo. Son indicativos: puede venir `false` y aun así descargarse (ver sección 6) |
| `pagos` | CFDI que hacen referencia a esta factura (REP y, si existen, notas de crédito). Arreglo vacío si no hay |
| `pagos[].monto` | Importe pagado a **esta** factura según el XML del REP; si no se pudo leer, el total del REP |
| `pagos[].fecha` | `YYYY-MM-DD`: fecha real del pago (`FechaPago` del REP) o, si no está, la de emisión del REP |
| `pagos[].fecha_cancelacion` | `YYYY-MM-DD` solo si el REP está cancelado; si no, `null` |
| `total_pagado` | Suma de `pagos` **vigentes** |
| `saldo_pendiente` | `total` − `total_pagado`, nunca negativo |
| `comentarios` | Bitácora, de la más reciente a la más antigua |
| `eventos` | Historial, del más reciente al más antiguo (ver nota abajo) |
| `es_efo`, `efo_situacion` | Si el RFC emisor está en la lista 69-B del SAT y su situación (ej. `Definitivo`, `Presunto`) |
| `adjuntos` | Documentos, del más reciente al más antiguo |

Notas importantes:

- **Eventos iniciales.** Mientras la factura no tenga eventos registrados, `eventos` trae 2 o 3
  hitos generados al vuelo (`Factura Importada`, `Conversión a PDF` y, si aplica,
  `Estatus: Cancelado`) **sin `id` ni `id_factura`** y firmados por `"Sistema"`. En cuanto se agrega
  el primer comentario o adjunto, esos hitos dejan de aparecer y solo se ven los eventos reales.
  Es comportamiento esperado: muéstralos tal cual y no los guardes como datos propios.
- `evento` es texto libre del servidor. Hoy existen `Comentario Agregado`, `Documento Adjuntado`,
  `Documento Eliminado` y los tres iniciales; un valor desconocido se muestra tal cual.
- Todos los `created_at`/`updated_at` de comentarios, eventos y adjuntos son **UTC** sin indicador
  de zona: interprétalos como UTC y conviértelos a la hora local solo para mostrar.
- `ruta_archivo` es interna de CoreCFDI. No la muestres ni la uses: para obtener el archivo usa
  `descargarAdjunto(id)`.
- El saldo de la Bóveda puede diferir del de Cuentas por pagar/cobrar (Tesorería), porque aquí el
  monto sale del XML del REP y allá de la relación registrada. Para saldos de cartera, la fuente
  es Tesorería; en la Bóveda muéstralo como referencia del expediente.
- Un REP aparece hasta que CoreCFDI lo descarga del SAT.

## 2. Agregar comentario

`POST {CORECFDI_BASE_URL}/facturas/{id}/boveda/comentario` con `Content-Type: application/json`

```json
{ "comentario": "Validada por contabilidad" }
```

- `comentario`: obligatorio, texto, máximo **1000** caracteres. Valida longitud y vacío (tras
  `trim`) antes de enviar.
- **No es idempotente**: cada llamada crea un comentario nuevo. No reintentes automáticamente en
  5xx ni en timeout; muestra el error y deja que el usuario decida. Deshabilita el botón mientras
  la petición está en curso.

### Respuesta 201

```json
{
  "success": true,
  "message": "Comentario guardado correctamente en el expediente",
  "data": {
    "comentarios": [ { "id": 3, "id_factura": 40, "comentario": "Validada por contabilidad", "usuario_nombre": "Integración ERP", "created_at": "2026-09-02 17:20:00", "updated_at": "2026-09-02 17:20:00" } ],
    "eventos": [ { "id": 8, "id_factura": 40, "evento": "Comentario Agregado", "descripcion": "Se agregó una nota a la bitácora de la Bóveda Fiscal.", "usuario_nombre": "Integración ERP", "created_at": "2026-09-02 17:20:00" } ]
  }
}
```

`comentarios` y `eventos` son las listas **completas y actualizadas**: reemplaza las que tengas en
pantalla con ellas, no hace falta volver a pedir el expediente. Aquí `eventos` ya no incluye los
hitos iniciales.

## 3. Subir adjunto

`POST {CORECFDI_BASE_URL}/facturas/{id}/boveda/adjuntos` con `multipart/form-data`

| Campo | Descripción |
|---|---|
| `archivo` | Obligatorio. Archivo de hasta **10 MB**. El servidor no restringe el tipo |
| `tipo_documento` | Obligatorio, texto, máximo 100. Clasificación libre |

- Ofrece una lista fija con los mismos valores que usa CoreCFDI en su propia pantalla, para que
  los expedientes se vean igual en ambos sistemas: `Evidencia de Pago`, `Orden de Compra`,
  `Cotización`, `Contrato`, `Evidencia de Entrega`, `Estado de Cuenta`, `Carta Porte`,
  `Pedimento`, `Correo de Cliente`, `Fotografía`, `Otro Documento`.
- Valida tamaño (≤ 10 MB) antes de enviar. Recomendado limitar en este sistema a PDF, imágenes,
  XML y documentos de Office.
- Timeout de 120 s. **No es idempotente**: no reintentes automáticamente; ante timeout, vuelve a
  pedir el expediente y revisa si el archivo ya quedó (mismo `nombre_archivo` y `tipo_documento`
  recientes) antes de ofrecer reintentar.
- El nombre original se conserva en `nombre_archivo` aunque tenga acentos o espacios.

### Respuesta 201

```json
{
  "success": true,
  "message": "Archivo adjunto guardado con éxito",
  "data": {
    "adjunto":  { "id": 12, "id_factura": 40, "tipo_documento": "Orden de Compra", "nombre_archivo": "OC-5541.pdf", "ruta_archivo": "facturas/adjuntos/40/1756833912_OC-5541.pdf", "usuario_nombre": "Integración ERP", "created_at": "2026-09-02 17:25:12", "updated_at": "2026-09-02 17:25:12" },
    "adjuntos": [ { "id": 12, "...": "..." } ],
    "eventos":  [ { "id": 9, "evento": "Documento Adjuntado", "...": "..." } ]
  }
}
```

`adjunto` es el registro recién creado; `adjuntos` y `eventos` son las listas completas
actualizadas.

## 4. Eliminar adjunto

`DELETE {CORECFDI_BASE_URL}/facturas/boveda/adjuntos/{id_adjunto}`

- Borra el archivo y el registro **de forma definitiva**. Pide confirmación al usuario antes.
- Deja un evento `Documento Eliminado` en el historial de la factura.
- Respuesta 200: `data` con `adjuntos` y `eventos` actualizados de la factura dueña del adjunto.
- Un 404 al eliminar significa que ya no existe: trátalo como éxito, quítalo de la pantalla y
  vuelve a pedir el expediente.

## 5. Descargar adjunto

`GET {CORECFDI_BASE_URL}/facturas/boveda/adjuntos/{id_adjunto}/descargar[?inline=1]`

- Responde el **contenido binario** del archivo (no JSON) con `Content-Disposition: attachment`;
  con `inline=1`, `Content-Disposition: inline` para vista previa (PDF e imágenes en el navegador).
- Toma el nombre de `Content-Disposition` o, si falta, de `nombre_archivo`; el tipo de
  `Content-Type`.
- Pide la respuesta como binario/stream; no intentes parsearla como JSON salvo que el status sea
  de error.
- Requiere el Bearer token, así que **no** pongas la URL directa en un `<a href>` o `<iframe>`:
  descárgala desde el backend de este sistema (o con `fetch` + blob) y entrégala al usuario.
- 404 (JSON): el adjunto no existe o su archivo ya no está en el servidor.

## 6. Ciclo de vida del CFDI (se calcula en este sistema)

La Bóveda de CoreCFDI muestra una línea de tiempo "Ciclo de Vida del CFDI". **No hay endpoint para
ella**: CoreCFDI la arma en su pantalla con los datos de `GET /facturas/{id}/boveda`. Implementa
aquí una función pura `cicloDeVida(expediente, origen)` que reproduzca las mismas reglas, sin
llamadas extra a la API.

- `origen`: `recibida` o `emitida`, según el listado desde el que se abrió la Bóveda. Solo cambia
  los textos (proveedor/cliente); las reglas son las mismas.
- Devuelve una lista ordenada de hitos: `{ clave, titulo, descripcion, completado, tono }`, con
  `tono` en `ok` (verde), `pendiente` (ámbar), `alerta` (rojo) o `neutro` (gris).
- Los hitos se muestran en este orden y solo los que apliquen.

| # | Clave | Cuándo aparece | Título | Descripción | `completado` | `tono` |
|---|---|---|---|---|---|---|
| 1 | `emitida` | Siempre | Recibida: "Factura emitida por el proveedor". Emitida: "Factura emitida" | "Expedida el {fecha} a las {hora HH:MM}" | sí | `ok` |
| 2 | `importada` | Siempre | "Descargada e importada" | "Guardada en CoreCFDI el {created_at}"; si es `null`: "Registrada en CoreCFDI" | sí | `ok` |
| 3 | `validacion_sat` | Siempre | "Validación fiscal SAT" | "Estatus en el SAT: {STATUS en mayúsculas}" + "(última actualización: {updated_at})" si existe | sí | `ok` si `status = vigente`; si no, `alerta` |
| 4 | `pdf` | Siempre | Recibida: "PDF del proveedor". Emitida: "PDF de la factura" | Con PDF: "Representación impresa lista para descarga". Sin PDF: "Sin PDF en CoreCFDI" | `has_pdf` | `ok` si `has_pdf`; si no, `neutro` |
| 5a | `pagada_pue` | `tipo_comprobante = I` y `metodo_pago = PUE` | "Pagada (PUE)" | "Pago de contado al emitirse el {fecha}" | sí | `ok` |
| 5b | `pago_ppd` | `tipo_comprobante = I` y es a crédito (ver abajo) | Liquidada: "Liquidada (PPD)". Si no: "Pago parcial / pendiente" | Ver abajo | `total_pagado > 0` | Liquidada: `ok`; con abonos: `pendiente`; sin abonos: `neutro` |
| 6 | `cancelada` | `status = cancelado` | "Cancelada en el SAT" | "Comprobante cancelado; detectado el {updated_at}" | sí | `alerta` |

Reglas del hito de pago (5b):

- **Es a crédito** si `metodo_pago = PPD`, o si `metodo_pago` no es `PUE` (incluido `null`) y hay
  `pagos` o `saldo_pendiente > 0`.
- **Liquidada** si `saldo_pendiente <= 0`.
- Descripción liquidada: "Liquidada al 100% con {n} recibo(s) de pago". Si no: "Abonado:
  {total_pagado} | Pendiente: {saldo_pendiente}", con montos en la `moneda` de la factura.
- Debajo, la lista de `pagos`: folio (o "REP" si falta), monto, fecha y estatus. Los cancelados
  van tachados y en rojo; ya están excluidos de `total_pagado` y no se vuelven a restar.
- Los CFDI de tipo `E`, `P`, `N` o `T` no llevan hito de pago (ni 5a ni 5b).

Fechas en los hitos:

- `fecha` y `hora` (hito 1 y 5a) son hora de México: muéstralas tal cual, sin convertir zona.
- `created_at` y `updated_at` (hitos 2, 3 y 6) son **UTC** sin indicador de zona. Conviértelos a
  la hora local antes de mostrarlos. Ojo: la pantalla de CoreCFDI los muestra sin convertir, así
  que ahí se ven con 6 horas de diferencia; aquí hazlo bien.
- `updated_at` es la última vez que CoreCFDI actualizó el registro, no la fecha oficial de
  cancelación del SAT. En el hito 6 preséntalo como "detectado el", nunca como "cancelado el".

Sobre el PDF: `GET /facturas/{uuid}/pdf` del API **no genera** el PDF si falta; responde 404. Por
eso el hito 4 sin PDF dice "Sin PDF en CoreCFDI" y no "listo para generarse". Además, `has_pdf` y
`has_xml` solo revisan la ruta con el UUID tal cual, mientras que los endpoints de descarga también
prueban mayúsculas/minúsculas: puede venir `has_pdf = false` y aun así descargarse. Deja los
botones XML/PDF activos siempre y maneja el 404 con "Archivo no disponible".

## 7. Semáforo fiscal del expediente (se calcula en este sistema)

Arriba del ciclo de vida, la Bóveda de CoreCFDI muestra un "Semáforo Fiscal" que califica el
expediente en rojo, amarillo o verde. Igual que el ciclo de vida, **no hay endpoint**: se calcula
con los datos de `GET /facturas/{id}/boveda`. Implementa una función pura
`semaforoFiscal(expediente, origen)` que devuelva `{ estado, titulo, detalles[] }`, con `estado`
en `riesgo`, `incompleto` o `completo`.

Se evalúa **en este orden y se detiene en el primer nivel que aplique**: si está en rojo, no se
revisa el amarillo.

### 🔴 `riesgo` — "Expediente con riesgo"

Aplica si se cumple **cualquiera** de estas; `detalles` lleva una línea por cada una que se cumpla:

| Condición | Detalle (recibida) | Detalle (emitida) |
|---|---|---|
| `status = cancelado` (sin distinguir mayúsculas) | "El comprobante del proveedor está cancelado ante el SAT." | "El comprobante está cancelado ante el SAT." |
| `es_efo = true` | "El proveedor está en la lista de EFOS del SAT ({efo_situacion})." | "El emisor está en la lista de EFOS del SAT ({efo_situacion})." |

Si `efo_situacion` viene vacío, usa "Presunto/Definitivo".

### 🟡 `incompleto` — "Expediente incompleto"

Solo si no hubo rojo. Aplica si se cumple **cualquiera**; una línea por cada una:

| Condición | Detalle |
|---|---|
| Falta REP: `metodo_pago = PPD` y `saldo_pendiente > 0` | Recibida: "Falta el complemento de pago del proveedor (saldo insoluto: {saldo_pendiente})." Emitida: "Falta el complemento de pago (saldo insoluto: {saldo_pendiente})." |
| Sin soporte: `adjuntos` vacío | "No hay documentos soporte adjuntos (orden de compra, cotización, etc.)." |

El saldo va formateado en la `moneda` de la factura.

### 🟢 `completo` — "Expediente completo"

Si no aplicó ninguno de los anteriores. `detalles` lista lo que sí se verificó:

- "Estatus vigente ante el SAT."
- "Emisor libre de la lista de EFOS."
- Si `metodo_pago = PPD`: "Complementos de pago cubiertos al 100%." Si es `PUE`: "Pago de contado
  (PUE) al emitirse." Si es otro o `null`: no agregues línea de pago.
- "Documentación soporte adjunta ({n} documento(s))."
- Solo si `has_xml` y `has_pdf` son `true`: "XML y PDF disponibles en CoreCFDI."

Diferencias a propósito con la pantalla de CoreCFDI (no las copies):

- CoreCFDI siempre pone "XML original y PDF disponibles" en verde, sin revisar `has_xml`/`has_pdf`.
  Aquí solo se afirma si ambos son `true`. El semáforo **no** baja a amarillo por falta de XML o
  PDF, porque esos indicadores pueden fallar (ver sección 6).
- CoreCFDI pone "Comprobante de contado (PUE)" cuando no es PPD, aunque `metodo_pago` sea `null` o
  el CFDI no sea de ingreso. Aquí esa línea solo aparece si es `PUE`.

Reglas que sí deben coincidir con CoreCFDI:

- La regla del REP usa **solo** `metodo_pago = PPD`. Es más estricta que la de "es a crédito" del
  ciclo de vida (sección 6): una factura con `metodo_pago = null` puede mostrar el hito de pago
  pendiente y aun así no poner el semáforo en amarillo por REP. Es correcto; no las unifiques.
- La regla del REP no revisa `tipo_comprobante`.
- Cualquier expediente sin adjuntos queda en amarillo, también los PUE ya pagados. Es intencional:
  el semáforo mide la materialidad del expediente, no solo el pago.

Presentación: un recuadro arriba del ciclo de vida con el color del estado, el título y la lista
de `detalles` (ícono de alerta en rojo, de información en amarillo, de palomita en verde). El
semáforo es una guía interna y no un dictamen fiscal; muestra junto al recuadro: "Calificación
automática con la información disponible en CoreCFDI." Recalcúlalo después de cada comentario,
adjunto o eliminación usando las listas de la respuesta: subir el primer adjunto puede pasar el
expediente de amarillo a verde sin volver a pedirlo.

## Errores

- 401: token inválido o expirado → renovar y reintentar UNA vez (en multipart, volver a adjuntar
  el archivo).
- 403: falta permiso (`crear facturacion` para comentar/subir, `eliminar facturacion` para borrar)
  o empresa suspendida. No reintentar; mostrar el `message`. Oculta los botones de escritura si la
  integración no tiene esos permisos.
- 404: `"No se encontró la factura con ID #40."`, `"Adjunto no encontrado"` o
  `"Archivo no encontrado"`; o tenant no encontrado (revisar `CORECFDI_TENANT`).
- 422 (comentario o adjunto): `{ "message": "...", "errors": { "comentario": ["..."] } }` — sin
  `success`. Mostrar `errors` por campo.
- 429: 60 peticiones/min para toda la integración. Respetar `Retry-After`.
- 5xx o red: en `GET` (expediente y descarga) reintentar máximo 2 veces con backoff; en `POST` y
  `DELETE`, ningún reintento automático.

## Qué debe hacer la implementación

1. Las cinco funciones del servicio, pasando todas por el cliente HTTP compartido. Timeouts:
   30 s para expediente, comentario y eliminar; 120 s para subir y descargar.
2. Un modelo normalizado del expediente: `factura`, `pagos`, `totalPagado`, `saldoPendiente`,
   `comentarios`, `eventos`, `adjuntos`, `esEfo`, `efoSituacion`, `tieneXml`, `tienePdf`. Fechas
   `*_at` como UTC; `fecha`/`hora` de la factura como hora local de México sin conversión.
3. Desde los listados de facturas de este sistema, una acción "Bóveda Fiscal" por fila que abre
   el expediente (panel lateral o página) con:
   - Encabezado: emisor, receptor, folio, UUID, fecha, total, moneda, estatus.
   - Alerta roja si `es_efo` con la `efo_situacion`.
   - Resumen de pagos: total, pagado, saldo y tabla de `pagos` (marcar cancelados y no sumarlos).
   - Semáforo fiscal con `semaforoFiscal()` (sección 7), arriba del ciclo de vida.
   - Ciclo de vida del CFDI como línea de tiempo vertical, con `cicloDeVida()` (sección 6):
     hitos completados con su color e ícono; pendientes en gris.
   - Botones XML/PDF siempre activos; un 404 muestra "Archivo no disponible".
   - Bitácora con caja de texto (contador de 1000 caracteres) y lista de comentarios.
   - Adjuntos: subir (selector de tipo + archivo), lista con tipo, nombre, quién y cuándo, y
     acciones ver (`inline=1`), descargar y eliminar (con confirmación).
   - Historial de eventos como línea de tiempo.
4. Tras comentar, subir o eliminar, reemplazar las listas en pantalla con las que devuelve la
   respuesta y recalcular el semáforo; no pedir de nuevo el expediente.
5. Cache del expediente máximo 1 minuto por `id`, invalidada en cualquier escritura sobre esa
   factura y con botón "Actualizar".
6. Montos formateados con `moneda`. Nombres de archivo y comentarios escapados al mostrarlos.
7. Log por petición: endpoint, status y duración. Nunca tokens, texto de comentarios ni contenido
   de archivos.

## Pruebas requeridas

Con respuestas simuladas de la API (las de este prompt):

- Expediente completo → encabezado, pagos, saldo, comentarios, eventos y adjuntos se muestran.
- Expediente sin pagos, comentarios ni adjuntos, con eventos iniciales sin `id` → se muestra sin
  errores.
- Pago con `status = "cancelado"` y `fecha_cancelacion` → se marca y no suma en la pantalla.
- `es_efo = true` → se muestra la alerta con `efo_situacion`.
- `has_pdf = false` → hito "PDF" en gris; el botón PDF sigue activo y un 404 muestra "Archivo no
  disponible".
- Ciclo de vida, con `cicloDeVida()` probado como función pura (sin API):
  - Ingreso PUE vigente con PDF → hitos 1, 2, 3, 4 y "Pagada (PUE)", todos completados.
  - Ingreso PPD sin pagos → "Pago parcial / pendiente" no completado, tono `neutro`.
  - Ingreso PPD con un abono → `completado = true`, tono `pendiente`, texto con abonado y pendiente.
  - Ingreso PPD con `saldo_pendiente = 0` → "Liquidada (PPD)", tono `ok`, con el número de recibos.
  - `metodo_pago = null`, tipo `I`, con saldo → se trata como crédito (hito 5b).
  - Pago cancelado en `pagos` → aparece tachado y no cambia `total_pagado`.
  - `tipo_comprobante = P` o `E` → sin hito de pago.
  - `status = cancelado` → hito 3 en `alerta` y hito 6 "Cancelada en el SAT" al final.
  - `created_at = "2026-08-16 02:10:33"` → se muestra como 15/08/2026 20:10 en CDMX.
  - `origen = emitida` → títulos sin la palabra "proveedor".
- Semáforo fiscal, con `semaforoFiscal()` probado como función pura (sin API):
  - Cancelada → `riesgo` con 1 detalle.
  - Cancelada y `es_efo = true` → `riesgo` con 2 detalles, incluida la `efo_situacion`.
  - `es_efo = true` con `efo_situacion = null` → el detalle dice "Presunto/Definitivo".
  - Cancelada, PPD con saldo y sin adjuntos → `riesgo`, sin detalles de amarillo.
  - PPD con saldo y sin adjuntos → `incompleto` con 2 detalles, saldo con la `moneda`.
  - PUE vigente sin adjuntos → `incompleto` solo por falta de soporte.
  - `metodo_pago = null` con saldo y con adjuntos → `completo` y sin línea de pago.
  - PPD liquidada, con adjuntos, `has_xml` y `has_pdf` → `completo` con la línea de XML y PDF.
  - `completo` con `has_pdf = false` → sigue verde, sin la línea de XML y PDF.
  - Subir el primer adjunto a un PUE vigente → el semáforo pasa de amarillo a verde sin pedir el
    expediente.
- `folio`, `emisor_rfc` o `metodo_pago` en `null` → se muestran vacíos sin romper.
- `created_at` `"2026-09-02 17:20:00"` → se interpreta como UTC (se muestra 11:20 en CDMX).
- `id` no numérico → no se llama a la API.
- Comentario vacío o de 1001 caracteres → no se envía. Comentario válido → 201 y la bitácora y el
  historial se reemplazan con la respuesta.
- Comentario con 5xx o timeout → error mostrado y **sin** reintento automático.
- Archivo de 11 MB → no se envía. Archivo válido → 201 y la lista de adjuntos se actualiza.
- 422 al subir → errores por campo visibles.
- Eliminar → pide confirmación; 200 actualiza listas; 404 se trata como ya eliminado.
- Descargar → el binario se guarda con `nombre_archivo`; `inline=1` abre la vista previa; 404
  muestra "archivo no encontrado".
- La URL de descarga nunca se expone sin token al navegador.
- 403 al comentar → se muestra el `message` y no se reintenta.
- Token expirado al subir → se renueva y el archivo se vuelve a adjuntar en el reintento.
- `evento` desconocido → se muestra tal cual.
