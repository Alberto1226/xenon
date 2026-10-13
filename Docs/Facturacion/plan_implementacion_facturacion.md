# Plan de Implementación: Módulo de Facturación Electrónica CFDI 4.0 (PAC CUCC)

> **Estado del código (actualizado):** se puede preparar y timbrar la factura individual de un `Pedido` **PUE** desde las acciones de pedidos enviados ("Preparar factura" → `preparar_factura.js`, `guardar_preparacion_factura.js`, `emitir_factura.js`). Se guardan metadatos y UUID en MongoDB; el XML y PDF Base64 devueltos por CUCC solo viven en memoria y las descargas posteriores se piden al PAC. El precio de cada línea se interpreta como el importe final cobrado, impuestos incluidos; el CFDI separa IVA/IEPS sin aumentar el total del pedido. Los productos requieren ClaveProdServ, ClaveUnidad y tratamiento fiscal SAT.
>
> **Origen y pedimento:** ya no se usa `es_primera_mano`. En la preparación, cada concepto se marca **Importado** o **Nacional**; si es importado se elige un pedimento del producto y se agrega `<cfdi:InformacionAduanera>` (15 dígitos, formato `YY  AA  CCCC  NNNNNNN`, después de `<cfdi:Impuestos>`). Esto se pide siempre; el interruptor `requerir_pedimentos` de Catálogos quedó sin efecto. El CP fiscal del receptor se toma de la dirección del cliente.
>
> **Aún NO implementado:** pantalla Emitir Factura (hoy informativa), facturas PPD, Complementos de Pago (REP), cancelación ante el SAT, factura global, retenciones e IEPS por cuota fija. Las pantallas `/app/facturacion/emitir` y `/app/facturacion/pagos` son marcadores. El timbrado real requiere perfil y CSD activos en CUCC y confirmación explícita por factura en producción; no se ha ejecutado ninguna emisión real.
>
> Las casillas marcadas reflejan el estado real del código. Las fases 5 a 8 son el plan de lo pendiente; el detalle técnico, riesgos y prompts están en [plan-facturacion-ppd.md](./plan-facturacion-ppd.md).

Este documento describe el plan paso a paso para la arquitectura, desarrollo e integración del **Módulo de Facturación Electrónica CFDI 4.0 con PAC CUCC** en el sistema Xenon. Incluye la gestión del **Perfil Fiscal**, subida de **CSD (.cer, .key, contraseña)**, la opción **Facturas Emitidas**, integración de **Pedimentos (Información Aduanera para productos de primera mano)**, persistencia de facturación en el arreglo `facturacion` en **Carritos y Pedidos** (evitando pérdida de archivos al desplegar), emisión de comprobantes (PUE/PPD) y complementos de pago.

---

## ⚠️ Estrategia de Almacenamiento Persistente en Base de Datos

> [!IMPORTANT]
> **No dependencia del almacenamiento en disco local**: Debido a que en el servidor de Xenon los despliegues borran los archivos estáticos guardados en el disco, **NO se almacenarán archivos `.xml` o `.pdf` en el sistema de archivos local**.

### Solución de Arquitectura:
> **Regla vigente:** la facturación se hace **solo sobre `Pedido`** (documento ya entregado). El `Carrito` es temporal: al pasar a Entregado se copia a `Pedido` con un `_id` nuevo y se borra, y Mongoose descarta los campos que el esquema destino no tenga. La clave estable entre ambas colecciones es el **folio**. Ver Fase 5.

1. **Arreglo `facturacion` en Carritos y Pedidos**:
   Tanto en la colección `carritos` como en `pedidos`, se agregará el arreglo `facturacion` que resguardará el historial de comprobantes timbrados y cancelados vinculados a la venta:
   ```javascript
   facturacion: [
     {
       uuid: String,                   // UUID fiscal de 36 caracteres
       serie: String,                  // Serie (ej. F, CON, GLO)
       folio: String,                  // Consecutivo fiscal
       fecha_emision: Date,            // Fecha de timbrado
       total: Number,                  // Monto total del CFDI
       rfc_receptor: String,           // RFC del cliente
       razon_social_receptor: String,  // Razón Social del cliente
       metodo_pago: String,            // PUE o PPD
       forma_pago: String,             // Clave SAT (01, 03, 04, 99)
       status: String,                 // 'Vigente', 'Cancelada'
       fecha_cancelacion: Date,        // Fecha si fue cancelada
       motivo_cancelacion: String,     // Clave SAT (01, 02, 03, 04)
       uuid_sustitucion: String        // Si el motivo fue 01
     }
   ]
   ```
2. **Descarga Directa en Tiempo Real desde PAC CUCC**:
   Al consultar o solicitar la descarga del XML o PDF desde la pantalla de **Facturas Emitidas**, el backend consultará directamente a la API REST de CUCC mediante:
   - `GET https://cucc.com.mx/v2/api-cucc/public/api/facturacion/descargar/{uuid}/xml`
   - `GET https://cucc.com.mx/v2/api-cucc/public/api/facturacion/descargar/{uuid}/pdf`
   O a través de la llamada SOAP `doInvoice` / `cancelInvoice` que retorna las cadenas Base64 al vuelo, garantizando disponibilidad total de los comprobantes vigentes y cancelados sin importar los despliegues en el servidor.

---

## 📸 Integración con API REST CUCC

1. **Obtener Mi Perfil Fiscal Emisor**: `GET /api/perfil/me`
2. **Actualizar Datos Fiscales Emisor**: `PUT /api/perfil/me`
3. **Subida de Certificados de Sello Digital (CSD) y Logo**: `POST /api/perfil/me/csd` (`multipart/form-data`: `certificado`, `llave`, `pass_ccrtificado`, `logo`)
4. **Descargar XML / PDF desde CUCC**: `GET /api/facturacion/descargar/{uuid}/{tipo}` (`tipo = xml | pdf`)

---

## 🎯 Estructura de Opciones en el Menú "Facturación"

En `side_panel.svelte` se habilitará el módulo **Facturación** con las siguientes opciones:

```
Facturación 🧾
 ├── 1. Perfil Fiscal (Datos Emisor, CSD .cer/.key, Contraseña y Logo)
 ├── 2. Facturas Emitidas (Consulta de CFDI vigentes/cancelados, descarga XML/PDF via CUCC y Cancelación SAT)
 ├── 3. Emitir Factura (PPD / ventas a crédito sobre pedidos enviados; las ventas PUE se preparan desde el modal de Pedidos)
 └── 4. Complementos de Pago (recepción de abonos a N facturas, saldo a favor y REP 2.0 / CFDI Tipo P)
```

---

## 🛠️ Fases de Desarrollo e Implementación

### Fase 1: Perfil Fiscal, Modelos BD y Navegación en Menú Lateral
- [x] Extender los esquemas Mongoose `Carrito` y `Pedido` agregando el campo `facturacion: [FacturacionSchema]`.
- [x] Crear el modelo Mongoose `ConfiguracionFiscal` (`src/models/configuracion_fiscal.js`):
  - Datos emisor (`rfc`, `razon_social`, `regimen_fiscal`, `cp`)
  - Credenciales PAC (`soap_user`, `soap_pass_encrypted`, `client_id`, `client_secret`)
  - CSD metadata (`certificado_nombre`, `llave_nombre`, `csd_cargado`: Boolean)
- [x] Crear el modelo `FolioConfig` (`src/models/folio_config.js`) para series y folios.
- [x] Crear endpoints backend:
  - `GET /app/facturacion/perfil-fiscal`: Consulta perfil local y sincroniza con `GET /api/perfil/me` de CUCC.
  - `POST /app/facturacion/perfil-fiscal/actualizar-datos`: Actualiza datos fiscales emisor local y llama a `PUT /api/perfil/me` en CUCC.
  - `POST /app/facturacion/perfil-fiscal/subir-csd`: Recibe los archivos `.cer`, `.key`, contraseña CSD e imagen de Logo (`multipart/form-data`) y los reenvía a `POST /api/perfil/me/csd` en CUCC.
  - `POST /app/facturacion/perfil-fiscal/probar-conexion`: Prueba login OAuth2 y llamada SOAP al PAC.
- [x] Crear la pantalla de **Perfil Fiscal** (`src/routes/app/facturacion/perfil-fiscal/index.svelte`).
- [x] Actualizar `side_panel.svelte` agregando la sección **Facturación** con las 4 opciones desplegables.

---

### Fase 2: Facturas Emitidas (Historial Persistente y Descargas desde CUCC)
- [x] Crear el endpoint `GET /app/facturacion/facturas-emitidas`:
  - Recopila las facturas registradas en la colección `Factura` y en los arreglos `facturacion` de `carritos` y `pedidos`.
  - Soporta filtros por rango de fechas, RFC de receptor, folio, UUID y estado (Vigente / Cancelada).
- [x] Crear el endpoint `GET /app/facturacion/descargar-comprobante/:uuid/:tipo`:
  - En lugar de leer un archivo del disco de Xenon, solicita dinámicamente el XML o PDF al PAC CUCC (`/api/facturacion/descargar/{uuid}/{tipo}`) o retorna la cadena Base64 resguardada, sirviendo la descarga directa al navegador.
- [x] Crear la pantalla de **Facturas Emitidas** (`src/routes/app/facturacion/facturas-emitidas/index.svelte`):
  - Tabla paginada de comprobantes fiscalmente vigentes y cancelados.
  - Indicadores visuales de estado SAT (Vigente / Cancelada).
  - Botones "Descargar XML" y "Descargar PDF" (consultando a CUCC).
  - [ ] Botón y Modal para "Solicitar Cancelación SAT" (motivos 01 a 04 y UUID de sustitución): pendiente, Fase 8.

---

### Fase 3: Distinción de Primera Mano y Asignación de Pedimentos
- [x] ~~Propiedad `es_primera_mano`~~: sustituida por el origen (Importado/Nacional) y el pedimento elegido por concepto en `preparacion_factura`.
- [x] Vincular el número de pedimento del pedimento elegido al generar los conceptos del comprobante.
- [x] Incluir el nodo `<cfdi:InformacionAduanera NumeroPedimento="YY  AA  CCCC  NNNNNNN" />` dentro de cada `<cfdi:Concepto>` si el concepto se marcó como importado.

---

### Fase 4: Motor XML CFDI 4.0, Servicio SOAP CUCC y Emisión de Facturas
- [x] Crear `src/services/cfdiXmlService.js`:
  - Generador XML estricto CFDI 4.0 (Encabezado, Emisor, Receptor, Conceptos con pedimentos, Impuestos, InformacionGlobal si aplica `XAXX010101000` con `Año`).
  - Inyección del complemento placeholder obligatorio `<tfd:TimbreFiscalDigital />`.
- [x] Crear `src/services/cuccPacService.js`:
  - Envío SOAP `doInvoice` (Base64).
  - Registro de los metadatos timbrados en el arreglo `facturacion` del Carrito/Pedido y en la colección central `Factura`.
  - [ ] Envío SOAP `cancelInvoice` con actualización de estatus a 'Cancelada' (pendiente, ver Fase 8).
- [ ] Pantalla **Emitir Factura** (`emitir/index.svelte`): hoy solo informativa; se implementa en la Fase 6.
- [ ] Pantalla **Complementos de Pago REP 2.0** (`pagos/index.svelte`): hoy marcador; se implementa en la Fase 7.

---

### Fase 5: Cierre de PUE y seguridad de datos entre Carrito y Pedido
- [ ] El modal "Preparar factura" solo permite **PUE** (se quita el selector de método de pago; el PPD se rechaza en `guardar_preparacion_factura.js`).
- [ ] Esquema compartido de `preparacion_factura` y `facturacion` en `Carrito`, `Carrito_cancelado` y `Pedido`, para que `cambiar_status_a_entregado`, `cancelar_pedido` y `salidas/finalizar/[idRuta].js` no pierdan datos fiscales.
- [ ] Bloquear `cancelar_pedido` si el pedido tiene un CFDI vigente.
- [ ] `Factura`: guardar `folio_pedido` y actualizar `pedido_id` cuando un carrito pase a pedido.

### Fase 6: Emitir Factura PPD (ventas a crédito)
- [ ] Ampliar `Factura` con `saldo_pendiente`, `total_pagado`, `status_pago`, `fecha_limite`, `condiciones_pago`.
- [ ] Pantalla `/app/facturacion/emitir`: buscar pedidos enviados sin factura, formulario de receptor y conceptos reutilizado del modal (componente compartido), método PPD fijo, forma de pago 99 y condiciones de crédito. Reutiliza `guardar_preparacion_factura.js` (parámetro `tipo`) y `emitir_factura.js`.
- [ ] `cfdiXmlService.js`: `CondicionesDePago` en el comprobante PPD.

### Fase 7: Recepción de pagos y Complemento de Pago 2.0
Un pago del cliente es **un solo registro** que se reparte en N facturas con un importe por cada una; se timbra como un CFDI tipo P con N `DoctoRelacionado`.
- [ ] Modelos `Pago`, `MovimientoSaldoCliente` (libro de saldo a favor) y `CuentaBancaria`; `Cliente.saldo_a_favor` como cache.
- [ ] Reglas confirmadas: solo MXN; si paga de más el excedente queda como **saldo a favor** y se ofrece aplicarlo en facturas PPD siguientes; se registra banco y cuenta de origen y destino según la forma de pago; el cobro se registra primero y el REP se timbra después (plazo: día 10 del mes siguiente al pago).
- [ ] Servicio `pagosService` con actualizaciones atómicas condicionadas, compensación e idempotencia.
- [ ] Pantalla `/app/facturacion/pagos`: cliente → facturas con saldo → importe por factura (automático FIFO, liquidar, manual) → registro y historial.
- [ ] `construirREP20` en `cfdiXmlService.js` y endpoint de timbrado del REP con los estados `emitiendo`/`fallido`/`requiere_revision`.

### Fase 8: Cuentas por cobrar, cancelaciones y reportes
- [ ] `cuentas-por-cobrar`: antigüedad de saldos, vencidas y saldo a favor por cliente; estado de cuenta.
- [ ] Cancelación SAT de facturas (`cancelInvoice`) y de pagos/REP, con reversa de saldos.
- [ ] Un pago no se cancela si su saldo a favor ya fue consumido.

---

## 🚀 Pasos Inmediatos

1. **Fase 5** (PUE solo en el modal y paridad de esquemas Carrito/Pedido), porque protege los datos antes de agregar crédito.
2. **Fase 6** (Emitir Factura PPD) con el saldo en `Factura`.
3. **Fase 7** (pagos, saldo a favor y REP) y después la **Fase 8**.

Las fases 1 a 4 ya están implementadas, salvo lo marcado como pendiente en ellas (cancelación y las dos pantallas marcador).
