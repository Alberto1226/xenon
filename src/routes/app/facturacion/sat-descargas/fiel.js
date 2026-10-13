import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import * as accesos from "../../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../../services/corecfdi";

// Carga la FIEL (e.firma) en CoreCFDI. Los archivos y la contraseña solo pasan por memoria:
// no se guardan en este sistema ni se escriben en logs.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado. Se requieren permisos administrativos." });
    }

    try {
        const { CoreCfdiSat, tenant } = await serviciosCoreCfdi(req);
        const { cer_base64, key_base64, cer_nombre, key_nombre, password } = req.body;

        let config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            config = new ConfiguracionFiscal();
        }

        const resultado = await CoreCfdiSat.configurarFiel({
            cer: cer_base64 ? { nombre: cer_nombre || "", buffer: Buffer.from(cer_base64, "base64") } : null,
            key: key_base64 ? { nombre: key_nombre || "", buffer: Buffer.from(key_base64, "base64") } : null,
            password,
            rfcEsperado: config.emisor_rfc
        });

        config.fiel_tenant = tenant;
        config.fiel_rfc = resultado.rfc || "";
        config.fiel_status = resultado.status || "";
        config.fiel_valido_hasta = resultado.valido_hasta || "";
        config.fiel_fecha_carga = new Date();
        await config.save();

        return res.send({
            ok: true,
            mensaje: resultado.mensaje || "FIEL cargada y verificada con éxito.",
            fiel: {
                rfc: config.fiel_rfc,
                status: config.fiel_status,
                valido_hasta: config.fiel_valido_hasta,
                fecha_carga: config.fiel_fecha_carga
            },
            advertencias: resultado.advertencias
        });
    } catch (err) {
        // Solo el mensaje: el error nunca debe arrastrar el cuerpo de la petición al log.
        console.error("Error al cargar la FIEL en CoreCFDI:", err.message);
        return res.send(respuestaDeError(err));
    }
}
