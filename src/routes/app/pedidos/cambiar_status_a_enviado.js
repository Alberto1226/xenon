import * as accesos from "../accesos";
import { cambiar_status_a_entregado } from "./_servicios/pedido_pipeline_service";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    const { id } = req.body;
    const resultado = await cambiar_status_a_entregado(id, req.user, req);
    res.send(resultado);
}