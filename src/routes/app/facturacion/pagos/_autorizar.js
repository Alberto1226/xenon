import * as accesos from "../../accesos";

export function autorizar(req, res) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return false;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return false;
    }
    return true;
}
