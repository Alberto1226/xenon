# Cuentas por cobrar y cuentas por pagar contra CoreCFDI API v1

Implementa en este sistema la consulta de la cartera de clientes (cuentas por cobrar) y de los
pasivos con proveedores (cuentas por pagar) que CoreCFDI calcula a partir de los CFDI descargados
del SAT. Hazlo como un servicio reutilizable (ej. `CoreCfdiTesoreria.cuentasPorCobrar(filtros)` y
`CoreCfdiTesoreria.cuentasPorPagar(filtros)`).

Requisito previo: el servicio de autenticación y el cliente HTTP compartido ya implementados
(`CoreCfdiAuth.getAccessToken()`), que envían los headers, renuevan el token y manejan 401/429.

CoreCFDI no registra pagos ni cobros: solo lee los CFDI. Esta integración es **de consulta**; no
marca facturas como pagadas ni envía nada al cliente o proveedor.

## Configuración (variables de entorno)

- `CORECFDI_BASE_URL` = {{https://mi-dominio.com}}/api/v1
- `CORECFDI_TENANT` = {{slug-o-id-de-la-empresa}}

## Para qué sirve

- Ver qué facturas a crédito siguen pendientes de cobro o de pago, con su saldo y vencimiento.
- Mostrar la antigüedad de saldos (al corriente, 1-30, 31-60, 61-90 y más de 90 días vencidos).
- Ver los complementos de pago (REP) y notas de crédito aplicados a cada factura.

## Cómo calcula CoreCFDI estas cuentas

Entender esto es necesario para explicar los números en pantalla:

- Solo entran CFDI de **ingreso** (tipo `I`), **vigentes** y con método de pago **PPD** (pago en
  parcialidades o diferido). Las facturas PUE se consideran pagadas de contado y no aparecen.
- Por cobrar = facturas donde la empresa es **emisor**. Por pagar = facturas donde la empresa es
  **receptor**.
- `saldo` = `importe` − suma de los REP y notas de crédito vigentes relacionados con la factura que
  ya estén descargados en CoreCFDI. Si el REP todavía no se descarga del SAT, la factura sigue
  apareciendo con saldo aunque ya esté pagada.
- Una factura con saldo de 0.05 o menos se considera liquidada.
- Vencimiento: la fecha límite de la factura si existe; si no, fecha de emisión + días de crédito
  del cliente/proveedor; si tampoco hay, fecha de emisión + 30 días.
- Los días vencidos se calculan contra la fecha del servidor en el momento de la consulta.

## Peticiones

`GET {CORECFDI_BASE_URL}/tesoreria/cobranza?buscar=texto`
`GET {CORECFDI_BASE_URL}/tesoreria/cuentas-por-pagar?buscar=texto`

Headers:

- `Accept: application/json` ← obligatorio
- `X-Tenant: {CORECFDI_TENANT}`
- `Authorization: Bearer {access_token}` ← obligatorio

Parámetros de query:

| Parámetro | Descripción |
|---|---|
| `buscar` | Opcional. Busca en folio, UUID, nombre o RFC del cliente (cobranza) o proveedor (por pagar) |

**Es el único filtro que funciona hoy.** La documentación OpenAPI menciona `estatus_pago` y
`per_page`, pero el servidor los ignora. En consecuencia:

- La respuesta **no está paginada**: llegan todas las facturas pendientes en una sola respuesta.
- `facturas` solo trae las **pendientes** (al corriente y vencidas). Las liquidadas no se pueden
  obtener por este endpoint.
- No hay filtro por fecha, año ni antigüedad en el servidor: hay que filtrar en el cliente.

No envíes `estatus`, `estatus_pago`, `per_page`, `page`, `year`, `fecha_inicio`, `fecha_fin` ni
`antiguedad`; hoy no tienen efecto y su comportamiento puede cambiar.

El usuario de la API necesita el permiso `ver tesoreria` y la empresa debe tener contratado el
módulo Tesorería.

## Respuesta 200 — cuentas por cobrar

```json
{
  "success": true,
  "message": "Reporte de cuentas por cobrar obtenido con éxito",
  "data": {
    "empresa": { "rfc": "QUHJ711021UR1", "nombre": "MI EMPRESA SA DE CV", "id_empresa": 1 },
    "facturas": [
      {
        "id_factura": 40,
        "folio": "A-1021",
        "uuid": "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
        "fecha": "2026-08-15",
        "fecha_vencimiento": "2026-09-14",
        "dias_credito": 30,
        "fechalimite": null,
        "cliente": "CLIENTE EJEMPLO SA DE CV",
        "rfc": "CEJ010203AB1",
        "correo": "pagos@cliente.com",
        "telefono": "",
        "importe": 11600.00,
        "abonos": 5000.00,
        "saldo": 6600.00,
        "pct_liquidado": 43.1,
        "dias_vencidos": 28,
        "dias_por_vencer": 0,
        "estatus_cobro": "vencido",
        "rango_antiguedad": "vencido_1_30",
        "moneda": "MXN",
        "pagos_detalle": [
          {
            "id_referencia": 7,
            "folio_pago": "P-88",
            "uuid_pago": "0A1B2C3D-...",
            "tipo_documento": "Complemento de Pago (REP)",
            "tipo_cfdi": "P",
            "fecha_pago": "2026-09-01",
            "monto": 5000.00,
            "saldo_ant": 11600.00,
            "nuevo_saldo": 6600.00,
            "parcialidad": 1,
            "status": "vigente"
          }
        ],
        "total_pagos_count": 1
      }
    ],
    "acumulados": {
      "total_facturado": 250000.00,
      "total_recuperado": 180000.00,
      "total_pendiente": 70000.00,
      "pct_recuperacion": 72.0,
      "conteo_vencidos": 4,
      "estratificacion": {
        "al_corriente":   { "total": 30000.00, "count": 3, "pct": 42.9 },
        "vencido_1_30":   { "total": 20000.00, "count": 2, "pct": 28.6 },
        "vencido_31_60":  { "total": 10000.00, "count": 1, "pct": 14.3 },
        "vencido_61_90":  { "total": 0.0,      "count": 0, "pct": 0.0 },
        "vencido_mas_90": { "total": 10000.00, "count": 1, "pct": 14.3 }
      }
    },
    "filtros": { "buscar": "", "estatus": "pendiente", "antiguedad": "todos", "year": null, "fecha_inicio": "", "fecha_fin": "" }
  }
}
```

## Respuesta 200 — cuentas por pagar

Misma estructura, con estas diferencias:

- `message`: `"Reporte de cuentas por pagar a proveedores obtenido con éxito"`.
- En cada factura: `proveedor` en lugar de `cliente`, `estatus_pago` en lugar de `estatus_cobro`,
  y no vienen `correo` ni `telefono`.
- `acumulados` trae `total_compras`, `total_pagado`, `total_pendiente`, `pct_pagado`,
  `conteo_vencidos`, `estratificacion` y además `pue_count` y `pue_total`.

```json
"acumulados": {
  "total_compras": 173430.45,
  "total_pagado": 120000.00,
  "total_pendiente": 53430.45,
  "pct_pagado": 69.2,
  "conteo_vencidos": 2,
  "estratificacion": { "al_corriente": { "total": 0, "count": 0, "pct": 0 }, "...": {} },
  "pue_count": 48,
  "pue_total": 96500.10
}
```

### Campos de cada factura

| Campo | Descripción |
|---|---|
| `id_factura` | ID interno de CoreCFDI |
| `folio` | Serie/folio; `"S/F"` si el CFDI no trae |
| `uuid` | Folio fiscal del CFDI |
| `fecha` | Fecha de emisión `YYYY-MM-DD`, hora de México. Mostrar tal cual |
| `fecha_vencimiento` | `YYYY-MM-DD`. **Usar esta** para mostrar el vencimiento |
| `fechalimite` | Fecha límite original del CFDI, casi siempre `null`. Llega en formato ISO con hora; no usarla, ya está considerada en `fecha_vencimiento` |
| `dias_credito` | Plazo en días. Puede llegar con decimales o en negativo: redondear y, si es menor a 0, mostrar 0 |
| `cliente` / `proveedor` | Nombre. `"Cliente Desconocido"` / `"Proveedor Desconocido"` si falta |
| `rfc` | RFC del cliente o proveedor; `"N/A"` si falta |
| `correo`, `telefono` | Solo en cobranza; pueden venir como cadena vacía |
| `importe` | Total de la factura |
| `abonos` | Suma de REP y notas de crédito aplicados |
| `saldo` | Pendiente (`importe` − `abonos`, nunca negativo) |
| `pct_liquidado` | Porcentaje cubierto, un decimal |
| `dias_vencidos` | Días de atraso; 0 si aún no vence |
| `dias_por_vencer` | Días que faltan para vencer; 0 si ya venció |
| `estatus_cobro` / `estatus_pago` | `al_corriente` o `vencido` (`liquidado` existe pero hoy no llega) |
| `rango_antiguedad` | `al_corriente`, `vencido_1_30`, `vencido_31_60`, `vencido_61_90`, `vencido_mas_90` |
| `moneda` | Código (`MXN`, `USD`…) |
| `pagos_detalle` | Abonos aplicados (ver abajo); arreglo vacío si no hay |
| `total_pagos_count` | Cantidad de abonos |

### Abonos (`pagos_detalle`)

| Campo | Descripción |
|---|---|
| `folio_pago`, `uuid_pago` | Del REP o nota de crédito; `"S/F"` / `"N/A"` si faltan |
| `tipo_documento` | `"Complemento de Pago (REP)"` o `"Nota de Crédito"` |
| `tipo_cfdi` | `P` (pago) o `E` (nota de crédito) |
| `fecha_pago` | `YYYY-MM-DD`; puede venir `"N/A"` |
| `monto` | Importe aplicado a esta factura |
| `saldo_ant`, `nuevo_saldo` | Saldo antes y después del abono, según el REP |
| `parcialidad` | Número de parcialidad |

### Acumulados: cuidado con lo que suman

- `total_facturado` / `total_compras` y `total_recuperado` / `total_pagado` suman **todas** las
  facturas PPD que coinciden con `buscar`, incluidas las ya liquidadas que no vienen en `facturas`.
  No van a coincidir con la suma de la lista; es correcto.
- `total_pendiente`, `conteo_vencidos` y `estratificacion` sí corresponden a las facturas de la lista.
- `estratificacion[x].pct` es el porcentaje de ese rango sobre `total_pendiente`.
- **Los acumulados suman importes de monedas distintas sin convertir.** Si en `facturas` hay más de
  una `moneda`, no muestres los acumulados del servidor como un total único: recalcula
  `total_pendiente` y la estratificación por moneda a partir de `facturas`, y oculta
  `total_facturado`/`total_recuperado` (o márcalos como mezcla de monedas).
- `pue_count` y `pue_total` (solo por pagar) son las compras de contado recibidas; sirven como dato
  informativo ("gastos de contado") y no cambian con `buscar`.
- `empresa.rfc` puede llegar como `XAXX010101000` si la empresa no ha configurado su RFC o FIEL; en
  ese caso las listas pueden no ser confiables: mostrar un aviso.

## Errores

- 401: access token inválido o expirado → renovar con `CoreCfdiAuth` y reintentar UNA vez.
- 403: no reintentar; mostrar el `message` del servidor. Causas: el módulo Tesorería no está
  contratado (`"El módulo 'Tesoreria' no está contratado para esta empresa."`), el usuario de la API
  no tiene el permiso `ver tesoreria`, o la empresa está suspendida.
- 404: tenant no encontrado → revisar `CORECFDI_TENANT`, no reintentar.
- 429: demasiadas peticiones (60/min para toda la integración). Respetar `Retry-After`.
- 5xx o error de red → error claro; reintentar máximo 2 veces con backoff (es una consulta).

Estos endpoints no validan parámetros, así que no devuelven 422.

## Qué debe hacer la implementación

1. `cuentasPorCobrar(filtros)` y `cuentasPorPagar(filtros)`: obtener el token, llamar al endpoint
   enviando solo `buscar` (si no está vacío) y devolver `{ empresa, facturas, acumulados }`.
2. Normalizar ambas respuestas a **un mismo modelo**: `contraparte` (de `cliente` o `proveedor`),
   `estatus` (de `estatus_cobro` o `estatus_pago`), `rfc`, `folio`, `uuid`, `fecha`,
   `fechaVencimiento`, `diasCredito`, `importe`, `abonos`, `saldo`, `pctLiquidado`, `diasVencidos`,
   `diasPorVencer`, `rangoAntiguedad`, `moneda`, `pagos`. Convertir `"S/F"`, `"N/A"` y cadenas
   vacías a vacío/nulo en el modelo.
3. Filtros en el cliente, sobre la lista ya recibida: estatus (todos / al corriente / vencido),
   rango de antigüedad, rango de fechas de emisión o de vencimiento, y moneda. Al aplicar un filtro,
   recalcular los totales mostrados a partir de las facturas visibles.
4. Paginación en el cliente (la respuesta llega completa). No pedir de nuevo al servidor al cambiar
   de página o de filtro local.
5. Cache de la respuesta por 5 minutos por tenant y valor de `buscar`, con un botón "Actualizar"
   que la invalide. La consulta es pesada en el servidor porque recalcula toda la cartera.
6. `buscar` con debounce (≥ 400 ms). Si la lista completa ya está en memoria, buscar localmente en
   lugar de llamar al servidor.
7. Pantallas "Cuentas por cobrar" y "Cuentas por pagar", cada una con:
   - Tarjetas: pendiente total, vencido (suma de los rangos vencidos), número de facturas vencidas
     y porcentaje recuperado/pagado.
   - Antigüedad de saldos con los 5 rangos (importe, porcentaje y número de facturas); al hacer
     clic en un rango, filtrar la tabla.
   - Tabla: fecha, folio, cliente/proveedor, RFC, total, abonado, saldo, vencimiento, días vencidos
     o por vencer, y estatus (resaltar `vencido`). Orden inicial: más días vencidos primero.
   - Detalle expandible con los abonos de `pagos_detalle`.
   - Aviso fijo: "Los saldos se calculan con los CFDI descargados del SAT. Un pago aparece hasta
     que su complemento de pago (REP) se descarga."
8. Montos: formatear con el código de `moneda`; nunca sumar importes de monedas distintas.
9. Fechas: mostrar `fecha` y `fecha_vencimiento` tal cual, sin conversión de zona horaria.
10. Timeout de 60 s. Registrar en log endpoint, status y duración, sin tokens.

**No implementar** `POST /tesoreria/cobranza/{id}/recordatorio`: aparece en la documentación pero
hoy no envía ningún correo (responde "enviado" sin hacer nada). No mostrar un botón de recordatorio
que dependa de él.

## Pruebas requeridas

Con respuestas simuladas de la API (las de este prompt):

- Cobranza y por pagar sin filtros → lista, acumulados y antigüedad se muestran correctamente.
- Ambas respuestas se normalizan al mismo modelo (`cliente`/`proveedor`, `estatus_cobro`/`estatus_pago`).
- Lista vacía (`facturas = []`, acumulados en 0) → pantalla vacía sin errores ni divisiones entre 0.
- `buscar` vacío no se envía; con texto, se envía y filtra.
- Filtro local por estatus `vencido` y por rango `vencido_31_60` → la tabla y los totales cambian.
- Filtro local por rango de fechas de un solo día → incluye las facturas de ese día.
- Factura con `pagos_detalle` → se ven los abonos; con arreglo vacío no se muestra el detalle.
- `folio = "S/F"`, `rfc = "N/A"`, `fecha_pago = "N/A"` → se muestran como vacío sin romper.
- `dias_credito` con decimales o negativo → se muestra un entero no negativo.
- Facturas en MXN y USD → totales separados por moneda, sin sumarlas.
- `empresa.rfc = "XAXX010101000"` → se muestra el aviso de RFC no configurado.
- `estatus` o `rango_antiguedad` desconocido → se muestra tal cual sin romper.
- 403 por módulo no contratado → se muestra el `message` del servidor y no se reintenta.
- Token expirado → se renueva y la consulta funciona.
- Segunda consulta dentro de 5 minutos → sale de cache; "Actualizar" vuelve a llamar al servidor.
- No se envían `estatus`, `estatus_pago`, `per_page` ni `page` al servidor.
