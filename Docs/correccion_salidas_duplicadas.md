# Corrección de salidas duplicadas

En Dev Tools, **Salidas duplicadas** permite al usuario `isotech_Xenonymas` con rol administrador consultar un folio y revisar los movimientos de cada producto. El endpoint verifica ambas condiciones; ocultar el menú no es la autorización.

El botón **Ver movimientos** muestra el historial completo del producto en un modal paginado, incluidos otros pedidos y correcciones anteriores. Los movimientos del folio consultado aparecen resaltados; la consulta del historial no modifica inventario.

Para habilitar un producto se requiere un único pedido no cancelado con ese folio, una sola partida para el producto y exactamente dos snaplogs de acción `2`, ambos con la cantidad del pedido y una disminución de existencias equivalente. Los registros similares son evidencia, no prueba concluyente: el operador debe revisar el historial y confirmar que corresponde corregir. Los productos ambiguos se muestran sin opción de corrección.

Se puede usar **Corregir** en una partida o seleccionar varias con las casillas y usar **Corregir seleccionados** en el encabezado del pedido o en la barra inferior que aparece al seleccionar productos. La selección se confirma antes de aplicar. El servidor vuelve a consultar el pedido, los movimientos y la existencia mostrada; si cambiaron, solicita repetir la consulta. Cada producto corregido suma una vez la cantidad de la partida a `existencia.actual` (dos salidas de 3 se corrigen sumando 3, no 6), sin alterar apartados ni folios. Se registra un snaplog de acción `1c` con usuario, folio, existencias antes y después y las dos salidas revisadas. Una marca en el producto impide volver a corregir el mismo producto y folio mediante esta herramienta.

La casilla **Seleccionar todos los corregibles** solo marca los productos habilitados; excluye los ya corregidos y los que requieren revisión manual. Desmarcarla limpia la selección.

Compatible con MongoDB standalone: el incremento y una marca con la evidencia completa del snaplog se guardan en una sola escritura atómica en el producto. Después se crea el snaplog con un identificador fijo y se marca la auditoría como completada. Si falla o se interrumpe el proceso, consulta de nuevo el folio: una auditoría pendiente muestra **Recuperar snaplog**, que reintenta el registro sin modificar existencias. La recuperación puede reintentarse y no crea snaplogs duplicados.

Las correcciones múltiples son independientes por producto, no una transacción global: si alguna falla, las anteriores pueden estar aplicadas y las posteriores no. Consulta el folio y revisa el estado de cada producto antes de continuar. Las marcas solo cubren correcciones realizadas por esta herramienta: revisa también ajustes manuales previos. Los datos deben conservarse en MongoDB hasta completar la auditoría; restaurar respaldos parciales o modificar manualmente las marcas puede invalidar estas garantías.

Durante una corrección, un modal muestra el producto en proceso y el número de productos con ajuste y snaplog confirmados. Se envía una solicitud por producto; si una falla o la respuesta es incierta, se detiene el lote y se actualiza el estado del pedido. El producto interrumpido no se cuenta como confirmado aunque podría haberse aplicado, por lo que debe revisarse antes de reintentar. No cierres ni recargues la página durante el proceso.

## Envío web y riesgos

El cambio a **Envío** bloquea visualmente la interfaz después de la confirmación y muestra errores al usuario. A petición del usuario se retiraron el bloqueo persistente del pedido, la consulta preventiva de snaplogs y las marcas de idempotencia de envío. El bloqueo visual solo afecta a esa interfaz mientras espera la respuesta.

**No se evitan descuentos duplicados entre pestañas, usuarios o solicitudes simultáneas, ni al reintentar después de un error parcial.** Si falla el descuento, la limpieza de apartados, el snaplog o el guardado del estatus, algunos productos pueden haberse descontado y otros no; revisa inventario y movimientos antes de reintentar. El servidor detiene el procesamiento y devuelve un error, pero no bloquea el pedido.

Los campos `control_envio` y `salidas_pedido_procesadas` que pudieran existir de versiones anteriores permanecen en la base de datos, pero el flujo actual no los usa ni elimina. La herramienta de corrección mantiene sus propias marcas independientes para impedir correcciones duplicadas.

Ante un error o una respuesta de red incierta, registra el folio y el mensaje completo, y comunícalos al responsable. Aunque el pedido siga disponible para reintentar, comprueba el estatus, las existencias y los movimientos de todas las partidas antes de hacerlo. La ausencia de un snaplog no demuestra que el descuento no se haya aplicado; tampoco se debe corregir inventario solo porque aparezcan dos movimientos.

Esta decisión afecta al envío web; no elimina los mecanismos existentes de otros procesos, como la cancelación, ni modifica la finalización independiente de rutas móviles.

## Problema investigado

Se reportó que en un pedido algunos productos tuvieron dos salidas registradas y un posible descuento duplicado de existencias. El escenario concreto que se investigó fue el cambio del pedido a **Envío**, acción que descuenta físicamente los productos.

El servidor consulta el estatus del carrito, después recorre sus productos y descuenta sus existencias y, al final, guarda el estatus `Envío`. Dos solicitudes simultáneas pueden leer el mismo estatus previo antes de que cualquiera lo actualice y ejecutar los descuentos. Una interrupción después del descuento, pero antes de guardar el estatus, también puede dejar el pedido aparentemente pendiente y permitir otro intento.

El snaplog se registra después del descuento y en una escritura separada. Por eso, buscar previamente un snaplog de salida es útil para detectar evidencia histórica, pero **no basta como garantía de idempotencia**: dos solicitudes pueden consultar antes de que exista el snaplog, o el descuento puede haberse aplicado aunque el snaplog no se haya guardado. Tampoco se puede asegurar que dos snaplogs equivalentes demuestren, por sí solos, que el stock fue descontado dos veces; es necesario revisar otros movimientos y ajustes.

La solución tiene dos partes distintas:

1. **Corrección de incidentes existentes:** consultar un folio, revisar la evidencia y, solo con confirmación del operador, regresar una cantidad por producto elegible y registrar la auditoría.
2. **Interfaz de envío web:** mostrar el bloqueo de pantalla durante la solicitud e informar fallos. No protege contra solicitudes concurrentes o reintentos.

## Cambios por archivo

### Modelos

#### [`src/models/producto_snaplog.js`](../src/models/producto_snaplog.js)

Se agregó `correccion_salida_duplicada.salidas`, que guarda los identificadores de los dos snaplogs que respaldan una corrección. La corrección utiliza la acción `1c` y conserva así un vínculo entre el ajuste de entrada y las salidas revisadas.

### Envío de pedidos

#### [`src/routes/app/pedidos/_servicios/pedido_pipeline_service.js`](../src/routes/app/pedidos/_servicios/pedido_pipeline_service.js)

`cambiar_status_a_envio` consulta el carrito y, si ya está en `Envío`, responde sin volver a descontar. Si falla el descuento o la auditoría, devuelve un error que advierte de posibles descuentos parciales. Si termina correctamente, guarda `Envío`. No hay bloqueo persistente ni comprobación de salidas previas; la consulta inicial no protege frente a solicitudes simultáneas.

El registro general de actividad se intenta después de guardar `Envío`: si ese registro falla, se escribe el error en el servidor, pero el envío ya completado se responde como exitoso. Esto es independiente del snaplog de cada producto, cuyo fallo sí interrumpe el recorrido y devuelve un error.

#### [`src/routes/app/pedidos/_servicios/inventario_reserva_service.js`](../src/routes/app/pedidos/_servicios/inventario_reserva_service.js)

En `descontar_fisico_inventario` cada producto se actualiza mediante `$inc`; si se seleccionaron folios, también se retiran en esa actualización. No se agregan ni consultan marcas de idempotencia para el envío.

Se mantienen la limpieza posterior de apartados y la creación del snaplog, pero se detectan explícitamente sus errores, incluido el caso en que el helper de snaplog devuelve `ok: false` sin lanzar una excepción. El snaplog de salida ahora recibe también el identificador del carrito en `pedido.id`. Un producto inexistente o un error en cualquiera de las etapas detiene el recorrido y devuelve un resultado de error al orquestador: productos anteriores pueden haber quedado aplicados y los posteriores no.

La limpieza de apartados, el snaplog y el cambio final del carrito son escrituras independientes; por tanto, un fallo puede dejar una operación parcial.

#### [`src/routes/app/pedidos/_listas/_Cambio_status.svelte`](../src/routes/app/pedidos/_listas/_Cambio_status.svelte)

Se conserva la confirmación existente de varios clics y, después de la confirmación definitiva, se agrega al indicador global de carga un mensaje para el folio procesado. El indicador utiliza la pantalla completa existente y se retira al terminar la solicitud, tanto en éxito como en error, sin borrar los mensajes de carga de otras operaciones.

Se corrigió el uso de una variable de estatus no definida en los mensajes del envío. La interfaz informa los errores devueltos por el servidor, advierte que un fallo de comunicación deja el resultado incierto y actualiza la lista al finalizar. Al cerrar el diálogo se restablece el texto de confirmación. También se muestra el error cuando un cambio básico de estatus responde `ok: false`, en lugar de dejar el componente procesando.

### Herramienta de corrección

#### [`src/routes/_layouts/side_panel.svelte`](../src/routes/_layouts/side_panel.svelte)

Se agregó la entrada **Dev Tools → Salidas duplicadas**, visible para el usuario `isotech_Xenonymas` con rol administrador. Esta restricción del menú es solo de presentación; la autorización real también se verifica en el servidor.

#### [`src/routes/app/dev_tools/salidas_duplicadas/index.svelte`](../src/routes/app/dev_tools/salidas_duplicadas/index.svelte)

Es la pantalla de consulta y corrección: recibe el folio, muestra las partidas, existencias, salidas encontradas y motivos de elegibilidad o bloqueo. Permite abrir los movimientos de cada producto, corregir individualmente, seleccionar productos elegibles, seleccionar todos los corregibles y ejecutar el lote desde el encabezado o la barra inferior.

La corrección se confirma antes de ejecutarse. Para el lote se envía una solicitud por producto en secuencia; al encontrar un error o resultado incierto se detiene el procesamiento y se vuelve a consultar el estado. La pantalla ofrece **Recuperar snaplog** cuando hay evidencia de auditoría pendiente y advierte antes de abandonar la página mientras hay trabajo en curso.

#### [`src/routes/app/dev_tools/salidas_duplicadas/_criterios.js`](../src/routes/app/dev_tools/salidas_duplicadas/_criterios.js)

Centraliza la evaluación de elegibilidad: rechaza una corrección previa, una cantidad inválida, un número de salidas distinto de dos, cantidades diferentes a la partida o variaciones de existencias que no coinciden con ella. Devuelve un motivo visible para el operador. El servidor aplica además las comprobaciones del pedido, producto y stock.

#### [`src/routes/app/dev_tools/salidas_duplicadas/operaciones.js`](../src/routes/app/dev_tools/salidas_duplicadas/operaciones.js)

Implementa el endpoint de consulta, historial, corrección y recuperación. Verifica sesión, permisos administrativos y usuario autorizado. Para consultar busca el folio en carritos, pedidos históricos y cancelados, exige una única coincidencia y cruza las partidas con los productos y snaplogs; contempla variantes históricas de tipo para folio e identificador.

Antes de cada corrección vuelve a consultar la evidencia y compara cantidad, stock e identificadores de las dos salidas con los datos seleccionados. Valida también los apartados para construir el snapshot. La actualización del producto exige que el stock y los apartados no hayan cambiado y que no exista una corrección previa para el folio; incrementa el stock y guarda una marca con el snaplog completo y un identificador fijo en la misma escritura atómica.

Posteriormente inserta o recupera el snaplog con ese identificador y confirma que la auditoría ya no está pendiente. La recuperación no vuelve a incrementar stock. Las escrituras solicitan confirmación con journal y no requieren una transacción de MongoDB. Las correcciones de un lote son independientes: la respuesta de error advierte que puede haber cambios parciales y que debe consultarse el folio de nuevo.

#### [`src/routes/app/dev_tools/salidas_duplicadas/_ModalMovimientos.svelte`](../src/routes/app/dev_tools/salidas_duplicadas/_ModalMovimientos.svelte)

Muestra el historial de snaplogs del producto, no solo los correspondientes al folio consultado. El modal permite recorrer páginas, identifica el folio en revisión y muestra estados de carga o error. La consulta del servidor entrega hasta 20 movimientos por página.

#### [`src/routes/app/dev_tools/salidas_duplicadas/_progreso.js`](../src/routes/app/dev_tools/salidas_duplicadas/_progreso.js)

Procesa los productos seleccionados secuencialmente y comunica el producto actual, los completados y el total. Un producto solo se cuenta como completado después de que su solicitud termine correctamente; ante un error se devuelve el producto fallido y no se procesan los restantes.

#### [`src/routes/app/dev_tools/salidas_duplicadas/_ModalProgreso.svelte`](../src/routes/app/dev_tools/salidas_duplicadas/_ModalProgreso.svelte)

Presenta el avance real del lote, el producto actual y el resultado final o interrumpido. Mientras se procesa, evita cerrar el diálogo mediante la cancelación normal; al terminar permite cerrarlo y revisar el pedido.

### Visualización de auditoría

#### [`src/routes/app/productos/todos_los_movimientos/lista.svelte`](../src/routes/app/productos/todos_los_movimientos/lista.svelte)

Incluye la acción `1c` en la lista de movimientos de entrada para que las correcciones de salidas duplicadas aparezcan en el historial habitual del producto.

#### [`src/routes/app/productos/todos_los_movimientos/row_inyectar_ingresos.svelte`](../src/routes/app/productos/todos_los_movimientos/row_inyectar_ingresos.svelte)

Cuando la acción es `1c`, muestra la etiqueta **Corrección de salida duplicada** y el folio asociado, en lugar de identificarla como una inyección de existencias ordinaria. Los demás tipos conservan su presentación anterior.

### Documentación

#### [`Docs/correccion_salidas_duplicadas.md`](correccion_salidas_duplicadas.md)

Este documento describe el incidente, el uso de la herramienta, las garantías y limitaciones, el control de errores y los cambios por archivo. Debe actualizarse si cambian los criterios, las acciones de snaplog o el procedimiento de recuperación.

### Configuración local independiente

#### [`src/server.js`](../src/server.js)

El árbol de trabajo también contiene un cambio preexistente en el nombre de la base de datos configurada en la conexión MongoDB: apunta a una base de pruebas en lugar de la base anterior. Este cambio **no forma parte de la prevención ni de la herramienta de corrección**, y no se modificó para documentar este incidente. Antes de desplegar o ejecutar, comprobar explícitamente que la configuración corresponda al entorno deseado; no copiar credenciales ni datos de conexión a esta documentación.

## Validación y despliegue

Durante el desarrollo se ejecutaron pruebas con modelos simulados; sus archivos se retiraron posteriormente. Esas pruebas no sustituyen una prueba de integración con MongoDB ni una prueba visual autenticada.

Antes de producción, probar el envío y los fallos parciales en una base de pruebas representativa y revisar el procedimiento manual con respaldo disponible. El riesgo de descuento duplicado sigue existiendo; comunicarlo a los operadores.
