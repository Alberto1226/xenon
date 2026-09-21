# Plan de Implementación: Modelo de Configuración, Pestaña en Catálogos y Reglas Dinámicas de Pedidos por Cliente (Actualizado)

Se actualiza el plan de implementación para reflejar las reglas de negocio ajustadas: administración dinámica de límite de pedidos por cliente, estatus mínimo requerido (excluyendo el estatus `Envío`), liberación del conteo al pasar a `Envío`, bloqueo de venta a partir de `Pagado` y progresión irreversible de estatus.

---

## 🔍 Resumen del Flujo y Reglas de Negocio

```
+----------------------------------------------------------------------------------------------------+
|                                    FLUJO DE ESTADOS DE PEDIDO                                     |
|                                                                                                    |
|  [1. Pedido] ----> [2. Ficha Pago] ----> [3. Pagado] ----> [4. Empaque] ----> [5. Envío] ----> [6. Entregado]
|  (Edición OK)      (Edición OK)        (🔒 Bloqueo Venta) (🔒 Bloqueo Venta) (📦 Salida Stock) (Histórico BD)
|                                        (Solo Folios OK)   (Solo Folios OK)   (No cuenta abierto)           |
+----------------------------------------------------------------------------------------------------+
|                                      REGLAS CLAVE DEL SISTEMA                                      |
|  1. Configuración Dinámica: Máximo N pedidos abiertos por cliente y Estatus Mínimo (sin 'Envío')  |
|  2. Exclusión de 'Envío': Al alcanzar estatus 'Envío', el pedido ya NO se cuenta como abierto      |
|  3. Transición Estrictamente Hacia Adelante: Prohibido regresar a un estatus anterior                |
|  4. Mantenimiento de Nombre Oficial: Se conserva 'Empaque' (no se usa 'Empacado')                  |
|  5. Bloqueo de Venta desde 'Pagado': Solo se permite la captura/edición de folios y datos de envío   |
+----------------------------------------------------------------------------------------------------+
```

---

## ⚙️ Detalle de Componentes y Cambios Arquitectónicos

### 1. Modelo de Datos Mongoose (`Configuracion_pedidos`)
- **Ubicación:** [configuracion_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/models/configuracion_pedidos.js)
- **Esquema:**
  ```javascript
  const schema = new Schema({
    limite_pedidos_abiertos: { type: Number, default: 3, min: 1 },
    status_minimo_requerido: { 
      type: String, 
      enum: ['Ninguno', 'Pedido', 'Ficha Pago', 'Pagado', 'Empaque'], 
      default: 'Pagado' 
    },
    aplicar_regla_status_minimo: { type: Boolean, default: true },
    fecha_modificacion: { type: Date, default: Date.now },
    usuario_modifico: { type: String }
  });
  ```
- **Nota:** Se removió `'Envío'` de la enumeración ya que cuando un pedido llega a `Envío`, ya no se considera pendiente de apertura ni bloqueante para el cliente.

---

### 2. Pestaña "Configuración Pedidos" en Catálogos (`/app/Catalogos`)
- **Componente Frontend:** [Catalogos/index.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/Catalogos/index.svelte)
- **Pestaña UI:** Pestaña **`Configuración Pedidos`** visible para usuarios con permisos administrativos (`Soporte Isotech` / `isotech_Xenonymas`).
- **Campos y Controles Visuales:**
  1. **Límite de Pedidos Abiertos ($N$):** Campo numérico para definir el número máximo de pedidos abiertos permitidos por cliente.
  2. **Estatus Mínimo Requerido:** Menú desplegable con las opciones: `Ninguno`, `Pedido`, `Ficha Pago`, `Pagado`, `Empaque`.
  3. **Activar Validación de Estatus Mínimo:** Checkbox para activar/desactivar la restricción.
  4. **Botón Guardar Configuración:** Actualización persistente en MongoDB con retroalimentación visual.

---

### 3. Servicio Endpoint Backend para Configuración
- **Ubicación:** [configuracion_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/Catalogos/configuracion_pedidos.js)
- **Operaciones:** `GET` (obtener o crear por defecto) y `POST` (guardar).

---

### 4. Validación Dinámica en la Creación de Pedidos
- **Archivos Afectados:**
  - [ya_tiene_carrito.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/nuevo/ya_tiene_carrito.js)
  - [crear_pedido_nuevo_v2.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/nuevo/crear_pedido_nuevo_v2.js)
- **Regla de Conteo de Pedidos Abiertos:**
  - Se cuentan únicamente los pedidos con estados en preparación previa a envío: `['Pedido', 'Ficha pago', 'Ficha Pago', 'Pagado', 'Empaque']`.
  - **Exclusión:** Los pedidos en estatus `Envío`, `Envio`, `Entregado` o `Cancelado` **NO se cuentan** dentro de la cuota de `limite_pedidos_abiertos`.
- **Evaluación de Restricciones:**
  1. Si los pedidos abiertos $< N$, el conteo lo permite.
  2. Si `aplicar_regla_status_minimo` es `true` y `status_minimo_requerido` $\ne$ `'Ninguno'`, se verifica que todos los pedidos abiertos del cliente tengan un estatus $\ge$ al estatus mínimo configurado.

---

### 5. Bloqueo de Edición de Venta a partir de `Pagado` y Progresión Irreversible
- **Bloqueo a partir de `Pagado`:**
  - Deshabilitar edición de cliente, productos, precios, cantidades y descuentos cuando el estatus sea `Pagado`, `Empaque`, `Envío` o `Entregado`.
  - Habilitada únicamente la captura y modificación de **folios/números de serie** y datos de paquetería.
  - [Row.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_listas/Row.svelte), [Paso_1.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_1.svelte), [Paso_2.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_2.svelte), [Row_producto.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Row_producto.svelte), [Row_producto_pedido.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Row_producto_pedido.svelte).
- **Progresión Irreversible hacia Adelante:**
  - Deshabilitar regresiones en [_Cambio_status.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_listas/_Cambio_status.svelte) y rechazo en el backend ([pedido_pipeline_service.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_servicios/pedido_pipeline_service.js)).

---

## 📂 Archivos del Sistema

### Nuevos Archivos
- **[configuracion_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/models/configuracion_pedidos.js):** Modelo Mongoose de configuración.
- **[configuracion_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/Catalogos/configuracion_pedidos.js):** Endpoint API para la pestaña.

### Archivos Modificados
- **[Catalogos/index.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/Catalogos/index.svelte):** Pestaña **Configuración Pedidos** y desplegable sin opción `Envío`.
- **[ya_tiene_carrito.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/nuevo/ya_tiene_carrito.js):** Exclusión del estatus `Envío` del conteo de pedidos abiertos.
- **[crear_pedido_nuevo_v2.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/nuevo/crear_pedido_nuevo_v2.js):** Revalidación dinámica al aperturar notas.
- **[Row.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_listas/Row.svelte), [Paso_1.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_1.svelte), [Paso_2.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_2.svelte), [Row_producto.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Row_producto.svelte), [Row_producto_pedido.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Row_producto_pedido.svelte):** Bloqueo de venta desde `Pagado` y captura de folios.
- **[_Cambio_status.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_listas/_Cambio_status.svelte), [pedido_pipeline_service.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_servicios/pedido_pipeline_service.js):** Progresión unidireccional de estatus.

---

## 🧪 Plan de Verificación

1. **Verificación de Pestaña y Opciones:**
   - Confirmar que el menú desplegable en Catálogos muestre únicamente: `Ninguno`, `Pedido`, `Ficha Pago`, `Pagado`, `Empaque`.
2. **Verificación de Liberación al Pasar a `Envío`:**
   - Configurar Límite = 3 y Estatus Mínimo = `Ninguno`.
   - Crear 3 pedidos para un cliente (`Pedido` 1, 2 y 3).
   - Pasar el Pedido 1 a estatus `Envío`.
   - Intentar crear un 4.º pedido ➔ **Permitido** (los abiertos ahora son 2, pues `Envío` ya no computa).
