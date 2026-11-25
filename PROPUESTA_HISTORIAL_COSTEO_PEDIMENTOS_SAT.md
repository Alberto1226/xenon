# Plan de Implementación: Historial y Costeo de Pedimentos SAT (Excel & PDF)

**Fecha:** 25 de Noviembre de 2026  
**Proyecto:** Xenon ERP (Sapper / Svelte 3 / Node.js / MongoDB)  
**Módulo:** Centro de Reportes (`src/routes/app/reportes`) ➔ Card: **Historial y Costeo de Pedimentos SAT**  
**Estatus:** 📋 PROPUESTA TÉCNICA Y DE DISEÑO PARA APROBACIÓN  

---

## 1. Visión y Objetivo del Módulo

Se plantea el desarrollo del reporte oficial **"Historial y Costeo de Pedimentos SAT"**, activando la **Card 3** del Centro de Reportes y Exportaciones (`/app/reportes`).

Este módulo proporcionará a la Dirección, Contabilidad y Comercio Exterior una **herramienta integral de auditoría, trazabilidad y costeo fiscal** que consolidará **el 100% de los datos capturados en los pedimentos**:
1. **Identificación Aduanera SAT:** Número de pedimento oficial (15 dígitos), clave (`A1`), patente, aduana de despacho, régimen (`IMD`), COVE y datos del proveedor internacional.
2. **Valores Base y Tipo de Cambio:** Tipo de cambio oficial liquidado, valor comercial en USD y valor en aduana en MXN.
3. **Contribuciones e Incrementables SAT:** DTA, PRV, IGI, CNT, Fletes y Seguros (M3), desglosando el IVA de importación 100% acreditable (excluido del costo fiscal).
4. **Gastos Indirectos y Bitácora de Comprobantes:** Honorarios de Agente Aduanal (con UUID obligatorio), maniobras, gastos extraordinarios y **devoluciones / reembolsos (saldos negativos)** debidamente respaldados con CFDI / factura y RFC.
5. **Partidas y Productos con Costeo Fiscal Unitario:** Secuencia de partidas, fracción arancelaria, NICO, SKU, descripción, cantidad de piezas, precio de compra en USD, gastos directos por partida y el **Costo Fiscal Unitario MXN definitivo prorrateado (bajo método PEPS - Art. 41 LISR)**.

---

## 2. Experiencia de Usuario (UX/UI): Modal de Parámetros y Vista Previa

Al hacer clic en **"Configurar y Exportar"** en la Card correspondiente, se abrirá un modal de pantalla ancha que conserva la misma línea gráfica, distribución limpia y velocidad del reporte de inventario:

```
+----------------------------------------------------------------------------------------------------+
| 🚢 Reporte de Historial y Costeo de Pedimentos SAT                                             [X] |
| Auditoría fiscal consolidada de cargamentos arribados, prorrateo y desglose de gastos              |
+----------------------------------------------------------------------------------------------------+
| FILTROS Y PARÁMETROS:                                                                              |
| [ Fecha Inicio: 2026-01-01 📅 ] [ Fecha Fin: 2026-11-25 📅 ] [ Estatus: Arribados ▾ ] [ Actualizar]|
| Rango rápido: [Hoy] [7 días] [Este Mes] [Mes Anterior] [Año en Curso]   Buscar: [No. Pedimento / RFC]|
+----------------------------------------------------------------------------------------------------+
| RESUMEN EJECUTIVO / KPIS EN VIVO:                                                                  |
| +------------------+ +------------------+ +------------------+ +------------------+ +-------------+|
| | TOTAL PEDIMENTOS | | PIEZAS IMPORTADAS| | VALOR ADUANA MXN | | GASTOS INDIRECTOS| | COSTO FISCAL ||
| | 12 Pedimentos    | | 48,500 piezas    | | $8,420,150.00    | | $2,369,669.00    | | $10,789,819 ||
| +------------------+ +------------------+ +------------------+ +------------------+ +-------------+|
+----------------------------------------------------------------------------------------------------+
| VISTA PREVIA (5 Pedimentos Muestra):                                                               |
| # | No. Pedimento      | Clave | Fecha     | Proveedor            | T.C.    | Gastos Ind.  | Estatus   |
|---|--------------------|-------|-----------|----------------------|---------|--------------|-----------|
| 1 | 26 16 3387 6500374 | A1    | 02/02/2026| GUANGDONG ZEALWELL...| 17.2532 |$2,369,669.00 | Arribado  |
| 2 | 26 16 3387 6500385 | A1    | 15/03/2026| SHENZHEN YUAN GLOBAL | 17.4120 |  $420,500.00 | Arribado  |
+----------------------------------------------------------------------------------------------------+
| [ Cancelar ]                                               [ Descargar Excel (.xlsx) ] [ PDF (.pdf]|
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Estrategia de Estructuración de Datos: Cómo resolver la complejidad (Excel y PDF)

Dado que un pedimento contiene **datos de cabecera, impuestos SAT, múltiples partidas de productos, múltiples facturas de gastos y devoluciones de anticipo**, acomodar todo en una sola tabla plana horizontal resulta caótico o incomprensible. Por ello se implementará una estructura especializada para cada formato:

### A. Estructura del Libro de Excel (.xlsx) — Formato Multi-Hojas

El archivo `.xlsx` contendrá **3 hojas estructuradas y vinculadas**, organizando la información contable con claridad profesional:

```
📘 Archivo: Reporte_Costeo_Pedimentos_SAT_2026-01-01_al_2026-11-25.xlsx
├── 📄 Hoja 1: "Resumen_Pedimentos" (Visión Contable Ejecutiva)
│   - Columnas: #, No. Pedimento, Clave, Fecha, Aduana, Patente, Régimen, COVE, Proveedor, País, T.C. Oficial,
│     Valor Comercial USD, Valor Aduana MXN, Fletes M3, Seguros M3, DTA, PRV, IGI, CNT,
│     Agente Aduanal, Otros Gastos Brutos, (-) Devoluciones/Reembolsos, Gastos Netos,
│     IVA Importación (100% Acreditable - Referencial), Costo Total Fiscal Consolidado, Cantidad de Partidas, Total Piezas.
│
├── 📄 Hoja 2: "Detalle_Partidas_Productos" (Kardex de Costeo por Producto)
│   - Columnas: No. Pedimento, Fecha, Secuencia Partida (#), Fracción Arancelaria, NICO,
│     Código/SKU Xenon, Nombre/Descripción del Producto, Marca, Modelo,
│     Cantidad de Piezas, Unidad de Medida, Precio Compra USD, Valor Comercial USD, Valor Aduana Partida MXN,
│     Gastos Prorrateados Asignados MXN, Gastos Directos Partida MXN,
│     Costo Fiscal Unitario MXN (Final), Costo Total Partida MXN.
│
└── 📄 Hoja 3: "Gastos_Facturas_Devoluciones" (Bitácora de Soporte Fiscal)
    - Columnas: No. Pedimento, Tipo de Movimiento (Gasto Extra, Agente Aduanal, Flete, Seguro, Devolución/Reembolso),
      Concepto / Descripción, Monto MXN (Positivos y Negativos), UUID CFDI (Folio Fiscal SAT),
      Serie y Folio Factura, RFC Proveedor / Agente, Razón Social Proveedor, Fecha Gasto, Observaciones.
```

> [!TIP] **Ventaja para Contabilidad y Auditoría:**  
> Esta división permite que el área contable filtre las facturas por UUID en la Hoja 3, revise el margen y costo unitario de cada producto en la Hoja 2, y cuadre las pólizas de importación en la Hoja 1, todo en el mismo archivo.

---

### B. Estructura del Reporte en PDF (.pdf) — Cédula Fiscal de Auditoría

El documento PDF se generará en formato **apaisado (*Landscape / Carta horizontal*)** con diseño institucional tipo expediente fiscal:

1. **Encabezado Institucional:** Logotipo de Xenon, folio del reporte, usuario emisor, fecha y resumen ejecutivo del período.
2. **Cédula por cada Pedimento:** Cada pedimento se presenta en una sección bien delimitada que incluye:
   - **Bloque A - Datos Generales SAT:** No. Pedimento destacado, Fecha, Clave, T.C., Proveedor, Aduana, Patente, Estatus.
   - **Bloque B - Balanza de Costos y Prorrateo (2 columnas):**
     - *Columna Izquierda (SAT M3):* Valor USD, Valor Aduana MXN, Fletes, Seguros, Impuestos Deducibles (DTA+PRV+IGI).
     - *Columna Derecha (Indirectos y Comprobantes):* Honorarios Agente Aduanal, Otros Gastos Brutos, **(-) Devoluciones / Reembolsos**, Total Neto Indirectos, **Total Prorrateado**.
     - *Nota Fiscal:* IVA de Importación identificado como 100% acreditable.
   - **Bloque C - Tabla de Partidas y Productos:**
     - Columnas: `# Sec`, `Código / SKU`, `Descripción Producto`, `Piezas`, `Precio USD`, `Valor Aduana MXN`, `Costo Fiscal Unitario MXN`, `Importe Total Partida MXN`.
   - **Bloque D - Tabla de Comprobantes Fiscales y Devoluciones:**
     - Listado de CFDI asociados: Concepto, Folio/Factura, RFC, UUID SAT y Monto (los montos negativos de devoluciones resaltados en rojo con signo negativo).
3. **Pie de Página con Totales Consolidados:** Sumatorias generales de piezas, valor aduana, gastos indirectos y costo fiscal del período.

---

## 4. Matriz de Datos Capturados en el Sistema

Todos los campos del modelo `Pedimento` (`src/models/pedimento.js`) serán extraídos y presentados:

| Categoría | Campos Técnicos en Base de Datos | Mapeo en Reporte |
| :--- | :--- | :--- |
| **Cabecera SAT** | `numero_pedimento`, `clave_pedimento`, `fecha_pedimento`, `tipo_cambio`, `aduana_despacho`, `patente`, `regimen`, `cove`, `status`, `fecha_arribo` | Datos del Pedimento |
| **Proveedor** | `proveedor.nombre`, `proveedor.tax_id`, `proveedor.pais` | Datos de Origen |
| **Valores SAT** | `valor_dolares`, `valor_aduana_mxn` | Valores Declarados |
| **Contribuciones** | `contribuciones_sat.dta`, `prv`, `igi`, `cnt`, `iva` (o `impuestos.*`) | Impuestos Deducibles y Exclusión IVA |
| **Incrementables M3** | `incrementables_sat.fletes`, `seguros`, `otros` | Incrementables de Costo |
| **Gastos Indirectos** | `gastos_importacion.Agente_Aduanal`, `honorarios_agente[]`, `gastos_costo[]`, `otros[]` | Gastos Adicionales de Almacén |
| **Devoluciones** | `gastos_importacion.otros[monto < 0]` | Reembolsos / Anticipos devueltos (-) |
| **Comprobantes CFDI** | `uuid_cfdi`, `factura.numero`, `factura.uuid`, `proveedor.rfc`, `proveedor.nombre` | Soporte Fiscal CFDI |
| **Productos / Partidas** | `sec`, `nico`, `fraccion_arancelaria`, `producto._id`, `cantidad`, `unidad_medida`, `precio_compra_usd`, `valor_aduana_partida_mxn`, `costo_fiscal_unitario_mxn`, `gastos_adicionales[]` | Catálogo de Mercancía Costeada |

---

## 5. Arquitectura Técnica y Componentes a Desarrollar

```
src/
├── services/
│   └── reportePedimentosService.js          <-- [NUEVO] Servicio de agregación y cálculo consolidado
├── routes/
│   └── app/
│       └── reportes/
│           ├── index.svelte                 <-- [MODIFICAR] Activar Card 3, nuevo modal y handlers
│           └── pedimentos/
│               ├── preview.js               <-- [NUEVO] POST: KPIs y 5 pedimentos muestra
│               ├── excel.js                 <-- [NUEVO] POST: Generador XLSX multi-pestaña (SheetJS)
│               └── pdf.js                   <-- [NUEVO] POST: Generador PDF apaisado (PDFKit)
```

### Componentes clave:
1. **`src/services/reportePedimentosService.js`**:
   - Recibe: `{ fecha_inicio, fecha_fin, estatus, buscar }`.
   - Consulta la colección `pedimentos` aplicando filtros por `fecha_pedimento` (o `fecha_arribo`).
   - Realiza `$lookup` / populate con la colección `productos` para obtener SKU, nombre y categoría en caso de requerirse.
   - Ejecuta la agregación de gastos indirectos, separando gastos brutos vs devoluciones y calculando los costos fiscales consolidados.
2. **`src/routes/app/reportes/pedimentos/preview.js`**:
   - Devuelve en JSON: `kpis` ejecutivos y `muestra` (los primeros 5 pedimentos con sus totales).
3. **`src/routes/app/reportes/pedimentos/excel.js`**:
   - Genera el archivo XLSX con las 3 pestañas especializadas usando SheetJS.
4. **`src/routes/app/reportes/pedimentos/pdf.js`**:
   - Genera el PDF apaisado con PDFKit, membrete, cédulas por pedimento y tabla de comprobantes UUID.
5. **`src/routes/app/reportes/index.svelte`**:
   - Se retira el estado deshabilitado de la Card 3 (`Historial y Costeo de Pedimentos SAT`).
   - Se agrega el modal reactivo de parámetros y preview.

---

## 6. Plan de Ejecución Paso a Paso

1. **Fase 1: Servicio Backend de Datos (`reportePedimentosService.js`)**
   - Construcción del extractor de datos de `Pedimento` con soporte completo de partidas, gastos positivos, devoluciones negativas y comprobantes CFDI.
2. **Fase 2: Endpoints de Consulta y Exportación**
   - Creación de `preview.js`, `excel.js` (3 pestañas con formato y anchos de columna) y `pdf.js` (cédulas de pedimentos con tablas anidadas).
3. **Fase 3: Integración Frontend en el Hub de Reportes (`index.svelte`)**
   - Activación de la Card 3 en `/app/reportes`.
   - Implementación del modal con filtros de fecha, selector de estatus, buscador, KPIs y tabla muestra interactiva.
   - Conexión de descarga reactiva para Excel y PDF.
4. **Fase 4: Verificación y Pruebas**
   - Prueba con los pedimentos reales de la base de datos (validando que los $2,352,345 de gastos y -$50,000 de devoluciones cuadren exactamente en el neto de $2,302,345 y en el prorrateo de los productos).

---

> [!IMPORTANT]
> **Solicitud de retroalimentación:**  
> Por favor revisa este plan de implementación. Si estás de acuerdo con la estructura multi-hoja de Excel, el diseño de cédula de auditoría en PDF y los filtros planteados, indícame para proceder de inmediato con la programación del servicio y los componentes.
