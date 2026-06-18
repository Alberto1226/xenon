import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const { id_pedimento } = req.body;

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

        // Incrementar existencias físicas y vaciar el campo pedimento_actual de cada producto
        for (const item of pedimento.productos) {
            await Producto.findByIdAndUpdate(item.producto, {
                $inc: { 'existencia.actual': item.cantidad },
                $set: { pedimento_actual: null }
            });
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
