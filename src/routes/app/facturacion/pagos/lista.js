import mongoose from "mongoose";
import { Pago } from "../../../../models/pago";
import { autorizar } from "./_autorizar";

const POR_PAGINA = 15;

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    try {
        const pagina = Math.max(1, Math.floor(Number(req.body.pagina)) || 1);
        const filtro = {};
        if (mongoose.Types.ObjectId.isValid(req.body.cliente_id)) {
            filtro["cliente.id"] = req.body.cliente_id;
        }
        const total = await Pago.countDocuments(filtro).exec();
        const pagos = await Pago.find(filtro).sort({ fecha_pago: -1, _id: -1 }).skip((pagina - 1) * POR_PAGINA).limit(POR_PAGINA).lean().exec();
        res.send({ ok: true, pagos, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) });
    } catch (err) {
        console.error(err);
        res.send({ ok: false, mensaje: "No se pudo consultar el historial." });
    }
}
