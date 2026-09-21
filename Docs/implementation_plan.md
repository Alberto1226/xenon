# Plan de Implementación: Modularización de Pedidos, Colección de Folios Únicos, Múltiples Pedidos por Cliente, Corrección de Bugs y Script de Transición

Este documento detalla el plan arquitectónico para modularizar el proceso completo de pedidos, corregir bugs de sincronización de apartados de inventario, evitar folios duplicados mediante una nueva colección dedicada, habilitar múltiples pedidos por cliente al bloquear la edición en estado `Pagado`, e **incluir un script de migración/backfill de datos para la transición segura en producción**.

---

## 1. Diagnóstico de Problemas y Objetivos

### Problemas Actuales en el Código:
1. **Desfasamiento de Apartados (`producto.carritos` vs `carrito.lista`)**:
   - Cada producto guarda en MongoDB `carritos: [{ cliente: { id }, cantidad }]`.
   - Las operaciones de borrado de apartados (`quitar_apartados2`) buscan únicamente por `cliente.id` a nivel global. Si un cliente tiene múltiples borradores o modificaciones, se borran o desfasan apartados independientemente de a qué pedido corresponden, dejando productos apartados en DB que no aparecen en la lista del pedido o viceversa.
2. **Duplicidad de Folios en Producción**:
   - `obtener_folio_actual()` realiza búsquedas no atómicas (`findOne().sort({ folio: -1 })`) en `carritos` y `pedidos`. En peticiones simultáneas ocurren condiciones de carrera que generan folios duplicados.
3. **Restricción de Único Pedido por Cliente**:
   - `ya_tiene_carrito` bloquea la creación de nuevos pedidos si existe cualquier carrito en status `['Pedido', 'Ficha pago', 'Pagado', 'Empaque']`. Esto obliga a los usuarios a crear clientes duplicados ("Cliente A", "Cliente A (sucursal)") para solventar la necesidad comercial.
4. **Falta de Trazabilidad en Datos Existentes de Producción**:
   - Los pedidos y apartados actuales en producción **no cuentan con el `carrito_id`** grabado en `producto.carritos`, por lo que se requiere un script de transición/backfill que complemente los datos faltantes antes de activar la nueva lógica.

---

## 2. User Review Required (Decisiones y Reglas de Negocio)

> [!IMPORTANT]
> **A. Múltiples Pedidos por Cliente y Bloqueo en Estado `Pagado`:**
> 1. Un pedido que alcanza el estado **`Pagado`** (o posterior) se **bloquea inmediatamente contra modificaciones** (no se pueden editar productos, cantidades ni precios).
> 2. Al cambiar a **`Pagado`**, se desbloquea la restricción del cliente y se le **permite abrir un nuevo pedido** de forma inmediata sin necesidad de registrar clientes duplicados.
> 3. Cada apartado en `producto.carritos` incluirá la referencia obligatoria a `carrito_id`, aislando las reservas de cada pedido.

> [!NOTE]
> **B. Nueva Colección Atómica de Folios (`folios` y `folio_config`):**
> 1. Se creará la colección `folios` para registrar cada folio asignado, su serie (default `"A"`, preparada para expansión futura), tipo (`carrito`, `pedido`, `cancelado`) y sus IDs relacionados.
> 2. Se utilizará una colección `folio_config` con incremento atómico (`$inc`) para prevenir colisiones bajo concurrencia.
> 3. Incluirá un parámetro inicial configurable (`folio_comienzo`) para definir exactamente en qué número iniciar al desplegar a producción (ej. 15000).

> [!IMPORTANT]
> **C. Script de Transición y Backfill para Producción:**
> Al desplegar la actualización, se ejecutará un script automatizado que:
> - Asociará el `carrito_id` a todas las reservas activas en `producto.carritos` analizando las órdenes abiertas en `carritos`.
> - Eliminará las reservas huérfanas en `producto.carritos` que ya no tengan un pedido activo en `carritos`.
> - Poblará la colección `folios` con las órdenes históricas existentes y configurará `folio_config` con el siguiente consecutivo atómico.

---

## 3. Cambios Propuestos por Componente

```
 +-----------------------------------------------------------------------------------+
 |                             NUEVOS SERVICIOS MODULARES                            |
 |                                                                                   |
 |  +-----------------------+   +-------------------------------+   +----------------+  |
 |  |    FolioService       |   |  InventarioReservaService     |   | DiscountService|  |
 |  | (Folios atómicos DB)  |   | (Apartados por carrito_id)    |   | (Ficha vs Base)|  |
 |  +-----------------------+   +-------------------------------+   +----------------+  |
 +-----------------------------------------------------------------------------------+
                                          |
                                          v
 +-----------------------------------------------------------------------------------+
 |                            PedidoPipelineService                                  |
 |  - Crear pedido      - Modificar productos    - Transición de Status (1 al 6)     |
 |  - Auditoría Log     - Snaplogs de inventario - Migración carritos -> pedidos     |
 +-----------------------------------------------------------------------------------+
                                          |
                                          v
 +-----------------------------------------------------------------------------------+
 |                    Script de Transición de Datos (Backfill)                       |
 |  - Backfill de carrito_id en producto.carritos                                    |
 |  - Limpieza de apartados huérfanos                                                |
 |  - Poblamiento inicial de la colección folios                                      |
 +-----------------------------------------------------------------------------------+
```

---

### Componente A: Colección y Servicio de Folios (`Folio`)

#### [NEW] [folio.js](file:///home/ghostpredator/Repos/xenon/src/models/folio.js)
Modelo Mongoose para la colección de folios e historial:
```js
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    folio: { type: Number, required: true, unique: true },
    serie: { type: String, default: "A" },
    tipo: { type: String, enum: ['carrito', 'pedido', 'cancelado'], default: 'carrito' },
    carrito_id: { type: Schema.Types.ObjectId, ref: 'Carrito' },
    pedido_id: { type: Schema.Types.ObjectId, ref: 'Pedido' },
    carrito_cancelado_id: { type: Schema.Types.ObjectId, ref: 'Carrito_cancelado' },
    fecha: { type: Date, default: Date.now }
});

export var Folio = mongoose.model('Folio', schema);
```

#### [NEW] [folio_config.js](file:///home/ghostpredator/Repos/xenon/src/models/folio_config.js)
Modelo Mongoose para el contador atómico de folios por serie:
```js
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    serie: { type: String, default: "A", unique: true },
    folio_siguiente: { type: Number, default: 1 }
});

export var FolioConfig = mongoose.model('FolioConfig', schema);
```

#### [NEW] [folio_service.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_servicios/folio_service.js)
Servicio modular para asignación atómica de folios:
- `generar_siguiente_folio({ serie = "A", carrito_id })`: Utiliza `findOneAndUpdate` con `$inc: { folio_siguiente: 1 }` en `FolioConfig` para garantizar la generación atómica e insensible a condiciones de carrera.
- `vincular_folio_a_estado(folio, { tipo, id_destino })`: Actualiza la trazabilidad del folio en la colección `folios` al pasar a `Pedido` entregado o `Carrito_cancelado`.
- `establecer_folio_comienzo(folio_inicial, serie = "A")`: Configura el punto de partida en producción.

---

### Componente B: Servicio de Apartados de Inventario por `carrito_id`

#### [MODIFY] [producto_schema.js](file:///home/ghostpredator/Repos/xenon/src/models/producto_schema.js) / [producto.js](file:///home/ghostpredator/Repos/xenon/src/models/producto.js)
Actualizar la estructura interna de `carritos` en los productos para asociarlos directamente al ID del carrito:
```js
carritos: [
    {
        carrito_id: { type: Schema.Types.ObjectId },
        cliente_id: { type: String },
        cantidad: { type: Number, default: 0 },
        canMB: { type: Number, default: 0 },
        fecha: { type: Date, default: Date.now }
    }
]
```

#### [NEW] [inventario_reserva_service.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_servicios/inventario_reserva_service.js)
Servicio desacoplado para apartado y deducción de existencias:
- `sincronizar_apartados_de_carrito(carrito_id, cliente_id, lista_productos, usuario, req)`: Reemplaza atómicamente la reserva específica del `carrito_id` en cada producto sin afectar reservas de otros pedidos del mismo cliente.
- `liberar_apartados_de_carrito(carrito_id, usuario, req)`: Limpia únicamente los apartados correspondientes al `carrito_id` especificado.
- `descontar_fisico_inventario(carrito_id, lista_productos, usuario, req)`: Realiza la deducción física `existencia.actual -= cantidad` durante el cambio a estado `Envío` y genera los `snaplogs` de trazabilidad.
- `reconciliar_apartados_huerfanos()`: Proceso de autocuración para auditar y remover registros en `producto.carritos` cuyos `carrito_id` ya no existan o pertenezcan a pedidos cerrados.

---

### Componente C: Múltiples Pedidos por Cliente y Bloqueo en `Pagado`

#### [MODIFY] [ya_tiene_carrito.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/nuevo/ya_tiene_carrito.js)
- Ajustar la consulta de pedidos abiertos:
  ```js
  // Se considera "bloqueante" únicamente si existe un carrito en estado 'Pedido' o 'Ficha pago'.
  // En cuanto un pedido cambia a 'Pagado', 'Empaque' o 'Envío', el cliente puede abrir nuevos pedidos.
  const carrito_abierto = await Carrito.findOne({
      'cliente.id': doc.id,
      status: { $in: ['Pedido', 'Ficha pago'] }
  });
  ```

#### [MODIFY] [Paso_2.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/editar/Paso_2.svelte) y [Row.svelte](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_listas/Row.svelte)
- Bloquear controles de edición (agregar/quitar productos, cambiar precios o aplicar descuentos) si `status` está en `['Pagado', 'Empaque', 'Envío']`.

---

### Componente D: Pipeline Unificado de Pedidos

#### [NEW] [pedido_pipeline_service.js](file:///home/ghostpredator/Repos/xenon/src/routes/app/pedidos/_servicios/pedido_pipeline_service.js)
Orquestador central para la lógica del pedido:
1. **Creación:** Encapsula la llamada a `FolioService`, `inventario_reserva_service`, asignación de descuentos (evaluando ficha temporal vs perfil base) y registro en `Log`.
2. **Transiciones de Estado:**
   - `cambiar_a_ficha_pago(carrito_id)`
   - `cambiar_a_pagado(carrito_id)`: Bloquea edición del pedido y habilita al cliente para crear nuevos pedidos.
   - `cambiar_a_empaque(carrito_id)`
   - `cambiar_a_envio(carrito_id, opciones_paqueteria)`: Descuenta inventario físico y registra audit logs.
   - `cambiar_a_entregado(carrito_id)`: Clona documento a colección `pedidos` y lo elimina de `carritos`.
   - `cancelar_pedido(carrito_id)`: Clona documento a `carritos_cancelados`, elimina de `carritos` y libera apartados por `carrito_id`.

---

### Componente E: Script de Migración y Transición en Producción

#### [NEW] [backfill_transicion_pedidos.js](file:///home/ghostpredator/Repos/xenon/src/routes/scripts_a/backfill_transicion_pedidos.js)
Script ejecutable de una sola vez durante el despliegue:
1. **Backfill de `carrito_id` en Apartados:**
   - Lee todos los carritos en estado activo (`['Pedido', 'Ficha pago', 'Pagado', 'Empaque']`).
   - Por cada producto en `carrito.lista`, busca la reserva correspondiente en `producto.carritos` (haciendo match por `cliente_id` y `cantidad`) y le inyecta el `carrito_id` exacto.
2. **Limpieza de Reservas Huérfanas:**
   - Remueve de `producto.carritos` cualquier apartado que no tenga un carrito activo correspondiente en la colección `carritos`.
3. **Poblado Inicial de Colección `folios` y Consecutivo:**
   - Registra todos los folios existentes de `carritos` y `pedidos` en la colección `folios`.
   - Inicializa `FolioConfig` registrando `folio_siguiente = max(folio_existente) + 1` (o usando `folio_comienzo` especificado).

---

## 4. Plan de Verificación

### Pruebas de Software y Scripts:
- **Prueba del Script de Transición:** Probar en una copia de la base de datos de desarrollo que el script complemente exitosamente `carrito_id` en todos los apartados de existencias y elimine apartados huérfanos.
- **Concurrencia de Folios:** Ejecutar script multihilo para solicitar 50 folios en paralelo y verificar 0 colisiones en `folios`.
- **Reconciliación de Inventario:** Ejecutar `reconciliar_apartados_huerfanos()` y verificar que el total reservado en `producto.carritos` coincida exactamente con la suma de `carrito.lista` activos.

### Pruebas Manuales de Negocio:
1. **Múltiples Pedidos por Cliente:**
   - Crear Pedido 1 para Cliente A.
   - Cambiar Pedido 1 a status `Pagado`.
   - Confirmar que Pedido 1 quede bloqueado para edición de productos/precios.
   - Crear Pedido 2 para Cliente A inmediatamente y verificar que se cree exitosamente con folio independiente.
2. **Aislamiento de Apartados por `carrito_id`:**
   - Crear Pedido 1 con 3 piezas del Producto X.
   - Crear Pedido 2 con 2 piezas del Producto X para el mismo cliente.
   - Cancelar únicamente el Pedido 1.
   - Confirmar que Producto X conserve únicamente el apartado de 2 piezas del Pedido 2.
