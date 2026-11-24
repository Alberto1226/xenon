# Propuesta Técnica y de Diseño: Módulo de Reportes & Reporte de Inventario

**Fecha:** 2026-11-24  
**Proyecto:** Xenon ERP (Sapper / Svelte 3 / Node.js / MongoDB)  
**Módulo:** Centro de Reportes (`src/routes/app/reportes`)  
**Estatus:** 📋 PROPUESTA PARA REVISIÓN Y APROBACIÓN  

---

## 1. Visión General del Módulo

Se plantea la creación de una **nueva sección principal** en el sistema denominada **"Reportes"**, accesible directamente desde el menú lateral (`side_panel.svelte`). 

Esta sección funcionará como un **Hub Central de Inteligencia y Reportería**, donde el usuario encontrará un catálogo visual de reportes organizados por tarjetas (*Cards*), permitiendo a futuro incorporar múltiples reportes (ventas, cobranza, fiscal, utilidades) con una experiencia homogénea.

Cada reporte contará con:
1. **Modal de Configuración de Parámetros:** Selección de rango de fechas, filtros y opciones.
2. **KPIs en Vivo:** Tarjetas con métricas acumuladas del período seleccionado.
3. **Muestra Rápida (Preview):** Tabla interactiva con **5 registros muestra** para que el usuario verifique la congruencia de los datos antes de exportar.
4. **Exportación Dual:** Botones de descarga directa en **Excel (.xlsx)** y **PDF (.pdf)**.

---

## 2. Ubicación y Navegación en el Sistema

### A. Menú Lateral (`src/routes/_layouts/side_panel.svelte`)
Se integrará una nueva pestaña de primer nivel:

```javascript
{
  url: "/app/reportes",
  titulo: "Reportes",
  icono: "assessment", // o "summarize"
  roles: ["administrador", "gerente", "almacen", "ComercioExterior"],
  subitems: [
    {
      titulo: "Catálogo de Reportes",
      url: "/app/reportes",
      icono: "dashboard"
    },
    {
      titulo: "Inventario y Kardex",
      url: "/app/reportes?tipo=inventario",
      icono: "inventory_2"
    },
    {
      titulo: "Utilidades y Ventas",
      url: "/app/reportes/utilidades",
      icono: "trending_up"
    }
  ]
}
```

---

## 3. Catálogo de Reportes (Vista Principal en Cards)

Al ingresar a `/app/reportes`, el usuario verá una cuadrícula moderna de tarjetas (*Cards*):

```
+---------------------------------------------------------------------------------------+
|  📊 Centro de Reportes y Exportaciones                                                |
|  Selecciona un reporte para configurar sus parámetros y descargarlo en Excel o PDF.   |
|                                                                                       |
|  [ Todos ]   [ Inventario & Almacén ]   [ Ventas & Facturación ]   [ Finanzas & Costos ]|
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  +-----------------------------------+   +-----------------------------------+        |
|  | 📦 INVENTARIO Y KARDEX            |   | 📈 UTILIDADES Y RENTABILIDAD      |        |
|  | Entradas, Salidas y Existencias   |   | Comparativa Costo Fiscal vs Venta |        |
|  | ───────────────────────────────── |   | ───────────────────────────────── |        |
|  | Movimientos de almacén calculados |   | Análisis de margen comercial por  |        |
|  | a partir de inyecciones y         |   | pedimento, producto y cliente.    |        |
|  | descuentos de pedidos en fecha.   |   |                                   |        |
|  |                                   |   |                                   |        |
|  | Formatos: [XLSX] [PDF]            |   | Formatos: [XLSX] [PDF]            |        |
|  | [ Configurar Reporte ➔ ]          |   | [ Ver Reporte ➔ ]                 |        |
|  +-----------------------------------+   +-----------------------------------+        |
|                                                                                       |
|  +-----------------------------------+   +-----------------------------------+        |
|  | 🚢 PEDIMENTOS Y COSTOS FISCALES   |   | 👥 VENTAS POR AGENTE / CLIENTE    |        |
|  | Costeo PEPS y Prorrateo SAT       |   | Desempeño Comercial               |        |
|  | (Próximamente)                    |   | (Próximamente)                    |        |
|  +-----------------------------------+   +-----------------------------------+        |
+---------------------------------------------------------------------------------------+
```

---

## 4. Primer Reporte: "Entradas, Salidas y Existencias de Inventario"

### A. Fuente de Datos: `Producto_snaplog` y `Producto`
El cálculo se fundamenta en la colección de trazabilidad de almacén de Xenon, diferenciando estrictamente entre **movimientos físicos de existencias** y **movimientos virtuales de carrito/apartados**:

| Acción en `Producto_snaplog` | Clasificación | Efecto en Existencias Físicas | Considerado en Reporte |
| :--- | :--- | :---: | :---: |
| `accion === "1"` / `"1c"` | **Inyección a Inventario** | **Aumenta (+) existencias** | **SÍ (Entrada)** |
| `accion === "2"` | **Descuento de Inventario** (surtido de pedidos) | **Disminuye (-) existencias** | **SÍ (Salida)** |
| `accion === "3"` | **Ajuste Manual Admin** (sobreescritura) | $\Delta$ Existencias (después - antes) | **SÍ (+Entrada o -Salida)** |
| `accion === "4a"` | **Agregar a pedido (Nuevo)** | Solo afecta apartados (0 cambio físico) | ❌ **EXCLUIDO (Solo Carrito)** |
| `accion === "4b"` | **Cambiar cantidad en pedido** | Solo afecta apartados (0 cambio físico) | ❌ **EXCLUIDO (Solo Carrito)** |
| `accion === "4c"` | **Borrar de pedido / Cancelado** | Solo libera apartados (0 cambio físico) | ❌ **EXCLUIDO (Solo Carrito)** |
| `accion === "4d"` / `"pendiente"` | **Modificación / Pendiente** | Solo afecta apartados (0 cambio físico) | ❌ **EXCLUIDO (Solo Carrito)** |

> ⚠️ **Regla Crítica de Auditoría:** Las acciones `4a`, `4b`, `4c`, `4d` corresponden a la operativa de preventa y carritos de clientes. No representan salidas de mercancía del almacén (el camión aún no surte el pedido). Por ello, el motor de reportería filtra exclusivamente las acciones con impacto físico (`1`, `1c`, `2`, `3`), garantizando que las salidas no se dupliquen ni se inflen por carritos modificados o cancelados.

Desde la colección `Producto` se obtienen:
* `codigo`: SKU / Clave interna.
* `nombre`: Descripción completa del producto.
* `category.nombre`: Familia o categoría.
* `existencia.actual`: Existencias vivas en el sistema al momento de consulta.
* `precio`: Precio de lista / venta unitario.

### B. Parámetros Confirmados por el Usuario (24 Nov 2026)
1. **Precio a Reportar:** Exclusivamente **Precio de Venta** (`precio` del catálogo de productos).
2. **Productos sin Movimiento:** Se incluyen **todos los productos** del catálogo; aquellos sin inyecciones ni salidas en el rango seleccionado se reportan con `Entradas = 0`, `Salidas = 0` y su existencia actual viva.
3. **Selector de Inactivos:** Se incorpora un selector/checkbox interactivo: **"Incluir productos desactivados / descontinuados"** (`activo: false`). Por defecto viene desmarcado para reportar solo productos vigentes, pero el usuario puede activarlo a demanda.

---

## 5. Diseño UX/UI del Modal de Selección y Previsualización

Al pulsar **"Configurar Reporte"** en la Card de Inventario, se abre un modal de pantalla ancha (máx. 1020px):

```
+--------------------------------------------------------------------------------------------------+
| 📦 Parámetros: Reporte de Entradas, Salidas y Existencias                                    [X] |
+--------------------------------------------------------------------------------------------------+
| 1. Rango de Fechas del Movimiento:                                                               |
|    [ Fecha Inicio: 2026-10-01 📅 ]   [ Fecha Fin: 2026-11-24 📅 ]                                |
|    Accesos rápidos: ( Hoy )  ( Últimos 7 días )  [ Este Mes ]  ( Mes Anterior )  ( Año en Curso )|
|                                                                                                  |
| 2. Filtros y Opciones del Catálogo:                                                              |
|    [✓] Incluir productos desactivados (inactivos)                                                |
|    Categoría: [ Todas las categorías ▾ ]   Buscar Producto: [ Escribe SKU o nombre...         ] |
+--------------------------------------------------------------------------------------------------+
| 📊 Resumen Ejecutivo del Período Seleccionado:                                                    |
| +--------------------+ +--------------------+ +--------------------+ +--------------------+       |
| | Total Productos    | | Piezas Entradas    | | Piezas Salidas     | | Valor Inventario   |       |
| | 495 SKU activos    | | +18,420 pzas       | | -12,150 pzas       | | $2,845,920.00 MXN  |       |
| +--------------------+ +--------------------+ +--------------------+ +--------------------+       |
+--------------------------------------------------------------------------------------------------+
| 👁️ Vista Previa (5 Registros Muestra):                                                          |
| #  | SKU / Código | Producto                     | Entradas (+) | Salidas (-) | Existencia | P. Unitario |
| ---|-------------|------------------------------|-------------:|------------:|-----------:|------------:|
| 1  | LED-D2C     | LED D2C HEADLIGHT KIT        |     200 pza  |      18 pza |    182 pza |     $360.00 |
| 2  | CA-BX30011  | CAJA AMP. DOWNFIRE 10" 450W  |     600 pza  |     145 pza |    455 pza |     $850.00 |
| 3  | CA-BX22065  | CAJA AMP. BOOM BOX 6.5" 320W |     200 pza  |      80 pza |    120 pza |     $890.00 |
| 4  | BAL-H4-55W  | BALASTRA XENON H4 55W SLIM   |     500 pza  |     320 pza |    180 pza |     $145.00 |
| 5  | FOCO-H7-6K  | FOCO XENON H7 6000K DIAMOND  |   1,000 pza  |     650 pza |    350 pza |      $95.00 |
|                                                                                                  |
| ℹ️ Mostrando 5 registros de muestra. El archivo descargado incluirá los 495 productos completos. |
+--------------------------------------------------------------------------------------------------+
|                                    [ Cancelar ]   [ 📗 Descargar Excel ]   [ 📕 Descargar PDF ]  |
+--------------------------------------------------------------------------------------------------+
```

---

## 6. Algoritmo de Agrupación y Cálculo

Para calcular de manera ultra-rápida y precisa los movimientos de cientos de productos sin ralentizar la base de datos:

1. **Pipeline de Agregación en MongoDB:**
   ```javascript
   const matchStage = {
     fecha: { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) }
   };

   const movimientosAgrupados = await Producto_snaplog.aggregate([
     { $match: matchStage },
     {
       $group: {
         _id: "$producto.id",
         totalEntradas: {
           $sum: { $cond: [{ $eq: ["$accion", "1"] }, "$cantidad", 0] }
         },
         totalSalidas: {
           $sum: { $cond: [{ $eq: ["$accion", "2"] }, "$cantidad", 0] }
         },
         conteoMovimientos: { $sum: 1 }
       }
     }
   ]);
   ```

2. **Cruce con Catálogo `Producto`:**
   Se complementa con la existencia actual, precio de lista, categoría y código de cada producto.
   - Si un producto no tuvo movimientos en el rango de fechas seleccionado, se puede configurar si se incluye con entradas=0 y salidas=0 o si se omiten productos inactivos.

---

## 7. Formatos de Salida

### A. Exportación a Excel (.xlsx)
* **Librería:** `xlsx` (SheetJS), ya instalada nativamente en el proyecto.
* **Estructura del archivo:**
  - **Fila de Título:** `XENON Y MAS - REPORTE DE MOVIMIENTOS DE INVENTARIO`
  - **Metadatos:** Rango de Fechas, Fecha y Hora de Generación, Usuario solicitante.
  - **Encabezados estilizados:** Código, Nombre del Producto, Categoría, Entradas (+), Salidas (-), Movimiento Neto, Existencias Actuales, Precio Unitario (MXN), Valor Total Estimado (MXN).
  - **Fila de Totales:** Sumatorias automáticas de cantidades y valores monetarios.

### B. Exportación a PDF (.pdf)
* **Librería:** `pdfmake` / `pdfkit`, ya integradas en el proyecto.
* **Estructura del documento:**
  - Encabezado institucional con logotipo de Xenon y datos de contacto.
  - Tabla limpia con tipografía legible, colores alternados (*zebra striping*) para facilitar la lectura.
  - Tarjetas de resumen en la primera página con los totales consolidados.
  - Numeración de página: `"Página X de Y"` y pie de página de control interno.

---

## 8. Arquitectura de Archivos Propuesta

```
src/
├── routes/
│   ├── _layouts/
│   │   └── side_panel.svelte             # Agregar enlace al módulo "Reportes"
│   └── app/
│       └── reportes/
│           ├── index.svelte              # Hub principal con Cards de selección
│           ├── inventario/
│           │   ├── ModalFiltrosInventario.svelte # Modal con fechas, KPI y 5 registros muestra
│           │   ├── preview.js            # Endpoint POST: KPIs y 5 registros muestra
│           │   ├── excel.js              # Endpoint POST: Generación del archivo .xlsx
│           │   └── pdf.js                # Endpoint POST: Generación del documento .pdf
│           └── utilidades.svelte         # Reporte de utilidades existente integrado
```

---

## 9. Plan de Implementación por Pasos

1. **Paso 1: Aprobación del Diseño y Reglas**
   - Confirmar si se desea incluir productos sin movimientos en el período (con entradas=0, salidas=0).
   - Validar si el precio unitario a mostrar es el Precio de Venta o el Costo Fiscal Unitario de Pedimento (o ambos).
2. **Paso 2: Backend de Extracción de Snaplogs**
   - Construir el servicio de agregación sobre `Producto_snaplog` con rangos de fecha y paginación muestra (5 registros).
3. **Paso 3: Frontend del Hub y Modal Interactivo**
   - Crear `/app/reportes/index.svelte` con las Cards.
   - Crear el modal con DatePickers, KPIs y tabla de 5 registros.
4. **Paso 4: Generadores de Excel y PDF**
   - Endpoint de streaming para descarga de `.xlsx` y `.pdf`.
5. **Paso 5: Pruebas y Validación**
   - Validar con movimientos reales de inventario y verificar concordancia con la pantalla de `todos_los_movimientos`.
