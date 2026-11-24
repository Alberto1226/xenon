# Listado de facturas emitidas (ingresos / clientes) contra CoreCFDI API v1

Implementa en este sistema la consulta de los CFDI que la empresa emitió a sus clientes (ingresos,
notas de crédito, complementos de pago, etc.) y que CoreCFDI descargó del SAT. Hazlo como una
función/servicio reutilizable (ej. `CoreCfdiFacturas.listarEmitidas(filtros, page)`).

CoreCFDI no emite ni timbra: estos son los comprobantes que la empresa timbró con su propio PAC y
que CoreCFDI obtuvo de la descarga masiva del SAT. Este endpoint solo los consulta.

Requisito previo: el servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`),
que devuelve un access token vigente y renueva el token cuando hace falta.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Mostrar el historial de facturas emitidas a clientes con búsqueda, filtros y paginación.
- Obtener totales del periodo (subtotal, IVA, total, cobrado, por cobrar, vigentes y canceladas)
  sin descargar todas las páginas.
- Detectar clientes en la lista negra del SAT (EFOS, Art. 69-B) y verificar cada CFDI en el portal del SAT.

## Petición

`GET {CORECFDI_BASE_URL}/facturas?fecha_inicio=2026-01-01&fecha_fin=2026-01-31&page=1`

Headers:

- `Accept: application/json` ← obligatorio (sin él, los errores 401/422 no llegan como JSON)
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}` ← obligatorio

Parámetros de query (todos opcionales):

| Parámetro | Descripción |
|---|---|
| `buscar` | Texto (máx. 100): busca en folio, UUID, nombre del **receptor (cliente)** o RFC del receptor |
| `fecha_inicio` | `YYYY-MM-DD`, inclusive |
| `fecha_fin` | `YYYY-MM-DD`, inclusive. No puede ser anterior a `fecha_inicio` |
| `status` | `vigente` o `cancelado` |
| `tipo_cfdi` | ID numérico interno del tipo de comprobante |
| `per_page` | Registros por página: 1 a 100 (default 15) |
| `page` | Número de página (default 1) |

- Solo devuelve facturas donde la empresa del tenant es el **emisor**.
- A diferencia de recibidas, **no hay `categoria`**: el listado incluye todos los tipos de
  comprobante (`I`, `E`, `P`, `N`, `T`). Si se envía `categoria`, se ignora.
- Orden: de la más reciente a la más antigua (`fecha` y `hora` descendente).
- Los complementos de pago (tipo `P`) cuya factura original ya está en CoreCFDI no salen como fila
  propia: aparecen dentro de `facturas_referencia_destino` de esa factura. Los que no tienen su
  factura original importada sí salen como fila.
- `tipo_cfdi` es un ID interno que puede variar entre empresas y no hay endpoint para consultarlo.
  Para filtrar por tipo (I, E, P, N…) filtrar del lado del cliente por `tipo_cfdi.tipo_cfdi`.

## Respuesta 200

`data` es un paginador de Laravel con una clave extra: `totales`.

```json
{
  "success": true,
  "message": "Listado de facturas obtenido con éxito",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id_factura": 41,
        "fecha": "2026-09-15",
        "hora": "10:24:11",
        "foliofactura": "A-1024",
        "uuid": "3B1F2C9A-5D7E-4A10-9C2B-8E6F0D4A7B21",
        "subtotal_gravado": 25000.00,
        "subtotal_cero": 0,
        "subtotal_exento": 0,
        "descuento": 0,
        "importe": 29000.00,
        "saldo": 14500.00,
        "fechalimite": "2026-10-15",
        "status": "vigente",
        "id_persona": 1,
        "id_cliente": 12,
        "id_tipo_cfdi": 2,
        "efos_emisor": null,
        "efos_receptor": null,
        "sat_url": "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=3B1F2C9A-...&re=QUHJ711021UR1&rr=CAC090514LX1&tt=0000029000.000000&fe=Xk9a1Q==",
        "has_pdf": true,
        "moneda_factura": { "id_moneda": 2, "codigo": "MXN", "descripcion": "Peso Mexicano", "decimales": 2 },
        "persona_emisor": {
          "id_persona": 1,
          "nombre": "MI EMPRESA SA DE CV",
          "persona_cliente": null,
          "configuracion_persona": { "id_persona": 1, "rfc": "QUHJ711021UR1", "nombre_comercial": "MI EMPRESA" }
        },
        "persona_cliente": {
          "id_persona": 12,
          "nombre": "COMERCIALIZADORA ACME SA DE CV",
          "correo": "pagos@acme.example",
          "persona_cliente": { "rfc": "CAC090514LX1", "tipo": "cliente" },
          "configuracion_persona": null
        },
        "tipo_cfdi": { "id_tipo_cfdi": 2, "tipo_cfdi": "I", "documento": "Ingreso" },
        "metodo_pago": { "clave": "03", "descripcion": "Forma de pago 03" },
        "forma_pago": { "clave": "PPD", "descripcion": "Método de pago PPD" },
        "facturas_referencia_destino": [
          {
            "monto": 14500.00,
            "parcialidad": 1,
            "saldo_ant": 29000.00,
            "nuevo_saldo": 14500.00,
            "fecha": "2026-09-30",
            "factura_origen": {
              "uuid": "9D0E4B12-...",
              "foliofactura": "P-210",
              "fecha": "2026-09-30",
              "importe": 0,
              "status": "vigente",
              "sat_url": "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=9D0E4B12-...",
              "has_pdf": false
            }
          }
        ]
      }
    ],
    "first_page_url": "...?page=1",
    "from": 1,
    "last_page": 3,
    "last_page_url": "...?page=3",
    "links": [],
    "next_page_url": "...?page=2",
    "path": "...",
    "per_page": 15,
    "prev_page_url": null,
    "to": 15,
    "total": 38,
    "totales": {
      "total_registros": 38,
      "suma_subtotal": 412500.00,
      "suma_total": 478500.00,
      "suma_iva": 66000.00,
      "suma_cobrado": 401200.00,
      "suma_por_cobrar": 77300.00,
      "vigentes_count": 36,
      "canceladas_count": 2
    }
  }
}
```

(Ejemplo ilustrativo y recortado: las personas traen además campos de domicilio que pueden venir
en `null`.)

### Campos de cada factura

| Campo | Descripción |
|---|---|
| `id_factura` | ID interno de CoreCFDI. Es el `id` que piden la Bóveda Fiscal y la verificación QR |
| `uuid` | Folio fiscal (UUID) del CFDI |
| `foliofactura` | Serie/folio de la empresa; puede venir vacío |
| `fecha`, `hora` | Fecha y hora de emisión del CFDI, en hora de México, sin zona horaria. Mostrar tal cual |
| `importe` | **Total** del comprobante |
| `subtotal_gravado`, `subtotal_cero`, `subtotal_exento` | Subtotales por tasa de IVA (16 %, 0 %, exento) |
| `descuento` | Descuento |
| `saldo` | Saldo pendiente de cobro (facturas PPD) |
| `fechalimite` | Fecha límite de pago, si se capturó; puede ser `null` |
| `status` | `vigente` o `cancelado`. Tratar cualquier otro valor como desconocido y mostrarlo tal cual |
| `moneda_factura.codigo` | Moneda (`MXN`, `USD`…) |
| `tipo_cfdi.tipo_cfdi` | `I` ingreso, `E` egreso (nota de crédito), `P` pago, `N` nómina, `T` traslado |
| `persona_emisor` | Emisor (la propia empresa) |
| `persona_cliente` | **Cliente** (receptor). Nombre en `nombre` |
| `efos_receptor` | `null` si el RFC del cliente no está en la lista 69-B del SAT; si trae un objeto, el cliente está listado |
| `efos_emisor` | Lo mismo para el RFC de la propia empresa |
| `sat_url` | Liga al verificador de CFDI del SAT; `null` si faltan datos para armarla |
| `has_pdf` | Si CoreCFDI ya tiene el PDF generado |
| `facturas_referencia_destino` | Pagos (REP) aplicados a esta factura (ver abajo) |

**Los roles están al revés que en recibidas:** aquí el cliente es `persona_cliente` y la empresa
es `persona_emisor`. Si se reutiliza código de recibidas, no tomar el nombre de `persona_emisor`.

**RFC de una persona:** tomar `persona_cliente.rfc` (dentro de la persona) y, si es `null`,
`configuracion_persona.rfc`. Ej. RFC del cliente:
`persona_cliente.persona_cliente?.rfc ?? persona_cliente.configuracion_persona?.rfc`.
Ojo: `persona_cliente` es a la vez el nombre de la relación del receptor y de un campo dentro de
cada persona; no confundirlos.

**Forma y método de pago vienen invertidos:** la clave `metodo_pago` contiene la **forma** de pago
del SAT (`01` efectivo, `03` transferencia…) y la clave `forma_pago` contiene el **método** de pago
(`PUE` / `PPD`). Mapearlos así en el modelo del cliente.

**Pagos (REP) de una factura:** cada elemento de `facturas_referencia_destino` trae `monto`,
`parcialidad`, `saldo_ant`, `nuevo_saldo`, `fecha` y `factura_origen` (el CFDI de pago, con `uuid`,
`fecha`, `importe`, `status`, `sat_url` y `has_pdf`). Mostrarlos como detalle expandible de la factura.

### Totales

- Se calculan sobre **todos** los registros del filtro activo, no solo la página actual.
- Si no se envía `status`, las sumas (`suma_subtotal`, `suma_total`, `suma_iva`, `suma_cobrado`,
  `suma_por_cobrar`) solo cuentan facturas vigentes; `total_registros` cuenta todas.
- `suma_subtotal` es la suma de `subtotal_gravado`. `suma_iva` = `suma_total` − `suma_subtotal`
  (aproximado: incluye otros impuestos y efectos de descuentos). Redondear a 2 decimales al mostrar.
- `suma_por_cobrar` es la suma de `saldo`; `suma_cobrado` = `suma_total` − `suma_por_cobrar`.
  Las facturas PUE suelen tener `saldo = 0`, así que cuentan como cobradas.
- Las sumas mezclan tipos de comprobante (ingresos, notas de crédito, REP) y monedas tal como están
  en el filtro. Para un total de ventas limpio, filtrar por tipo y moneda.
- No hay `conteo_categorias` ni `categoria` en esta respuesta.

## Errores

- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: empresa suspendida o inactiva, o usuario sin permiso `ver facturacion` → no reintentar, alertar.
- 404: tenant no encontrado → revisar `CORECFDI_TENANT`, no reintentar.
- 422: parámetros inválidos. Formato `{ "message": "...", "errors": { "per_page": ["..."] } }`
  (no trae `success`). Mostrar el mensaje; no reintentar sin corregir.
- 429: demasiadas peticiones (60/min). Respetar `Retry-After`.
- 5xx o error de red → error claro; reintentar máximo 2 veces con backoff (es una consulta, es seguro reintentar).

## Qué debe hacer la implementación

1. `listarEmitidas(filtros, page = 1)`: validar los filtros antes de enviar (fechas `YYYY-MM-DD`,
   `fecha_fin >= fecha_inicio`, `per_page` ≤ 100), obtener el token, llamar al endpoint y devolver
   `{ items, page, lastPage, total, totales }`. No enviar parámetros vacíos.
2. `listarTodasEmitidas(filtros)`: recorrer páginas con `per_page=100` mientras `next_page_url` no
   sea `null` (poner un límite, ej. 50 páginas). Usarlo solo para exportaciones, no para pintar la pantalla.
3. Normalizar cada factura a un modelo propio: uuid, folio, fecha+hora, cliente (nombre y RFC),
   tipo, moneda, subtotal, descuento, total, saldo, fecha límite, forma de pago, método de pago
   (con el mapeo invertido), estado, `esEfo` (`efos_receptor != null`), `satUrl`, `pagos`.
   Si ya existe el modelo de recibidas, reutilizarlo con un campo `contraparte` en lugar de duplicarlo.
4. En pantalla: tabla con fecha, folio, UUID, cliente, RFC, tipo, total, saldo, estado y acciones;
   tarjetas con los totales (incluyendo cobrado y por cobrar); alerta visible cuando el cliente sea
   EFO; botón "Verificar en SAT" que abra `sat_url` (ocultarlo si es `null`); paginación.
   Si ya está implementado `verificacionQr(id)` (`PROMPT_INTEGRACION_VERIFICACION_QR_API.md`),
   agregar también "Ver QR" en las acciones.
5. Filtro por tipo de comprobante en el cliente (sobre `tipo_cfdi.tipo_cfdi`), ya que no hay `categoria`.
6. Aplicar la búsqueda con debounce (≥ 400 ms) para no pasar el límite de 60 peticiones por minuto.
7. Montos: usar el `codigo` de moneda para formatear; no sumar en el cliente importes de monedas distintas.
8. Timeout de 30 s. Registrar en log endpoint, status y duración, sin tokens.

## Pruebas requeridas

- Sin filtros → datos de paginación y totales correctos, incluyendo `suma_cobrado` y `suma_por_cobrar`.
- Búsqueda por RFC y por nombre del **cliente** → encuentra las facturas; buscar por el RFC de la
  propia empresa no filtra nada útil.
- Rango de un solo día (`fecha_inicio = fecha_fin`) → incluye las facturas de ese día.
- `fecha_fin` anterior a `fecha_inicio` y `per_page=500` → se bloquean en el cliente (o 422 manejado).
- Sin resultados → lista vacía sin errores (`data.data = []`, `total = 0`, totales en 0).
- El nombre mostrado es el del cliente (`persona_cliente`), no el de la empresa.
- Forma de pago y método de pago se muestran correctamente (mapeo invertido).
- Factura PPD con saldo → se ve el saldo; con REP en `facturas_referencia_destino` → se ven en el detalle.
- Cliente con `efos_receptor` → se muestra la alerta.
- `sat_url = null` → no se muestra el botón de verificación.
- `status` desconocido → se muestra tal cual sin romper.
- `fecha`/`hora` se muestran sin conversión de zona horaria.
- Token expirado → se renueva y la consulta funciona.
