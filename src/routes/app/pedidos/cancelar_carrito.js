import * as accesos from "../accesos";
import { cancelar_pedido } from "./_servicios/pedido_pipeline_service";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    const { id } = req.body;
    const resultado = await cancelar_pedido(id, req.user, req);
    res.send(resultado);
}