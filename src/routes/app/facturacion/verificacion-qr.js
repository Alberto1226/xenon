import * as accesos from "../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../services/corecfdi";

// Verificación QR de un CFDI de CoreCFDI: liga al verificador del SAT e imagen del QR.
//   { id }  ← id_factura de CoreCFDI (no el UUID)
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { CoreCfdiFacturas } = await serviciosCoreCfdi(req);
        const verificacion = await CoreCfdiFacturas.verificacionQr(req.body.id);
        return res.send({ ok: true, verificacion });
    } catch (err) {
        // Sin la liga en el log: contiene RFC y UUID.
        console.error("Error al consultar la verificación QR:", err.message);
        return res.send(respuestaDeError(err));
    }
}
