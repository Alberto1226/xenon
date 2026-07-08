# Análisis de Roles y Plan de Transición a Control de Acceso Dinámico (RBAC)

Este documento detalla la estructura actual de permisos y roles hardcodeados en el código de Xenón, y presenta un plan de ingeniería para migrar a un modelo de control de acceso basado en roles dinámicos (RBAC) administrable desde la base de datos.

---

## 📊 1. Matriz de Permisos Actuales (Hardcodeados)

El sistema evalúa el campo literal `usuario.rol` para autorizar u ocultar componentes y endpoints.

| Módulo / Acción | Administrador | Gerente | Comercio Exterior | Almacén | Diseñador | Vendedor | Marketing |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Registrar nuevo producto** | Sí | No | No | No | No | No | No |
| **Editar precios / códigos** | Sí | Sí | No | No | No | No | No |
| **Editar imágenes de producto** | Sí | Sí | Sí | Sí | **Sí** | Sí | Sí |
| **Ver Reporte de Utilidades** | **Sí** | No | No | No | No | No | No |
| **Acceso a módulo Pedimentos** | Sí | Sí | No | No | No | No | No |
| **Modificar importes de Pedido**| Sí | Sí | **Sí** | **No** | No | Sí | Sí |
| **Asignar folios en arribo** | Sí | Sí | No | **Sí** | No | No | No |
| **Ver todos los clientes** | Sí | Sí | **No** (Solo suyos) | Sí | No | **No** (Solo suyos) | **No** (Solo suyos) |
| **Descargar inventario (Excel)** | Sí | Sí | **No** | Sí | Sí | No | **Sí** |

---

## 🔍 2. Inventario de Archivos con Roles Hardcodeados

A continuación se listan los archivos del proyecto que contienen lógica de negocio o de interfaz condicionada directamente por strings de roles:

### A. Controladores del Backend (Endpoints de Sapper)
* **[accesos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/accesos.js):**
  * Centraliza funciones auxiliares de comparación de cadenas para `'administrador'` (línea 20), `'vendedor'` / `'marketing'` / `'ComercioExterior'` (línea 26) y `'gerente'` (línea 34).
* **[lista_de_clientes.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/clientes/lista_de_clientes.js):**
  * **Líneas 50 y 144:** Si es `'vendedor'`, `'marketing'` o `'ComercioExterior'`, la consulta a la base de datos filtra los clientes para mostrar únicamente los que tengan su `agente.id` asociado.
  * **Líneas 71 y 148:** Si es `'administrador'` o `'gerente'`, se le permite ver y consultar la lista global de clientes de la base de datos.
* **[Guardado_Edicion_Cliente.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/clientes/DatosCliente/Guardado_Edicion_Cliente.js):**
  * **Línea 98:** Si el rol es `'vendedor'`, `'marketing'` o `'ComercioExterior'`, se asigna automáticamente al usuario como agente.
* **Controladores de Pedidos ([lista_de_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos.js#L68), [lista_de_pedidos_cancelados.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos_cancelados.js#L67), [lista_de_pedidos_publicos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos_publicos.js#L68), [lista_de_pedidos_historicos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos_historicos.js#L68) y [lista_de_pedidos_publicos_historicos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/lista_de_pedidos_publicos_historicos.js#L68)):**
  * **Líneas 68 y 134:** Si el rol es `'vendedor'`, `'marketing'` o `'ComercioExterior'`, la consulta restringe los resultados a sus propios pedidos. Si es `'administrador'` o `'gerente'`, descarga la lista global sin filtros de agente.
* **[pedidos_listos_para_empaque.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/productos/Almacen/pedidos_listos_para_empaque.js):**
  * **Líneas 68 y 75:** Filtra el listado de empaque según el rol del usuario (vendedor/marketing/ComercioExterior vs administrador/gerente).
* **[activar_notis.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/notificacion/activar_notis.js):**
  * Filtra las suscripciones de notificaciones push del navegador según el rol del usuario.

### B. Vistas de la Interfaz (Componentes Svelte)
* **[side_panel.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/_layouts/side_panel.svelte):**
  * Determina qué pestañas y botones del menú lateral se muestran a cada usuario comparando su rol contra arrays de strings (añadido `'marketing'` y `'ComercioExterior'` a Inicio, Pedidos, Productos y Clientes).
* **[productos/index.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/productos/index.svelte#L116):**
  * Oculta el botón de "Registrar Producto" si el rol es `'diseñador'`, `'vendedor'`, `'gerente'`, `'almacen'`, `'ComercioExterior'` o `'marketing'`.
* **[productos/_Row.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/productos/_Row.svelte):**
  * **Líneas 484, 516 y 568:** Oculta controles de edición, desactivación y categoría a `'ComercioExterior'` y `'marketing'`.
  * **Línea 484 (Desactivación):** Se ocultó la opción de activar o desactivar productos (cruz roja / check verde) para los roles `'marketing'` y `'ComercioExterior'`.
  * **Línea 516 (Edición):** Se ocultó el botón de edición de producto (lápiz verde) para los roles `'marketing'` y `'ComercioExterior'`.
  * **Línea 530 (Movimientos):** Los botones de historial y detalles de movimientos (reloj naranja e info) permanecen **visibles y accesibles** para los roles `'marketing'` y `'ComercioExterior'`.
  * **Línea 568 (Categoría):** Se ocultó el botón de edición de categoría (árbol morado) para los roles `'marketing'` y `'ComercioExterior'`.
  * **Línea 549:** Muestra opciones especiales de carga de imágenes si el rol es `'diseñador'`.
* **[pedidos/editar/Paso_1.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_1.svelte) y [Paso_2.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_2.svelte):**
  * Deshabilitan la edición de cantidades, precios y botones de confirmación si el rol es `'almacen'`.
* **[_Rol.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/usuarios/nuevo/_Rol.svelte#L5):**
  * Define la lista estática de roles seleccionables al crear un usuario en el sistema.

---

## 🛠️ 3. Plan de Acción: Transición a un Sistema Dinámico (RBAC)

Para eliminar el hardcodeo y permitir que los permisos se configuren dinámicamente desde una base de datos sin requerir modificaciones en el código, se propone la siguiente estrategia dividida en 4 fases:

### Fase 1: Modelo de Datos de Roles y Permisos (Mongoose)
Crearemos una nueva colección de `roles` en MongoDB y asociaremos a los usuarios con un rol dinámico.

1. **Crear el modelo `Rol` ([rol.js](file:///home/ghostpredator/Repos/xenon/src/models/rol.js)):**
   ```javascript
   const mongoose = require('mongoose');
   const Schema = mongoose.Schema;

   const schema = new Schema({
       nombre: { type: String, required: true, unique: true }, // Ej: 'vendedor'
       descripcion: { type: String, default: '' },
       permisos: [{ type: String }] // Array de scopes. Ej: ['productos:crear', 'pedidos:ver_todos']
   });

   export const Rol = mongoose.model('Rol', schema);
   ```
2. **Modificar el modelo `Usuario` ([usuario.js](file:///home/ghostpredator/Repos/xenon/src/models/usuario.js)):**
   * Cambiar el campo `rol` de tipo `String` a una referencia de Mongoose:
     ```javascript
     rol: { type: Schema.Types.ObjectId, ref: 'Rol' }
     ```

---

### Fase 2: Middleware de Seguridad en el Backend (API)
Crearemos un mecanismo centralizado en el backend para validar permisos basado en "scopes".

1. **Implementar helper de autorización en [accesos.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/accesos.js):**
   ```javascript
   export function tiene_permiso(req, permisoRequerido) {
       const usuario = req.user;
       if (!usuario || !usuario.activo) return false;
       
       // Si es administrador general, tiene todos los permisos automáticamente
       if (usuario.rol && usuario.rol.nombre === 'superadmin') return true;

       // Verificar si el rol del usuario contiene el scope requerido
       return usuario.rol && usuario.rol.permisos.includes(permisoRequerido);
   }
   ```
2. **Reemplazar las validaciones en los endpoints:**
   * En lugar de:
     `if (usuario.rol === 'vendedor')`
   * Usar:
     `if (accesos.tiene_permiso(req, 'pedidos:ver_todos') === false)`

---

### Fase 3: Desacoplamiento en el Frontend (Svelte Stores)
Evitaremos que el frontend conozca los nombres de los roles. La interfaz se condicionará exclusivamente mediante la lista de permisos (scopes) del usuario.

1. **Enviar los permisos en la sesión:**
   * Cuando el usuario inicia sesión o se consulta su estado, el servidor le envía su lista de permisos de MongoDB:
     `{ ok: true, usuario: { nombre: '...', permisos: ['productos:crear', 'pedidos:editar'] } }`
2. **Usar un Svelte Store para los permisos:**
   * En el frontend, guardamos esta lista de permisos en un store reactivo (por ejemplo, `$permisos`).
3. **Condicionar la interfaz por permisos:**
   * En lugar de:
     `{#if $usuario_db.rol === 'administrador'}`
   * Usar:
     `{#if $permisos.includes('reportes:utilidades')}`
     `{#if $permisos.includes('productos:crear')}`

---

### Fase 4: Panel de Configuración de Roles (UI)
Crearemos una interfaz web exclusiva para administradores que permita gestionar los accesos en tiempo real:
* **Lista de Roles:** Crear, editar y eliminar roles.
* **Asignación de Permisos:** Una matriz de checkboxes donde el administrador puede activar o desactivar permisos específicos para cada rol (ej. activar el permiso de "Crear Productos" al rol "gerente").
* **Asignación a Usuarios:** Al editar un usuario, en lugar de un dropdown estático de texto, se consultan los roles de la base de datos de forma dinámica.
