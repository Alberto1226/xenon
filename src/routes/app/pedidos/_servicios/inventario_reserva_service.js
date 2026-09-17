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

        // 1. Remover reservas previas asociadas a este carrito_id en todos los productos
        await Producto.updateMany(
            { "carritos.carrito_id": id_obj },
            { $pull: { carritos: { carrito_id: id_obj } } }
        );

        // También remover reservas legadas asociadas a cliente.id si no tenían carrito_id
        await Producto.updateMany(
            { "carritos.cliente.id": String(cliente_id), "carritos.carrito_id": { $exists: false } },
            { $pull: { carritos: { "cliente.id": String(cliente_id), carrito_id: { $exists: false } } } }
        );

        if (!lista_productos || lista_productos.length === 0) {
            return { ok: true, mensaje: "Reservas liberadas (lista vacía)" };
        }

        // 2. Insertar las nuevas reservas con carrito_id
        for (let item of lista_productos) {
            if (!item.producto || !item.producto._id) continue;

            const reserva = {
                carrito_id: id_obj,
                cliente_id: String(cliente_id),
                cantidad: parseInt(item.cantidad) || 0,
                canMB: parseInt(item.canMB) || 0,
                fecha: new Date(),
                // Compatibilidad con código legado que busca cliente.id
                cliente: { id: String(cliente_id) }
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
            const total_reservado = producto_db.total_reservado();

            existencias_log.push({
                producto: producto_db.nombre,
                cantidad_nueva: registro.cantidad,
                id: producto_db._id,
                total_reservado,
                existencias_previas: producto_db.existencia.actual,
                existencias_postEnvio: producto_db.existencia.actual - registro.cantidad
            });

            // Restar existencias físicas
            producto_db.existencia.actual -= registro.cantidad;

            // Quitar apartados asignados a este carrito_id o cliente.id
            producto_db.carritos = producto_db.carritos.filter(elem => {
                const match_carrito = elem.carrito_id && String(elem.carrito_id) === String(_id);
                const match_cliente = elem.cliente && elem.cliente.id === cliente.id;
                return !(match_carrito || match_cliente);
            });

            // Quitar folios/números de serie usados si los tuviera
            if (registro.folios && registro.folios.length > 0) {
                producto_db.existencia.folios = producto_db.existencia.folios.filter(
                    f => !registro.folios.includes(f)
                );
            }

            await producto_db.save();

            // Guardar snap log de auditoría
            await snap_por_cambio_en_pedido(
                { nombre: producto_constante.nombre, id: producto_constante._id },
                { nombre: req.user.nombre, id: req.user._id },
                registro.cantidad,
                registro.cantidad,
                "2", // Acción 2: Descontar de inventario
                { folio, cliente: { nombre: cliente.nombre, id: cliente.id } },
                producto_constante,
                registro.folios
            );
        }

        const id_log_previo = await accesos.logActividad(
            'pedidos/cambiar_status_a_envio',
            req.user,
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
