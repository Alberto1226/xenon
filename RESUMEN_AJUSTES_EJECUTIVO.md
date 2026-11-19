# Resumen Ejecutivo: Ajustes Contables en Pedimentos de Importación

**Fecha de Implementación:** 2026-11-19  
**Equipo Solicitante:** Contabilidad y Finanzas de Xenon  
**Módulo:** Importaciones (`src/routes/app/pedimentos`)  
**Estatus:** ✅ 100% IMPLEMENTADO Y OPERATIVO  

---

## 🎯 Objetivo Logrado

Alinear el costeo fiscal y comercial del módulo de pedimentos con las normas tributarias mexicanas (**Ley del IVA Arts. 4 y 5**, **LISR Art. 41**, **Ley Aduanera** y **NIF C-4**), garantizando inventarios con costos reales no inflados, trazabilidad fiscal mediante CFDIs y soporte de gastos directos e indirectos sin dependencias de modelos externos.

---

## 📊 Matriz de Solicitudes y Solución Implementada

| # | Solicitud Contable | Estado | Justificación y Solución Implementada |
|---|-------------------|:------:|---------------------------------------|
| 1 | **Excluir IVA de importación del costo** | ✅ Resuelto | **Crítico:** El IVA aduanal pagado es 100% acreditable. Sumarlo inflaba artificialmente el inventario y distorsionaba el margen bruto. Se excluye al 100% del costo unitario fiscal y se reporta en auditoría como impuesto recuperable. |
| 2 | **Prorrateo de todos los gastos e incrementables** | ✅ Resuelto | **Crítico:** Se distribuyen DTA, PRV, IGI, Fletes, Seguros, Honorarios de Agente y Gastos Adicionales (maniobras, almacenajes, demoras). Soporta saldos negativos para devoluciones de anticipos aduanales. |
| 3 | **Gastos directos por producto (partida)** | ✅ Resuelto | Permite imputar costos adicionales específicos a una partida individual (ej. permisos Cofepris o embalaje especial), sumándolos a su costo unitario sin alterar el prorrateo de los demás productos. |
| 4 | **Trazabilidad fiscal con CFDI / Factura** | ✅ Resuelto | Cada gasto adicional cuenta con captura de UUID CFDI (36 caracteres), folio de factura, RFC y razón social del proveedor para auditorías del SAT. |
| 5 | **Arquitectura nativa (sin modelos extras)** | ✅ Resuelto | Todo se administra dentro de la estructura nativa del pedimento (`gastos_importacion.otros` y `productos[].gastos_adicionales`), descartando colecciones separadas para evitar redundancia y desincronización de datos. |
| 6 | **Valuación PEPS y fórmulas documentadas** | ✅ Resuelto | Valuación fijada a PEPS (LISR Art. 41). Se agregaron modales interactivos de consulta de fórmulas y previsualización con comparativa de costo anterior vs nuevo costo y diferencia en pesos. |
| 7 | **Uso de montos directos en MXN del pedimento** | ✅ Resuelto | Los cálculos de costeo fiscal ahora toman directamente los importes en pesos mexicanos (`valor_aduana_partida_mxn` / `importe_precio_pagado_mxn`) emitidos por el pedimento oficial del SAT, evitando recálculos y discrepancias por redondeo de Tipo de Cambio (USD × TC). Las fórmulas y vistas reflejan la base en MXN. |
| 8 | **Simplificación de metodologías (Opciones A y B)** | ✅ Resuelto | Se ocultaron del selector y del modal explicativo las opciones C (Mixto) y D (Fijo manual) que no aplican a la normativa actual de la empresa, dejando activas únicamente las opciones A (Ad-Valorem SAT) y B (Unitario). |

---

## 🛠️ Resumen de Archivos Modificados y Creados

### Archivos Modificados:
1. **`src/models/pedimento.js`**
   - Incorpora soporte de `Seguro` en gastos de importación.
   - Campos de trazabilidad fiscal (`uuid_cfdi`, `proveedor`, `factura`, `fecha_gasto`, `observaciones`) en gastos indirectos y partidas.
   - Campo `metodo_valuacion: 'PEPS'` fijo por normativa.
   - Corrección de sintaxis a módulo ES (`import mongoose from 'mongoose'`).

2. **`src/routes/app/pedimentos/index.svelte`**
   - Modal unificado *"Registrar / Editar gasto adicional"* con campos fiscales completos.
   - Menú contextual desplegable por partida para agregar o ver gastos directos específicos.
   - Menú desplegable `Acciones ▾` por pedimento (calcular, ver cargos, editar, eliminar) eliminando botones redundantes.
   - Modal informativo rápido *"Cargos y Devoluciones Extra"* para consultar desglose de CFDI y gastos por partida sin entrar a edición.
   - Modal interactivo de *"Información de Fórmulas"* enfocado en Ad-Valorem SAT y Unitario con base en MXN.
   - Modal de *"Previsualizar Costos Fiscales"* con comparativa antes/después y variaciones.
   - Corrección de compatibilidad para Svelte 3 (reemplazo de `?.` y `{@const}`).
   - Corrección de reactividad inmutable al agregar, editar o quitar gastos en pedimentos existentes.

3. **`src/routes/app/pedimentos/calcular_fiscales.js`**
   - Conexión con el servicio de cálculo fiscal.
   - Actualización directa de subdocumentos en `pedimento.productos` resolviendo incompatibilidades de casting de Mongoose.
   - Generación de bitácora de auditoría detallada en la respuesta JSON.

### Archivos Nuevos Creados:
1. **`src/services/calcularFiscalesService.js`**
   - Motor puro de cálculo contable y prorrateo con soporte directo de montos en MXN del pedimento SAT (`valor_aduana_partida_mxn`).
   - Soporte para montos negativos (devoluciones/reembolsos de anticipos aduanales).
   - Aislamiento de lógica de negocio comprobada con pruebas unitarias.

2. **`src/services/validacionPedimentoService.js`**
   - Reglas de validación previas al costeo fiscal del pedimento.

---

## 💡 Impacto Contable y Financiero

- **Margen Comercial Real:** Al no absorber el IVA acreditable en el costo de la mercancía, el costo de venta fiscal es exacto y no castiga injustificadamente la utilidad bruta.
- **Auditoría Transparente:** La empresa cuenta con el respaldo de los UUID de los comprobantes fiscales digitales vinculados a cada gasto y prorrateo.
- **Claridad Operativa:** La previsualización de costos antes del guardado definitivo previene errores humanos en compras e importaciones.
