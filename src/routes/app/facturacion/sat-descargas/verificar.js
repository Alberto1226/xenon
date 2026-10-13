import * as accesos from "../../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../../services/corecfdi";

// "Verificar ahora": fuerza la verificación de una solicitud. Puede tardar varios minutos cuando
// el SAT ya terminó, porque CoreCFDI descarga e importa los CFDI en esta misma llamada.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const id = parseInt(req.body.id);
        if (!id) {
            return res.send({ ok: false, mensaje: "Falta el ID de la solicitud." });
        }
        const { CoreCfdiSat } = await serviciosCoreCfdi(req);
        const resultado = await CoreCfdiSat.verificarSolicitud(id);
        return res.send({ ok: true, resultado });
    } catch (err) {
        console.error("Error al verificar solicitud de descarga SAT:", err.message);
        return res.send(respuestaDeError(err));
    }
}
