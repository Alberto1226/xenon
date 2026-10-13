# Listado de facturas recibidas (gastos / proveedores) contra CoreCFDI API v1

Implementa en este sistema la consulta de los CFDI que la empresa ha recibido de sus proveedores
(compras, gastos y, opcionalmente, recibos de nómina) registrados en CoreCFDI. Hazlo como una
función/servicio reutilizable (ej. `CoreCfdiFacturas.listarRecibidas(filtros, page)`).

Requisito previo: el servicio de autenticación ya implementado (`CoreCfdiAuth.getAccessToken()`),
que devuelve un access token vigente y renueva el token cuando hace falta.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Mostrar el historial de facturas de proveedores con búsqueda, filtros y paginación.
- Obtener totales del periodo (subtotal, IVA, total, vigentes y canceladas) sin descargar todas las páginas.
- Detectar proveedores en la lista negra del SAT (EFOS, Art. 69-B) y verificar cada CFDI en el portal del SAT.

## Petición

`GET {CORECFDI_BASE_URL}/facturas/recibidas?categoria=gastos&fecha_inicio=2026-01-01&fecha_fin=2026-01-31&page=1`

Headers:

- `Accept: application/json` ← obligatorio (sin él, los errores 401/422 no llegan como JSON)
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}` ← obligatorio

Parámetros de query (todos opcionales):

| Parámetro | Descripción |
|---|---|
| `categoria` | `gastos` (default): todo excepto nómina · `nomina`: solo recibos de nómina · `todos` |
| `buscar` | Texto (máx. 100): busca en folio, UUID, nombre del emisor o RFC del emisor |
| `fecha_inicio` | `YYYY-MM-DD`, inclusive |
| `fecha_fin` | `YYYY-MM-DD`, inclusive. No puede ser anterior a `fecha_inicio` |
| `status` | `vigente` o `cancelado` |
| `tipo_cfdi` | ID numérico interno del tipo de comprobante. Si se envía, `categoria` se ignora |
| `per_page` | Registros por página: 1 a 100 (default 15) |
| `page` | Número de página (default 1) |

- Solo devuelve facturas donde la empresa del tenant es el **receptor**.
- Orden: de la más reciente a la más antigua (`fecha` y `hora` descendente).
- Los complementos de pago (tipo `P`) cuya factura original ya está en CoreCFDI no salen como fila
  propia: aparecen dentro de `facturas_referencia_destino` de esa factura. Los que no tienen su
  factura original importada sí salen como fila.
- `tipo_cfdi` es un ID interno que puede variar entre empresas y no hay endpoint para consultarlo.
  Para filtrar por tipo (I, E, P, N…) usar `categoria` y, si hace falta más detalle, filtrar del lado
  del cliente por `tipo_cfdi.tipo_cfdi`.

## Respuesta 200

`data` es un paginador de Laravel con tres claves extra: `categoria`, `totales` y `conteo_categorias`.

```json
{
  "success": true,
  "message": "Facturas recibidas devueltas con éxito",
  "data": {
    "current_page": 1,
    "data": [
      {
        "id_factura": 25,
        "fecha": "2026-08-31",
        "hora": "23:59:58",
        "foliofactura": "0208107174",
        "uuid": "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
        "subtotal_gravado": 1000.00,
        "subtotal_cero": 0,
        "subtotal_exento": 0,
        "descuento": 0,
        "importe": 1160.00,
        "saldo": 0,
        "fechalimite": null,
        "status": "vigente",
        "id_persona": 9,
        "id_cliente": 1,
        "id_tipo_cfdi": 2,
        "efos_emisor": null,
        "efos_receptor": null,
        "sat_url": "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=EF34CE53-...&re=BMN930209927&rr=QUHJ711021UR1&tt=0000001160.000000&fe=pEwi2g==",
        "has_pdf": false,
        "moneda_factura": { "id_moneda": 2, "codigo": "MXN", "descripcion": "Peso Mexicano", "decimales": 2 },
        "persona_emisor": {
          "id_persona": 9,
          "nombre": "BANCO MERCANTIL DEL NORTE SA ...",
          "correo": "correo@temp.com",
          "persona_cliente": { "rfc": "BMN930209927", "tipo": "proveedor" },
          "configuracion_persona": null
        },
        "persona_cliente": {
          "id_persona": 1,
          "nombre": "MI EMPRESA SA DE CV",
          "persona_cliente": null,
          "configuracion_persona": { "id_persona": 1, "rfc": "QUHJ711021UR1", "nombre_comercial": "MI EMPRESA" }
        },
        "tipo_cfdi": { "id_tipo_cfdi": 2, "tipo_cfdi": "I", "documento": "Ingreso" },
        "metodo_pago": { "clave": "03", "descripcion": "Forma de pago 03" },
        "forma_pago": { "clave": "PUE", "descripcion": "Método de pago PUE" },
        "facturas_referencia_destino": []
      }
    ],
    "first_page_url": "...?page=1",
    "from": 1,
    "last_page": 2,
    "last_page_url": "...?page=2",
    "links": [],
    "next_page_url": "...?page=2",
    "path": "...",
    "per_page": 15,
    "prev_page_url": null,
    "to": 15,
    "total": 25,
    "categoria": "gastos",
    "totales": {
      "total_registros": 25,
      "suma_subtotal": 150844.12,
      "suma_total": 173430.45,
      "suma_iva": 22586.330000000016,
      "vigentes_count": 25,
      "canceladas_count": 0
    },
    "conteo_categorias": { "gastos": 25, "nomina": 0, "todos": 25 }
  }
}
```

(Ejemplo recortado: las personas traen además campos de domicilio que pueden venir en `null`.)

### Campos de cada factura

| Campo | Descripción |
|---|---|
| `id_factura` | ID interno de CoreCFDI |
| `uuid` | Folio fiscal (UUID) del CFDI |
| `foliofactura` | Serie/folio del emisor; puede venir vacío |
| `fecha`, `hora` | Fecha y hora de emisión del CFDI, en hora de México, sin zona horaria. Mostrar tal cual |
| `importe` | **Total** del comprobante |
| `subtotal_gravado`, `subtotal_cero`, `subtotal_exento` | Subtotales por tasa de IVA (16 %, 0 %, exento) |
| `descuento` | Descuento |
| `saldo` | Saldo pendiente de pago (facturas PPD) |
| `status` | `vigente` o `cancelado`. Tratar cualquier otro valor como desconocido y mostrarlo tal cual |
| `moneda_factura.codigo` | Moneda (`MXN`, `USD`…) |
| `tipo_cfdi.tipo_cfdi` | `I` ingreso, `E` egreso (nota de crédito), `P` pago, `N` nómina, `T` traslado |
| `persona_emisor` | **Proveedor**. Nombre en `nombre` |
| `persona_cliente` | Receptor (la propia empresa) |
| `efos_emisor`, `efos_receptor` | `null` si el RFC no está en la lista 69-B del SAT; si trae un objeto, el RFC está listado |
| `sat_url` | Liga al verificador de CFDI del SAT; `null` si faltan datos para armarla |
| `has_pdf` | Si CoreCFDI ya tiene el PDF generado |
| `facturas_referencia_destino` | Pagos (REP) aplicados a esta factura (ver abajo) |

**RFC de una persona:** tomar `persona_cliente.rfc` (dentro de la persona) y, si es `null`,
`configuracion_persona.rfc`. Ej. RFC del proveedor:
`persona_emisor.persona_cliente?.rfc ?? persona_emisor.configuracion_persona?.rfc`.
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
- Si no se envía `status`, las sumas (`suma_subtotal`, `suma_total`, `suma_iva`) solo cuentan
  facturas vigentes; `total_registros` cuenta todas.
- `suma_subtotal` es la suma de `subtotal_gravado`. `suma_iva` = `suma_total` − `suma_subtotal`
  (aproximado: incluye otros impuestos y efectos de descuentos). Redondear a 2 decimales al mostrar.
- `conteo_categorias` da cuántas facturas hay en cada categoría con los demás filtros aplicados;
  usarlo para los contadores de pestañas (Gastos / Nómina / Todos).

## Errores

- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: empresa suspendida o inactiva → no reintentar, alertar.
- 404: tenant no encontrado → revisar `CORECFDI_TENANT`, no reintentar.
- 422: parámetros inválidos. Formato `{ "message": "...", "errors": { "per_page": ["..."] } }`
  (no trae `success`). Mostrar el mensaje; no reintentar sin corregir.
- 429: demasiadas peticiones (60/min). Respetar `Retry-After`.
- 5xx o error de red → error claro; reintentar máximo 2 veces con backoff (es una consulta, es seguro reintentar).

## Qué debe hacer la implementación

1. `listarRecibidas(filtros, page = 1)`: validar los filtros antes de enviar (fechas `YYYY-MM-DD`,
   `fecha_fin >= fecha_inicio`, `per_page` ≤ 100), obtener el token, llamar al endpoint y devolver
   `{ items, page, lastPage, total, totales, conteoCategorias }`. No enviar parámetros vacíos.
2. `listarTodas(filtros)`: recorrer páginas con `per_page=100` mientras `next_page_url` no sea `null`
   (poner un límite, ej. 50 páginas). Usarlo solo para exportaciones, no para pintar la pantalla.
3. Normalizar cada factura a un modelo propio: uuid, folio, fecha+hora, proveedor (nombre y RFC),
   tipo, moneda, subtotal, descuento, total, saldo, forma de pago, método de pago (con el mapeo
   invertido), estado, `esEfo` (`efos_emisor != null`), `satUrl`, `pagos`.
4. En pantalla: tabla con fecha, folio, UUID, proveedor, RFC, tipo, total, estado y acciones;
   pestañas Gastos / Nómina / Todos con los contadores de `conteo_categorias`; tarjetas con los
   totales; alerta visible cuando el proveedor sea EFO; botón "Verificar en SAT" que abra `sat_url`
   (ocultarlo si es `null`); paginación.
5. Aplicar la búsqueda con debounce (≥ 400 ms) para no pasar el límite de 60 peticiones por minuto.
6. Montos: usar el `codigo` de moneda para formatear; no sumar en el cliente importes de monedas distintas.
7. Timeout de 30 s. Registrar en log endpoint, status y duración, sin tokens.

## Pruebas requeridas

- Sin filtros → categoría `gastos`, datos de paginación y totales correctos.
- `categoria=nomina` y `categoria=todos` → cambian la lista; `conteo_categorias` coincide con las pestañas.
- Búsqueda por RFC y por nombre del proveedor → encuentra las facturas.
- Rango de un solo día (`fecha_inicio = fecha_fin`) → incluye las facturas de ese día.
- `fecha_fin` anterior a `fecha_inicio` y `per_page=500` → se bloquean en el cliente (o 422 manejado).
- Sin resultados → lista vacía sin errores (`data.data = []`, `total = 0`, totales en 0).
- Forma de pago y método de pago se muestran correctamente (mapeo invertido).
- Proveedor con `efos_emisor` → se muestra la alerta.
- `sat_url = null` → no se muestra el botón de verificación.
- Factura con pagos en `facturas_referencia_destino` → se ven en el detalle.
- `status` desconocido → se muestra tal cual sin romper.
- `fecha`/`hora` se muestran sin conversión de zona horaria.
- Token expirado → se renueva y la consulta funciona.
