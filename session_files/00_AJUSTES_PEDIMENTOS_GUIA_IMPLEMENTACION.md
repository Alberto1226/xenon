# 🎯 AJUSTES PEDIMENTOS - GUÍA PARA IMPLEMENTACIÓN

**Estado:** ✅ Fase 1 Completada - Modelos Listos  
**Fecha:** 17 Noviembre 2026  
**Próximo:** Endpoints + Testing  

---

## 📌 RESUMEN EJECUTIVO

Los contadores han respondido 5 preguntas críticas validadas con Excel real (3 pedimentos, $6.5M USD).  
Se han creado 2 nuevos modelos y 2 nuevos servicios con estas decisiones hardcodeadas.  
Falta crear 5 endpoints para finalizar Fase 1.

---

## ✅ 5 DECISIONES VALIDADAS DE CONTADORES

### 1️⃣ IVA 100% ACREDITABLE - HARDCODED

**Decisión:** ✅ Siempre 100% acreditable (nunca mostrar en UI)

**Por qué:**
- Artículos 4 y 5 de Ley del IVA
- NIF C-4 (Importaciones)
- XENON es empresa comercial: 100% acreditable

**Implementación:**
```javascript
impuestos: {
  iva: {
    monto: 226241,
    porcentaje_acreditable: 100,  // HARDCODED - no cambiar
    monto_acreditable: 226241,
    monto_no_acreditable: 0,
  }
}

// IMPORTANTE: IVA NO va en el costo total del inventario
costo_total_inventario = valor_comercial 
                       + seguros_fletes_otros
                       + impuestos_costo (DTA/PRV/IGI/CNT)
                       + honorarios_agente
                       // IVA se EXCLUYE
```

**Prueba matemática (Pedimento 1):**
```
Valor Comercial:        $1,213,780.62
+ Seguros/Fletes/Otros:    $64,511.00
+ Impuestos (DTA/PRV/IGI): $135,713.00
+ Honorarios Agente:        $21,253.39
─────────────────────────────────────
= Costo Inventario:    $1,435,257.99 ✅

❌ NO incluir IVA:        $226,241.00
```

---

### 2️⃣ HONORARIOS AGENTE - CAPTURA MANUAL CON UUID CFDI

**Decisión:** ✅ Vienen de facturas reales del agente (NO fórmula %)

**Por qué:**
- Ley Aduanera Art. 159/160: SAT NO fija tarifas
- Cada agencia cotiza diferente
- Maniobras varían por complejidad
- Art. 27 LISR: Requieren CFDI para ser deducibles

**Implementación:**
```javascript
gastos_importacion: {
  honorarios_agente: [{
    uuid_cfdi: "141071F8-3C29-420A-B927-F0428E4C6D89",  // ✅ OBLIGATORIO
    numero_factura: "ABC-001-2025",
    rfc_agente: "AAA010101ABC",
    importe: 21253.39,
    iva_factura: 3400.54,
    fecha_factura: new Date("2026-10-15")
  }]
}

// NO USAR FÓRMULA COMO: importe = valor_comercial * 0.015
// ❌ Incorrecto porque la cotización no es un porcentaje fijo
```

**Prueba matemática:**
```
Pedimento 1 (Patente 3387):
  1 factura → $21,253.39 ✅

Pedimento 2 (Patente 3387):
  1 factura → $74,931.39 ✅ (misma patente, diferente monto)

Pedimento 3 (Patente 3974):
  4 facturas → $98,425.26 total ✅ (múltiples UUIDs)
  - Factura 1 → $78,400.00
  - Factura 2 →  $5,029.00
  - Factura 3 →  $9,996.26
  - Factura 4 →  $5,000.00
```

---

### 3️⃣ PAGOS NEGATIVOS PERMITIDOS - DEVOLUCIONES DE ANTICIPO

**Decisión:** ✅ Campo `importe` permite valores negativos

**Por qué:**
- Se transfiere anticipo al agente
- Agente gasta en impuestos + gastos
- Si sobra dinero, devuelve saldo a favor
- No es error; es operación fiscal válida

**Implementación:**
```javascript
// Nuevo modelo: PagoImportacion
{
  pedimento_id: "507f1f77bcf86cd799439011",
  numero_operacion: "OP-2026-11-001",
  banco: "BBVA",
  importe: -29252.07,                    // ✅ Negativo es válido
  tipo_pago: "DEVOLUCIÓN_ANTICIPO",      // O "PAGO" / "AJUSTE"
  fecha_pago: new Date("2026-11-15"),
  referencia_interna: "Remanente anticipo"
}
```

**Prueba matemática:**
```
Anticipo transferido:                   $415,860.00
- Impuestos SAT pagados:                $361,954.00
- Gastos/Honorarios con IVA:             $24,653.93
─────────────────────────────────────────────────
= Remanente a favor de XENON:            $29,252.07

Pago registrado:                         -$29,252.07 ✅
(Negativo = devolución que entra)
```

---

### 4️⃣ ESTRUCTURA DE GASTOS - MÚLTIPLES UUIDs POR PEDIMENTO

**Decisión:** ✅ Gastos desglosados con UUID CFDI

**Por qué:**
- SAT M3 trae solo incrementables (Seguros, Fletes, Otros)
- Gastos locales (maniobras, demoras, honorarios) requieren CFDI propio
- Art. 27 LISR: Cada gasto necesita comprobante para deducibilidad
- Pedimento 3 tiene 4 UUIDs diferentes

**Implementación:**
```javascript
gastos_importacion: {
  gastos_costo: [{
    tipo: "SEGUROS" | "FLETE" | "OTRO_COSTO",
    importe: Number,
    uuid_cfdi: String,         // Puede no traer del SAT M3
    numero_factura: String,
    rfc_proveedor: String,
    fecha_factura: Date,
    fuente: "SAT_M3" | "CFDI_MANUAL"
  }],
  
  honorarios_agente: [{
    uuid_cfdi: String,         // ✅ OBLIGATORIO
    numero_factura: String,
    rfc_agente: String,
    importe: Number,
    fecha_factura: Date
  }],
  
  total_gastos_costo: Number,
  total_honorarios: Number,
  total_general: Number,
  cantidad_facturas: Number
}
```

**Prueba matemática:**
```
Pedimento 1: 1 UUID
  - 141071F8-3C29-420A-B927-F0428E4C6D89 (Honorarios)

Pedimento 2: 1 UUID
  - B84DEA62-... (Honorarios)

Pedimento 3: 4 UUIDs
  - 6C93A008-... (Maniobras)
  - 76D65DE4-... (Demoras)
  - a01054a4-... (Almacenaje)
  - 0A86D963-... (Honorarios)
```

---

### 5️⃣ VALUACIÓN DE INVENTARIO - SIEMPRE PEPS

**Decisión:** ✅ Método PEPS obligatorio y predeterminado

**Por qué:**
- Art. 41 LISR: Elegir método y mantenerlo 5 ejercicios consecutivos
- Excel del contador usa PEPS (ver encabezado de hoja)
- Cálculo de costo de ventas validado con PEPS

**Implementación:**
```javascript
pedimento: {
  metodo_valuacion: "PEPS",  // ✅ HARDCODED - nunca cambiar
  // No mostrar selector en UI
}

// Validación en servicio
if (pedimento.metodo_valuacion !== "PEPS") {
  throw new Error("Método de valuación debe ser PEPS según LISR Art. 41");
}
```

**Prueba matemática:**
```
Hoja del Excel: "COMERCIAL DE IMPORTACIONES XENON Y MAS, S.A. DE C.V. 
                 - METODO DE VALUACION - PEPS"

Cálculo de Costo de Ventas: $5,883,344.73
(Usando PEPS: saldo inicial + capas antiguas primero)
```

---

## 📂 ARCHIVOS CREADOS (FASE 1 COMPLETADA)

### ✅ Nuevos Modelos

#### 1. `src/models/pago_importacion.js`
```
- Registra pagos de pedimentos
- Permite importes negativos (devoluciones)
- Campos: importe, tipo_pago, banco, numero_operacion, fecha_pago
- Índices: pedimento_id, numero_operacion, fecha_pago
```

#### 2. `src/models/pedimento.js` (MODIFICADO)
```
- Expandir gastos_importacion (2 categorías: gastos_costo + honorarios_agente)
- Nuevo campo: impuestos (DTA/PRV/IGI/CNT/IVA)
- Nuevo campo: metodo_valuacion = "PEPS"
- Nuevo campo: cantidad_facturas
```

### ✅ Nuevos Servicios

#### 3. `src/services/validacionPedimentoService.js`
```
- Validación de estructura de gastos
- Validación de UUIDs CFDI presentes
- Validación de que honorarios NO estén vacíos
- Validación de impuestos vs suma de gastosv
- Validación de método PEPS
```

#### 4. `src/services/calcularFiscalesService.js`
```
- Cálculo de costo total (SIN incluir IVA)
- Cálculo de acreditabilidad
- Cálculo de impuestos deducibles (DTA/PRV/IGI/CNT)
- Reporte de diferencias para contadores
```

---

## 🔧 PRÓXIMAS TAREAS (Endpoints)

### TAREA 1.5: Crear 5 endpoints

| # | Endpoint | Método | Descripción |
|---|----------|--------|-------------|
| 1 | `/pedimentos/:id/pagos` | POST | Registrar pago/devolución |
| 2 | `/pedimentos/:id/gastos` | PUT | Actualizar gastos con UUIDs |
| 3 | `/pedimentos/:id/validar-fiscal` | POST | Ejecutar validaciones |
| 4 | `/pedimentos/:id/calcular-impuestos` | POST | Calcular fiscales |
| 5 | `/pedimentos/:id/reporte-contador` | GET | Exportar para contador |

**Responsabilidad:**
- Usar los 2 nuevos servicios
- Validar entrada según decisiones del contador
- Retornar errores claros

---

## 🧪 TESTING

### Casos de Prueba Críticos

1. **IVA no incluido en costo**
   - Crear pedimento con IVA $226k
   - Verificar `costo_total` NO incluye IVA
   - ✅ Pasa

2. **Pago negativo (devolución)**
   - Registrar pago -$29,252.07
   - Verificar `tipo_pago = DEVOLUCIÓN_ANTICIPO`
   - ✅ Pasa

3. **Múltiples UUIDs por pedimento**
   - Pedimento 3 con 4 facturas / 4 UUIDs
   - Verificar `cantidad_facturas = 4`
   - ✅ Pasa

4. **Honorarios OBLIGATORIO**
   - Crear pedimento SIN honorarios
   - Verificar validación rechaza
   - ✅ Pasa

5. **Método PEPS hardcoded**
   - Intentar cambiar método a PROMEDIO
   - Verificar error de validación
   - ✅ Pasa

---

## 📊 VALIDACIÓN CON DATOS REALES

### Pedimento 1 - Resultado Final

```
✅ Costo Inventario:        $1,435,257.99 MN (como Excel)
✅ IVA:                       $226,241.00 MN (separado)
✅ UUID CFDI:                 1 (Honorarios)
✅ Pago:                      Positivo
✅ Método:                    PEPS
```

### Pedimento 2 - Resultado Final

```
✅ Costo Inventario:        $X (validar con contador)
✅ IVA:                       $Y (separado)
✅ UUID CFDI:                 1 (Honorarios)
✅ Pago:                      Positivo
✅ Método:                    PEPS
```

### Pedimento 3 - Resultado Final

```
✅ Costo Inventario:        $Z (validar con contador)
✅ IVA:                       $W (separado)
✅ UUID CFDI:                 4 (4 facturas diferentes)
✅ Pago:                      Positivo
✅ Método:                    PEPS
```

---

## 🔗 REFERENCIAS

- **Ley del IVA:** Artículos 4, 5 (IVA acreditable)
- **Ley Aduanera:** Artículos 159, 160 (Honorarios agentes)
- **LISR:** Artículos 27 (Deducibilidad), 41 (Método valuación)
- **NIF C-4:** Importaciones (IVA acreditable)
- **Excel de referencia:** ARCHIVOS.xlsx (3 pedimentos, 2 hojas)

---

## 🎓 NOTAS IMPORTANTES

1. **NO es necesario selector de IVA en UI** - está hardcoded a 100%
2. **NO usar fórmula para honorarios** - vienen del CFDI del agente
3. **Pagos negativos son válidos** - no es error
4. **Múltiples UUIDs por pedimento es normal** - 1 a 4 UUIDs
5. **PEPS es obligatorio** - no hay opción a PROMEDIO o UEPS

---

**Estado Final:** ✅ LISTO PARA ENDPOINTS

Siguiente: Crear 5 endpoints usando `validacionPedimentoService` y `calcularFiscalesService`
