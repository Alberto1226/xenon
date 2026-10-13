# Reporte de vulnerabilidades críticas

Fecha: 2026-10-12
Rama revisada: `xenonPruebas` (commit `6166b0b`)
Alcance: revisión por lectura de código. No se ejecutó la app ni se probó contra el servidor.

Hay 6 problemas críticos; los dos primeros permiten tomar control total del sistema.

## Críticos

### 1. Credenciales reales en el repositorio

- `src/server.js:66` trae la cadena de conexión a MongoDB con usuario, contraseña e IP pública, con `authSource=admin`. Las líneas 63-65 tienen comentadas otras dos credenciales de Atlas.
- `src/server.js` está en `.gitignore` pero sigue versionado, así que todo esto está en el historial y en GitHub (`Alberto1226/xenon`).
- La contraseña SMTP está hardcodeada en `src/models/email.js:53`, `src/routes/app/pedidos/emails/mandar_pdf_email_carrito.js:13` y `src/routes/app/clientes_nuevos/_mandar_email.js:249`.
- La contraseña del usuario de Mongo local está en `src/config/llaves.js:4` y `:49`.
- El secreto de sesión está fijo en `src/server.js:111`; quien lo conozca puede firmar cookies de sesión.
- `src/services/cryptoService.js:4` usa una llave por defecto escrita en el código si no existe `APP_SECRET`. Con ella se descifran los secretos del PAC/facturación guardados en la BD.

**Qué hacer:** rotar todas esas contraseñas ya (borrarlas del código no basta porque siguen en el historial), moverlas a variables de entorno, hacer que la app falle al arrancar si falta `APP_SECRET` y cerrar el puerto de Mongo a internet.

### 2. El chequeo de administrador no funciona en 7 endpoints

El código dice `if (accesos.tiene_permisos_administrativos == false)` sin `(req)`. Compara la función con `false`, lo cual nunca se cumple, así que cualquier usuario logueado pasa.

Afecta a:

- `src/routes/app/usuarios/nuevo/crear_usuario_nuevo.js:15`: un vendedor puede crear un usuario con `rol: "administrador"`.
- `src/routes/app/usuarios/dialogos/cambiar_password.js:15`: cambiar la contraseña de cualquier usuario, incluido el admin.
- `src/routes/app/usuarios/editar/editar_usuario.js:13`: pasa `req.body` directo a `findByIdAndUpdate`, así que puede cambiarse su propio `rol`.
- `src/routes/app/clientes/dialogos/cambiar_password.js:13`
- `src/routes/app/pedidos/editar/cambiar_precio.js:14`
- `src/routes/app/pedidos/editar/cambiar_cantidad.js`
- `src/routes/app/pedidos/nuevo/administracion_carrito_ruta.js` (además está comentado, ver punto 3)

`src/routes/app/usuarios/status_activo.js` ni siquiera intenta validar rol y también manda `req.body` completo al update.

**Qué hacer:** agregar `(req)` en los 7 y armar el update con campos explícitos en vez de `req.body`.

### 3. Endpoints sin ninguna autenticación

| Ruta | Qué permite sin sesión |
| --- | --- |
| `carritos/administrar_producto` | Reexpone `administracion_carrito_ruta.js`, que tiene la validación comentada (líneas 15-23). Modifica carritos, cantidades e inventario apartado. |
| `carritos/crear_pedido` | Crea pedidos con cliente, agente y lista arbitrarios, y consume folios. |
| `salidas/cancelar/[idCarrito]` | Cancela cualquier pedido con un POST. |
| `salidas/salidas-ventas/[idUsuario]` | Un GET que además cambia pedidos a "En Ruta". |
| `salidas/historial-rutas` | Sin filtro devuelve todo el historial con los pedidos. |
| `api/carritos`, `api/carritos/carrito`, `api/productos/producto` | Devuelven el documento completo por id (clientes, precios, costos). |
| `app/pedidos/publicos/mandar_a_historicos` | Mueve y borra carritos públicos. |
| `scripts_a/actualizar_categorias` | Un GET anónimo que reescribe la categoría de todos los productos. |

Varios parecen ser para la app móvil de rutas. Aun así necesitan autenticación (token o sesión).

**Qué hacer:** definir cómo se autentica la app móvil y exigirlo en todas estas rutas; eliminar o proteger con rol admin los scripts de `scripts_a/`.

### 4. Borrado de archivos arbitrarios en el servidor

- `src/routes/app/productos/editar/borrar_imagen_de_producto.js:22` hace `fs.unlink("static/" + imagen_a_borrar)` con un valor que viene del body.
- Cualquier usuario logueado puede mandar una ruta con `../` y borrar lo que el proceso pueda tocar (código fuente, logs).

**Qué hacer:** validar con `path.resolve` que la ruta quede dentro de `static/`, comprobar que la imagen pertenezca al producto y pedir rol.

### 5. Hashes de contraseña expuestos y bcrypt débil

- `src/routes/app/usuarios/lista_de_usuarios.js` devuelve los documentos completos, con el campo `password`, a cualquier usuario logueado. Le falta `.select('-password')`.
- `src/routes/app/login.js:39` y `crear_usuario_nuevo.js` también devuelven el usuario con su hash.
- `src/routes/wtfai.js` intenta quitarlo con `delete`, pero sobre un documento Mongoose eso no tiene efecto.
- `src/models/usuario.js:21` usa `genSaltSync(5)`, un costo muy bajo, sobre `bcrypt-nodejs`, que está abandonado. Esos hashes se crackean rápido.

**Qué hacer:** excluir `password` de todas las respuestas, migrar a `bcrypt` o `bcryptjs` con costo 10-12 y rehashear al siguiente login.

### 6. Sin protección CSRF ni límite de intentos en login

- `csurf` está en `package.json` pero no se usa en ningún lado, y la cookie de sesión no fija `sameSite` ni `secure`.
- El login no tiene rate limit, y `req.body.usuario` entra directo a `findOne`. Mandando un objeto con operadores de Mongo se puede probar una contraseña contra varios usuarios a la vez.
- `src/routes/app/login.js:31` guarda `req.body` (con la contraseña en claro) en el log cuando falla `logIn`.

**Qué hacer:** `sameSite: 'lax'` y `secure` en la cookie, forzar `String()` en usuario y password, agregar rate limit al login y no loguear el body.

## Importantes, un escalón abajo

- **Autorización solo por login:** la mayoría de los endpoints de `app/` solo validan que haya sesión, no el rol. Un vendedor puede llamar directo a crear/editar productos, pedimentos, promociones e inyecciones de existencias.
- **Regex sin escapar:** el texto de búsqueda del usuario va directo a `$regex` (por ejemplo en `lista_de_usuarios.js` y `tecnico-isotech/logsDB.js`), lo que permite tumbar el servidor con una expresión costosa.
- **Dependencias viejas:** `mongoose 5`, `helmet 3`, `express-validator 5`, `passport 0.4`, `sapper` (descontinuado) y Node 16 en el Dockerfile. Conviene correr `npm audit`.
- **Sesiones en memoria:** `express-session` usa el MemoryStore por defecto, que pierde las sesiones al reiniciar y no está pensado para producción.

## Orden sugerido

1. Rotar credenciales y cerrar Mongo.
2. Arreglar los `(req)` faltantes.
3. Poner autenticación en `carritos/`, `salidas/`, `api/` y `scripts_a/`.
4. Corregir el `unlink`.
5. Quitar `password` de las respuestas.

Los puntos 2, 4 y 5 son cambios chicos. Para el 3 hay que definir primero cómo se autentica la app móvil.
