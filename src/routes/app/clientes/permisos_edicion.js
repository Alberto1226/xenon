import * as accesos from "../accesos";
import { obtenerPermisosEdicionCliente } from "../../../services/permisosEdicionClientes";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    try {
        const permisos = await obtenerPermisosEdicionCliente(req.user, req.body.cliente_id);
        return res.send({ ok: true, ...permisos });
    } catch (err) {
        console.error("Error al consultar permisos de edición del cliente:", err);
        return res.send({ ok: false, mensaje: "No se pudieron consultar los permisos de edición." });
    }
}
