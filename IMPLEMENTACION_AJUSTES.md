# Plan y Documentación Técnica de Implementación: Pedimentos de Importación

**Fecha de Actualización:** 2026-11-19  
**Módulo:** Importaciones y Pedimentos (`src/routes/app/pedimentos`)  
**Estatus:** ✅ IMPLEMENTADO Y VERIFICADO  

---

## 1. Arquitectura del Módulo

El sistema utiliza una arquitectura consolidada alrededor del modelo `Pedimento`, evitando modelos satélite o colecciones adicionales:

```
src/
├── models/
│   └── pedimento.js                   # Modelo unificado con soporte fiscal, PEPS y UUIDs
├── services/
│   ├── calcularFiscalesService.js     # Motor puro de cálculo y prorrateo contable
│   └── validacionPedimentoService.js  # Validaciones previas de integridad fiscal
└── routes/app/pedimentos/
    ├── calcular_fiscales.js           # Endpoint POST de ejecución/preview de cálculo
    ├── editar.js                      # Endpoint POST de edición de pedimento
    ├── crear.js                       # Endpoint POST de alta de pedimento
    ├── lista.js                       # Endpoint POST de listado paginado
    └── index.svelte                   # Vista integral en Svelte 3
```

---

## 2. Reglas Contables y Fiscales Implementadas

### A. Exclusión del 100% del IVA Acreditable (LIVA Art. 4-5 y NIF C-4)
- **Regla:** El IVA liquidado en la importación definitiva es un impuesto acreditable contra el IVA cobrado, no forma parte del costo de adquisición del inventario.
- **Implementación:** En `calcularFiscalesService.js`, la sumatoria de gastos deducibles a prorratear incluye únicamente:
  $$\text{Gastos a Prorratear} = \text{Impuestos Deducibles (DTA + PRV + IGI)} + \text{Fletes} + \text{Seguros} + \text{Honorarios Agente} + \text{Otros Gastos}$$
- El IVA se conserva y muestra en auditoría contable como `iva_acreditable_excluido`.

### B. Gastos Directos vs. Gastos Indirectos
- **Gastos Indirectos (`gastos_importacion.otros`):** Se prorratean entre todas las partidas del pedimento mediante la metodología elegida. Soportan montos negativos para registrar devoluciones o reembolsos de anticipo del agente aduanal.
- **Gastos Directos (`productos[i].gastos_adicionales`):** Asignados exclusivamente a un producto específico. Se dividen entre el número de piezas de esa partida y se suman directamente a su costo unitario:
  $$\text{Gasto Directo Unitario} = \frac{\sum \text{Monto}(\text{gastos\_adicionales})}{\text{Cantidad de Piezas}}$$

### C. Metodologías de Prorrateo Soportadas

El sistema toma directamente los importes en pesos (**MXN**) liquidados en el pedimento del SAT (`valor_aduana_partida_mxn` o `importe_precio_pagado_mxn`), evitando distorsiones por conversión de Tipo de Cambio (`USD × TC`). En caso de pedimentos manuales sin desglose MXN, cuenta con un fallback a `Cantidad × Precio USD × TC`.

$$\text{Precio Base Unitario MXN} = \frac{\text{Valor Aduana Partida MXN}}{\text{Cantidad}}$$

1. **Opción A: Ad-Valorem (SAT - Recomendada):**
   - Distribuye los gastos indirectos en proporción al valor comercial en pesos de cada partida:
     $$\text{Total Compra Comercial MXN} = \sum \text{Valor Aduana Partida MXN}$$
     $$\text{Factor} = \frac{\text{Total Gastos Indirectos (sin IVA)}}{\text{Total Compra Comercial MXN}}$$
     $$\text{Costo Fiscal Unitario Base MXN} = \text{Precio Base Unitario MXN} \times (1 + \text{Factor})$$

2. **Opción B: Unitario por Piezas:**
   - Equitativo por cada unidad física importada, ideal para contenedores homogéneos:
     $$\text{Total Piezas} = \sum \text{Cantidad de Piezas}$$
     $$\text{Gasto / Pieza} = \frac{\text{Total Gastos Indirectos (sin IVA)}}{\text{Total Piezas}}$$
     $$\text{Costo Fiscal Unitario Base MXN} = \text{Precio Base Unitario MXN} + \text{Gasto / Pieza}$$

> **Nota:** Las opciones históricas C (Mixto) y D (Factor Fijo Manual) se mantienen en el motor pero están ocultas en la interfaz para estandarizar el cumplimiento normativo con el SAT y NIF C-4.

### D. Devoluciones y Reembolsos de Anticipo
- **Saldos negativos:** Se permite capturar gastos con monto negativo en `gastos_importacion.otros` (por ejemplo, devolución de anticipo no ejercido por la agencia aduanal).
- **Afectación en indirectos:** El monto negativo resta automáticamente del total de gastos a prorratear, evitando sobrecosteos en el inventario.

---

## 3. Trazabilidad Fiscal con CFDI / Factura

Tanto en `gastos_importacion.otros` como en `productos[i].gastos_adicionales`, cada registro almacena:
```javascript
{
  concepto: String,
  monto: Number,           // Positivo para gastos, negativo para reembolsos
  fecha_gasto: Date,
  uuid_cfdi: String,       // Folio Fiscal de 36 caracteres
  proveedor: {
    nombre: String,
    rfc: String
  },
  factura: {
    numero: String,
    uuid: String,
    fecha_emision: Date
  },
  observaciones: String
}
```

---

## 4. Soluciones Técnicas Destacadas

1. **Compatibilidad con Svelte 3:**
   - Sustitución de encadenamiento opcional (`?.`) y directivas `{@const}` incompatibles con la versión de Svelte del proyecto por funciones auxiliares seguras (`calcularCostoBase`, `calcularGastoDirecto`, `calcularGastoIndirecto`).
2. **Reactividad Inmutable en Listas Anidadas:**
   - Para garantizar que la interfaz se redibuje de inmediato al agregar, editar o remover gastos en un pedimento existente, se utilizó reasignación explícita de referencias:
     ```javascript
     pedimentoEditar.gastos_importacion.otros = [...pedimentoEditar.gastos_importacion.otros];
     pedimentoEditar = { ...pedimentoEditar };
     ```
3. **Mongoose Subdocument Array Updating:**
   - Se evitó la sobreescritura directa de arrays Mongoose (`pedimento.productos = [...]`) que causaba errores de `Cast to Array failed`, actualizando las propiedades unitarias directamente sobre los subdocumentos existentes.
4. **Compatibilidad de Módulos ES:**
   - Migración de `var mongoose = require('mongoose')` a `import mongoose from 'mongoose'` en `src/models/pedimento.js`.
5. **Menú de Acciones Desplegable y Modal de Auditoría Rápida:**
   - Se unificaron las operaciones en un dropdown `Acciones ▾` por fila en la lista de pedimentos (evitando botones exteriores redundantes).
   - Se agregó la opción y modal interactivo **"Ver Cargos y Devoluciones"**, permitiendo consultar de forma transparente los gastos indirectos con CFDI/facturas y los gastos directos asignados a partidas sin tener que ingresar a editar.
6. **Costeo Directo en Pesos (MXN):**
   - El motor de cálculo prioriza `valor_aduana_partida_mxn` sobre conversiones con `USD × TC`, asegurando coincidencia centavo a centavo con la liquidación fiscal del pedimento oficial.
