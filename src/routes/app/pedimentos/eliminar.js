import { Pedimento } from "../../../models/pedimento";
import * as accesos from "../accesos";

// Solo para entornos locales; en cualquier otro host se rechaza.
function es_local(req) {
    const host = String(req.hostname || req.headers.host || "").split(":")[0];
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (!accesos.tiene_permisos_administrativos(req)) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }
    if (!es_local(req)) {
        res.send({ ok: false, mensaje: "Eliminar pedimentos solo está disponible en modo local." });
        return;
    }

    try {
        const { id_pedimento } = req.body;
        const eliminado = await Pedimento.findByIdAndDelete(id_pedimento).exec();
        if (!eliminado) {
            res.send({ ok: false, mensaje: "Pedimento no encontrado." });
            return;
        }
        res.send({ ok: true });
    } catch (err) {
        console.error(err);
        res.send({ ok: false, mensaje: "Error al eliminar el pedimento." });
    }
}
