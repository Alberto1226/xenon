import * as accesos from "../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../services/corecfdi";

// Bóveda Fiscal de un CFDI de CoreCFDI: expediente, comentarios y eliminación de adjuntos.
// La subida y las descargas van por /app/facturacion/boveda-archivo (binario).
//   { accion: "expediente", id, actualizar }
//   { accion: "comentario", id, comentario }
//   { accion: "eliminar", id_adjunto, id }
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    const accion = req.body.accion;
    try {
        const { CoreCfdiBoveda } = await serviciosCoreCfdi(req);

        if (accion === "expediente") {
            const resultado = await CoreCfdiBoveda.expediente(req.body.id, { actualizar: req.body.actualizar === true });
            return res.send({ ok: true, ...resultado });
        }
        if (accion === "comentario") {
            const resultado = await CoreCfdiBoveda.agregarComentario(req.body.id, req.body.comentario);
            return res.send({ ok: true, ...resultado });
        }
        if (accion === "eliminar") {
            const resultado = await CoreCfdiBoveda.eliminarAdjunto(req.body.id_adjunto, { idFactura: req.body.id || null });
            return res.send({ ok: true, ...resultado });
        }
        return res.send({ ok: false, mensaje: "Acción no válida." });
    } catch (err) {
        console.error(`Error en la Bóveda Fiscal de CoreCFDI (${accion}):`, err.message);
        return res.send(respuestaDeError(err));
    }
}
