# Reporte de Cambios y Mejoras del Sistema

**Fecha:** 30 de Octubre de 2026  
**Proyecto:** Xenón  
**Estado:** Implementado y Verificado  

---

## 1. Corrección de Tipos `ObjectId`, Manejo de `null` y Eliminación de `CastError`

### Problema Resuelto:
Tras la migración de esquemas de MongoDB donde campos de referencia pasaron de `String` a `Schema.Types.ObjectId`, se producían errores en tiempo de ejecución:
```
CastError: Cast to ObjectId failed for value "" at path "promo.id_promocion"
```
Mongoose rechaza convertir cadenas vacías `""` a `ObjectId`. En varios puntos del backend y frontend se seguían asignando `""` al limpiar o desasignar relaciones (sin agente, sin promo).

### Archivos y Cambios Realizados:
1. **[`src/models/producto_schema.js`](file:///c:/laragon/www/xenon/src/models/producto_schema.js):**
   * Se actualizó `promo.id_promocion` de `type: String, default: ""` a `{ type: Schema.Types.ObjectId, ref: 'Promocion', default: null }`, unificándolo con el esquema principal.
2. **[`src/routes/app/promociones/borrar_una.js`](file:///c:/laragon/www/xenon/src/routes/app/promociones/borrar_una.js):**
   * Al borrar/desactivar una promoción de un producto, se asigna `{ id_promocion: null }` en lugar de `''`.
3. **[`src/routes/app/promociones/nueva/promo_nueva.js`](file:///c:/laragon/www/xenon/src/routes/app/promociones/nueva/promo_nueva.js):**
   * Actualización de referencias para reflejar el tipo `ObjectId` con default `null`.
4. **[`src/routes/app/pedidos/editar/_promos/info_promos.svelte`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/editar/_promos/info_promos.svelte):**
   * Inicialización de `id_promocion: null` en lugar de `""`.
5. **[`src/routes/app/clientes/DatosCliente/index.svelte`](file:///c:/laragon/www/xenon/src/routes/app/clientes/DatosCliente/index.svelte):**
   * Estado inicial de `cliente.agente.id` cambiado de `""` a `null`.
   * Al desasignar agente en `asociarAgente()`, se asigna `null`.
   * En selección de cliente, `ag.id || null`.
6. **[`src/routes/app/clientes/nuevo/index.svelte`](file:///c:/laragon/www/xenon/src/routes/app/clientes/nuevo/index.svelte):**
   * Estado inicial de `agente.id` establecido en `null`.
7. **[`src/routes/app/pedidos/editar/crear_pedido_nuevo.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/editar/crear_pedido_nuevo.js) y [`_crear_pedido_nuevo.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/nuevo/_crear_pedido_nuevo.js):**
   * En `obtener_datos_agente(id_agente)`, cuando no hay agente o no existe en BD, devuelve `id: null` en lugar de `id: ''`.
8. **Compatibilidad Explícita en Vistas y Servicios:**
   * En `Row.svelte`, `Row_enviados.svelte`, `_Cambio_status.svelte` y `pedido_pipeline_service.js`, las validaciones de cliente de ruta se definieron explícitamente como:
     ```javascript
     (pedido.cliente.id == "" || pedido.cliente.id == null || !pedido.cliente.nombre)
     ```
     Asegurando compatibilidad tanto con registros históricos (`""`) como con nuevos registros (`null` / `ObjectId`).

---

## 2. Ajuste de Búsqueda bajo Demanda (Enter) y Fluidez en la Interfaz

### Problema Resuelto:
La búsqueda automática por pulsación de tecla (*debounce* de 350 ms) causaba parpadeos en pantalla y bloqueos visuales en usuarios que escriben despacio o con latencia de red, provocando una falsa percepción de lentitud.

### Archivos y Cambios Realizados:
1. **[`src/routes/app/productos/_Lista.svelte`](file:///c:/laragon/www/xenon/src/routes/app/productos/_Lista.svelte):**
   * Se eliminó el *debounce* por tecla. Ahora la búsqueda se ejecuta únicamente al presionar la tecla **`Enter`** o al hacer clic en el botón de la lupa.
2. **[`src/routes/app/pedidos/index.svelte`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/index.svelte):**
   * Se retiró el temporizador de escritura, ejecutando la consulta únicamente bajo demanda (`Enter` o clic en la lupa).
3. **Resultado:** Escritura 100% fluida en el campo de texto y respuesta inmediata y sólida al dar Enter.

---

## 3. Búsqueda Inteligente Multi-campo y Medidas en Pulgadas (Productos)

### Problemas Resueltos:
1. **Discriminación de medidas en pulgadas (ej. `2.5"`):**
   * Si se eliminaban las comillas, buscar `2.5"` traía el producto deseado (`TWEETER 2.5"`), pero también llantas `22.5 GAJO` y `22.5 LISA` porque el número `22.5` contiene `2.5`.
2. **Búsqueda por fragmentos dispersos (ej. `9" G carbon frame`):**
   * El usuario suele recordar parte del nombre (`9 G`) y la marca (`Carbon Frame`), e introduce comillas por costumbre (`9"`). Sin embargo, en la base de datos el producto está registrado como `BMW X3 2006-2010 9 G` y su marca es `Carbon Frame`.

### Archivo y Cambios Realizados:
* **[`src/routes/app/productos/lista_de_activos_e_inactivos.js`](file:///c:/laragon/www/xenon/src/routes/app/productos/lista_de_activos_e_inactivos.js):**
  * **Sin sintaxis obligatoria:** El usuario escribe términos con espacios normales (sin necesidad de comas).
  * **Detección de medidas con comillas:** Cuando se busca una medida con comilla literal (ej. `2.5"`), prioriza la coincidencia exacta con comilla para **excluir llantas `22.5`**.
  * **Búsqueda multi-campo paralela:** Separa las palabras por espacio (`9"`, `G`, `carbon`, `frame`) y genera variantes con y sin comillas, permitiendo que `9 G` coincida en el campo `nombre` y `carbon frame` en el campo `marca` mediante `$and`.
  * **Frase completa como alternativa:** En la misma consulta evalúa en paralelo si el texto coincide como frase completa en algún campo.

---

## 4. Limpieza y Tolerancia de Comillas en Pedidos

### Archivos y Cambios Realizados:
* **[`src/routes/app/pedidos/lista_de_pedidos.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/lista_de_pedidos.js)**
* **[`src/routes/app/pedidos/lista_de_pedidos_historicos.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/lista_de_pedidos_historicos.js)**
* **[`src/routes/app/pedidos/lista_de_pedidos_cancelados.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/lista_de_pedidos_cancelados.js)**
* **[`src/routes/app/pedidos/lista_de_rutas_finalizadas.js`](file:///c:/laragon/www/xenon/src/routes/app/pedidos/lista_de_rutas_finalizadas.js)**
  * Se sustituyó el código anterior `.replace('"', '')` (que solo borraba la primera comilla y rompía expresiones regulares) por una sanitización global `/["'“”]/g`.
  * Permite al usuario buscar folios o clientes entre comillas sin fallos ni errores de consulta.

---

## Tabla Resumen de Archivos Modificados

| Módulo | Archivo | Tipo de Cambio |
| :--- | :--- | :--- |
| **Modelos** | `src/models/producto_schema.js` | Schema `promo.id_promocion`: `ObjectId` con default `null` |
| **Promociones** | `src/routes/app/promociones/borrar_una.js` | Asignación de `id_promocion: null` al eliminar promo |
| **Promociones** | `src/routes/app/promociones/nueva/promo_nueva.js` | Documentación de esquema de promo |
| **Promociones** | `src/routes/app/pedidos/editar/_promos/info_promos.svelte` | Inicialización de `id_promocion: null` |
| **Clientes** | `src/routes/app/clientes/DatosCliente/index.svelte` | `agente.id` inicializado y desasignado en `null` |
| **Clientes** | `src/routes/app/clientes/nuevo/index.svelte` | `agente.id` inicializado en `null` |
| **Pedidos** | `src/routes/app/pedidos/editar/crear_pedido_nuevo.js` | Resolución de agente retorna `id: null` si no existe |
| **Pedidos** | `src/routes/app/pedidos/nuevo/_crear_pedido_nuevo.js` | Resolución de agente retorna `id: null` si no existe |
| **Pedidos** | `src/routes/app/pedidos/_servicios/pedido_pipeline_service.js` | Validación explícita `(id == "" \|\| id == null)` |
| **Vistas Pedidos**| `src/routes/app/pedidos/_listas/Row.svelte` | Validación explícita `(id == "" \|\| id == null)` |
| **Vistas Pedidos**| `src/routes/app/pedidos/_listas/Row_enviados.svelte` | Validación explícita `(id == "" \|\| id == null)` |
| **Vistas Pedidos**| `src/routes/app/pedidos/_listas/_Cambio_status.svelte` | Validación explícita `(id == "" \|\| id == null)` |
| **Frontend Búsqueda** | `src/routes/app/productos/_Lista.svelte` | Búsqueda solo con tecla `Enter` o clic en Lupa |
| **Frontend Búsqueda** | `src/routes/app/pedidos/index.svelte` | Búsqueda solo con tecla `Enter` o clic en Lupa |
| **Backend Búsqueda** | `src/routes/app/productos/lista_de_activos_e_inactivos.js` | Motor multi-campo inteligente y medidas literales |
| **Backend Búsqueda** | `src/routes/app/pedidos/lista_de_pedidos.js` (y variantes) | Sanitización global de comillas |

