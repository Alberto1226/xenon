import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import * as accesos from "../../accesos";
import { decryptText, obtenerClientSecret } from "../../../../services/cryptoService";
import { obtenerOAuthToken, obtenerPerfilCUCC } from "../../../../services/cuccApiService";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }

    try {
        let config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            res.send({ ok: false, mensaje: "No hay configuración fiscal guardada" });
            return;
        }

        const soapPassPlain = req.body.soap_pass ? req.body.soap_pass.trim() : decryptText(config.soap_pass_encrypted);
        const clientSecretPlain = req.body.client_secret
            ? req.body.client_secret.trim()
            : obtenerClientSecret(config);

        if (!soapPassPlain) {
            res.send({ ok: false, mensaje: "Proporcione la contraseña del PAC para realizar la prueba." });
            return;
        }

        const tokenRes = await obtenerOAuthToken({
            cucc_api_base: req.body.cucc_api_base || config.cucc_api_base,
            client_id: req.body.client_id || config.client_id,
            client_secret: clientSecretPlain,
            soap_user: req.body.soap_user || config.soap_user,
            soap_pass_plain: soapPassPlain
        });

        if (!tokenRes.ok || !tokenRes.access_token) {
            res.send({ ok: false, mensaje: "Fallo la prueba de conexión con CUCC: " + tokenRes.mensaje });
            return;
        }

        const perfilRes = await obtenerPerfilCUCC(tokenRes.access_token, config);

        res.send({
            ok: true,
            mensaje: "¡Conexión con el PAC CUCC probada exitosamente!",
            access_token: tokenRes.access_token.substring(0, 15) + "...",
            perfil_cucc: perfilRes.perfil || null
        });
    } catch (err) {
        console.error("Error en probar_conexion CUCC:", err);
        res.send({ ok: false, mensaje: "Error al probar conexión: " + err.message });
    }
}
