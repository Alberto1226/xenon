import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { FolioConfig } from "../../../../models/folio_config";
import * as accesos from "../../accesos";
import { decryptText } from "../../../../services/cryptoService";

function esUsuarioIsotech(user) {
    if (!user) return false;
    const u = String(user.usuario || "").toLowerCase();
    const n = String(user.nombre || "").toLowerCase();
    const c = String(user.correo || "").toLowerCase();
    return u.includes("isotech") || n.includes("isotech") || c.includes("isotech");
}

export async function get(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }

    try {
        let config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            config = new ConfiguracionFiscal();
            await config.save();
        }

        let folios = await FolioConfig.find().exec();

        // Convertir a objeto JS y ocultar la contraseña real
        let configObj = config.toObject();
        configObj.has_soap_pass = !!config.soap_pass_encrypted;
        configObj.has_client_secret = !!(config.client_secret_encrypted || config.client_secret);
        delete configObj.soap_pass_encrypted;
        delete configObj.client_secret_encrypted;
        delete configObj.client_secret;

        const es_isotech = esUsuarioIsotech(req.user);

        // Si no es el usuario Isotech, ocultar URLs, Client ID y Ambiente por seguridad
        if (!es_isotech) {
            delete configObj.cucc_api_base;
            delete configObj.soap_url;
            delete configObj.client_id;
            delete configObj.ambiente;
        }

        res.send({ ok: true, config: configObj, folios, es_isotech });
    } catch (err) {
        console.error("Error al obtener perfil fiscal:", err);
        res.send({ ok: false, mensaje: "Error al consultar la configuración fiscal" });
    }
}

export async function post(req, res, next) {
    return get(req, res, next);
}
