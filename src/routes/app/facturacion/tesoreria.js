import * as accesos from "../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../services/corecfdi";

// Cuentas por cobrar (tipo "cobrar") y por pagar (tipo "pagar") calculadas por CoreCFDI.
// Llega la lista completa de facturas pendientes: los filtros y la paginación se hacen en la pantalla.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { CoreCfdiTesoreria } = await serviciosCoreCfdi(req);
        const opciones = { actualizar: req.body.actualizar === true };
        const resultado = req.body.tipo === "pagar"
            ? await CoreCfdiTesoreria.cuentasPorPagar({}, opciones)
            : await CoreCfdiTesoreria.cuentasPorCobrar({}, opciones);
        return res.send({ ok: true, ...resultado });
    } catch (err) {
        console.error("Error al consultar tesorería en CoreCFDI:", err.message);
        return res.send(respuestaDeError(err));
    }
}
