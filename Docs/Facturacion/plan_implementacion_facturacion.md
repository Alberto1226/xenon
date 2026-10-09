# Plan de Implementación: Módulo de Facturación Electrónica CFDI 4.0 (PAC CUCC)

> **Estado del código:** ya se puede preparar y solicitar el timbrado individual de un `Pedido` desde sus acciones de enviados. Se guardan metadatos y UUID en MongoDB; el XML y PDF Base64 devueltos por CUCC solo viven en memoria y las descargas posteriores se piden al PAC. El precio de cada línea se interpreta como el importe final cobrado, impuestos incluidos; el CFDI separa IVA/IEPS del importe sin aumentar el total del pedido. Los productos requieren ClaveProdServ, ClaveUnidad y tratamiento fiscal SAT. El pedimento se agrega por línea únicamente si se marca como importada.
>
> Esta entrega **no** implementa facturación global, cancelación, REP/complementos de pago, retenciones ni IEPS por cuota fija. El timbrado real requiere perfil y CSD activos en CUCC y una confirmación explícita por factura en producción. No se ejecutó ninguna emisión real durante el desarrollo.
>
> Las casillas de las fases siguientes describen el plan original; no implican que todas las funciones indicadas (en especial cancelación, global y REP) estén disponibles en el código actual.

Este documento describe el plan paso a paso para la arquitectura, desarrollo e integración del **Módulo de Facturación Electrónica CFDI 4.0 con PAC CUCC** en el sistema Xenon. Incluye la gestión del **Perfil Fiscal**, subida de **CSD (.cer, .key, contraseña)**, la opción **Facturas Emitidas**, integración de **Pedimentos (Información Aduanera para productos de primera mano)**, persistencia de facturación en el arreglo `facturacion` en **Carritos y Pedidos** (evitando pérdida de archivos al desplegar), emisión de comprobantes (PUE/PPD) y complementos de pago.

---

## ⚠️ Estrategia de Almacenamiento Persistente en Base de Datos

> [!IMPORTANT]
> **No dependencia del almacenamiento en disco local**: Debido a que en el servidor de Xenon los despliegues borran los archivos estáticos guardados en el disco, **NO se almacenarán archivos `.xml` o `.pdf` en el sistema de archivos local**.

### Solución de Arquitectura:
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
 ├── 3. Emitir Factura (Nueva Factura individual o consolidada a partir de Pedidos/Carritos)
 └── 4. Complementos de Pago (REP 2.0 / CFDI Tipo P para facturas PPD)
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
  - Botón y Modal para "Solicitar Cancelación SAT" (motivos 01 a 04 y UUID de sustitución).

---

### Fase 3: Distinción de Primera Mano y Asignación de Pedimentos
- [x] Agregar la propiedad `es_primera_mano` en el modelo y formulario de edición/creación de `Producto`.
- [x] Vincular el número de pedimento de la partida/producto al momento de generar los conceptos del comprobante.
- [x] Incluir el nodo `<cfdi:InformacionAduanera NumeroPedimento="YY  AA  CCCC  NNNNNNN" />` dentro de cada `<cfdi:Concepto>` si el producto es de primera mano/importación.

---

### Fase 4: Motor XML CFDI 4.0, Servicio SOAP CUCC y Emisión de Facturas
- [x] Crear `src/services/cfdiXmlService.js`:
  - Generador XML estricto CFDI 4.0 (Encabezado, Emisor, Receptor, Conceptos con pedimentos, Impuestos, InformacionGlobal si aplica `XAXX010101000` con `Año`).
  - Inyección del complemento placeholder obligatorio `<tfd:TimbreFiscalDigital />`.
- [x] Crear `src/services/cuccPacService.js`:
  - Envío SOAP `doInvoice` (Base64).
  - Registro de los metadatos timbrados en el arreglo `facturacion` del Carrito/Pedido y en la colección central `Factura`.
  - Envío SOAP `cancelInvoice` con actualización de estatus a 'Cancelada' en el arreglo `facturacion`.
- [x] Pantalla **Emitir Factura** (`src/routes/app/facturacion/emitir/index.svelte`).
- [x] Pantalla **Complementos de Pago REP 2.0** (`src/routes/app/facturacion/pagos/index.svelte`).

---

## 🚀 Pasos Inmediatos para Iniciar

1. Implementar la **Fase 1**:
   - Modificar los modelos Mongoose `Carrito` y `Pedido` agregando el esquema del arreglo `facturacion`.
   - Crear los modelos `ConfiguracionFiscal` y `FolioConfig`.
   - Crear las rutas backend en `/app/facturacion/perfil-fiscal` para datos emisor, subida de CSD (`multipart/form-data`) a CUCC y sincronización.
   - Diseñar e implementar la vista de **Perfil Fiscal** (`/app/facturacion/perfil-fiscal/index.svelte`).
   - Agregar la sección **Facturación** en `side_panel.svelte` con sus 4 opciones:
     1. Perfil Fiscal
     2. Facturas Emitidas
     3. Emitir Factura
     4. Complementos de Pago
