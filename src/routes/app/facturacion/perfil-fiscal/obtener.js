import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { FolioConfig } from "../../../../models/folio_config";
import * as accesos from "../../accesos";
import { decryptText } from "../../../../services/cryptoService";

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

        res.send({ ok: true, config: configObj, folios });
    } catch (err) {
        console.error("Error al obtener perfil fiscal:", err);
        res.send({ ok: false, mensaje: "Error al consultar la configuración fiscal" });
    }
}

export async function post(req, res, next) {
    return get(req, res, next);
}
