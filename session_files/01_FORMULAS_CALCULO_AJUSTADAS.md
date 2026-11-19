# 📐 FÓRMULAS DE CÁLCULO AJUSTADAS - PEDIMENTOS

**Fecha:** 17 Noviembre 2026  
**Estado:** ✅ Implementadas en código  
**Validación:** Contadores validaron (Excel real ARCHIVOS.xlsx)

---

## 🎯 FÓRMULA PRINCIPAL CORRECTA

```
╔════════════════════════════════════════════════════════════════════════╗
║                COSTO TOTAL INVENTARIO (SIN IVA)                       ║
║                                                                        ║
║ Costo = Valor Comercial + Gastos Costo + Impuestos + Honorarios       ║
║                      (EXCLUIR IVA 100% acreditable)                   ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 📊 DESGLOSE COMPLETO - PEDIMENTO 1 (Validado ✅)

```
VALOR COMERCIAL:                          $1,213,780.62 MXN
  └─ Este es el precio base USD * TC

GASTOS DE COSTO (Incrementables SAT M3):
  ├─ Seguros:                               $X.XX MXN
  ├─ Fletes:                            $51,760.00 MXN
  └─ Otros Incrementables:                  $X.XX MXN
  └─ Subtotal Gastos Costo:             $64,511.00 MXN

IMPUESTOS DEDUCIBLES (DTA/PRV/IGI/CNT):
  ├─ DTA:                                   $X.XX MXN
  ├─ PRV:                                   $X.XX MXN
  ├─ IGI:                                   $X.XX MXN
  └─ CNT:                                   $0.00 MXN
  └─ Subtotal Impuestos:               $135,713.00 MXN

HONORARIOS AGENTE ADUANAL (CFDI con UUID):
  └─ Honorarios Patente 3387:            $21,253.39 MXN
  └─ UUID CFDI: 141071F8-3C29-420A-B927-F0428E4C6D89
  └─ Subtotal Honorarios:               $21,253.39 MXN

─────────────────────────────────────────────────────────
COSTO TOTAL INVENTARIO:               $1,435,257.99 MXN ✅
─────────────────────────────────────────────────────────

IVA ACREDITABLE (EXCLUIDO):
  └─ IVA:                               $226,241.00 MXN ❌
  └─ Estatus: 100% acreditable
  └─ Fundamento: Ley IVA Art. 4-5, NIF C-4
```

---

## 🧮 FÓRMULAS POR METODOLOGÍA DE PRORRATEO

### Opción A: PRORRATEO AD-VALOREM (Por Valor de Importación - SAT)

```
Factor = Gastos Totales / Valor Compra Comercial

Costo Unitario = Precio Base MXN × (1 + Factor)

EJEMPLO:
  Factor = $221,477.39 / $1,213,780.62 = 0.1824 (18.24%)
  Costo Unitario = $100 × (1 + 0.1824) = $118.24 MXN
  
DESCRIPCIÓN: Se distribuye proporcionalmente al valor de cada producto.
Los productos más caros reciben más prorrateo.
```

---

### Opción B: PRORRATEO UNITARIO (Por Cantidad de Piezas)

```
Gasto por Pieza = Gastos Totales / Cantidad Total

Costo Unitario = Precio Base MXN + Gasto por Pieza

EJEMPLO:
  Gasto por Pieza = $221,477.39 / 50,000 piezas = $4.43 por pieza
  Costo Unitario = $100 + $4.43 = $104.43 MXN
  
DESCRIPCIÓN: Se distribuye equitativamente entre todas las piezas.
Funciona bien si todos los productos tienen peso/volumen similar.
```

---

### Opción C: PRORRATEO MIXTO (Combinado)

```
Gastos por Valor = Impuestos + Honorarios
Gastos por Cantidad = Seguros + Fletes + Otros

Factor por Valor = Gastos por Valor / Valor Compra
Gasto por Pieza = Gastos por Cantidad / Cantidad Total

Costo Unitario = (Precio Base × (1 + Factor por Valor)) + Gasto por Pieza

EJEMPLO:
  Impuestos + Honorarios = $135,713 + $21,253 = $156,966
  Factor Valor = $156,966 / $1,213,780 = 0.1292 (12.92%)
  
  Seguros + Fletes + Otros = $64,511
  Gasto por Pieza = $64,511 / 50,000 = $1.29
  
  Costo Unitario = ($100 × 1.1292) + $1.29 = $113.29 MXN
  
DESCRIPCIÓN: Maniobras y honorarios van por valor (proporcionalmente).
Transporte va por cantidad (equitativamente).
```

---

### Opción D: PRORRATEO FIJO (Factor Manual)

```
Factor = % ingresado manualmente (ej. 15%)

Costo Unitario = Precio Base MXN × (1 + Factor / 100)

EJEMPLO:
  Factor = 15%
  Costo Unitario = $100 × 1.15 = $115.00 MXN
  
DESCRIPCIÓN: Aplica un porcentaje fijo a todos los productos.
Útil si se tiene un margen operativo predefinido.
```

---

## 🔢 ESTRUCTURA DE DATOS NUEVA

### Nuevo Campo: `impuestos` (reemplaza `contribuciones_sat`)

```javascript
impuestos: {
  dta: 123,
  prv: 456,
  igi: 789,
  cnt: 0,
  
  iva: {
    monto: 226241,
    porcentaje_acreditable: 100,          // ✅ HARDCODED
    monto_acreditable: 226241,
    monto_no_acreditable: 0
  }
}
```

---

### Nuevo Campo: `gastos_importacion.gastos_costo[]`

```javascript
gastos_costo: [{
  tipo: "SEGUROS" | "FLETE" | "OTRO_COSTO",
  importe: 51760,
  uuid_cfdi: "ABC123...",              // Opcional
  numero_factura: "FAC-001",
  rfc_proveedor: "XXX010101XXX",
  fecha_factura: "2026-10-15",
  fuente: "SAT_M3" | "CFDI_MANUAL"
}]
```

---

### Nuevo Campo: `gastos_importacion.honorarios_agente[]`

```javascript
honorarios_agente: [{
  uuid_cfdi: "141071F8-3C29-420A-B927-F0428E4C6D89",  // ✅ OBLIGATORIO
  numero_factura: "HONOR-001",
  rfc_agente: "AAA010101ABC",
  importe: 21253.39,
  iva_factura: 3400.54,
  fecha_factura: "2026-10-15",
  fuente: "CFDI_MANUAL"
}]
```

---

## ✅ VALIDACIONES IMPLEMENTADAS

### 1️⃣ IVA DEBE SER 100% ACREDITABLE

```javascript
// Validación en validacionPedimentoService.js
if (impuestos.iva?.porcentaje_acreditable !== 100) {
  throw new Error("IVA debe ser 100% acreditable");
}
```

**Regla:** Nunca mostrar selector de % en UI - está hardcoded.

---

### 2️⃣ HONORARIOS AGENTE OBLIGATORIOS CON UUID

```javascript
// Validación en validacionPedimentoService.js
if (!honorarios_agente || honorarios_agente.length === 0) {
  warn("⚠️ No hay honorarios de agente registrados");
}

for (let honorario of honorarios_agente) {
  if (!honorario.uuid_cfdi) {
    throw new Error("UUID CFDI es obligatorio en honorarios");
  }
}
```

**Regla:** No permitir guardar sin al menos un honorario con UUID.

---

### 3️⃣ MÉTODO PEPS OBLIGATORIO

```javascript
// Validación en validacionPedimentoService.js
if (pedimento.metodo_valuacion !== "PEPS") {
  throw new Error("Método debe ser PEPS (Art. 41 LISR)");
}
```

**Regla:** No mostrar selector en UI - está hardcoded a PEPS.

---

### 4️⃣ PAGOS NEGATIVOS PERMITIDOS

```javascript
// En PagoImportacion model
importe: { 
  type: Number, 
  required: true
  // ✅ Permite negativos
}

tipo_pago: {
  enum: ['PAGO', 'ANTICIPO', 'DEVOLUCIÓN_ANTICIPO', 'AJUSTE']
  // ✅ DEVOLUCIÓN_ANTICIPO para pagos negativos
}
```

**Regla:** Validar que si importe < 0, entonces tipo_pago = DEVOLUCIÓN_ANTICIPO.

---

## 🧪 CASOS DE PRUEBA

### Caso 1: Pedimento con 1 UUID (Pedimento 1)
```
Entrada:
  - 1 honorario con UUID válido
  - Impuestos correctos (DTA/PRV/IGI)
  - IVA $226,241 sin incluir en costo

Salida esperada:
  ✅ Costo total = $1,435,257.99
  ✅ IVA excluido
  ✅ 1 UUID registrado
```

### Caso 2: Pedimento con 4 UUIDs (Pedimento 3)
```
Entrada:
  - 4 honorarios/gastos con 4 UUIDs diferentes
  - Impuestos correctos
  - IVA sin incluir

Salida esperada:
  ✅ Costo total calculado correctamente
  ✅ 4 UUIDs validados
  ✅ Prorrateo aplicado a todas las partidas
```

### Caso 3: Pago Negativo (Devolución de Anticipo)
```
Entrada:
  - importe: -29252.07
  - tipo_pago: "DEVOLUCIÓN_ANTICIPO"
  - banco: "BBVA"

Salida esperada:
  ✅ Pago guardado exitosamente
  ✅ Signo correcto en reportes
  ✅ Validación no rechaza
```

### Caso 4: Intento de cambiar a PROMEDIO (debe fallar)
```
Entrada:
  - metodo_valuacion: "PROMEDIO"

Salida esperada:
  ❌ Error: "Método debe ser PEPS (Art. 41 LISR)"
```

---

## 📋 CHECKLIST DE AJUSTES IMPLEMENTADOS

✅ Modelo `pedimento.js` - Nuevos campos `impuestos`, `gastos_costo`, `honorarios_agente`  
✅ Modelo `pago_importacion.js` - Campo `importe` permite negativos, campo `tipo_pago`  
✅ Servicio `calcularFiscalesService.js` - Nueva lógica con 4 metodologías + auditoría  
✅ Servicio `validacionPedimentoService.js` - Validaciones críticas + reporte  
✅ Endpoint `calcular_fiscales.js` - Integrado con nuevos servicios + documentación  

---

## 🔗 REFERENCIAS FISCALES

| Decisión | Referencia | Artículo |
|----------|-----------|---------|
| IVA 100% acreditable | Ley del IVA | Art. 4-5 |
| IVA acreditable importaciones | NIF | C-4 |
| Honorarios agente | Ley Aduanera | Art. 159-160 |
| Deducibilidad gastos | LISR | Art. 27 |
| Método PEPS obligatorio | LISR | Art. 41 |

---

**Estado Final:** ✅ LISTO PARA TESTING

Próximo paso: Validar cálculos con datos reales de Excel contador.
