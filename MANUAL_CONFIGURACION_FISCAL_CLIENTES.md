# Manual de Configuración de Datos Fiscales del Cliente para Facturación CFDI 4.0

**Sistema Xenon ERP**  
*Versión del Documento: 1.0 — Noviembre 2026*  
*Autor: Equipo de Desarrollo y Soporte Xenon*

---

## 1. Introducción y Objetivo

Bajo la versión **CFDI 4.0** del Servicio de Administración Tributaria (SAT), la emisión de facturas electrónicas requiere una validación estricta y en tiempo real de la identidad fiscal de los clientes receptores. El SAT coteja directamente contra sus listas oficiales (LCO / EFOS) que el **RFC**, la **Razón Social**, el **Código Postal del Domicilio Fiscal** y el **Régimen Fiscal** coincidan con exactitud milimétrica.

Este documento explica cómo capturar, validar y mantener actualizados los datos fiscales de los clientes en **Xenon ERP**, así como el uso del lector automatizado de **Constancia de Situación Fiscal (CSF)** en PDF.

---

## 2. Acceso al Formulario de Datos del Cliente

**Ruta en el sistema:**  
`Menú Principal > Clientes > Lista de Clientes > Botón Editar / Ficha de Cliente` (`/app/clientes/DatosCliente?id=...`)  
O bien al registrar un cliente nuevo desde `Menú Principal > Clientes > Nuevo Cliente` (`/app/clientes/nuevo`).

---

## 3. Interfaz de Configuración de Clientes

[IMAGEN_CONFIGURACION_CLIENTE]

---

## 4. Función Inteligente: Cargar Constancia SAT (Lector PDF)

Para evitar errores humanos de captura y agilizar el alta de clientes, el sistema incorpora el botón azul **"Cargar Constancia SAT"**:

1. **Cómo utilizarlo:**
   - Solicita al cliente su **Constancia de Situación Fiscal (CSF)** reciente emitida por el SAT en formato PDF.
   - En la ficha del cliente, haz clic en el botón azul **"Cargar Constancia SAT"**.
   - Selecciona el archivo PDF desde tu equipo.
2. **Extracción Automática:**  
   El motor inteligente de Xenon procesa el documento en segundos y extrae de forma nativa:
   - **RFC** oficial.
   - **Tipo de Persona:** Detecta automáticamente si es `FISICA` o `MORAL`.
   - **Razón Social / Nombre Oficial:** Extrae la denominación limpia, eliminando automáticamente los regímenes societarios que el SAT prohíbe en CFDI 4.0 (ej. remueve `S.A. DE C.V.`, `S. DE R.L. DE C.V.`).
   - **Código Postal:** C.P. oficial de 5 dígitos registrado ante el SAT.
   - **Domicilio Fiscal Completo:** Entidad Federativa (Estado), Municipio/Alcaldía, Colonia, Calle, Números Exterior e Interior y Entre Calles.
3. **Modal de Confirmación Flexible:**  
   Una vez procesado el archivo, el sistema despliega una ventana modal con opciones para que el usuario decida qué datos aplicar:
   - **Solo Datos Fiscales:** Aplica únicamente el RFC, Tipo de Persona, Razón Social y Régimen, preservando las direcciones de entrega previas.
   - **Datos Fiscales + Domicilio Completo:** Actualiza tanto el expediente fiscal como la dirección predeterminada de despacho.

---

## 5. Catálogo de Campos Fiscales y Reglas SAT CFDI 4.0

A continuación se detalla cada campo fiscal, su atributo normativo y las consideraciones esenciales:

---

| Campo en Xenon | Atributo SAT (CFDI 4.0) | Regla Fiscal SAT / Consideraciones | Valores Típicos y Ejemplos |
| :--- | :--- | :--- | :--- |
| **RFC** | `Rfc` | Longitud exacta de 12 caracteres para personas morales o 13 para personas físicas. Sin espacios ni guiones. | • Persona Moral: `ABC010203XYZ`<br>• Persona Física: `GOME800101ABC`<br>• Público General: `XAXX010101000`<br>• Extranjero: `XEXX010101000` |
| **Nombre / Razón Social** | `Nombre` | **Obligatorio en Mayúsculas.** Debe coincidir exactamente con el campo *Denominación / Razón Social* de la Constancia. **NO incluir el régimen de capital** (prohibido poner `S.A. DE C.V.`, `S.A.P.I.`, etc.). | • `NUEVA WAL MART DE MEXICO`<br>• `DISTRIBUIDORA AUTOMOTRIZ DEL CENTRO`<br>• `MERCADO LIBRE 32` |
| **Tipo de Persona** | N/A (Interno) | Clasificación para filtrar automáticamente los regímenes y usos de CFDI autorizados por el SAT para cada contribuyente. | • `FISICA`<br>• `MORAL` |
| **Uso del CFDI** | `UsoCFDI` | Clave del catálogo `c_UsoCFDI`. Destino fiscal que el receptor dará al comprobante. Depende del Régimen Fiscal del cliente. | • `G01 - Adquisición de mercancías`<br>• `G03 - Gastos en general`<br>• `S01 - Sin efectos fiscales`<br>• `CP01 - Pagos` (para complementos REP) |
| **Régimen Fiscal** | `RegimenFiscalReceptor` | Clave del catálogo `c_RegimenFiscal`. Debe ser uno de los regímenes tributarios en los que el cliente tributa activamente según su CSF. | • `601 - General de Ley Personas Morales`<br>• `612 - Personas Físicas con Actividades Empresariales`<br>• `626 - Régimen Simplificado de Confianza (RESICO)`<br>• `616 - Sin obligaciones fiscales` |
| **Código Postal (C.P.)** | `DomicilioFiscalReceptor` | Código postal de 5 dígitos del domicilio fiscal del receptor registrado ante el SAT. Si difiere aunque sea en un dígito, el PAC rechazará la factura. | • `26015`, `76000`, `06000`, etc. |

---

## 6. Domicilio Fiscal vs. Domicilio de Entrega

El sistema Xenon ERP separa claramente los fines fiscales de los fines logísticos:

1. **Domicilio Fiscal (SAT):**  
   Se define principalmente por el **Código Postal (C.P.)** y la Entidad Federativa. Es el valor que se plasma en el XML oficial del CFDI 4.0 y que valida el PAC CUCC.
1. **Domicilio de Entrega (Rutas y Paqueterías):**  
   Son los campos detallados de **Calle**, **Nº Exterior**, **Nº Interior**, **Colonia**, **Entre Calles** e **Indicaciones**. Se utilizan para la logística de almacén, etiquetado de cajas, guías de envío (Paquetexpress, FedEx, etc.) y hojas de reparto de pedidos enviados.
1. **Casilla "Usar como Predeterminada":**  
   Marca la dirección capturada como la principal para la generación automática de pedidos y cotizaciones del cliente.

---

## 7. Precarga Automática en la Emisión de Facturas

Cuando un agente o facturista genera una factura desde **Pedidos Enviados** (`/app/pedidos`) o desde **Facturación Emitir** (`/app/facturacion/emitir`):

- El sistema localiza al cliente vinculado al pedido y **autocompleta de inmediato** el RFC, Razón Social, C.P., Tipo de Persona, Uso CFDI y Régimen Fiscal.
- Si el cliente tiene su expediente completo, el facturista solo debe seleccionar la **Serie Fiscal**, verificar el **Método de Pago (PUE/PPD)** y pulsar timbrar.
- Si algún dato fiscal falta o está incorrecto, el modal permite editarlo directamente o muestra la indicación para completar la ficha del cliente.

---

## 8. Preguntas Frecuentes y Solución de Rechazos del PAC

### ¿Por qué el PAC CUCC arroja el error "CFDI40145 - El campo Nombre del receptor no corresponde"?
Ocurre cuando la Razón Social incluye el régimen societario (ej. `S.A. DE C.V.`). Para solucionarlo, abre la ficha del cliente y elimina las siglas societarias dejando únicamente el nombre base registrado en el SAT.

### ¿Qué error se produce si el Código Postal no coincide con el SAT?
El PAC devolverá el error *CFDI40147*. La única fuente válida para resolverlo es consultar la Cédula o Constancia de Situación Fiscal actualizada del cliente y corregir el C.P. en su expediente.

### ¿Cómo facturar a un cliente que no solicita factura nominativa?
Se utiliza el RFC genérico nacional `XAXX010101000`, Razón Social `PUBLICO EN GENERAL`, Código Postal del emisor (o del lugar de expedición), Uso de CFDI `S01 - Sin efectos fiscales` y Régimen Fiscal `616 - Sin obligaciones fiscales`.

---

*Para dudas adicionales sobre catálogos del SAT o asistencia técnica, contacta a Soporte Técnico Isotech.*
