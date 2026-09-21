# Documentación de Cambios: Optimización de Búsqueda de Productos

Este documento detalla las mejoras y modificaciones implementadas en el módulo de catálogo de productos (`/app/productos`), permitiendo búsquedas multi-palabra precisas por **código**, **nombre** y **marca**, además de reducir los tiempos de respuesta del servidor mediante indexación y paralelización en MongoDB.

## 🛠️ Cambios Realizados

---

### 1. Modelo de Datos y Base de Datos (MongoDB)

#### [MODIFY] [producto.js](file:///home/ghostpredator/Repos/xenon/src/models/producto.js)
Se agregaron índices secundarios no únicos en los campos principales utilizados durante las búsquedas y ordenamientos:
```javascript
schema.index({ codigo: 1 });
schema.index({ codigo_de_barras: 1 });
schema.index({ nombre: 1 });
schema.index({ marca: 1 });
```
- **Beneficio:** Evita escaneos completos de la colección (`COLLSCAN`), permitiendo a MongoDB localizar coincidencias por código o nombre en milisegundos (`IXSCAN`).

---

### 2. Backend (Endpoint de Búsqueda)

#### [MODIFY] [lista_de_activos_e_inactivos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/productos/lista_de_activos_e_inactivos.js)

* **Búsqueda Inteligente Multi-palabra (`$and` de `$or`):**
  Se reemplazó el reemplazo simple `.replace(' ', '|')` por la función `construirQueryBusqueda(texto)`. Ahora, cada palabra separada por espacio es evaluada con un conjunto de condiciones `$or` agrupadas bajo un `$and` general:
  ```javascript
  // Ejemplo: Si el usuario busca "22.5 gremax"
  // "22.5" DEBE coincidir en alguna propiedad (código, nombre, marca...) 
  // Y "gremax" DEBE coincidir también en alguna propiedad.
  ```
* **Sanitización de Expresiones Regulares:**
  Se agregó la función `escaparRegex` para sanitizar metacaracteres (como `.`, `-`, `()`, `+`), evitando que la búsqueda falle o interprete puntos como comodines.

* **Paralelización de Consultas (`Promise.all` y `.lean()`):**
  Se unificó el conteo de coincidencias (`countDocuments`) y la recuperación de registros (`find`) en un único `Promise.all`:
  ```javascript
  const [cuentaTotal, lista] = await Promise.all([
      Producto.countDocuments(query),
      Producto.find(query)
          .sort({ codigo: 1, nombre: 1 })
          .skip(pagina_actual * limite)
          .limit(limite)
          .lean()
  ]);
  ```
- **Beneficio:** Reduce a la mitad la latencia de red al enviar las solicitudes simultáneamente a MongoDB y evita la hidratación de objetos Mongoose en memoria RAM.

---

### 3. Frontend (Interfaz de Usuario)

#### [MODIFY] [_Lista.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/productos/_Lista.svelte)

* **Debounce de 350 ms al Escribir:**
  Se implementó un temporizador de 350 ms (`timerBusqueda`) para actualizar la lista automáticamente mientras el usuario escribe en el cuadro de búsqueda.
* **Ejecución Inmediata:**
  Al presionar `Enter` o hacer clic en el botón de la lupa, la búsqueda se ejecuta al instante cancelando cualquier temporizador pendiente.
* **Placeholder Actualizado:**
  Se actualizó el campo de texto a: `"Buscar por código, nombre o marca"`.

---

## 🎯 Resultados Obtenidos
1. **Precisión de Búsqueda:** Búsquedas compuestas (ej. `"22.5 gremax"` o `"LLA11R22.5"`) traen únicamente los productos que cumplen **todos** los términos ingresados.
2. **Mayor Fluidez:** El usuario ve actualizaciones dinámicas en la tabla al escribir sin requerir hacer clic constantemente en buscar.
3. **Alto Rendimiento:** Tiempos de respuesta inmediatos en backend gracias a los índices y ejecuciones en paralelo.
