# Resumen de Cambios: Herramienta de Apartados Huérfanos (Dev Tools)

Este documento detalla todas las modificaciones, arquitectura, backend y frontend implementados para la gestión, curación y auditoría de apartados huérfanos de inventario en el sistema **Xenon**.

---

## 🛠️ 1. Módulo Backend (`obtener_huerfanos.js`)

**Ubicación:** `src/routes/app/dev_tools/huerfanos/obtener_huerfanos.js`

### Principales Funcionalidades Backend:
- **Detección de Apartados Huérfanos (`detectar_apartados_huerfanos`):**
  - Consulta todos los productos en la base de datos que poseen reservas en `producto.carritos`.
  - Contrasta cada reserva con los carritos activos en estados de borrador/previos a envío (`Pedido`, `Ficha pago`, `Pagado`, `Empaque`) utilizando expresiones regulares case-insensitive para prevenir falsos positivos.
  - Clasifica la ubicación del folio del apartado dentro del sistema:
    - **`cancelado`**: El folio existe en `Carrito_cancelado`.
    - **`pedido_historico`**: El folio existe en `Pedido` (completado/enviado).
    - **`carrito_inactivo`**: El folio existe en `Carrito` pero en un status inactivo.
    - **`no_existe`**: El folio no existe en ninguna colección de la base de datos.

- **Acción "Solo Limpiar" (`eliminar_apartado_huerfano_especifico`):**
  - Remueve la reserva del arreglo `producto.carritos` **sin modificar** las existencias del inventario físico.
  - Útil para apartados provenientes de carritos cancelados o folios inexistentes.

- **Acción "Limpiar y Descontar" (`limpiar_y_descontar_huerfano_especifico`):**
  - Diseñada para apartados pertenecientes a pedidos ya enviados (`pedido_historico`).
  - Remueve la reserva de `producto.carritos`.
  - Descuenta físicamente la cantidad enviada de `producto.existencia.actual`, `producto.existencias` y `producto.inventario`.
  - Registra un documento completo en la colección `producto_snaplogs` con:
    - `accion: "2"` (*descuento de inventario por envío de pedido*).
    - `cantidad` y `cantidad_anterior`.
    - `inventario_antes` y `inventario_despues` (existencias y apartados).
    - Datos del producto, pedido, cliente y usuario ejecutor.
  - Registra auditoría en el archivo en disco `logs_correccion/apartados_huerfanos.log` y en la colección `Log` de MongoDB.

- **Contador de Correcciones (`obtener_total_correcciones`):**
  - Consulta dinámicamente las entradas realizadas en `Log` y en el archivo en disco para proveer el total acumulado de correcciones ejecutadas.

---

## 🎨 2. Interfaz de Usuario (`index.svelte`)

**Ubicación:** `src/routes/app/dev_tools/huerfanos/index.svelte`

### Características de la Interfaz:
- **Tarjetas de Métricas:**
  1. **Apartados Huérfanos Detectados**: Total de registros detectados.
  2. **Piezas Retenidas en Limbo**: Total de piezas acumuladas en reservas huérfanas.
  3. **Huérfanos en Pedidos Enviados**: Cantidad de huérfanos listos para limpiar y descontar.
  4. **Correcciones Realizadas**: Contador dinámico acumulado de correcciones exitosas.

- **Tabla Interactiva y Paginación:**
  - Límite estricto de **10 registros por página**.
  - Filtro de búsqueda multinivel por SKU, modelo, producto, folio, cliente o ubicación.
  - Vista del producto (imagen, SKU, modelo, nombre), cantidad apartada, folio con badge, cliente y fecha del pedido.
  - Badges de color para **Ubicación del Folio**.

- **Acciones e Interacción:**
  - **Botón "Limpiar y Descontar"**: Disponible únicamente en filas pertenecientes a `Pedido (Completado)`. Abre un modal que calcula y muestra el stock actual vs nuevo stock proyectado.
  - **Botón "Solo Limpiar"**: Disponible en todas las filas para remover reservas sin afectar existencias.
  - **Acciones en Lote**: Botones superiores para procesar masivamente pedidos enviados o limpiar todos los registros.

---

## 📂 3. Estructura de Archivos Modificados / Creados

```
src/
├── routes/
│   ├── _layouts/
│   │   ├── side_panel.svelte (Menú Dev Tools agregado)
│   │   └── _componentes/
│   │       └── Item_side_panel.svelte (Soporte para sub-ítems colapsables)
│   └── app/
│       └── dev_tools/
│           └── huerfanos/
│               ├── index.svelte (Vista principal de apartados huérfanos)
│               └── obtener_huerfanos.js (API backend / endpoints GET y POST)
logs_correccion/
└── apartados_huerfanos.log (Bitácora en texto plano de correcciones realizadas)
```

---

## 🔄 4. Verificación y Pruebas Realizadas

- **Servidor:** Validado ejecutando en `http://localhost:3000/app/dev_tools/huerfanos`.
- **Persistencia en MongoDB:**
  - Verificada la remoción de elementos en `producto.carritos`.
  - Verificado el descuento en `producto.existencia.actual`.
  - Verificado la creación de entradas en `producto_snaplogs` con `accion: "2"`.
- **Sesión:** Integración con `postData` garantizando credenciales de sesión activas (`credentials: 'same-origin'`).
