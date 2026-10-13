import * as accesos from "../../accesos";
import { cerrarSesionCoreCfdi } from "../../../../services/corecfdi";

// Cierra la sesión del usuario en CoreCFDI: borra los tokens guardados en este sistema.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }

    try {
        await cerrarSesionCoreCfdi(req);
        return res.send({ ok: true, mensaje: "Sesión de CoreCFDI cerrada." });
    } catch (err) {
        console.error("Error al cerrar la sesión de CoreCFDI:", err.message);
        return res.send({ ok: false, mensaje: "No se pudo cerrar la sesión de CoreCFDI." });
    }
}
