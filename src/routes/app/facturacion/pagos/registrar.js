import { registrarPago } from "../../../../services/pagosService";
import { autorizar } from "./_autorizar";

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    try {
        const resultado = await registrarPago(req.body, req.user);
        res.send({
            ok: true,
            repetido: resultado.repetido,
            mensaje: resultado.repetido ? "Este pago ya estaba registrado." : "Pago registrado. Ya puedes timbrar el complemento de pago.",
            pago_id: resultado.pago && resultado.pago._id
        });
    } catch (err) {
        console.error("Error al registrar pago:", err);
        res.send({ ok: false, mensaje: err.message || "No se pudo registrar el pago." });
    }
}
