# Documento de Permisos de Roles Agregados: Marketing y Comercio Exterior

Este documento describe las capacidades, accesos y limitaciones de los dos nuevos roles configurados en la plataforma: **Marketing** y **Comercio Exterior**, los cuales actúan como variaciones del rol de vendedor estándar.

---

## 👥 1. Rol: Marketing

El rol de **Marketing** está diseñado para usuarios enfocados en la comercialización que requieren visibilidad del inventario físico y la capacidad de extraer bases de datos para análisis comerciales, pero sin privilegios de edición técnica de productos.

### 🟢 Funciones Permitidas
* **Filtro de Vendedor (Clientes y Pedidos):** Solo puede ver y gestionar los clientes y pedidos donde esté asignado como agente.
* **Descarga de Inventario (Excel):** Tiene acceso al botón de **"Descargar"** en la sección de productos para exportar el inventario completo a Excel.
* **Ventas de Productos (Movimientos):** Puede visualizar el historial de ventas y movimientos de cada producto (reloj naranja e info en la lista de productos).

### 🔴 Restricciones
* **No puede editar la información comercial del producto** (deshabilitado el lápiz de edición).
* **No puede cambiar o asignar categorías** a los productos.
* **No puede activar o desactivar productos** para la venta en el catálogo.

---

## 👥 2. Rol: Comercio Exterior

El rol de **Comercio Exterior** está estructurado para usuarios del área logística y de aduanas que gestionan clientes o importaciones específicas bajo un esquema de agente, requiriendo visibilidad de los flujos de existencias.(esto cuando se carguen los cambios de pedimentos del sistema de importaciones)

### 🟢 Funciones Permitidas
* **Filtro de Vendedor (Clientes y Pedidos):** Solo visualiza y gestiona sus clientes y pedidos asignados.
* **Ventas de Productos (Movimientos):** Puede abrir y auditar el historial de ventas y movimientos de cualquier producto desde el catálogo.

### 🔴 Restricciones
* **No puede descargar el inventario en Excel** (el botón de descarga en la sección de productos está oculto).
* **No puede editar la información comercial del producto** (deshabilitado el lápiz de edición).
* **No puede cambiar o asignar categorías** a los productos.
* **No puede activar o desactivar productos** para la venta en el catálogo.

---

## 📊 3. Tabla Comparativa de Permisos: Vendedores y Variantes

| Permiso / Capacidad | Vendedor (Estándar) | Marketing | Comercio Exterior |
| :--- | :---: | :---: | :---: |
| Ver menú lateral (Inicio, Pedidos, Clientes, Productos) | Sí | Sí | Sí |
| Ver solo clientes y pedidos propios | Sí | Sí | Sí |
| Asignación automática de agente al crear cliente | Sí | Sí | Sí |
| **Descargar Inventario de Productos (Excel)** | **No** | **Sí** | **No** |
| **Ver Movimientos/Ventas de Productos (Historial)**| **No** | **Sí** | **Sí** |
| Modificar o editar datos de un producto | No | No | No |
| Cambiar categoría de un producto | No | No | No |
| Activar/desactivar productos para venta | No | No | No |

---

## ⚙️ 4. Configuración en la Base de Datos

Al crear o editar un usuario desde el panel de administración, los nombres exactos de los roles a seleccionar en el selector de la interfaz son:
* `'marketing'`
* `'ComercioExterior'`
