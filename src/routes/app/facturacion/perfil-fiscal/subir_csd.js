import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import * as accesos from "../../accesos";
import { decryptText, obtenerClientSecret } from "../../../../services/cryptoService";
import { obtenerOAuthToken, subirCSDCUCC } from "../../../../services/cuccApiService";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }

    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado. Se requieren permisos administrativos." });
        return;
    }

    try {
        const {
            certificado_base64,
            llave_base64,
            pass_certificado,
            logo_base64,
            certificado_nombre,
            llave_nombre
        } = req.body;

        let config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            res.send({ ok: false, mensaje: "Debe guardar la configuración fiscal antes de subir los certificados." });
            return;
        }

        const soapPassPlain = decryptText(config.soap_pass_encrypted);
        const tokenRes = await obtenerOAuthToken({
            cucc_api_base: config.cucc_api_base,
            client_id: config.client_id,
            client_secret: obtenerClientSecret(config),
            soap_user: config.soap_user,
            soap_pass_plain: soapPassPlain
        });

        if (!tokenRes.ok || !tokenRes.access_token) {
            res.send({ ok: false, mensaje: "No se pudo autenticar con el PAC CUCC para subir los certificados: " + tokenRes.mensaje });
            return;
        }

        const files = {};
        if (certificado_base64) {
            files.certificado = {
                buffer: Buffer.from(certificado_base64, 'base64'),
                originalname: certificado_nombre || 'certificado.cer'
            };
        }

        if (llave_base64) {
            files.llave = {
                buffer: Buffer.from(llave_base64, 'base64'),
                originalname: llave_nombre || 'llave.key'
            };
        }

        if (logo_base64) {
            files.logo = {
                buffer: Buffer.from(logo_base64, 'base64'),
                originalname: 'logo.png',
                mimetype: 'image/png'
            };
        }

        const cuccRes = await subirCSDCUCC(files, pass_certificado, tokenRes.access_token, config);

        if (cuccRes.ok) {
            config.csd_cargado = true;
            if (certificado_nombre) config.certificado_nombre = certificado_nombre;
            if (llave_nombre) config.llave_nombre = llave_nombre;
            config.fecha_actualizacion = new Date();
            await config.save();

            res.send({
                ok: true,
                mensaje: "¡Certificados de Sello Digital (CSD) y Logo cargados y sincronizados exitosamente con el PAC CUCC!",
                resultado: cuccRes.resultado
            });
        } else {
            res.send({ ok: false, mensaje: "Error del PAC CUCC al procesar CSD: " + cuccRes.mensaje });
        }
    } catch (err) {
        console.error("Error en subir_csd:", err);
        res.send({ ok: false, mensaje: "Error al procesar archivos CSD: " + err.message });
    }
}
