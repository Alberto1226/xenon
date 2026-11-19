# Análisis Completo del Sistema de Pedimentos (Importaciones)

**Aplicación:** Xenon (Sistema Administrativo PWA)  
**Módulo:** Registro de Pedimentos de Importación  
**Última actualización:** 2026-11-13  
**Estado:** Sistema en desarrollo con funcionalidad completa

---

## 📋 Resumen Ejecutivo

El módulo de **Pedimentos** es un sistema integral de gestión de importaciones que:
- Registra y rastrea mercancías en tránsito desde proveedores extranjeros
- Parsea archivos M3 del SAT (validación aduanal)
- Calcula costos fiscales con múltiples metodologías
- Integra automáticamente con el catálogo de productos
- Gestiona el estado del inventario en tránsito vs. arribado

**Ubicación del módulo:** `/app/pedimentos`

---

## 🗂️ Estructura del Proyecto

### Backend (Node.js + Express)

```
src/
├── models/
│   └── pedimento.js                           # Esquema MongoDB
├── services/
│   └── pedimentoParserService.js              # Parser de archivos M3 SAT
└── routes/app/pedimentos/
    ├── index.svelte                           # Interfaz Svelte (143 KB)
    ├── lista.js                               # GET lista con paginación
    ├── crear.js                               # POST nuevo pedimento
    ├── editar.js                              # PUT editar + gestión de inventario
    ├── arribar.js                             # POST marcar como arribado
    ├── calcular_fiscales.js                   # POST calcular costos fiscales
    ├── parse.js                               # POST parsear archivos M3
    └── eliminar.js                            # DELETE (localhost only)
```

---

## 🗄️ Modelo de Datos (MongoDB)

### Esquema Pedimento

```javascript
{
  // --- Identificación del Pedimento ---
  numero_pedimento: String,                    // Formato SAT: 15 dígitos (YY AD PATENTE NUMERO)
  clave_pedimento: String,                    // Ej. "A1" (importación definitiva)
  fecha_pedimento: Date,
  tipo_cambio: Number,                        // USD a MXN
  
  // --- Información Aduanal SAT (Registro 501) ---
  aduana_despacho: String,                    // Ej. "160" = Manzanillo
  patente: String,                            // Ej. "3387"
  regimen: String,                            // Ej. "IMD" = Importación Definitiva
  peso_bruto: Number,
  valor_dolares: Number,
  valor_aduana_mxn: Number,
  cove: String,                               // Ej. "COVE257UVCJ84"
  
  // --- Proveedor Extranjero (Registro 505) ---
  proveedor: {
    nombre: String,
    tax_id: String,                          // RFC del extranjero
    pais: String                             // ISO 3 (ej. "CHN")
  },
  
  // --- Incrementables SAT (Registro 501) ---
  incrementables_sat: {
    fletes: Number,                          // Flete internacional
    seguros: Number,                         // Seguro del envío
    otros: Number                            // Otros incrementables
  },
  
  // --- Contribuciones Fiscales (Registro 510) ---
  contribuciones_sat: {
    dta: Number,                             // Derecho Arancelario
    prv: Number,                             // Derecho Provisional
    igi: Number,                             // Impuesto General de Importación
    iva: Number,                             // IVA
    total_efectivo: Number                   // Total de impuestos pagados
  },
  
  // --- Gastos de Importación (Prorrateo) ---
  gastos_importacion: {
    Impuesto_Aduanal: Number,
    Flete: Number,
    Agente_Aduanal: Number,
    Seguridad: Number,
    otros: [
      {
        concepto: String,
        monto: Number,
        fecha_gasto: Date,
        observaciones: String
      }
    ]
  },
  
  // --- Productos en el Pedimento ---
  productos: [
    {
      producto: ObjectId,                    // Referencia a Producto (con populate)
      fraccion_arancelaria: String,          // Ej. "8471.30.50"
      cantidad: Number,
      unidad_medida: String,                 // "pza", "kg", "m", "m²", "L", etc.
      precio_compra_usd: Number,             // Unitario en USD
      costo_fiscal_unitario_mxn: Number,     // Calculado con prorrateo
      
      // --- Campos SAT por Partida (Registro 551) ---
      sec: Number,                           // Número de sección
      nico: String,                          // Número de fracción: "00"-"99"
      marca: String,                         // Marca del producto
      modelo: String,                        // Modelo/descripción
      valor_aduana_partida_mxn: Number,      // Valor aduanal de la partida
      
      // --- Gastos Exclusivos de la Partida ---
      gastos_adicionales: [
        {
          concepto: String,                  // Ej. "Re-etiquetado"
          monto: Number,
          fecha_gasto: Date,
          observaciones: String
        }
      ],
      
      folios: [String]                       // Números de serie recibidos al arribar
    }
  ],
  
  // --- Estado General ---
  status: String,                            // "transito" | "arribado"
  fecha_arribo: Date,                        // Fecha cuando se marca como arribado
  
  // --- Timestamps ---
  createdAt: Date,
  updatedAt: Date
}
```

### Relación con Producto

Cuando un pedimento está **en tránsito**, cada producto vinculado tiene:

```javascript
producto.pedimento_actual = {
  id_pedimento: ObjectId,
  cantidad_en_transito: Number,
  precio_compra_usd: Number,
  costo_fiscal_unitario_mxn: Number,
  fecha_estimada_arribo: Date (null)
}
```

Cuando el pedimento **arriba**, `pedimento_actual` se vacía y las cantidades se suman a `existencia.actual`.

---

## 🔄 Flujo de Operaciones

### 1️⃣ **Cargar Pedimento** (Archivo M3 del SAT)

**Endpoint:** `POST /app/pedimentos/parse`

**Entrada:**
- Archivo plano M3 (.338, .034, .txt) del SAT
- Base64 o contenido plano

**Validaciones:**
- ✅ Detecta PDFs por error y rechaza
- ✅ Valida presencia del registro 501 (cabecera)
- ✅ Rechaza acuses de firmas (registros 4001)

**Salida:**
```json
{
  "ok": true,
  "data": {
    "numero_pedimento": "25 87 3387 0001234",
    "clave_pedimento": "A1",
    "tipo_cambio": 20.50,
    "productos": [
      {
        "fraccion_arancelaria": "8471.30.50",
        "cantidad": 100,
        "unidad_medida": "pza",
        "precio_compra_usd": 150.00,
        "producto": "ObjectId de producto vinculado (si coincide)"
      }
    ],
    ...
  }
}
```

**Parseo del archivo M3 (Registro → Campo):**

| Registro SAT | Campo | Descripción |
|---|---|---|
| 501 | Cabecera | Patente, aduana, COVE, tipo_cambio, incrementables |
| 505 | Proveedor | Tax ID, nombre, país |
| 506 | Fechas | Entrada/pago del pedimento |
| 510 | Contribuciones | DTA, PRV, IGI, IVA |
| 551 | Partidas | Fracción, cantidad, precio SAT, valor aduanal |
| 554, 558 | Observaciones | Marca, modelo, notas |

**Vinculación Automática de Productos:**

1. ✅ Coincidencia exacta: `p.codigo === modelo`
2. ✅ Coincidencia por nombre: `p.nombre === descripción_partida`
3. ✅ Substring directo: `modelo` ⊂ `p.codigo`
4. ✅ Substring inverso: `p.codigo` ⊂ `modelo`

Si no hay coincidencia, `producto = null` (puede editarse después).

---

### 2️⃣ **Crear Pedimento Manualmente**

**Endpoint:** `POST /app/pedimentos/crear`

**Pasos:**
1. Buscar productos del catálogo
2. Agregar productos a la lista (cantidad, precio USD, fracción arancelaria, etc.)
3. Llenar campos aduanales (SAT)
4. Enviar formulario

**Campos Requeridos:**
- `numero_pedimento` (único)
- `fecha_pedimento`
- `tipo_cambio`
- `productos[]` (mínimo 1)

**Comportamiento:**
- ✅ Verifica duplicados de número
- ✅ Asigna `status: "transito"`
- ✅ Crea referencia `pedimento_actual` en cada producto
- ✅ Las cantidades NO se agregan a `existencia.actual` todavía

---

### 3️⃣ **Editar Pedimento**

**Endpoint:** `POST /app/pedimentos/editar`

**Restricciones por Rol:**
- **Admin:** Puede agregar/eliminar/modificar productos
- **Gerente:** Solo puede modificar precios y gastos (no agregar/eliminar productos)

**Gestión Inteligente de Inventario:**

#### Si el pedimento está **en tránsito:**
- Productos eliminados: se limpia `pedimento_actual`
- Productos nuevos: se crea referencia `pedimento_actual`
- Productos modificados: se actualiza cantidad en `pedimento_actual`

#### Si el pedimento ya **arribó:**
- Productos eliminados: se resta de `existencia.actual`
- Productos modificados: se ajusta stock por diferencia (nueva - antigua)
- Productos nuevos: se suma a `existencia.actual`

---

### 4️⃣ **Calcular Costos Fiscales**

**Endpoint:** `POST /app/pedimentos/calcular_fiscales`

Distribuye los gastos de importación entre los productos según la metodología elegida.

**Metodologías Disponibles:**

#### 📊 **Ad Valorem** (Por Valor)
```
Factor = Total Gastos / Total Compra MXN
Costo Fiscal = Precio MXN × (1 + Factor)
```
✅ Recomendado para mercancías heterogéneas

#### 💰 **Unitario** (Por Cantidad Física)
```
Gasto por Pieza = Total Gastos / Total Piezas
Costo Fiscal = Precio MXN + Gasto por Pieza
```
✅ Recomendado para lotes homogéneos

#### 🔀 **Mixto** (Híbrido)
```
Impuesto + Agente → por valor
Flete + Seguridad → por cantidad
Costo Fiscal = (Precio MXN × (1 + Factor Valor)) + Gasto por Pieza
```
✅ Recomendado para facturas complejas

#### 📌 **Fijo** (Factor Porcentual)
```
Costo Fiscal = Precio MXN × (1 + Factor_Fijo/100)
```
✅ Para control manual

**Gastos Adicionales por Partida:**

Algunos productos pueden tener gastos exclusivos (re-etiquetado, conversión, etc.)
que NO se distribuyen entre los demás:

```javascript
item.gastos_adicionales = [
  { concepto: "Re-etiquetado", monto: 500 },
  { concepto: "Inspección especial", monto: 300 }
]
// Se suma solo al costo de esa partida
costo_fiscal += (gastos_adicionales_total / cantidad)
```

**Opciones:**
- ✅ `preview: true` → Simula sin guardar
- ✅ `preview: false` → Guarda en BD y actualiza `pedimento_actual` de productos

---

### 5️⃣ **Registrar Arribo**

**Endpoint:** `POST /app/pedimentos/arribar`

**Cambios:**
- ✅ `status: "transito"` → `status: "arribado"`
- ✅ `fecha_arribo: now()`
- ✅ `pedimento_actual` de cada producto se limpia
- ✅ Las cantidades se **suman a `existencia.actual`** (opcionalmente)
- ✅ Se registran `folios` (números de serie) por producto

**Captura de Folios (por Producto):**
```json
{
  "folios_productos": {
    "ObjectId_Producto1": ["FOLIO001", "FOLIO002", "FOLIO003"],
    "ObjectId_Producto2": ["FOLIO004", "FOLIO005"]
  }
}
```

**Nota:** La memoria del repositorio indica que `existencia.folios` ya no se usa; los folios se guardan directamente en `productos[].folios`.

---

### 6️⃣ **Listar Pedimentos**

**Endpoint:** `POST /app/pedimentos/lista`

**Parámetros:**
```json
{
  "pagina_actual": 1,
  "limite": 10
}
```

**Retorna:**
- Lista paginada de pedimentos
- Total de registros
- Populated con `productos.producto` (nombre, código)

---

### 7️⃣ **Eliminar Pedimento** (Desarrollo Local)

**Endpoint:** `POST /app/pedimentos/eliminar`

⚠️ **Restricciones:**
- Solo disponible en `localhost` o `127.0.0.1`
- Requiere permisos administrativos
- **Acción irreversible**

---

## 🔐 Control de Accesos

| Endpoint | Admin | Gerente | Operario |
|---|:---:|:---:|:---:|
| **Listar** | ✅ | ✅ | ❌ |
| **Crear** | ✅ | ❌ | ❌ |
| **Editar** | ✅ | ✅* | ❌ |
| **Arribar** | ✅ | ✅ | ❌ |
| **Calcular Fiscales** | ✅ | ✅ | ❌ |
| **Parse M3** | ✅ | ✅ | ❌ |
| **Eliminar** | ✅† | ❌ | ❌ |

**\* Gerente:** Solo puede modificar datos, NO agregar/eliminar productos  
**† Admin:** Solo en localhost

---

## 📊 Campos de Unidades de Medida (SAT)

| Código | Nombre | Abreviatura |
|---|---|---|
| 1 | Kilogramo | kg |
| 3 | Metro Lineal | m |
| 4 | Metro Cuadrado | m² |
| 5 | Metro Cúbico | m³ |
| 6 | Pieza | pza |
| 7 | Cabeza | cab |
| 8 | Litro | L |
| 9 | Par | par |
| 10 | Docena | doc |
| 11 | Centenar | cen |
| 12 | Millar | mil |
| 13 | Millón de Unidades | millon |
| 14 | Docena de Docenas | doc-doc |
| 15 | Decilitro | dl |
| 16 | Hectolitro | hl |
| 17 | Kilovatio-Hora | kWh |
| 99 | Otras Unidades | otro |

---

## 🎨 Interfaz Frontend (index.svelte)

### Pestañas Principales

#### 📋 **Lista**
- Tabla paginada de pedimentos
- Filtros: status (tránsito/arribado)
- Acciones: ver detalles, editar, arribar, calcular, eliminar

#### ➕ **Nuevo Pedimento**
- Formulario con 3 secciones:
  1. **Datos Generales** (número, fecha, tipo cambio)
  2. **Información Aduanal** (aduana, patente, regimen, COVE)
  3. **Productos** (búsqueda predictiva, cantidad, precio USD)
  4. **Gastos** (impuesto, flete, agente, seguridad, otros)

**Búsqueda Predictiva de Productos:**
- Filtra por nombre o código en tiempo real
- Muestra: "CODIGO - NOMBRE"
- Selecciona automáticamente la referencia

**Agregación de Productos:**
- Calcula `precio_compra_usd` a partir de importe total en MXN

#### 📈 **Calcular Fiscales**
- Selector de metodología (ad-valorem, unitario, mixto, fijo)
- Preview sin guardar
- Visualiza costo fiscal unitario por producto

#### 📦 **Editar Pedimento**
- Todas las opciones de crear + cambios en inventario
- Sincronización SAT: convierte impuestos a `gastos_importacion`

#### ✈️ **Arribar Pedimento**
- Captura de folios por producto
- Checkbox: actualizar existencias automáticamente

---

## ⚠️ Validaciones y Restricciones

### En Creación:
- ✅ Número de pedimento único
- ✅ Mínimo 1 producto
- ✅ Cantidad y precio_compra_usd válidos

### En Edición:
- ✅ Verifica duplicados de número
- ✅ Gerentes no pueden modificar lista de productos
- ✅ Ajustes inteligentes de inventario según status

### En Cálculo Fiscal:
- ✅ Requiere productos con precios/cantidades válidas
- ✅ Redondea a 2 decimales para evitar errores de punto flotante
- ✅ Gastos adicionales solo afectan su partida

### En Arribo:
- ✅ No permite doble arribo
- ✅ Limpia referencia `pedimento_actual`
- ✅ Opcionalmente incrementa inventario

---

## 🐛 Casos Especiales y Consideraciones

### 1. **Productos sin Vincular**
Si el parser no encuentra coincidencia:
- `producto: null`
- Debe editarse manualmente desde la UI
- Aviso visual: "PARTIDAS SIN VINCULAR: X"

### 2. **Cambio de Moneda**
- `tipo_cambio` aplica a TODO el pedimento
- Se usa al calcular costos fiscales
- Recomendación: capturar del SAT automáticamente

### 3. **Referencia Cruzada Producto ↔ Pedimento**

**Estado: En Tránsito**
```
Producto.pedimento_actual = {
  id_pedimento: ref,
  cantidad_en_transito: 100,
  precio_compra_usd: 50.00,
  costo_fiscal_unitario_mxn: 1000.00
}
```

**Estado: Arribado**
```
Producto.pedimento_actual = null
Producto.existencia.actual += cantidad_pedimento
```

### 4. **Gastos Directos vs. Indirectos**

**Directos (Por Partida):** 
- Almacenado en `productos[].gastos_adicionales`
- Se prorratean solo entre su cantidad
- Ej. re-etiquetado específico

**Indirectos (Del Pedimento):**
- Almacenados en `gastos_importacion`
- Se distribuyen según metodología elegida
- Ej. impuesto aduanal, flete internacional

---

## 🚀 Flujo de Uso Típico (End-to-End)

```
1. Agencia Aduanal envía archivo M3
   ↓
2. Admin/Gerente sube archivo en "Nuevo Pedimento"
   ↓
3. Sistema parsea y vincula automáticamente productos
   ↓
4. Revisión manual (validar fracturas, ajustar si necesario)
   ↓
5. Guardar pedimento (status: "transito")
   ↓
6. Sistema incrementa contador en Producto.pedimento_actual
   ↓
7. Mercancía en tránsito (reflejada en reportes)
   ↓
8. Llega el cargamento → Admin marca como "Arribar"
   ↓
9. Captura folios (números de serie)
   ↓
10. Sistema limpia pedimento_actual y suma a existencia.actual
    ↓
11. Mercancía disponible para venta
```

---

## 📌 Integración con Otros Módulos

- **Productos:** Vinculación automática, actualización de `pedimento_actual`, `existencia.actual`
- **Reportes:** Query de pedimentos en tránsito vs. arribados
- **Facturación:** Costo fiscal (`costo_fiscal_unitario_mxn`) usado en pricing
- **Inventario:** Reflejado en "Stock en Tránsito" vs. "Stock Disponible"

---

## 🎯 Resumen de Características

| Característica | Implementado | Estado |
|---|:---:|---|
| Parser M3 SAT | ✅ | Funcional |
| Vinculación automática de productos | ✅ | Funcional |
| Múltiples metodologías de prorrateo | ✅ | Funcional |
| Gestión de inventario (tránsito/arribo) | ✅ | Funcional |
| Captura de folios | ✅ | Funcional |
| Control de acceso por rol | ✅ | Funcional |
| Interfaz completa (crear/editar/listar) | ✅ | Funcional |
| Cálculo de costos fiscales | ✅ | Funcional |
| Gastos adicionales por partida | ✅ | Funcional |
| Sincronización con datos SAT | ✅ | Funcional |
| Validación de archivo M3 | ✅ | Funcional |
| Búsqueda predictiva de productos | ✅ | Funcional |
| Preview de cálculos | ✅ | Funcional |
| Eliminación (localhost) | ✅ | Funcional |

---

## 📝 Notas Importantes

1. **Memoria del Proyecto:** El campo `existencia.folios` ya no se usa; los folios ahora se guardan en `productos[].folios` dentro del pedimento.

2. **Envío de Pedidos:** Según la memoria, no depender de `existencia.folios` al crear pedidos. Usar `existencia.actual` en su lugar.

3. **Escalabilidad:** 
   - Paginación implementada (default 10 por página)
   - Índices recomendados en MongoDB: `numero_pedimento`, `status`, `fecha_pedimento`

4. **Seguridad:**
   - Eliminación solo en localhost
   - Validaciones de rol en cada endpoint
   - Sanitización básica de archivo M3 (BOM, PDF detection)

5. **Audit Trail:** Los timestamps `createdAt` y `updatedAt` están habilitados automáticamente.

---

**Fin del Análisis**
