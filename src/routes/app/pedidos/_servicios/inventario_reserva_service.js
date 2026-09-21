import { Producto } from "../../../../models/producto";
import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos";
import { snap_por_cambio_en_pedido } from "../editar/_producto_snaplogs/snap_por_cambio_en_pedido";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

/**
 * Sincroniza las reservas de productos en producto.carritos usando el carrito_id específico.
 * Limpia reservas previas asignadas a este carrito_id y coloca las nuevas cantidades.
 */
export async function sincronizar_apartados_de_carrito(carrito_id, cliente_id, lista_productos, usuario, req) {
    try {
        if (!carrito_id) return { ok: false, mensaje: "carrito_id es requerido" };
        const id_obj = ObjectId(JSON.parse(JSON.stringify(carrito_id)));

        // Buscar información del carrito para extraer el folio y cliente completos
        const carrito_db = await Carrito.findById(id_obj).lean();
        const folio_num = (carrito_db && carrito_db.folio != null) ? parseInt(carrito_db.folio) : null;
        const cliente_info = (carrito_db && carrito_db.cliente) ? carrito_db.cliente : {};
        const cliente_nombre = cliente_info.nombre || 'Cliente';
        const cliente_correo = cliente_info.correo || '';

        // 1. Remover reservas previas asociadas a este carrito_id o folio en todos los productos (Atómico)
        let pull_conditions = [{ carrito_id: id_obj }];
        if (folio_num != null) pull_conditions.push({ folio: folio_num });

        await Producto.updateMany(
            { $or: [{ "carritos.carrito_id": id_obj }, { "carritos.folio": folio_num }] },
            { $pull: { carritos: { $or: pull_conditions } } }
        );

        // También remover reservas legadas asociadas a cliente.id si no tenían carrito_id
        if (cliente_id) {
            await Producto.updateMany(
                { "carritos.cliente.id": String(cliente_id), "carritos.carrito_id": { $exists: false } },
                { $pull: { carritos: { "cliente.id": String(cliente_id), carrito_id: { $exists: false } } } }
            );
        }

        if (!lista_productos || lista_productos.length === 0) {
            return { ok: true, mensaje: "Reservas liberadas (lista vacía)" };
        }

        // 2. Insertar las nuevas reservas con carrito_id, folio y cliente completos
        for (let item of lista_productos) {
            if (!item.producto || !item.producto._id) continue;

            const reserva = {
                carrito_id: id_obj,
                folio: folio_num,
                cliente_id: String(cliente_id),
                cantidad: parseInt(item.cantidad) || 0,
                canMB: parseInt(item.canMB) || 0,
                fecha: new Date(),
                cliente: {
                    id: String(cliente_id),
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
 * Libera únicamente los apartados correspondientes al carrito_id especificado.
 */
export async function liberar_apartados_de_carrito(carrito_id, cliente_id = null) {
    try {
        if (!carrito_id) return { ok: false, mensaje: "carrito_id requerido" };
        const id_obj = ObjectId(JSON.parse(JSON.stringify(carrito_id)));

        await Producto.updateMany(
            { "carritos.carrito_id": id_obj },
            { $pull: { carritos: { carrito_id: id_obj } } }
        );

        // Compatibilidad legada si no se guardó carrito_id en el apartado
        if (cliente_id) {
            await Producto.updateMany(
                { "carritos.cliente.id": String(cliente_id) },
                { $pull: { carritos: { "cliente.id": String(cliente_id) } } }
            );
        }

        return { ok: true };
    } catch (err) {
        console.error("Error en liberar_apartados_de_carrito:", err);
        return { ok: false, err };
    }
}

/**
 * Descuenta físicamente el inventario al cambiar a estado 'Envío' y remueve las reservas.
 * Implementa operaciones atómicas ($inc y $pull) para prevenir condiciones de carrera.
 */
export async function descontar_fisico_inventario(carrito, req) {
    try {
        const { lista, folio, cliente, _id } = carrito;
        const id_obj = ObjectId(JSON.parse(JSON.stringify(_id)));
        let existencias_log = [];

        for (let i = 0; i < lista.length; i++) {
            const registro = lista[i];
            const producto_db = await Producto.findById(registro.producto._id);
            if (!producto_db) continue;

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

            // ATÓMICO: Restar existencias físicas y remover apartado sin condiciones de carrera
            const folio_num = parseInt(folio) || null;
            let pull_conds = [{ carrito_id: id_obj }];
            if (folio_num != null) pull_conds.push({ folio: folio_num });
            if (cliente && cliente.id) pull_conds.push({ "cliente.id": String(cliente.id) });

            let update_op = {
                $inc: { "existencia.actual": -registro.cantidad },
                $pull: { carritos: { $or: pull_conds } }
            };

            if (registro.folios && registro.folios.length > 0) {
                update_op.$pullAll = { "existencia.folios": registro.folios };
            }

            await Producto.updateOne({ _id: producto_db._id }, update_op);

            // Guardar snap log de auditoría
            const usuario_req = (req && req.user) ? req.user : { nombre: 'Sistema', _id: null };
            await snap_por_cambio_en_pedido(
                { nombre: producto_constante.nombre, id: producto_constante._id },
                { nombre: usuario_req.nombre, id: usuario_req._id },
                registro.cantidad,
                registro.cantidad,
                "2", // Acción 2: Descontar de inventario
                { folio, cliente: { nombre: cliente ? cliente.nombre : 'Cliente', id: cliente ? cliente.id : null } },
                producto_constante,
                registro.folios
            );
        }

        const usuario_req = (req && req.user) ? req.user : { nombre: 'Sistema', _id: null };
        const id_log_previo = await accesos.logActividad(
            'pedidos/cambiar_status_a_envio',
            usuario_req,
            { folio, preproceso: existencias_log, fn: "descontar_fisico_inventario" },
            req
        );

        return { ok: true, id_log_previo };
    } catch (err) {
        console.error("Error en descontar_fisico_inventario:", err);
        return { ok: false, err };
    }
}

/**
 * Servicio de autocuración / reconciliación:
 * Elimina registros en producto.carritos cuyos carrito_id ya no pertenezcan a ningún carrito activo.
 */
export async function reconciliar_apartados_huerfanos() {
    try {
        const productos = await Producto.find({ "carritos.0": { $exists: true } });
        let limpiados = 0;

        for (let producto of productos) {
            let carritos_filtrados = [];
            for (let reserva of producto.carritos) {
                if (reserva.carrito_id) {
                    const existe = await Carrito.findOne({
                        _id: reserva.carrito_id,
                        status: { $in: ['Pedido', 'Ficha pago', 'Pagado', 'Empaque'] }
                    });
                    if (existe) carritos_filtrados.push(reserva);
                    else limpiados++;
                } else {
                    // Si no tiene carrito_id, verificar si existe algún carrito activo con ese cliente.id
                    const existe_cliente = await Carrito.findOne({
                        'cliente.id': reserva.cliente ? reserva.cliente.id : reserva.cliente_id,
                        status: { $in: ['Pedido', 'Ficha pago', 'Pagado', 'Empaque'] }
                    });
                    if (existe_cliente) carritos_filtrados.push(reserva);
                    else limpiados++;
                }
            }

            if (carritos_filtrados.length !== producto.carritos.length) {
                producto.carritos = carritos_filtrados;
                await producto.save();
            }
        }

        return { ok: true, limpiados };
    } catch (err) {
        console.error("Error en reconciliar_apartados_huerfanos:", err);
        return { ok: false, err };
    }
}
