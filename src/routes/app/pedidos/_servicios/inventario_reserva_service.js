/**
 * =============================================================================
 * inventario_reserva_service.js
 * =============================================================================
 * Servicio central de gestión de reservas (apartados) de inventario.
 *
 * PROBLEMA ORIGINAL EN PRODUCCIÓN:
 * Los registros en `Producto.carritos` se guardaron a lo largo del tiempo con
 * tipos inconsistentes:
 *   - `carrito_id` guardado como ObjectId en unos registros y como String en otros.
 *   - `folio` guardado como Number en algunos y como String en otros.
 *   - Algunas reservas sólo tienen `cliente.id` (sin carrito_id ni folio),
 *     correspondiente a datos muy antiguos o de rutas.
 *
 * MongoDB NO equipara automáticamente ObjectId con String ni Number con String,
 * por lo que una consulta como `{ carrito_id: ObjectId("abc") }` NO encontrará
 * documentos donde carrito_id fue guardado como String("abc"), y viceversa.
 * Esto causaba que los $pull fallaran silenciosamente, dejando reservas huérfanas.
 *
 * SOLUCIÓN IMPLEMENTADA:
 * 1. Helpers `asegurarObjectId`, `obtener_variantes_id`, `obtener_variantes_folio`
 *    que generan arrays con AMBAS representaciones para usar en `$in`.
 * 2. Todas las consultas de búsqueda y eliminación usan `{ campo: { $in: variantes } }`
 *    cubriendo ObjectId + String o Number + String según corresponda.
 * 3. Como capa final de seguridad: filtrado en memoria con `String()` comparado
 *    con `String()`, que es completamente agnóstico de tipo BSON.
 * =============================================================================
 */
import { Producto } from "../../../../models/producto";
import { Carrito } from "../../../../models/carrito";
import { Carrito_cancelado } from "../../../../models/carrito_cancelado";
import * as accesos from "../../accesos";
import { snap_por_cambio_en_pedido } from "../editar/_producto_snaplogs/snap_por_cambio_en_pedido";
import mongoose from "mongoose";

/**
 * Normaliza cualquier valor a mongoose.Types.ObjectId válido de forma segura.
 *
 * POR QUÉ EXISTE:
 * En MongoDB, si guardas un _id como String("60c...") y luego consultas con
 * ObjectId("60c..."), NO hay coincidencia — son tipos BSON distintos.
 * Este helper garantiza que siempre trabajemos con el tipo ObjectId correcto
 * al insertar nuevas reservas, evitando crear documentos con tipos mezclados.
 *
 * @param {*} val - Puede ser ObjectId, string hexadecimal de 24 chars, o cualquier otro valor.
 * @returns {mongoose.Types.ObjectId|null} ObjectId válido o null si no es convertible.
 */
export function asegurarObjectId(val) {
    if (!val) return null;
    if (val instanceof mongoose.Types.ObjectId) return val;
    const str = String(val).trim();
    // Solo intentar convertir si tiene el formato correcto (24 hex chars)
    // para evitar falsos positivos con números cortos que pasan isValid()
    if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
        try {
            return new mongoose.Types.ObjectId(str);
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Retorna un array con AMBAS representaciones de un ID: [ObjectId, String].
 *
 * POR QUÉ EXISTE:
 * En producción existen registros donde `carrito_id` fue guardado como ObjectId
 * y otros donde fue guardado como String (dependiendo del archivo que creó la
 * reserva). Al usar `{ carrito_id: { $in: [ObjectId, String] } }` en MongoDB,
 * la consulta encuentra AMBOS tipos de registros en una sola operación,
 * garantizando retrocompatibilidad total sin necesidad de migrar datos.
 *
 * @param {*} val - Valor a normalizar (ObjectId, string, number, etc.)
 * @returns {Array} Array con [ObjectId, String] si es válido, o sólo [String] si no.
 */
export function obtener_variantes_id(val) {
    if (!val) return [];
    const variantes = [];
    const obj = asegurarObjectId(val);
    const str = String(val).trim();
    if (obj) variantes.push(obj);          // Variante ObjectId (nuevos registros)
    if (str && !variantes.some(v => typeof v === 'string' && v === str)) {
        variantes.push(str);               // Variante String (registros legados)
    }
    return variantes;
}

/**
 * Retorna un array con AMBAS representaciones de un folio: [Number, String].
 *
 * POR QUÉ EXISTE:
 * En producción los folios fueron guardados de forma inconsistente:
 *   - Registros nuevos: `folio: 29939` (Number)
 *   - Registros legados: `folio: "29939"` (String)
 * MongoDB no equipara Number con String, por lo que `{ folio: 29939 }` no
 * encuentra documentos con `folio: "29939"`. Este helper cubre ambos casos.
 *
 * @param {*} folio - Número o string de folio.
 * @returns {Array} Array con [Number, String] o subconjunto si alguna conversión falla.
 */
export function obtener_variantes_folio(folio) {
    if (folio == null || folio === '') return [];
    const variantes = [];
    const num = parseInt(folio);
    if (!isNaN(num)) variantes.push(num);  // Variante Number (registros nuevos)
    const str = String(folio).trim();
    if (str && !variantes.includes(str)) variantes.push(str); // Variante String (registros legados)
    return variantes;
}

/**
 * Sincroniza las reservas de productos en `producto.carritos` para un carrito específico.
 *
 * FLUJO:
 * 1. Elimina TODAS las reservas previas de este carrito (por carrito_id, folio y cliente).
 * 2. Inserta las reservas actualizadas con los datos normalizados (ObjectId + folio Number).
 *
 * POR QUÉ BUSCA POR MÚLTIPLES CRITERIOS:
 * Registros existentes en producción pueden tener la reserva identificada por
 * carrito_id (ObjectId o String), por folio (Number o String), o solo por cliente.id.
 * El $pull multicriterio garantiza limpiar TODOS los tipos de registro previo.
 *
 * @param {string|ObjectId} carrito_id
 * @param {string|ObjectId} cliente_id
 * @param {Array} lista_productos - Lista de items del pedido con su cantidad.
 * @param {Object} usuario
 * @param {Object} req
 */
export async function sincronizar_apartados_de_carrito(carrito_id, cliente_id, lista_productos, usuario, req) {
    try {
        if (!carrito_id) return { ok: false, mensaje: "carrito_id es requerido" };
        const id_obj = asegurarObjectId(carrito_id);
        const variantes_id = obtener_variantes_id(carrito_id);

        // Buscar información del carrito para extraer el folio y cliente completos
        const carrito_db = await Carrito.findById(carrito_id).lean();
        const folio_num = (carrito_db && carrito_db.folio != null) ? parseInt(carrito_db.folio) : null;
        const variantes_folio = folio_num != null ? obtener_variantes_folio(folio_num) : [];
        const cliente_info = (carrito_db && carrito_db.cliente) ? carrito_db.cliente : {};
        const cliente_nombre = cliente_info.nombre || 'Cliente';
        const cliente_correo = cliente_info.correo || '';
        const variantes_cliente = obtener_variantes_id(cliente_id || cliente_info.id || cliente_info._id);

        // 1. Remover reservas previas asociadas a este carrito_id o folio en todos los productos (Atómico)
        let pull_conditions = [];
        if (variantes_id.length > 0) pull_conditions.push({ carrito_id: { $in: variantes_id } });
        if (variantes_folio.length > 0) pull_conditions.push({ folio: { $in: variantes_folio } });

        if (pull_conditions.length > 0) {
            await Producto.updateMany(
                { $or: [{ "carritos.carrito_id": { $in: variantes_id } }, { "carritos.folio": { $in: variantes_folio } }] },
                { $pull: { carritos: { $or: pull_conditions } } }
            );
        }

        // También remover reservas legadas asociadas a cliente si no tenían carrito_id ni folio
        if (variantes_cliente.length > 0) {
            await Producto.updateMany(
                {
                    $and: [
                        { $or: [{ "carritos.cliente.id": { $in: variantes_cliente } }, { "carritos.cliente_id": { $in: variantes_cliente } }] },
                        { "carritos.carrito_id": { $exists: false } },
                        { "carritos.folio": { $exists: false } }
                    ]
                },
                {
                    $pull: {
                        carritos: {
                            $and: [
                                { $or: [{ "cliente.id": { $in: variantes_cliente } }, { cliente_id: { $in: variantes_cliente } }] },
                                { carrito_id: { $exists: false } },
                                { folio: { $exists: false } }
                            ]
                        }
                    }
                }
            );
        }

        if (!lista_productos || lista_productos.length === 0) {
            return { ok: true, mensaje: "Reservas liberadas (lista vacía)" };
        }

        // 2. Insertar las nuevas reservas con carrito_id (ObjectId), folio y cliente completos
        const cliente_id_final = asegurarObjectId(cliente_id) || String(cliente_id);

        for (let item of lista_productos) {
            if (!item.producto || !item.producto._id) continue;

            const reserva = {
                carrito_id: id_obj || carrito_id,
                folio: folio_num,
                cliente_id: String(cliente_id),
                cantidad: parseInt(item.cantidad) || 0,
                canMB: parseInt(item.canMB) || 0,
                fecha: new Date(),
                cliente: {
                    id: cliente_id_final,
                    nombre: cliente_nombre,
                    correo: cliente_correo
                }
            };

            await Producto.findByIdAndUpdate(item.producto._id, {
                $push: { carritos: reserva }
            });
        }

        return { ok: true };
    } catch (err) {
        console.error("Error en sincronizar_apartados_de_carrito:", err);
        return { ok: false, err };
    }
}

/**
 * Libera de forma garantizada y resiliente TODOS los apartados de un carrito en `producto.carritos`.
 *
 * POR QUÉ SE REESCRIBIÓ:
 * La versión original solo buscaba por `{ carrito_id: ObjectId }` usando un único tipo.
 * Esto fallaba en 3 escenarios comunes en producción:
 *   A) La reserva tenía `carrito_id` guardado como String (apartar_producto_sin_previo).
 *   B) La reserva no tenía `carrito_id`, solo `folio` (cambiar_cantidad.js antiguo).
 *   C) La reserva no tenía ni carrito_id ni folio, solo `cliente.id` (pedidos nuevos iniciales).
 *
 * ESTRATEGIA DE LIMPIEZA EN 3 CAPAS:
 *   1. Por producto específico (filtrado en memoria, 100% agnóstico de tipo):
 *      Itera cada producto de `carrito.lista`, carga su documento y filtra
 *      su array `carritos` comparando `String(reserva.campo) === String(valor)`.
 *      Esto funciona SIN IMPORTAR qué tipo BSON tiene el campo en MongoDB.
 *
 *   2. Limpieza global atómica por carrito_id y folio (con variantes ObjectId+String y Number+String):
 *      Cubre cualquier producto que no estuviera en `carrito.lista` pero tuviera la reserva.
 *
 *   3. Limpieza de contingencia por cliente.id:
 *      Solo elimina reservas SIN carrito_id NI folio, para no borrar accidentalmente
 *      reservas de otros pedidos activos del mismo cliente.
 *
 * COMPATIBILIDAD CON DATOS LEGADOS:
 * Acepta tanto el objeto carrito completo como solo un ID. Si recibe solo un ID,
 * busca primero en Carrito activo y luego en Carrito_cancelado para obtener
 * folio, cliente y lista y así poder hacer la limpieza completa.
 *
 * @param {Object|string|ObjectId} carrito_o_id - Objeto carrito completo o solo su _id.
 * @param {string|ObjectId|null} segundo_param - cliente_id (solo cuando carrito_o_id es un ID).
 */
export async function liberar_apartados_de_carrito(carrito_o_id, segundo_param = null) {
    try {
        if (!carrito_o_id) return { ok: false, mensaje: "Identificador de carrito requerido" };

        let carrito_id = null;
        let folio_num = null;
        let cliente_id = null;
        let lista_productos = [];

        if (typeof carrito_o_id === 'object' && carrito_o_id !== null) {
            carrito_id = carrito_o_id._id || carrito_o_id.id;
            folio_num = carrito_o_id.folio != null ? parseInt(carrito_o_id.folio) : null;
            if (carrito_o_id.cliente) {
                cliente_id = carrito_o_id.cliente.id || carrito_o_id.cliente._id || carrito_o_id.cliente_id;
            }
            if (Array.isArray(carrito_o_id.lista)) {
                lista_productos = carrito_o_id.lista;
            }
        } else {
            carrito_id = carrito_o_id;
            cliente_id = segundo_param;
        }

        // Si no se proporcionó el folio o lista, intentar cargarlo desde la base de datos
        if (carrito_id && (folio_num == null || lista_productos.length === 0)) {
            const id_obj = asegurarObjectId(carrito_id) || carrito_id;
            let carrito_db = await Carrito.findById(id_obj).lean();
            if (!carrito_db) {
                carrito_db = await Carrito_cancelado.findById(id_obj).lean();
            }
            if (carrito_db) {
                if (folio_num == null && carrito_db.folio != null) folio_num = parseInt(carrito_db.folio);
                if (!cliente_id && carrito_db.cliente) {
                    cliente_id = carrito_db.cliente.id || carrito_db.cliente._id;
                }
                if (lista_productos.length === 0 && Array.isArray(carrito_db.lista)) {
                    lista_productos = carrito_db.lista;
                }
            }
        }

        const variantes_id = obtener_variantes_id(carrito_id);
        const variantes_folio = folio_num != null ? obtener_variantes_folio(folio_num) : [];
        const variantes_cliente = obtener_variantes_id(cliente_id);

        // Construir condiciones pull resilientes (soporta ObjectId y String, Number y String)
        const pull_conds = [];
        if (variantes_id.length > 0) {
            pull_conds.push({ carrito_id: { $in: variantes_id } });
        }
        if (variantes_folio.length > 0) {
            pull_conds.push({ folio: { $in: variantes_folio } });
        }

        // 1. Limpieza directa y garantizada en los productos específicos del pedido
        if (Array.isArray(lista_productos) && lista_productos.length > 0) {
            for (let item of lista_productos) {
                const prod_id = item.producto ? (item.producto._id || item.producto.id) : item._id;
                if (!prod_id) continue;

                try {
                    const prod_doc = await Producto.findById(prod_id);
                    if (prod_doc && Array.isArray(prod_doc.carritos) && prod_doc.carritos.length > 0) {
                        const folio_str = folio_num != null ? String(folio_num) : null;
                        const id_strs = new Set(variantes_id.map(v => String(v)));

                        const carritos_filtrados = prod_doc.carritos.filter(reserva => {
                            if (!reserva) return false;

                            // Coincidencia por carrito_id
                            if (reserva.carrito_id && id_strs.has(String(reserva.carrito_id))) {
                                return false; // Remover
                            }
                            // Coincidencia por folio
                            if (folio_str != null && reserva.folio != null && String(reserva.folio) === folio_str) {
                                return false; // Remover
                            }
                            return true; // Mantener
                        });

                        if (carritos_filtrados.length !== prod_doc.carritos.length) {
                            prod_doc.carritos = carritos_filtrados;
                            prod_doc.markModified('carritos');
                            await prod_doc.save();
                        }
                    }
                } catch (eProd) {
                    console.error("Error al limpiar reserva individual de producto:", eProd);
                }
            }
        }

        // 2. Limpieza global atómica defensiva en toda la colección de productos
        if (pull_conds.length > 0) {
            const find_or = [];
            if (variantes_id.length > 0) find_or.push({ "carritos.carrito_id": { $in: variantes_id } });
            if (variantes_folio.length > 0) find_or.push({ "carritos.folio": { $in: variantes_folio } });

            await Producto.updateMany(
                { $or: find_or },
                { $pull: { carritos: { $or: pull_conds } } }
            );
        }

        // 3. Limpieza de contingencia legada por cliente (solo reservas sin folio y sin carrito_id)
        if (variantes_cliente.length > 0) {
            await Producto.updateMany(
                {
                    $and: [
                        { $or: [{ "carritos.cliente.id": { $in: variantes_cliente } }, { "carritos.cliente_id": { $in: variantes_cliente } }] },
                        { "carritos.carrito_id": { $exists: false } },
                        { "carritos.folio": { $exists: false } }
                    ]
                },
                {
                    $pull: {
                        carritos: {
                            $and: [
                                { $or: [{ "cliente.id": { $in: variantes_cliente } }, { cliente_id: { $in: variantes_cliente } }] },
                                { carrito_id: { $exists: false } },
                                { folio: { $exists: false } }
                            ]
                        }
                    }
                }
            );
        }

        return { ok: true };
    } catch (err) {
        console.error("Error en liberar_apartados_de_carrito:", err);
        return { ok: false, err };
    }
}

/**
 * Descuenta físicamente el inventario al cambiar a estado 'Envío' y limpia las reservas.
 *
 * PROBLEMA ORIGINAL:
 * La versión anterior combinaba `$inc` y `$pull` en un único `updateOne`, y todo
 * el loop estaba dentro de un único `try/catch`. Esto causaba dos problemas:
 *
 *   1. Si la operación fallaba en el producto N (ej. CONECTOR 2F1M del folio #29369),
 *      los productos N+1, N+2... NUNCA se procesaban. El pedido podía quedar con
 *      inventario parcialmente descontado.
 *
 *   2. Si el `$pull` fallaba silenciosamente (por disparidad ObjectId/String en
 *      el campo `carrito_id` de la reserva), el `$inc` tampoco se ejecutaba porque
 *      estaban combinados. O peor: el `$inc` sí corría pero el `$pull` no, dejando
 *      una reserva huérfana con el inventario ya descontado.
 *
 * SOLUCIÓN IMPLEMENTADA EN 3 CAPAS:
 *
 *   CAPA EXTERNA (por producto): cada producto tiene su propio `try/catch`.
 *   Un error en producto 7 NO detiene el procesamiento de producto 8, 9, 10...
 *
 *   CAPA MEDIA (por operación): `$inc` y `$pull` son operaciones SEPARADAS con
 *   su propio `try/catch`. Si el $pull falla, el descuento físico ya está hecho.
 *   Si el $inc falla, se salta el $pull para no dejar inconsistencias.
 *
 *   CAPA INTERNA (limpieza en memoria): después del `$pull`, recarga el documento
 *   y filtra `carritos` comparando `String(campo)` con `String(valor)` — completamente
 *   agnóstico de tipo. Esto garantiza que aunque MongoDB no encuentre la reserva
 *   por disparidad ObjectId/String, la limpieza en JS sí la elimina.
 *
 * RETROCOMPATIBILIDAD:
 * El `$pull` usa variantes [ObjectId, String] para carrito_id y [Number, String]
 * para folio, cubriendo todos los tipos que existen en producción.
 *
 * @param {Object} carrito - Objeto Mongoose del carrito (con lista, folio, cliente, _id).
 * @param {Object} req - Request de Express (para obtener req.user en logs).
 * @returns {{ ok: true, errores: Array, id_log_previo: string }}
 *   Siempre retorna ok:true. Los errores parciales se incluyen en `errores[]`.
 */
export async function descontar_fisico_inventario(carrito, req) {
    const { lista, folio, cliente, _id } = carrito;
    const variantes_id = obtener_variantes_id(_id);
    const folio_num = parseInt(folio) || null;
    const variantes_folio = folio_num != null ? obtener_variantes_folio(folio_num) : [];
    const cliente_id = cliente ? (cliente.id || cliente._id) : null;
    const variantes_cliente = obtener_variantes_id(cliente_id);

    let existencias_log = [];
    let errores_log = [];

    for (let i = 0; i < lista.length; i++) {
        const registro = lista[i];
        const nombre_prod = registro.producto ? registro.producto.nombre : `índice ${i}`;

        try {
            const producto_db = await Producto.findById(registro.producto._id);
            if (!producto_db) {
                console.warn(`descontar_fisico_inventario: producto no encontrado (${nombre_prod} / ${registro.producto._id})`);
                continue;
            }

            const producto_constante = JSON.parse(JSON.stringify(producto_db));
            const total_reservado = producto_db.total_reservado ? producto_db.total_reservado() : 0;
            const stock_actual = (producto_db.existencia && producto_db.existencia.actual != null)
                ? producto_db.existencia.actual
                : (producto_db.existencias != null ? producto_db.existencias : (producto_db.inventario || 0));

            existencias_log.push({
                producto: producto_db.nombre,
                cantidad_nueva: registro.cantidad,
                id: producto_db._id,
                total_reservado,
                existencias_previas: stock_actual,
                existencias_postEnvio: stock_actual - registro.cantidad
            });

            // ── PASO 1: Descontar existencias físicas ────────────────────────────────
            // Operación separada del pull para que un fallo en el filtro de reservas
            // no impida el descuento físico (y viceversa).
            try {
                let inc_op = {
                    $inc: { "existencia.actual": -registro.cantidad }
                };
                if (registro.folios && registro.folios.length > 0) {
                    inc_op.$pullAll = { "existencia.folios": registro.folios };
                }
                await Producto.updateOne({ _id: producto_db._id }, inc_op);
            } catch (eInc) {
                console.error(`descontar_fisico_inventario: Error en $inc para ${nombre_prod}:`, eInc);
                errores_log.push({ producto: nombre_prod, id: producto_db._id, etapa: '$inc', error: eInc.message });
                // No continuamos con el pull si el $inc falló, pero seguimos con el siguiente producto
                continue;
            }

            // ── PASO 2: Limpiar reserva en producto.carritos ─────────────────────────
            // Multicriterio: soporta carrito_id como ObjectId y String,
            // folio como Number y String (retrocompatibilidad con datos de producción).
            try {
                let pull_conds = [];
                if (variantes_id.length > 0) pull_conds.push({ carrito_id: { $in: variantes_id } });
                if (variantes_folio.length > 0) pull_conds.push({ folio: { $in: variantes_folio } });
                if (variantes_cliente.length > 0) {
                    pull_conds.push({ "cliente.id": { $in: variantes_cliente } });
                    pull_conds.push({ cliente_id: { $in: variantes_cliente } });
                }

                if (pull_conds.length > 0) {
                    await Producto.updateOne(
                        { _id: producto_db._id },
                        { $pull: { carritos: { $or: pull_conds } } }
                    );
                }

                // Limpieza adicional en memoria: por si la disparidad de tipo en MongoDB
                // hizo que el $pull no eliminara la reserva
                const prod_post = await Producto.findById(producto_db._id);
                if (prod_post && Array.isArray(prod_post.carritos) && prod_post.carritos.length > 0) {
                    const folio_str = folio_num != null ? String(folio_num) : null;
                    const id_strs = new Set(variantes_id.map(v => String(v)));
                    const cliente_strs = new Set(variantes_cliente.map(v => String(v)));

                    const antes = prod_post.carritos.length;
                    prod_post.carritos = prod_post.carritos.filter(reserva => {
                        if (!reserva) return false;
                        // Coincidencia por carrito_id (agnóstico de tipo)
                        if (reserva.carrito_id && id_strs.has(String(reserva.carrito_id))) return false;
                        // Coincidencia por folio (agnóstico de tipo)
                        if (folio_str != null && reserva.folio != null && String(reserva.folio) === folio_str) return false;
                        // Coincidencia por cliente (solo si la reserva no tiene carrito_id ni folio)
                        if (!reserva.carrito_id && reserva.folio == null) {
                            const cid = reserva.cliente ? String(reserva.cliente.id || '') : '';
                            const cid2 = reserva.cliente_id ? String(reserva.cliente_id) : '';
                            if ((cid && cliente_strs.has(cid)) || (cid2 && cliente_strs.has(cid2))) return false;
                        }
                        return true;
                    });

                    if (prod_post.carritos.length !== antes) {
                        prod_post.markModified('carritos');
                        await prod_post.save();
                        console.log(`descontar_fisico_inventario: limpieza en memoria aplicada para ${nombre_prod} (${antes} → ${prod_post.carritos.length} reservas)`);
                    }
                }
            } catch (ePull) {
                console.error(`descontar_fisico_inventario: Error en $pull para ${nombre_prod}:`, ePull);
                errores_log.push({ producto: nombre_prod, id: producto_db._id, etapa: '$pull', error: ePull.message });
                // El $inc ya se ejecutó correctamente; el huérfano será detectado por la herramienta de dev_tools
            }

            // ── PASO 3: Snaplog de auditoría ─────────────────────────────────────────
            try {
                const usuario_req = (req && req.user) ? req.user : { nombre: 'Sistema', _id: null };
                await snap_por_cambio_en_pedido(
                    { nombre: producto_constante.nombre, id: producto_constante._id },
                    { nombre: usuario_req.nombre, id: usuario_req._id },
                    registro.cantidad,
                    registro.cantidad,
                    "2", // Acción 2: Descontar de inventario
                    { folio, cliente: { nombre: cliente ? cliente.nombre : 'Cliente', id: cliente ? (cliente.id || cliente._id) : null } },
                    producto_constante,
                    registro.folios
                );
            } catch (eSnap) {
                console.error(`descontar_fisico_inventario: Error en snaplog para ${nombre_prod}:`, eSnap);
            }

        } catch (eProducto) {
            // Error inesperado al procesar este producto — se registra pero NO detiene los demás
            console.error(`descontar_fisico_inventario: Error inesperado en ${nombre_prod}:`, eProducto);
            errores_log.push({ producto: nombre_prod, id: (registro.producto && registro.producto._id) ? registro.producto._id : null, etapa: 'general', error: eProducto.message });
        }
    }

    try {
        const usuario_req = (req && req.user) ? req.user : { nombre: 'Sistema', _id: null };
        const id_log_previo = await accesos.logActividad(
            'pedidos/cambiar_status_a_envio',
            usuario_req,
            { folio, preproceso: existencias_log, errores: errores_log, fn: "descontar_fisico_inventario" },
            req
        );
        return { ok: true, id_log_previo, errores: errores_log };
    } catch (eLog) {
        console.error("descontar_fisico_inventario: Error al registrar log de actividad:", eLog);
        return { ok: true, errores: errores_log };
    }
}

/**
 * Servicio de autocuración / reconciliación:
 * Elimina registros en producto.carritos cuyos carrito_id o folio ya no pertenezcan a ningún carrito activo.
 */
export async function reconciliar_apartados_huerfanos() {
    try {
        const productos = await Producto.find({ "carritos.0": { $exists: true } });
        let limpiados = 0;

        for (let producto of productos) {
            let carritos_filtrados = [];
            for (let reserva of producto.carritos) {
                if (!reserva) continue;

                if (reserva.carrito_id) {
                    const variantes_id = obtener_variantes_id(reserva.carrito_id);
                    const existe = await Carrito.findOne({
                        _id: { $in: variantes_id },
                        status: { $in: ['Pedido', 'Ficha pago', 'Ficha Pago', 'Pagado', 'Empaque'] }
                    });
                    if (existe) {
                        carritos_filtrados.push(reserva);
                        continue;
                    }
                }

                if (reserva.folio != null) {
                    const variantes_folio = obtener_variantes_folio(reserva.folio);
                    const existe_folio = await Carrito.findOne({
                        folio: { $in: variantes_folio },
                        status: { $in: ['Pedido', 'Ficha pago', 'Ficha Pago', 'Pagado', 'Empaque'] }
                    });
                    if (existe_folio) {
                        carritos_filtrados.push(reserva);
                        continue;
                    }
                }

                if (!reserva.carrito_id && reserva.folio == null) {
                    const c_id = reserva.cliente ? (reserva.cliente.id || reserva.cliente._id) : reserva.cliente_id;
                    const variantes_c = obtener_variantes_id(c_id);
                    const existe_cliente = await Carrito.findOne({
                        'cliente.id': { $in: variantes_c },
                        status: { $in: ['Pedido', 'Ficha pago', 'Ficha Pago', 'Pagado', 'Empaque'] }
                    });
                    if (existe_cliente) {
                        carritos_filtrados.push(reserva);
                        continue;
                    }
                }

                limpiados++;
            }

            if (carritos_filtrados.length !== producto.carritos.length) {
                producto.carritos = carritos_filtrados;
                producto.markModified('carritos');
                await producto.save();
            }
        }

        return { ok: true, limpiados };
    } catch (err) {
        console.error("Error en reconciliar_apartados_huerfanos:", err);
        return { ok: false, err };
    }
}
