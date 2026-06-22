import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const { id_pedimento, folios_productos, actualizar_existencias } = req.body;

    if (!id_pedimento) {
        res.send({ ok: false, mensaje: "ID del pedimento no proporcionado" });
        return;
    }

    try {
        const pedimento = await Pedimento.findById(id_pedimento).exec();
        if (!pedimento) {
            res.send({ ok: false, mensaje: "Pedimento no encontrado" });
            return;
        }

        if (pedimento.status === 'arribado') {
            res.send({ ok: false, mensaje: "Este pedimento ya fue registrado como arribado anteriormente" });
            return;
        }

        // Vaciar el campo pedimento_actual de cada producto, asociar folios e incrementar existencias físicas opcionalmente
        for (const item of pedimento.productos) {
            // Obtener folios capturados para este producto en específico
            const foliosItem = folios_productos && folios_productos[item.producto] ? folios_productos[item.producto] : [];
            
            // Guardar folios en la partida del pedimento
            item.folios = foliosItem;

            // Actualizar el stock físico del producto y vaciar la referencia del pedimento en tránsito
            const updateQuery = {
                $set: { pedimento_actual: null }
            };
            if (actualizar_existencias !== false) {
                updateQuery.$inc = { 'existencia.actual': item.cantidad };
            }
            await Producto.findByIdAndUpdate(item.producto, updateQuery);
        }

        pedimento.status = 'arribado';
        pedimento.fecha_arribo = new Date();
        const pedimentoGuardado = await pedimento.save();

        res.send({ ok: true, mensaje: "El cargamento del pedimento ha arribado al almacén. Inventario físico actualizado.", pedimento: pedimentoGuardado });

    } catch (err) {
        console.error("Error al registrar arribo de pedimento:", err);
        res.send({ ok: false, mensaje: "Error al registrar el arribo: " + err.message });
    }
}
