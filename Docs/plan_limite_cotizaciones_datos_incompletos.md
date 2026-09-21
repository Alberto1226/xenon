# Plan de implementación: Límite de cotizaciones para clientes con información incompleta

Fecha: 2026-09-10

## Contexto

Anteriormente existía una restricción obligatoria que impedía crear pedidos si el cliente
tenía información incompleta. Esa restricción no le gustó al cliente y fue deshabilitada
(ver `Paso_1.svelte`, función `arreglar_direccion`, validación comentada). Actualmente **no
existe ningún bloqueo** al crear pedidos sin importar qué tan incompleta esté la información
del cliente.

Se pide un punto intermedio: permitir hasta 3 cotizaciones con datos incompletos antes de
exigir que el cliente complete su información.

## Diagnóstico del estado actual

- El ícono rojo y la leyenda "Faltan datos" en
  [src/routes/app/clientes/_Row.svelte](../src/routes/app/clientes/_Row.svelte) (líneas 239,
  248, 280) dependen únicamente de `cliente.newData` (Boolean).
- `newData` **no valida nada real**: se inicializa en `true` al crear un cliente
  ([DatosCliente/index.svelte](../src/routes/app/clientes/DatosCliente/index.svelte#L79)) y se
  fuerza a `true` cada vez que se guarda un cliente vía `EditarClienteSelecto()`
  ([DatosCliente/index.svelte#L842](../src/routes/app/clientes/DatosCliente/index.svelte#L842)),
  sin importar si quedaron campos vacíos.
- La única lista documentada de "campos obligatorios" en el código está en
  [Ayuda_paso1.svelte](../src/routes/app/pedidos/nuevo/Ayuda_paso1.svelte#L20-L28): Calle,
  Número Exterior, Colonia, Localidad, Código Postal, Estado, Municipio.
- Tras la simplificación reciente del formulario de registro de clientes, Región, Cumpleaños
  y País dejaron de pedirse/ser obligatorios, y los datos fiscales (RFC, Tipo de Persona,
  CFDI, Régimen Fiscal) se piden pero ya no son obligatorios en el formulario.

## Reglas de negocio confirmadas

- **Campos que cuentan como "obligatorios para uso del sistema"** (aunque en el formulario ya
  no sean obligatorios):
  - Dirección completa: Calle, Número Exterior, Colonia, Localidad, Código Postal, Estado,
    Municipio.
  - Teléfono.
  - Datos fiscales: RFC, Tipo de Persona, CFDI, Régimen Fiscal.
- **Límite**: 3 cotizaciones permitidas con datos incompletos; la 4ta queda bloqueada hasta
  que el cliente complete su información.
- **Contador**: se reinicia a `0` en cuanto el cliente completa todos los campos obligatorios.
- **Rol**: la regla aplica igual para todos los usuarios, sin excepción para
  administrador/gerente.
- **Backfill**: los clientes existentes arrancan el contador en `0` (no se reconstruye
  histórico de cotizaciones pasadas).

## Cambios propuestos

### 1. Modelo `Cliente` ([src/models/cliente.js](../src/models/cliente.js))

```js
datos_completos: { type: Boolean, default: false },
cotizaciones_con_datos_incompletos: { type: Number, default: 0 },
```

`newData` se conserva sin cambios por compatibilidad histórica, pero deja de ser la fuente de
verdad para la interfaz.

### 2. Función central de validación

Nuevo módulo (ej. `src/routes/app/clientes/_datos_completos.js`) con
`evaluar_datos_completos(cliente)` que valide en un único lugar:

- Los 7 campos de `direcciones_asociadas[0]`.
- `cliente.telefono` (número sin el prefijo de tipo Fijo/Celular).
- `cliente.datos_fiscales.{rfc, tipo_persona, cfdi, rfiscal}`.

Devuelve `{ completos: boolean, campos_faltantes: string[] }` para reutilizar el detalle tanto
en el aviso del Paso 1 de creación de pedido como en la lista de clientes.

### 3. Guardado del cliente ([Guardado_Edicion_Cliente.js](../src/routes/app/clientes/DatosCliente/Guardado_Edicion_Cliente.js))

- Calcular `datos_completos` con la función central antes de guardar (alta y edición).
- Si `datos_completos` pasa de `false` a `true`, reiniciar
  `cotizaciones_con_datos_incompletos = 0`.

### 4. Conteo y bloqueo al crear pedido

- En la selección de cliente (`Paso_1.svelte` → `ya_tiene_carrito.js` ampliado o un endpoint
  nuevo) se consulta `datos_completos` y el contador actual.
- `datos_completos === false` y contador `< 3` → permitir continuar, mostrar advertencia con
  cuántas cotizaciones quedan disponibles.
- `datos_completos === false` y contador `>= 3` → bloquear el botón "Continuar", mostrar el
  detalle de campos faltantes (`campos_faltantes`).
- Al crear el pedido con éxito en
  [crear_pedido_nuevo_v2.js](../src/routes/app/pedidos/nuevo/crear_pedido_nuevo_v2.js), si
  `datos_completos === false`, incrementar el contador (`$inc`) en el servidor — la validación
  del límite se revalida en backend, no solo en el frontend.

### 5. Interfaz de lista de clientes ([_Row.svelte](../src/routes/app/clientes/_Row.svelte))

Reemplazar las 3 referencias a `cliente.newData` por `cliente.datos_completos`, y mostrar el
conteo junto a la leyenda "Faltan datos" (ej. "2/3 cotizaciones usadas").

### 6. Migración de datos existentes

Script de backfill único que recorra todos los documentos `Cliente`, calcule
`datos_completos` real con la función central del punto 2, y deje
`cotizaciones_con_datos_incompletos = 0` para todos.

### 7. Plan de pruebas

- Cliente con información completa: nunca ve advertencia; el contador no se mueve.
- Cliente con información incompleta: cotizaciones 1, 2 y 3 permitidas con aviso decreciente
  de cuántas quedan; la 4ta queda bloqueada mostrando los campos faltantes.
- Completar los datos entre cotizaciones: el contador se reinicia a `0` y deja de
  advertir/bloquear de inmediato.
- La lista de clientes refleja el estatus real inmediatamente después de guardar el cliente.
- La regla se aplica igual sin importar el rol del usuario que crea el pedido.

## Archivos que se tocarán

- `src/models/cliente.js`
- `src/routes/app/clientes/DatosCliente/Guardado_Edicion_Cliente.js`
- `src/routes/app/clientes/_Row.svelte`
- `src/routes/app/pedidos/nuevo/ya_tiene_carrito.js` (o endpoint nuevo equivalente)
- `src/routes/app/pedidos/nuevo/Paso_1.svelte`
- `src/routes/app/pedidos/nuevo/crear_pedido_nuevo_v2.js`
- Nuevo módulo de validación central de datos completos
- Script de backfill (uso único)
