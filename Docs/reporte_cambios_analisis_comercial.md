# Reporte de Cambios: Módulo de Estado de Cuenta Anual y Análisis Comercial de Clientes

Este documento consolida y describe todos los cambios realizados para implementar el nuevo módulo de **Análisis Comercial y Estado de Cuenta Anual** de los clientes de Xenón. La implementación abarca modificaciones en base de datos, endpoints del backend, interfaces visuales en Svelte, e interactividad avanzada.

---

## 🛠️ Detalle de Archivos Creados y Modificados

### 1. Backend (API y Agregación de Datos)
* **[NEW] [obtener_analisis.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/clientes/analisis_comercial/obtener_analisis.js):**
  * Creado el endpoint que procesa las estadísticas de ventas de un cliente específico, cargando sus datos de forma segura.
  * Realiza los cálculos analíticos comerciales en tiempo real:
    * **Métricas Básicas:** Total histórico comprado, ticket promedio, primera y última compra con montos y folios.
    * **Clasificación de Estado Comercial:** Asigna categorías reactivas: *Inactivo* (sin compras en 6 meses), *Nuevo* (<90 días de registro), *Frecuente* (>=3 compras en el último mes), o *Recurrente* (compras en los últimos 3 meses consecutivos).
    * **Detección de Clientes de Alto Valor:** Mediante agregación en MongoDB, calcula si el cliente se ubica en el top 10% de facturación acumulada del universo de clientes con su mismo perfil comercial.
    * **Crecimiento y Riesgo:** Compara la facturación del año en curso con el año anterior, catalogándolo como *En Crecimiento* (crecimiento > 5%) o *En Riesgo* (caída del 30% o superior).
    * **Productos en Pedidos (Doble Clic):** Retorna de forma mapeada y optimizada la lista de productos comprados (código, nombre, cantidad y precio) para cada pedido del historial.
    * **Filtro de Fechas Dinámico:** Filtra cronológica y mensualmente los pedidos según el rango de fechas recibido del cliente.

### 2. Frontend (Panel de Navegación Lateral y Catálogo)
* **[MODIFY] [side_panel.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/_layouts/side_panel.svelte):**
  * Se agregó el botón **"Análisis Comercial"** con icono `analytics` en la sección de opciones del menú para dar acceso directo a la pantalla.
* **[MODIFY] [_Row.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/clientes/_Row.svelte):**
  * Se incorporó el botón con icono de analítica (`analytics`) en la lista de acciones de cada fila de clientes. Al presionarlo, redirige al usuario a la vista de análisis cargando de forma automática al cliente seleccionado.

### 3. Frontend (Dashboard e Interactividad)
* **[NEW] [index.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/clientes/analisis_comercial/index.svelte):**
  * **Estructura del Dashboard:** KPI Cards de consumo, insignias animadas de colores según el estado comercial del cliente y una tabla paginada de historial de compras.
  * **Buscador Nativo de Alto Contraste:** Se implementó un `<input>` HTML nativo con icono de búsqueda y botón de limpiar en reemplazo de componentes de librerías externas. Posee un fondo gris translúcido moderno y resalte de borde azul al enfocarse, asegurando 100% de visibilidad en modo oscuro.
  * **Filtros por Fecha Reactivos:** Checkbox para activar rango de fechas personalizado (`Desde` / `Hasta`) que actualiza dinámicamente todo el dashboard.
  * **Gráficas Comparativas SVG:**
    * **Anual (Barras):** Muestra el acumulado de compras anuales.
    * **Mensual (Línea):** Muestra la estacionalidad de compras mes a mes.
  * **Filtro Rápido por Año:** Al hacer clic sobre cualquier barra anual (o su etiqueta de año) en el gráfico, el sistema activa automáticamente el filtro de fecha configurando el rango desde el 1 de enero al 31 de diciembre del año seleccionado, recargando de inmediato los datos del dashboard.
  * **Doble Clic en Historial de Compras (Modal):** Al dar doble clic en cualquier fila de compra del historial, se despliega un modal flotante elegante con desenfoque de fondo (*backdrop blur*) que detalla la información del pedido y lista los productos comprados (Código, Descripción, Cantidad, Precio Unitario e Importe).
  * **Cards Flotantes (Tooltips Reactivos):**
    * **Tooltip Anual:** Al pasar el ratón por encima de una barra de año, muestra el Año, el Total Vendido y la cantidad de pedidos hechos de ese periodo.
    * **Tooltip Mensual (Condicional):** Al pasar el ratón por encima de un círculo en la gráfica de tendencia mensual (únicamente cuando hay un año seleccionado en el filtro), se despliega una card verde con los detalles de ese mes (Mes/Año, Total y Pedidos).
  * **Exportación a PDF en Cliente:** Implementada la inyección dinámica de `pdfmake` y `vfs_fonts` desde un CDN confiable sólo cuando el usuario presiona "Exportar a PDF". Esto evita que Rollup analice la librería al compilar, solucionando de raíz el error de compilación `Assigning to rvalue (4209:0)` y manteniendo el bundle de la aplicación liviano y rápido. Genera y descarga un Estado de Cuenta formal y corporativo del cliente.

---

## 🔍 Guía de Pruebas y Validación

1. **Catálogo de Clientes:**
   * Entra a la sección de **Clientes** y confirma que cada fila posea el nuevo botón de gráfica de barra azul.
   * Presiona el botón del cliente **MERCADO LIBRE 42** o **Claudia**. Confirma que se te redirija a la pantalla de análisis con el cliente ya cargado.
2. **Selector de Cliente (Buscador):**
   * Escribe parte del nombre del cliente en la caja de búsqueda superior (ej: *"Claudia"*). Comprueba que el desplegable predictivo se muestre de inmediato.
3. **Filtro por Clic en Gráfico de Barras:**
   * Haz clic sobre la barra de barras del año **2020** o **2023** en la gráfica de *Ventas Comparativas por Año*.
   * Comprueba que:
     * El checkbox de rango de fechas se activa.
     * Los inputs se autocompletan con las fechas correspondientes (ej: `01/01/2020` a `12/31/2020`).
     * Las métricas (KPIs), la tabla de compras y el gráfico mensual de tendencia se actualizan de inmediato.
4. **Tooltips Interactivos (Cards):**
   * Pasa el cursor por las barras anuales y confirma que la card flotante siga al ratón detallando las ventas del año.
   * Con el año filtrado, pasa el cursor por los puntos de la gráfica mensual y comprueba que se visualice la card de detalles verde del mes correspondiente.
5. **Doble Clic (Modal de Productos):**
   * Haz doble clic sobre cualquier registro en la tabla de *Historial de Compras Realizadas*.
   * Valida que se abra el modal flotante detallando la lista completa de productos adquiridos y sus subtotales.
6. **Exportación de PDF:**
   * Haz clic en **"Exportar a PDF"**.
   * Verifica que el botón cambie a *"Cargando exportador..."* temporalmente (mientras descarga los scripts asíncronos si es la primera vez) y posteriormente descargue el archivo `Estado_Cuenta_[Nombre_Cliente].pdf` con estructura e insignias de descuento corporativas.
