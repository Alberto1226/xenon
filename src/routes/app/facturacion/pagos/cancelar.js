import { cancelarPago } from "../../../../services/pagosService";
import { autorizar } from "./_autorizar";

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    try {
        await cancelarPago(req.body.pago_id, req.user, req.body.motivo);
        res.send({ ok: true, mensaje: "Pago cancelado y saldos revertidos." });
    } catch (err) {
        console.error("Error al cancelar pago:", err);
        res.send({ ok: false, mensaje: err.message || "No se pudo cancelar el pago." });
    }
}
