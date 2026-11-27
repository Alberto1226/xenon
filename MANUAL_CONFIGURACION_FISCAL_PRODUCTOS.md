# Manual de Configuración Fiscal de Productos para Facturación CFDI 4.0

**Sistema Xenon ERP**  
*Versión del Documento: 1.0 — Noviembre 2026*  
*Autor: Equipo de Desarrollo y Soporte Xenon*

---

## 1. Introducción y Objetivo

El presente instructivo detalla los campos fiscales obligatorios que deben configurarse en cada producto del catálogo de **Xenon ERP** para garantizar la correcta emisión de comprobantes fiscales digitales por internet bajo el estándar **CFDI 4.0** ante el SAT y el PAC CUCC.

Para que una factura individual o global pueda timbrarse exitosamente, el SAT exige que todos los conceptos facturados cuenten con su clasificación oficial de productos, unidad de medida estandarizada, determinación de objeto de impuesto y tasa impositiva correspondiente.

---

## 2. Acceso a la Configuración Fiscal del Producto

**Ruta en el sistema:**  
`Menú Principal > Productos > Lista de Productos > Botón Editar en el Producto` (`/app/productos/editar?id=...`)  
O bien al registrar un artículo nuevo en `Menú Principal > Productos > Nuevo Producto` (`/app/productos/nuevo`).

Al ingresar a la pantalla de edición, desplázate hasta la **Sección 2: Configuración Fiscal SAT (Claves y tasas para facturación CFDI 4.0)**, identificada con encabezado morado y la insignia **CFDI 4.0**.

---

## 3. Interfaz de Configuración Fiscal de Productos

![Configuración Fiscal SAT en Productos](https://docs.google.com)

---

## 4. Detalle y Guía de los Campos Fiscales Obligatorios

Tal como destaca el panel informativo del sistema:  
> **"Datos obligatorios para facturación electrónica. Independientes de pedimentos y costos de importación."**

A continuación se detalla cada uno de los 5 parámetros fiscales requeridos:

---

| Campo en Xenon | Atributo SAT (CFDI 4.0) | Tipo de Dato | Descripción y Regla Fiscal SAT | Valores Comunes / Recomendados |
| :--- | :--- | :--- | :--- | :--- |
| **Clave Producto/Servicio** | `ClaveProdServ` | Clave de 8 dígitos | Código del catálogo oficial `c_ClaveProdServ`. Clasifica la naturaleza del producto vendido. Dispone de buscador predictivo en tiempo real por clave numérica o por descripción. | • `25172900` (Accesorios o refacciones para vehículos)<br>• `39101600` (Lámparas y bombillas / focos LED)<br>• `39111500` (Sistemas y equipos de iluminación) |
| **Clave de Unidad SAT** | `ClaveUnidad` | Clave alfanumérica | Unidad de medida fiscal según catálogo `c_ClaveUnidad`. Debe ser congruente con la unidad de comercialización del producto. Dispone de buscador predictivo por clave o nombre. | • `H87` - Pieza<br>• `KT` - Kit (conjunto de elementos)<br>• `XPK` - Paquete<br>• `SET` - Conjunto<br>• `XBX` - Caja |
| **Objeto de Impuesto (SAT)** | `ObjetoImp` | Menú desplegable | Clave oficial del catálogo `c_ObjetoImp`. Notifica al SAT si la venta de este producto es objeto de gravamen de impuestos indirectos (IVA/IEPS). | • `01 - No objeto de impuesto`<br>• `02 - Sí objeto de impuesto` *(Estándar comercial)*<br>• `03 - Sí objeto, no obligado al desglose`<br>• `04 - Sí objeto, no causa impuesto` |
| **IVA en Venta** | `TasaOCuota / TipoFactor` | Menú desplegable | Tasa de Impuesto al Valor Agregado aplicable en territorio mexicano para la venta del artículo. Requerido cuando Objeto de Impuesto es `02`. | • `Tasa 16%` *(General en México)*<br>• `Tasa 8%` *(Estímulo franja fronteriza)*<br>• `Tasa 0%` *(Gravado a tasa cero)*<br>• `Exento`<br>• `No aplica` |
| **IEPS Venta (%)** | `TasaOCuota (IEPS)` | Número porcentual | Tasa de Impuesto Especial sobre Producción y Servicios. Si el artículo no causa IEPS, debe permanecer en `0.00`. | • `0.00` *(Predeterminado para iluminación, refacciones y misceláneos)* |

---

## 5. Búsqueda Asistida de Claves SAT en el Sistema

El formulario cuenta con componentes de búsqueda predictiva en tiempo real:

1. **Búsqueda por Clave:** Si conoces el código oficial de 8 dígitos (por ejemplo `39101600`), escribe los dígitos directamente en el recuadro para que el sistema sugiera la clave oficial correspondiente.
1. **Búsqueda por Nombre:** Escribe palabras clave del producto (ejemplo: *"led"*, *"bombilla"*, *"arnés"*, *"foco"*, *"farola"*) para filtrar los resultados autorizados por el catálogo del SAT sin salir de la plataforma.
1. **Unidad de Medida:** Puedes teclear *"pieza"* para que sugiera `H87 - Pieza`, o *"kit"* para seleccionar `KT - Kit`.

---

## 6. Validación Preventiva y Bloqueo en la Facturación

Si un producto no tiene configurados sus datos fiscales y se intenta facturar un pedido que lo contiene:

1. **Alerta en la Preparación de Factura:**  
   En la ventana modal de preparación de factura (`/app/pedidos` o `/app/facturacion/emitir`), el sistema mostrará una advertencia roja en la base de la pantalla:  
   > **"No se puede timbrar todavía: configura ClaveProdServ, ClaveUnidad, ObjetoImp e impuestos de venta en cada producto."**
1. **Identificación del Producto Incompleto:**  
   En la tabla de productos del pedido, se resaltará en rojo la leyenda:  
   - `ClaveProdServ: Falta configurar`  
   - `ClaveUnidad: Falta configurar`  
   - `ObjetoImp: Falta configurar`  
   - `IVA venta: Falta configurar`  
1. **Botón de Guardado Deshabilitado:**  
   El botón **"Guardar datos de facturación"** y los botones de timbrado permanecerán inactivos hasta que todos los productos del pedido se encuentren debidamente catalogados. Esto previene penalizaciones o rechazos con errores del PAC como el código *CFDI40141* o *CFDI40145*.

---

## 7. Relación entre Datos Fiscales y Pedimentos Aduanales

Es importante distinguir entre la configuración base del catálogo y los datos aduanales:

- **Datos Fiscales del Catálogo (Configuración Permanente):**  
  Son los explicados en este manual (`ClaveProdServ`, `ClaveUnidad`, `ObjetoImp`, `IVA`). Se configuran una sola vez por cada producto en su ficha técnica y aplican a todas las ventas de dicho producto.
- **Pedimento Aduanal (Asignación por Lote / Pedido):**  
  Aplica únicamente cuando el producto es de origen importado. El número de pedimento de 15 dígitos se selecciona durante la preparación de la factura a partir de los pedimentos registrados y costeados en el módulo de Comercio Exterior.

---

## 8. Pasos para Guardar la Configuración

1. Tras capturar los campos en la **Sección 2**, desplázate a la parte inferior de la pantalla de edición de producto.
1. Haz clic en el botón azul **"Guardar Producto"**.
1. El sistema confirmará la actualización mediante una notificación emergente verde.
1. A partir de ese momento, cualquier pedido nuevo o existente que incluya ese producto podrá facturarse de manera inmediata.

---

*Para dudas sobre la clave de producto SAT adecuada para mercancías específicas, consulte al área contable de la empresa o a Soporte Técnico Isotech.*
