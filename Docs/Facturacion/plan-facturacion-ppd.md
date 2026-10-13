# Plan: PUE en "Preparar factura" y PPD en "Emitir factura"

## 1. Hallazgos del análisis (código actual)

**Ciclo de vida del pedido** (`routes/app/pedidos/_servicios/pedido_pipeline_service.js`)
- `crear_pedido` → crea un `Carrito` (status "Pedido"). El folio (serie A) se reserva en la colección `Folio` y **no cambia** durante todo el ciclo.
- `cambiar_status_a_envio` → descuenta inventario, el documento sigue en `Carrito`.
- `cambiar_status_a_entregado` → `new Pedido(JSON.parse(JSON.stringify(carrito)))`, guarda, vincula el folio a `{tipo:'pedido', id}` y **borra el carrito**. El `_id` cambia.
- `cancelar_pedido` → copia a `Carrito_cancelado` y borra el carrito.
- Segunda vía: `routes/salidas/finalizar/[idRuta].js` crea `Pedido` directamente con `doc_nuevo_pedido` (pedidos de ruta).

**Dónde vive hoy lo fiscal**
- `Pedido.preparacion_factura` (receptor, método/forma de pago, conceptos con origen/pedimento/claves SAT) y `Pedido.facturacion[]`.
- `Carrito` solo tiene `facturacion[]`; **no tiene `preparacion_factura`** (ni `Carrito_cancelado`).
- `Factura` (colección propia) guarda `pedido_id` y `carrito_id`, pero hoy solo se llena `pedido_id`.
- El botón "Preparar factura" está solo en `Row_enviados.svelte` (pedidos ya en la colección `Pedido`, solo administrador).
- `emitir_factura.js` bloquea una segunda factura por pedido (`facturacion.length>0` y `Factura.findOne({pedido_id})`), toma el estado de `preparacion_factura` y usa `cfdiXmlService.construirCFDI40`, que ya soporta PPD (`FormaPago="99"`).
- `/app/facturacion/emitir` es hoy solo una pantalla informativa; `/app/facturacion/pagos` (REP) y `cuentas-por-cobrar` son esqueletos sin lógica.

**Riesgos de pérdida de información**
1. Mongoose en modo estricto descarta cualquier campo que no exista en el esquema destino. Si algo fiscal se guarda en el `Carrito` sin que exista en `Pedido` (o al revés), se pierde en `cambiar_status_a_entregado`/`cancelar_pedido`.
2. `Factura.pedido_id` quedaría apuntando a un `_id` de carrito inexistente si se factura antes de entregar (el `_id` cambia al pasar a `Pedido`). La clave estable es el **folio**.
3. Cancelar un pedido con CFDI vigente (en `Carrito`) lo mandaría a cancelados sin cancelar el CFDI ante el SAT.
4. Pedidos de ruta (`salidas/finalizar`) crean el `Pedido` sin copiar campos fiscales.
5. `preparacion_factura.conceptos` depende de `lista[].indice`; si el pedido cambia (precios/cantidades) después de preparar, los conceptos quedan desfasados. Hoy solo se edita antes de entregar, por eso no pasa.
6. PPD requiere seguimiento de saldo y pagos (REP tipo P); no existe colección de pagos.

## 2. Decisión de diseño (recomendada)

- **Fuente única de verdad fiscal = `Pedido`** (documento ya entregado/inmutable). No se factura sobre `Carrito`.
- **PUE**: se prepara y timbra desde el modal "Preparar factura" (pedidos enviados). El selector de método de pago se elimina y se fija en PUE.
- **PPD**: se configura y emite desde `/app/facturacion/emitir` (buscar pedido por folio, elegir pedidos enviados sin factura, definir condiciones de crédito/fecha límite). Reutiliza `preparacion_factura` y `emitir_factura.js` con `metodo_pago="PPD"`.
- **Red de seguridad**: paridad de esquema `Carrito`/`Pedido`/`Carrito_cancelado` para `preparacion_factura` y `facturacion`, y helper único que copia los campos fiscales al trasladar. Así, aunque más adelante se permita facturar antes de entregar, no se pierde nada.
- `Factura` queda indexada por `folio_pedido` además de `pedido_id`.

## 3. Fases de implementación

### Fase 1 – Modal solo PUE (bajo riesgo)
- `PrepararFacturaModal.svelte`: quitar el `<select>` de método de pago, fijar `metodo_pago="PUE"`, texto explicativo "Las ventas a crédito (PPD) se facturan en Facturación → Emitir factura".
- `guardar_preparacion_factura.js`: `metodosPago = new Set(["PUE"])`; rechazar PPD con mensaje claro; forma de pago sin "99".
- Borradores existentes con PPD: mostrar aviso y forzar PUE al reabrir.

### Fase 2 – Paridad de esquemas y traslado seguro
- Extraer `preparacion_factura` y `facturacion` a un esquema compartido (`models/factura_pedido_schema.js`) usado por `Carrito`, `Carrito_cancelado` y `Pedido`.
- En `cambiar_status_a_entregado` y `cancelar_pedido`: tras `JSON.parse(JSON.stringify(...))`, verificar que `preparacion_factura`/`facturacion` pasen intactos; añadir prueba/script de verificación.
- `salidas/finalizar/[idRuta].js`: copiar los campos fiscales si el carrito los trae.
- `cancelar_pedido`: bloquear si `facturacion` tiene un CFDI con status "Vigente" (pedir cancelar primero el CFDI).
- Al trasladar a `Pedido`: `Factura.updateMany({carrito_id: carrito._id}, {pedido_id: nuevo._id})` y guardar `folio_pedido` en `Factura`.

### Fase 3 – Modelo de crédito PPD
- Nuevo modelo `PagoFactura`/campos en `Factura`: `saldo_pendiente`, `parcialidades[]` (fecha, monto, forma de pago, UUID del REP), `fecha_limite`, `condiciones_pago`.
- `preparacion_factura` agrega: `condiciones_pago`, `dias_credito`, `tipo` ("PUE"|"PPD").
- Al emitir PPD: `Factura.saldo_pendiente = total`; `forma_pago` en XML = "99" (ya soportado), `condicionesDePago` opcional en el comprobante.

### Fase 4 – Pantalla Emitir factura (PPD)
- `/app/facturacion/emitir/index.svelte`: buscador por folio/cliente, lista de pedidos enviados sin factura, reutilizar el formulario de receptor/conceptos del modal (extraer a un componente compartido `FormularioFactura.svelte`) con método fijo PPD, forma de pago "99 Por definir", condiciones de crédito.
- Endpoints: `facturacion/pedidos_pendientes.js` (lista), reutilizar `preparar_factura.js`, `guardar_preparacion_factura.js` (con parámetro `tipo`) y `emitir_factura.js`.
- Validaciones: solo administrador, pedido en colección `Pedido`, sin factura previa, cliente con RFC/CP/régimen.

### Fase 5 – REP (opcional, posterior)
- Complemento de pago 2.0 (tipo P, uso CP01) en `/app/facturacion/pagos`, ligado a `Factura.saldo_pendiente`.

## 4. Pruebas mínimas
- Pedido → entregado con `preparacion_factura` en el carrito conserva los datos.
- Cancelar pedido con CFDI vigente es rechazado.
- Modal rechaza PPD; emitir acepta PPD y deja `Factura.saldo_pendiente`.
- `Factura.pedido_id` se actualiza al trasladar carrito → pedido.
- Pedido de ruta finalizado conserva los datos fiscales.

## 5. Prompts listos

**Prompt Fase 1**
> En Xenon, deja el modal `src/routes/app/pedidos/_listas/PrepararFacturaModal.svelte` solo para ventas PUE: elimina el selector de método de pago, fija `metodo_pago="PUE"`, agrega la leyenda de que los PPD se emiten desde Facturación → Emitir factura. En `guardar_preparacion_factura.js` acepta solo PUE y devuelve error claro si llega PPD. Si un borrador guardado trae PPD, avisa y fuerza PUE. No toques `src/server.js`. Valida con `npm run build`.

**Prompt Fase 2**
> Analiza `pedido_pipeline_service.js` y `routes/salidas/finalizar/[idRuta].js`. Crea un esquema compartido para `preparacion_factura` y `facturacion` y úsalo en los modelos `Carrito`, `Carrito_cancelado` y `Pedido`. Garantiza que `cambiar_status_a_entregado`, `cancelar_pedido` y la finalización de ruta conserven esos campos. Bloquea `cancelar_pedido` si hay un CFDI vigente. Al pasar a Pedido, actualiza `Factura.pedido_id` por `carrito_id` y guarda `folio_pedido`. Escribe un script de verificación y no cambies `src/server.js`.

**Prompt Fase 3**
> Extiende `Factura` y `preparacion_factura` para crédito PPD: `tipo`, `condiciones_pago`, `dias_credito`, `fecha_limite`, `saldo_pendiente` y `parcialidades[]`. Ajusta `emitir_factura.js` y `cfdiXmlService.js` para incluir `CondicionesDePago` y fijar `FormaPago="99"` cuando sea PPD, e inicializar `saldo_pendiente=total`.

**Prompt Fase 4**
> Implementa `/app/facturacion/emitir` para facturas PPD: lista de pedidos enviados sin factura con buscador por folio y cliente; al elegir uno, abre el formulario de receptor y conceptos (extráelo del modal a un componente compartido) con método PPD fijo, forma "99" y condiciones de crédito. Reutiliza `guardar_preparacion_factura.js` (parámetro `tipo`) y `emitir_factura.js`. Solo administrador; confirmación explícita antes de timbrar; maneja los estados "emitiendo/fallida/requiere_revision" como el flujo actual.

**Prompt Fase 5**
> Implementa el Complemento de Recepción de Pagos 2.0 (CFDI tipo P) en `/app/facturacion/pagos` para facturas PPD con saldo pendiente: registrar el pago, generar el XML, timbrar con CUCC, actualizar `saldo_pendiente` y `parcialidades[]`.

---

# Plan 2: Recepción de pagos (abonos a N facturas) y REP 2.0

Sustituye y detalla la Fase 5 del plan anterior. Depende de la Fase 3 (saldo en `Factura`).

## A. Hallazgos
- `Factura` no tiene saldo ni parcialidades; no existe colección de pagos, bancos o cuentas.
- `/app/facturacion/pagos` y `cuentas-por-cobrar` son pantallas vacías; `tesoreria.js` (25 líneas) no tiene lógica relevante.
- `cuccPacService.timbrarConCUCC({xml, config, soapPassword})` es genérico: sirve igual para un CFDI tipo P. `cfdiXmlService.js` solo arma tipo I/E; falta un generador de tipo P con el complemento `pago20`.
- Un pago del cliente es **un solo evento** que puede cubrir N facturas, con un monto distinto por cada una. En el SAT eso es **un CFDI tipo P con un nodo `Pago` que contiene N `DoctoRelacionado`** (si todos los documentos comparten moneda, forma de pago y fecha del pago).

## B. Reglas de negocio
1. Solo se abonan facturas PPD vigentes, del mismo cliente (mismo RFC receptor) y timbradas.
2. Monto recibido = suma de lo aplicado a cada factura (la diferencia, si la hay, queda como **saldo a favor** del cliente o se rechaza; decisión del usuario, ver pendientes).
3. Aplicado por factura: `0 < aplicado <= saldo_pendiente`.
4. `NumParcialidad` = parcialidades previas + 1; `ImpSaldoAnt`, `ImpPagado` e `ImpSaldoInsoluto` por documento; `ImpSaldoInsoluto = ImpSaldoAnt - ImpPagado`.
5. Se debe declarar por documento el `ObjetoImpDR` y los impuestos trasladados proporcionales al pago (IVA/IEPS) en `ImpuestosDR`, y los totales en `Pagos/Totales`.
6. Facturas en moneda distinta a la del pago requieren `EquivalenciaDR` y tipo de cambio.
7. El REP debe timbrarse a más tardar el día 10 del mes siguiente al pago (aviso en pantalla).
8. Nunca borrar un abono: se **cancela** (con motivo) y se revierte el saldo; si ya tiene REP vigente, primero se cancela el CFDI.

## C. Modelo de datos
- **`Pago`** (nueva colección, un registro por evento de cobro):
  `folio`, `cliente{id,nombre,rfc}`, `fecha_pago`, `forma_pago`, `moneda`, `tipo_cambio`, `monto_total`, `monto_aplicado`, `saldo_a_favor`, `referencia/num_operacion`, `banco/cuenta` (opcional), `notas`,
  `aplicaciones[{factura_id, uuid_factura, folio_pedido, num_parcialidad, saldo_anterior, importe_pagado, saldo_insoluto}]`,
  `rep{estado: sin_timbrar|emitiendo|timbrado|fallido|requiere_revision|cancelado, uuid, serie, folio, error, fecha_timbrado}`,
  `status: Registrado|Cancelado`, `usuario`, `created_at`.
- **`Factura`** (campos de la Fase 3): `saldo_pendiente`, `total_pagado`, `status_pago: pendiente|parcial|pagada`, `parcialidades[{pago_id, uuid_rep, importe, fecha}]` (referencia al `Pago`, no duplicar datos), `fecha_limite`.
- **`Pedido.facturacion[]`**: opcionalmente reflejar `status_pago`/`saldo` para mostrarlo en la lista de pedidos sin consultar `Factura`.
- Índices: `Pago.cliente.id`, `Pago.rep.uuid`, `Factura.status_pago + receptor.rfc`.

## D. Integridad (evitar pérdida o doble aplicación)
- Aplicar el pago con operaciones atómicas por factura: `Factura.updateOne({_id, saldo_pendiente: {$gte: importe}}, {$inc: {saldo_pendiente: -importe, total_pagado: importe}, $push: {parcialidades: ...}})`. Si alguna de las N falla, revertir las anteriores (compensación) y marcar el `Pago` como fallido; no hay transacciones multidocumento si Mongo no es réplica.
- Flujo en dos etapas: (1) **Registrar el cobro** (guarda `Pago` y actualiza saldos), (2) **Timbrar el REP** (puede reintentarse). Si el PAC falla, el abono queda registrado con `rep.estado = fallido` y se puede reintentar sin duplicar saldos. Mismo manejo `requiere_revision` que el flujo de facturas para no duplicar timbres.
- Idempotencia: llave `clave_idempotencia` (cliente+fecha+monto+referencia) para no registrar el mismo pago dos veces con doble clic.
- Auditoría con `accesos.logActividad`.

## E. Fases

### P1 – Modelo y servicio de aplicación (sin timbrar)
- Crear `models/pago.js`, ampliar `Factura`, servicio `services/pagosService.js`: `calcularAplicaciones`, `aplicarPago`, `revertirPago`, validaciones B1–B4.
- Endpoints: `facturacion/pagos/facturas_pendientes.js` (por cliente: UUID, folio, fecha, total, saldo, fecha límite), `registrar.js`, `cancelar.js`, `lista.js`.

### P2 – Pantalla de recepción de pagos (`/app/facturacion/pagos`)
- Paso 1: elegir cliente (buscador) → se listan sus facturas PPD con saldo.
- Paso 2: capturar fecha, forma de pago, moneda, monto recibido, referencia.
- Paso 3: tabla con checkbox por factura y campo "importe a aplicar". Botones: **"Aplicar automático"** (más antiguas primero, FIFO, hasta agotar el monto), **"Liquidar"** por fila y edición manual. Totalizador en vivo: recibido, aplicado, restante; bloquea si aplicado > recibido o importe > saldo.
- Resumen de confirmación y botón "Registrar pago".
- Historial de pagos con filtros (cliente, fechas, estado REP) y acciones: timbrar REP, reintentar, descargar XML/PDF, cancelar.

### P3 – Complemento de pago 2.0 (CFDI tipo P)
- En `cfdiXmlService.js` nuevo `construirREP20({pago, facturas, emisor, receptor, serie, folio, fecha})`:
  Comprobante `TipoDeComprobante="P"`, `SubTotal=0`, `Total=0`, `Moneda="XXX"`, concepto fijo `ClaveProdServ=84111506`, `ClaveUnidad=ACT`, `Descripcion="Pago"`, `ObjetoImp="01"`, receptor con `UsoCFDI="CP01"`.
  `pago20:Pagos Version="2.0"` → `Totales` + un `Pago` con `FechaPago`, `FormaDePagoP`, `MonedaP`, `Monto`, `TipoCambioP` y N `DoctoRelacionado` (`IdDocumento`=UUID, `Serie`, `Folio`, `MonedaDR`, `EquivalenciaDR`, `NumParcialidad`, `ImpSaldoAnt`, `ImpPagado`, `ImpSaldoInsoluto`, `ObjetoImpDR`, `ImpuestosDR`).
- Endpoint `facturacion/pagos/timbrar_rep.js` usando `timbrarConCUCC`, con el mismo bloqueo `emitiendo` y confirmación de producción que `emitir_factura.js`.
- Guardar UUID del REP en `Pago.rep` y en cada `Factura.parcialidades`.
- Validar contra el XSD de pagos 2.0 en sandbox antes de producción.

### P4 – Seguimiento y reportes
- `cuentas-por-cobrar`: lista de facturas con saldo, antigüedad (0-30/31-60/60+), vencidas por `fecha_limite`, saldo a favor por cliente.
- Estado de cuenta por cliente (facturas, abonos, saldo) exportable.
- Indicador de pago en la lista de pedidos/facturas emitidas.

### P5 – Cancelaciones y saldo a favor
- Cancelar un pago: cancelar REP ante CUCC (motivo 02/01), revertir `saldo_pendiente` de cada factura y marcar `Pago` Cancelado.
- Saldo a favor: si el cliente paga más de lo que debe, guardarlo y aplicarlo a futuras facturas (anticipo CFDI 4.0 requiere tratamiento especial; se deja como decisión).

## F. Pruebas mínimas
- Pago de $1,000 repartido en 3 facturas (400/350/250) → saldos y `NumParcialidad` correctos y un solo REP con 3 `DoctoRelacionado`.
- Segundo abono a la misma factura → `NumParcialidad=2`, `ImpSaldoAnt` = saldo previo.
- Importe mayor al saldo o a lo recibido → rechazado.
- Doble clic / reintento → sin doble descuento.
- Falla del PAC → pago registrado, REP "fallido", reintento correcto.
- Cancelar pago → saldos restaurados.

## G. Prompts listos

**Prompt P1**
> En Xenon crea el modelo `models/pago.js` (cliente, fecha_pago, forma_pago, moneda, tipo_cambio, monto_total, aplicaciones[{factura_id, uuid_factura, num_parcialidad, saldo_anterior, importe_pagado, saldo_insoluto}], rep{estado, uuid, serie, folio, error}, status, usuario) y amplía `models/factura.js` con `saldo_pendiente`, `total_pagado`, `status_pago` y `parcialidades[]`. Implementa `services/pagosService.js` con aplicarPago/revertirPago usando actualizaciones atómicas condicionadas (`saldo_pendiente >= importe`) y compensación si falla alguna factura, e idempotencia. Crea los endpoints `facturas_pendientes`, `registrar`, `cancelar` y `lista` bajo `routes/app/facturacion/pagos/`, solo administrador. No toques `src/server.js`.

**Prompt P2**
> Implementa `/app/facturacion/pagos/index.svelte`: selector de cliente, captura de fecha, forma de pago, moneda, monto y referencia; tabla de facturas PPD con saldo, checkbox e importe editable por factura, botones "Aplicar automático" (FIFO) y "Liquidar", totalizador en vivo (recibido/aplicado/restante) con validaciones, resumen de confirmación e historial de pagos con acciones. Usa el componente de paginación compartido y el estilo visual del resto de Facturación.

**Prompt P3**
> En `src/services/cfdiXmlService.js` agrega `construirREP20` para un CFDI tipo P con complemento pago20 (Totales + un Pago con N DoctoRelacionado, ImpuestosDR proporcionales, UsoCFDI CP01, Moneda XXX, concepto 84111506). Crea `facturacion/pagos/timbrar_rep.js` con `timbrarConCUCC`, bloqueo "emitiendo", estados fallido/requiere_revision y confirmación de producción como `emitir_factura.js`. Guarda el UUID en `Pago.rep` y en `Factura.parcialidades`. Valida en sandbox.

**Prompt P4/P5**
> Implementa cuentas por cobrar con antigüedad de saldos, vencidas, estado de cuenta por cliente, y la cancelación de pagos (cancelar el REP en CUCC, revertir saldos y marcar el pago como cancelado).

## H. Decisiones pendientes
1. Si el cliente paga de más: ¿rechazar, guardar como saldo a favor o anticipo?
2. ¿Pagos en moneda distinta a la de la factura (USD/MXN)?
3. ¿Se registra banco/cuenta de origen y destino (necesario para ciertas formas de pago como transferencia)?
4. ¿El abono se puede registrar sin timbrar el REP en el momento (cobro primero, REP después)? El plan lo asume que sí.

---

# Decisiones confirmadas (actualizan el Plan 2, sección H)

1. **Pago de más → se registra y queda como saldo a favor.** Se aplica después a facturas futuras.
2. **Solo MXN por ahora.** Se fija `moneda="MXN"`, `tipo_cambio=1` y `EquivalenciaDR="1"`. El campo moneda queda en el modelo para ampliarlo luego.
3. **Se registra banco y cuenta de origen y destino según la forma de pago.**
4. **El cobro se registra primero y el REP se timbra después.**

## Ajustes al diseño

### Saldo a favor (crédito del cliente)
- Nueva colección `MovimientoSaldoCliente` (libro de movimientos, no un solo número):
  `cliente_id`, `tipo: abono_excedente | aplicacion | ajuste | reversa`, `importe` (+/−), `pago_id`, `factura_id`, `fecha`, `usuario`, `nota`.
  El saldo a favor es la suma de movimientos; queda auditable y reversible.
- Cache `Cliente.saldo_a_favor`, actualizado con incrementos atómicos (se puede reconstruir desde los movimientos).
- Al registrar un pago: `monto_total = aplicado + excedente`. Si `excedente > 0` se crea el movimiento `abono_excedente` y el `Pago` guarda `saldo_a_favor_generado`.
- **Aplicación en facturas siguientes:** al emitir una factura PPD a un cliente con saldo a favor, la pantalla muestra "Saldo a favor disponible: $X" y propone aplicarlo (casilla activable). Al confirmar se crea un movimiento `aplicacion`, se descuenta de `saldo_pendiente` y se registra un abono con `origen: "saldo_a_favor"`. En la pantalla de pagos también aparece como fuente adicional que se puede sumar al monto recibido.
- Para facturas PUE no se aplica automáticamente (ya nacen pagadas).

### Aviso fiscal importante (validar con el contador)
- El REP 2.0 solo relaciona el importe realmente aplicado a documentos (`Monto` = suma de `ImpPagado`). **El excedente no entra al REP**; queda como crédito interno.
- Al aplicar ese crédito después, el REP se timbra con la **fecha y forma de pago del pago original**, y el plazo (día 10 del mes siguiente) cuenta desde el **pago real**. Si ya venció, el sistema avisa que el REP es extemporáneo.
- Si el contador prefiere tratar el excedente como **anticipo** (CFDI de anticipo con relación 07), es otro flujo; queda como tipo de movimiento alterno, no implementado.

### Banco y cuenta (origen y destino)
- Nuevo catálogo `CuentaBancaria` (cuentas de la empresa, para el destino): `banco`, `rfc_banco` (opcional), `numero_cuenta`, `alias`, `activa`.
- En `Pago` agregar: `cuenta_destino_id`, `cuenta_ordenante{banco, rfc_banco, numero_cuenta}` (origen del cliente) y, solo con SPEI, `tipo_cadena_pago`, `certificado_pago`, `cadena_pago`, `sello_pago`.
- Reglas según forma de pago:
  - 01 Efectivo: sin cuentas.
  - 02 Cheque, 03 Transferencia, 04/28 Tarjetas: cuenta ordenante (cliente) y beneficiaria (la nuestra).
  - Formato de cuenta según el SAT (10, 11, 15, 16 o 18 dígitos); `RfcEmisorCtaOrd` y `RfcEmisorCtaBen`.
  - Solo se incluyen en el XML cuando la forma de pago lo requiere.
- En pantalla, los campos de banco aparecen según la forma de pago; la cuenta destino es un select del catálogo con opción "Agregar cuenta".
- CRUD simple del catálogo dentro de Facturación.

### Cobro primero, REP después
- `Pago.rep.estado`: `sin_timbrar` (default) → `emitiendo` → `timbrado` / `fallido` / `requiere_revision` / `cancelado`.
- El historial alerta los pagos sin REP con los días restantes del plazo (rojo si vencido).
- Acción "Timbrar REP pendientes" (un REP por pago; no se combinan pagos distintos).
- El registro del cobro no se bloquea por datos del REP; el **timbrado** sí se bloquea si faltan cuentas que la forma de pago exige.

## Cambios en las fases
- **P1**: añadir `MovimientoSaldoCliente`, `CuentaBancaria`, campos de cuentas en `Pago` y la lógica de excedente en `registrar`. Endpoint `saldo_cliente.js`.
- **P2**: mostrar el excedente (recibido − aplicado) en el totalizador, el saldo a favor disponible, casilla "usar saldo a favor", campos de banco condicionados y CRUD de cuentas.
- **P3**: REP con un solo `Pago` por registro, `Monto` = aplicado (sin excedente), MXN fijo, nodos de cuenta cuando correspondan. Para abonos con `origen: saldo_a_favor`, usar fecha y forma del pago original.
- **P4**: cuentas por cobrar muestra el saldo a favor por cliente y su historial de movimientos.
- **P5**: cancelar un pago revierte aplicaciones y movimientos de saldo a favor; si ese saldo ya se consumió en otra factura, bloquear hasta revertir esa aplicación.

## Pruebas adicionales
- Pago de $1,200 contra facturas con saldo total $1,000 → aplicado $1,000, saldo a favor +$200, REP por $1,000.
- Nueva factura PPD de $500 → propone aplicar $200; queda saldo $300; el movimiento `aplicacion` es auditable.
- Cancelar el pago original con saldo a favor ya consumido → bloqueado.
- Transferencia sin cuenta destino → el cobro se registra, el timbrado se rechaza con mensaje claro; efectivo → timbra sin cuentas.
- Excedente aplicado después del día 10 → aviso de REP extemporáneo.

## Prompt complementario
> Actualiza la implementación de pagos de Xenon con estas reglas: solo MXN; si el cliente paga más que el saldo de las facturas seleccionadas, se registra el cobro completo y el excedente se guarda como saldo a favor mediante un libro de movimientos (`MovimientoSaldoCliente`) con cache en `Cliente.saldo_a_favor`; al emitir o abonar facturas PPD posteriores, ofrece aplicar ese saldo. Agrega el catálogo `CuentaBancaria` y campos de cuenta ordenante/beneficiaria en `Pago`, requeridos según la forma de pago (transferencia, cheque, tarjetas) y emitidos en el nodo `Pago` del REP 2.0 solo cuando aplique. El cobro se registra sin timbrar; el REP se timbra después, con alertas por el plazo del día 10 del mes siguiente. El REP solo incluye el importe aplicado, nunca el excedente. Impide cancelar un pago cuyo saldo a favor ya fue consumido.
