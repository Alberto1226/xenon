# Documentación de Cambios: Optimización de Búsqueda de Pedidos

Este documento detalla las mejoras y modificaciones implementadas en el módulo de pedidos (`/app/pedidos`), permitiendo búsquedas unificadas por **folio**, **nombre de cliente**, **alias**, **dirección** y **agente** a través de las 3 vistas del sistema (Pendientes, Enviados y Cancelados).

## 🛠️ Cambios Realizados

---

### 1. Endpoints del Backend

#### [MODIFY] [lista_de_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos.js) (Pendientes)
* **Búsqueda Unificada de Folio y Cliente:**
  Se implementó la función `construirQueryPedido(buscando, usuario)`. Evalúa palabras independientes permitiendo buscar por coincidencia exacta o parcial de `folio` (si el término contiene números) Y/O por `cliente.nombre`, `cliente.alias`, `cliente.direccion` y `agente.nombre`.
* **Seguridad por Rol Preservada:**
  Conserva de manera estricta las restricciones para usuarios con roles de `vendedor`, `marketing` o `ComercioExterior`.
* **Paralelización:**
  `Promise.all([ Carrito.countDocuments(query), Carrito.find(query)...lean() ])` para ejecución simultánea y respuesta ultrarrápida.

#### [MODIFY] [lista_de_pedidos_historicos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos_historicos.js) (Enviados)
* **Búsqueda Unificada en Vista MongoDB (`vistaPedidosDatos`):**
  Aplica la misma consulta por folio/cliente sobre la vista de pedidos históricos finalizados.
* **Consultas en Paralelo:** `Promise.all` para conteo y consulta paginada.

#### [MODIFY] [lista_de_pedidos_cancelados.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos_cancelados.js) (Cancelados)
* **Búsqueda Unificada en Carritos Cancelados:**
  Aplica la búsqueda por folio y cliente sobre la colección `carritos_cancelados`.

---

### 2. Frontend (Svelte)

#### [MODIFY] [index.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/index.svelte)
* **Debounce de 350 ms al Escribir:**
  Se integró un temporizador de 350 ms para actualizar las listas dinámicamente al tipear sin requerir presionar `Enter` en cada intento.
* **Búsqueda Inmediata:**
  Presionar `Enter` o hacer clic en la lupa ejecuta la búsqueda al instante.
* **Placeholder descriptivo:** `"Buscar por folio o cliente..."`.

---

## 🎯 Resultados Obtenidos
1. **Flexibilidad:** El usuario puede buscar por número de folio (ej. `35826`), por nombre o alias del cliente (ej. `Transpormer` o `Angel Cano`) o por combinaciones de ambos.
2. **Consistencia:** Mismo comportamiento uniforme en las 3 secciones: **Pendientes**, **Enviados** y **Cancelados**.
3. **Alto Rendimiento:** Consultas backend optimizadas en paralelo con `.lean()`.
