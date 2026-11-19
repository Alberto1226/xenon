# Análisis de Ajustes Solicitados por Contabilidad

**Fecha:** 2026-11-13  
**Módulo:** Pedimentos de Importación  
**Solicitante:** Equipo Contable (Contadores)  

---

## 📊 Resumen Ejecutivo

Los contadores solicitan **6 ajustes principales**, categorizados en:
- **Correcciones críticas** (3): Cálculo de costos, IVA acreditable, prorrateo
- **Ampliaciones de datos** (2): Trazabilidad fiscal, pagos registrados
- **Reportería** (1): Reporte de pedimentos + inventarios

**Impacto:** Afecta el modelo Pedimento, cálculo fiscal y UI de entrada de datos.

---

## 🔴 CRÍTICO: Correcciones al Cálculo de Costos

### 1️⃣ **Exclusión del IVA Acreditable del Costo**

**Problema Actual:**
```javascript
// INCORRECTO: El IVA se suma al costo del producto
Costo Total = Mercancías + Gastos + IVA
Costo Unitario = (Mercancías + Gastos + IVA) / Cantidad
```

**Situación Correcta:**
```
Valores Comerciales:
├── Valor de mercancías:        $100,000
├── Gastos de importación:      $ 15,000
├── IVA acreditable (16%):      $ 18,400  ← NO SUMA AL COSTO
└── Costo que se distribuye:    $115,000  ← Solo esto

Según la contabilidad:
- Si IVA es 100% acreditable → Es un impuesto recuperable → No forma parte del costo
- Si IVA es parcialmente acreditable → Solo la parte no recuperable afecta costo
- Si IVA NO es acreditable → Sí forma parte del costo
```

**Solución Propuesta:**

Agregar campos al modelo Pedimento:
```javascript
{
  iva_importacion: {
    total: Number,              // Total IVA de importación
    acreditable_porcentaje: Number,  // 0-100% (default 100)
    acreditable_monto: Number,  // total × porcentaje
    no_acreditable_monto: Number  // total - acreditable
  }
}
```

**Impacto en Cálculo Fiscal:**
```javascript
// ANTES (incorrecto)
costoDistribuible = mercancías + gastos + iva

// DESPUÉS (correcto)
costoDistribuible = mercancías + gastos + iva_no_acreditable

// O si queremos más control:
costoDistribuible = mercancías + gastos + (iva * (1 - acreditable_porcentaje))
```

**UI Changes:**
- Agregar campo "% IVA Acreditable" en formulario (default 100%)
- Mostrar desglose: Total IVA | Acreditable | No Acreditable
- Advertencia fiscal si IVA acreditable < 100%

---

### 2️⃣ **Inclusión de Seguros e Incrementables en Prorrateo**

**Problema Actual:**
```javascript
// Se distribuyen: Impuesto Aduanal, Flete, Agente, Seguridad
// SE IGNORAN: Seguros, Otros incrementables del SAT

gastos_importacion = {
  Impuesto_Aduanal: 5000,
  Flete: 3000,
  Agente_Aduanal: 2000,
  Seguridad: 1000,
  otros: []  // ← Estos NO se distribuyen
}

// Incrementables SAT que SE IGNORAN:
incrementables_sat = {
  fletes: 2000,     // Diferente del flete nacional
  seguros: 1500,    // Seguro internacional
  otros: 500        // Otros incrementables
}
```

**Lo que Piden:**
Distinguir y distribuir TODOS los gastos que formen parte del costo contable:

```javascript
// Propuesta: Separar incrementables de impuestos
gastos_importacion = {
  // IMPUESTOS (depende de acreditabilidad)
  impuesto_aduanal: {
    monto: 5000,
    acreditable: true
  },
  iva: {
    monto: 18400,
    acreditable_porcentaje: 100
  },
  
  // GASTOS QUE FORMAN PARTE DEL COSTO (SIEMPRE)
  gastos_costo: {
    flete_internacional: 2000,
    seguro_internacional: 1500,
    flete_nacional: 3000,
    agente_aduanal: 2000,
    seguridad: 1000,
    otros: []
  }
}
```

**Cálculo Revisado:**
```
Total Costo = Mercancías + Gastos_Costo + (IVA × no_acreditable_porcentaje)

Gastos_Costo incluye:
✓ Flete internacional (del proveedor)
✓ Seguro del envío
✓ Flete nacional (puerto → almacén)
✓ Honorarios agente aduanal
✓ Gastos de seguridad física
✓ Otros gastos directos
```

**UI Changes:**
- Reorganizar formulario de gastos en 2 secciones: "Impuestos" y "Gastos de Costo"
- Validar que incrementables SAT (fletes, seguros) no se dupliquen
- Auto-sincronizar desde SAT M3 cuando sea posible

---

### 3️⃣ **Método de Prorrateo: Ad-Valorem (Por Valor)**

**Situación Actual:** Sistema soporta 4 metodologías, pero Ad-Valorem tiene ambigüedad.

**Lo que Piden:**
```
Base de distribución = Valor comercial de cada producto
Proporción = Valor Producto / Valor Total
Gastos asignados = Gastos Total × Proporción

Ejemplo:
Producto A: $60,000 / $100,000 = 60% → $9,000
Producto B: $30,000 / $100,000 = 30% → $4,500
Producto C: $10,000 / $100,000 = 10% → $1,500
Total distribuido: $15,000 ✓
```

**Validación de Datos:**
```javascript
// Antes de distribuir gastos, validar:
✓ Todos los productos tienen precio_compra_usd
✓ No hay valores negativos
✓ Tipo de cambio > 0
✓ Total mercancías > 0
```

**Cambio en Backend (calcular_fiscales.js):**
```javascript
// ACTUAL (ad-valorem)
const factor = totalIndirectos / totalCompraMXN;
costoFiscalUnitario = precioBaseMXN * (1 + factor);

// CORRECTO (ad-valorem con validación)
const totalGastos = sum(gastos_costo) + (iva × no_acreditable_porcentaje);
const factor = totalGastos / totalCompraMXN;
costoFiscalUnitario = precioBaseMXN * (1 + factor);
```

---

## 🟡 AMPLIACIÓN: Trazabilidad Fiscal (UUID en Gastos)

### 4️⃣ **Folio Fiscal en Gastos Adicionales**

**Requisito:**
Capturar el UUID/Folio fiscal de cada comprobante asociado a un gasto de importación.

**Casos de Uso:**
- Factura del agente aduanal
- Factura de flete nacional
- Factura de almacenaje
- Factura de servicios aduanales

**Cambio de Modelo:**

```javascript
// EN: gastos_importacion.otros[]
// ACTUAL
{
  concepto: "Re-etiquetado",
  monto: 500
}

// PROPUESTO
{
  concepto: "Re-etiquetado",
  monto: 500,
  proveedor: {
    nombre: "Laboratorio XYZ",
    rfc: "XXX000000XXX"
  },
  factura: {
    numero: "FAC-2026-001",
    uuid: "12345678-1234-1234-1234-123456789012",
    fecha_emision: "2026-11-05",
    importe_subtotal: 500,
    iva: 80,
    importe_total: 580,
    archivo_xml: null,  // Opcional: binary file
    archivo_pdf: null   // Opcional: binary file
  },
  observaciones: "Servicio de re-etiquetado completo"
}
```

**También en: productos[].gastos_adicionales[]**

**UI Changes:**
- Modal para capturar factura por cada gasto
- Campos: Proveedor, # Factura, UUID, Fecha, Importes
- Validación de UUID (formato: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX)
- Opcionalmente: upload de XML y PDF
- Mostrar resumen: "Factura {numero} ({uuid})"

**Integración Futura:**
Con módulo ISOTECH ya existente para validar CFDI ante el SAT.

---

## 🟡 AMPLIACIÓN: Registro de Pagos

### 5️⃣ **Pagos al Proveedor y Agente Aduanal**

**Requisito:**
Registrar y trazar los pagos asociados a cada pedimento.

**Nuevo Documento: "PagoImportacion"**

```javascript
{
  _id: ObjectId,
  pedimento: ObjectId,              // Referencia al pedimento
  
  // Información del Pago
  tipo_beneficiario: "proveedor" | "agente_aduanal" | "tercero",
  beneficiario: {
    nombre: String,
    rfc: String,
    banco: String
  },
  
  // Detalles Financieros
  concepto: String,                 // "Pago de mercancía", "Honorarios aduanales", etc.
  fecha_pago: Date,
  moneda: "MXN" | "USD" | "EUR",
  importe: Number,
  tipo_cambio: Number,              // Si es distinto a USD
  
  // Trazabilidad Bancaria
  banco_origen: String,
  banco_destino: String,
  referencia: String,               // "TRF-000125", "TRANSF-123456"
  
  // Documentos
  comprobante: {
    tipo: "transferencia" | "cheque" | "efectivo" | "otro",
    numero_comprobante: String,
    fecha_emision: Date,
    archivo_comprobante: null        // Binary file
  },
  
  // Relación con el Pedimento
  concepto_pedimento: "anticipo" | "pago_parcial" | "liquidacion",
  saldo_pendiente: Number,          // Si es anticipo
  
  // Audit
  createdAt: Date,
  updatedAt: Date
}
```

**Endpoint Nuevo:**
```
POST /app/pedimentos/registrar-pago
  → Valida pedimento existe
  → Crea documento PagoImportacion
  → Actualiza saldo_pendiente en Pedimento

GET /app/pedimentos/:id/pagos
  → Lista todos los pagos del pedimento
  → Muestra resumen: pagado vs. saldo
```

**UI Changes:**
- Sección "Pagos" en detalle de pedimento
- Tabla de pagos registrados
- Botón "Registrar Pago"
- Modal: Beneficiario, Concepto, Fecha, Importe, Banco, Referencia
- Resumen: Total Pedimento | Pagado | Saldo

**Validaciones:**
```javascript
// No permitir pagar más del valor del pedimento
pagoNuevo + pagosAnteriores ≤ valorTotalPedimento

// Si hay anticipos, indicar saldo
saldo_pendiente = valorTotalPedimento - sumaDeTodasLossPagos
```

---

## 🟢 REPORTERÍA: Reporte de Pedimentos

### 6️⃣ **Exportar Pedimento a Excel/PDF**

**Estructura del Reporte:**

```
═══════════════════════════════════════════════════════════
REPORTE DE PEDIMENTO - IMPORTACIÓN ADUANAL
═══════════════════════════════════════════════════════════

I. IDENTIFICACIÓN
───────────────────────────────────────────────────────────
Número de Pedimento:        26 87 3387 0001234
Clave:                      A1
Aduana de Despacho:         160 (Manzanillo)
Patente:                    3387
Régimen:                    IMD (Importación Definitiva)
Fecha de Pedimento:         2026-11-05
Fecha de Arribo:            2026-11-10 (si aplica)

II. PROVEEDOR EXTRANJERO
───────────────────────────────────────────────────────────
Nombre:                     Shanghai Electronics Ltd.
Tax ID:                     CN9876543210
País:                       China (CHN)
COVE:                       COVE257UVCJ84

III. MERCANCÍAS
───────────────────────────────────────────────────────────
[Tabla con columnas: SKU, Descripción, Fracción, Qty, Unit, Precio USD, Total USD]
Subtotal en USD:            $50,000.00
Tipo de Cambio:             $20.50
Subtotal en MXN:            $1,025,000.00

IV. VALORES ADUANALES
───────────────────────────────────────────────────────────
Valor Comercial (MXN):      $1,025,000.00
Valor en Aduana (MXN):      $1,100,000.00

V. IMPUESTOS Y CONTRIBUCIONES (Registro 510 SAT)
───────────────────────────────────────────────────────────
IGI (Impuesto General):     $   165,000.00
DTA (Derecho Arancelario):  $    82,500.00
PRV (Derecho Provisional):  $    41,250.00
IVA Acreditable (100%):     $   255,400.00
────────────────────────────────────────────────────────────
Total Impuestos Pagados:    $   544,150.00

VI. INCREMENTABLES ADUANEROS (Registro 501 SAT)
───────────────────────────────────────────────────────────
Fletes Internacionales:     $    15,000.00
Seguros:                    $     5,000.00
Otros Incrementables:       $     2,000.00
────────────────────────────────────────────────────────────
Subtotal Incrementables:    $    22,000.00

VII. GASTOS DE IMPORTACIÓN
───────────────────────────────────────────────────────────
[Tabla: Concepto, Proveedor, RFC, UUID Factura, Importe]

Flete Nacional:
  • Transportes XYZ, RFC: TRX000000XX0, Fact. FAC-2026-050
    UUID: 12345678-..., Importe: $5,000.00

Agente Aduanal:
  • Agencia ABC, RFC: AAA000000AA0, Fact. FAC-2026-051
    UUID: 87654321-..., Importe: $8,000.00

────────────────────────────────────────────────────────────
Total Gastos Adicionales:   $    13,000.00

VIII. RESUMEN DE COSTOS DISTRIBUIDOS
───────────────────────────────────────────────────────────
[Tabla: SKU, Descripción, Cantidad, Costo USD Unitario, Costo MXN Unitario, Costo Total MXN]

Producto A (PROD-001):
  100 unidades × $250.00 USD × $20.50 TC = $512,500.00
  + Prorrateo: $45,000.00
  COSTO TOTAL: $557,500.00
  COSTO UNITARIO: $5,575.00 MXN

────────────────────────────────────────────────────────────
COSTO TOTAL DISTRIBUIDO:    $1,078,500.00
COSTO PROMEDIO UNITARIO:    $5,392.50 MXN

IX. PAGOS REGISTRADOS
───────────────────────────────────────────────────────────
[Tabla: Beneficiario, Concepto, Fecha, Moneda, Importe, Referencia]

TOTAL PAGADO:               $1,050,000.00
SALDO PENDIENTE:            $    28,500.00

X. OBSERVACIONES
───────────────────────────────────────────────────────────
[Notas adicionales si las hay]

═══════════════════════════════════════════════════════════
Generado: 2026-11-13 11:19
Por: Angel Resendiz (usuario@isotech.mx)
═══════════════════════════════════════════════════════════
```

**Nuevo Endpoint:**
```
GET /app/pedimentos/:id/reporte?formato=pdf|excel
  → Genera reporte en formato solicitado
  → Descarga automática
```

**Librerías a Usar:**
- **Excel:** `exceljs` (celdas formateadas, múltiples hojas)
- **PDF:** `pdfkit` o `puppeteer` (si necesita HTML renderizado)

**Estructura Excel (múltiples hojas):**
```
Hoja 1: Resumen
  - Encabezado + Identif. + Valores clave

Hoja 2: Partidas
  - Tabla detallada de productos

Hoja 3: Impuestos
  - Desglose SAT

Hoja 4: Gastos
  - Gastos y facturas

Hoja 5: Pagos
  - Movimientos financieros
```

---

## ⚠️ RIESGO: Reporte de Inventarios (Fuera de Alcance)

### 6b. **Reporte de Inventarios: Entradas, Salidas, Existencias**

**Análisis de Viabilidad:**

El cliente solicita:
```
Entradas (por pedimentos)
├─ Mercancía A: 100 unidades → $5,000 MXN c/u
├─ Mercancía B: 50 unidades → $10,000 MXN c/u
└─ Total entrada: $750,000.00

Salidas (por pedidos/facturación)
├─ Mercancía A: 20 unidades → $6,000 MXN c/u (margen)
└─ Total salida: $120,000.00

Existencias (actuales)
└─ Mercancía A: 80 unidades → $400,000.00

Costo Unitario por Método:
├─ Promedio Ponderado: $5,000.00
├─ PEPS (First In First Out): $5,000.00
└─ UEPS (Last In First Out): $5,000.00
```

**Problemas Identificados:**

1. **Falta integración con Sistema de Ventas:**
   - ¿Dónde se registran las salidas? ¿En pedidos? ¿En facturas?
   - Se necesita fuente de datos clara

2. **No hay movimientos de inventario históricos:**
   - Solo se sabe: cantidad inicial vs. cantidad actual
   - No hay trazabilidad de cada movimiento

3. **Método de valuación no definido:**
   - Xenon no especifica si usa PEPS, Promedio, UEPS
   - Impacta directamente en costo unitario y margen

4. **Transferencias y devoluciones:**
   - No hay registro de traslados entre almacenes
   - No hay proceso de devoluciones a proveedor

**Recomendación:**

🔴 **SEPARAR este requerimiento en una SEGUNDA fase**

Razones:
- Requiere análisis profundo del módulo de Ventas
- Necesita definir flujo completo de movimientos
- Impacta integridad de datos históricos
- Diferente equipo de desarrollo

---

## 📋 Matriz de Cambios Propuestos

| # | Ajuste | Tipo | Prioridad | Complejidad | BD | Backend | Frontend | Días EST. |
|---|--------|------|-----------|-------------|----|---------|---------|----|
| 1 | Excluir IVA acreditable | Corrección | CRÍTICA | Media | +4 campos | calcular_fiscales.js | Form + cálculos | 2-3 |
| 2 | Incluir gastos en prorrateo | Corrección | CRÍTICA | Baja | Reestructura | calcular_fiscales.js | Sin cambios | 1-2 |
| 3 | Ad-Valorem validado | Corrección | MEDIA | Baja | - | calcular_fiscales.js | Sin cambios | 1 |
| 4 | UUID en gastos | Ampliación | MEDIA | Baja | +factura | crear.js, editar.js | Modal factura | 2-3 |
| 5 | Registro de pagos | Ampliación | MEDIA | Media | Nuevo doc | routes/pagos.js | Sección pagos | 3-4 |
| 6 | Reporte Excel/PDF | Reportería | MEDIA | Media | - | routes/reporte.js | Botón descarga | 2-3 |
| 6b | Reporte inventarios | Análisis | - | Alta | - | - | - | FASE 2 |

---

## ✅ Plan de Implementación Sugerido

**FASE 1 (SEMANA 1):** Correcciones Críticas
```
Día 1-2: Ajustar modelo Pedimento, IVA y gastos
Día 3-4: Reescribir calcular_fiscales.js con validaciones
Día 5: QA y testing de cálculos
```

**FASE 2 (SEMANA 2):** Ampliaciones
```
Día 6-7: Agregar campos factura en gastos + UUID
Día 8-9: Crear módulo de pagos (modelo + endpoints)
Día 10: Integración en UI
```

**FASE 3 (SEMANA 3):** Reportería
```
Día 11-12: Desarrollo de reporte Excel/PDF
Día 13-14: Testing y validación
Día 15: Entrega
```

**FASE 4 (FUTURO):** Inventarios
```
Análisis con equipo de Ventas
Definir flujos de movimiento
Implementar valuación de inventario
```

---

## 🎯 Conclusión

Los **ajustes solicitados son viables** y forman parte del control financiero y fiscal que Xenon debe proporcionar como ERP.

**Prioritario ahora:**
1. ✅ Corrección del cálculo de costos (IVA y prorrateo)
2. ✅ Trazabilidad de facturas en gastos
3. ✅ Registro de pagos

**Postergar:**
- ❌ Reporte de inventarios (requiere análisis independiente)

**Beneficio:**
Con estos cambios, el sistema será una herramienta confiable para la contabilidad de importaciones, con la trazabilidad fiscal y financiera que los contadores necesitan.

