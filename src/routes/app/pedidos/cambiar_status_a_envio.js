import * as accesos from "../accesos";
import { cambiar_status_a_envio } from "./_servicios/pedido_pipeline_service";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    const { id, producto_para_envios_existe, costo_envio, producto_para_envios_id } = req.body;
    const resultado = await cambiar_status_a_envio(id, { producto_para_envios_existe, costo_envio, producto_para_envios_id }, req.user, req);
    res.send(resultado);
}
