import * as accesos from "../../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../../services/corecfdi";

// Historial de solicitudes de descarga masiva SAT (20 por página, de la más reciente a la más antigua).
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { CoreCfdiSat } = await serviciosCoreCfdi(req);
        const page = Math.max(parseInt(req.body.page) || 1, 1);
        const historial = await CoreCfdiSat.listarSolicitudes(page);
        return res.send({ ok: true, ...historial });
    } catch (err) {
        console.error("Error al consultar solicitudes de descarga SAT:", err.message);
        return res.send(respuestaDeError(err));
    }
}
