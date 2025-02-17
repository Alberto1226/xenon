import { Cliente } from "../../../../models/cliente";
import * as accesos from "../../accesos";

export function post(req, res, next) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;        
    }

    console.log("Guardado_Edicion_Cliente", req.body);
}