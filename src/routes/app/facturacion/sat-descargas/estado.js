import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import * as accesos from "../../accesos";
import { estadoSesionCoreCfdi } from "../../../../services/corecfdi";

// Última FIEL cargada desde este sistema para la empresa de la sesión de CoreCFDI del usuario.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const sesion = await estadoSesionCoreCfdi(req);
        const config = await ConfiguracionFiscal.findOne().lean().exec();
        // La FIEL es de una empresa: solo se muestra si se cargó para la empresa de esta sesión.
        const esDeEstaEmpresa = !!config && sesion.activa && config.fiel_tenant === sesion.tenant;
        return res.send({
            ok: true,
            rfc_emisor: config ? config.emisor_rfc : "",
            fiel: {
                rfc: esDeEstaEmpresa ? config.fiel_rfc || "" : "",
                status: esDeEstaEmpresa ? config.fiel_status || "" : "",
                valido_hasta: esDeEstaEmpresa ? config.fiel_valido_hasta || "" : "",
                fecha_carga: esDeEstaEmpresa ? config.fiel_fecha_carga || null : null
            }
        });
    } catch (err) {
        console.error("Error al consultar el estado de la FIEL:", err.message);
        return res.send({ ok: false, mensaje: "No se pudo consultar el estado de la FIEL." });
    }
}
