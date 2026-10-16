import * as accesos from "../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../services/corecfdi";

// Balanza anual de ingresos y egresos (lo facturado) calculada por CoreCFDI.
// Sin `year` el servidor elige el año más reciente con CFDI.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { CoreCfdiReportes } = await serviciosCoreCfdi(req);
        const resultado = await CoreCfdiReportes.balanza(req.body.year, { actualizar: req.body.actualizar === true });
        return res.send({ ok: true, ...resultado });
    } catch (err) {
        console.error("Error al consultar la balanza en CoreCFDI:", err.message);
        return res.send(respuestaDeError(err));
    }
}
