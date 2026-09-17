import * as accesos from "../accesos";
import { cambiar_status_basico } from "./_servicios/pedido_pipeline_service";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    const { id, status } = req.body;
    const resultado = await cambiar_status_basico(id, status, req.user, req);
    res.send(resultado);
}