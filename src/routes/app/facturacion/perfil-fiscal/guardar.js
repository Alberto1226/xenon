import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { FolioConfig } from "../../../../models/folio_config";
import * as accesos from "../../accesos";
import { encryptText, decryptText, obtenerClientSecret } from "../../../../services/cryptoService";
import { obtenerOAuthToken, actualizarPerfilCUCC } from "../../../../services/cuccApiService";

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
            emisor_rfc,
            emisor_nombre,
            emisor_regimen,
            emisor_cp,
            cucc_api_base,
            soap_url,
            soap_user,
            soap_pass,
            client_id,
            client_secret,
            ambiente,
            folios
        } = req.body;

        let config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            config = new ConfiguracionFiscal();
        }

        if (emisor_rfc) config.emisor_rfc = emisor_rfc.trim().toUpperCase();
        if (emisor_nombre) config.emisor_nombre = emisor_nombre.trim().toUpperCase();
        if (emisor_regimen) config.emisor_regimen = emisor_regimen.trim();
        if (emisor_cp) config.emisor_cp = emisor_cp.trim();
        if (cucc_api_base) config.cucc_api_base = cucc_api_base.trim();
        if (soap_url) config.soap_url = soap_url.trim();
        if (soap_user) config.soap_user = soap_user.trim();
        if (client_id) config.client_id = client_id.trim();
        if (client_secret && client_secret.trim()) {
            config.client_secret_encrypted = encryptText(client_secret.trim());
            config.client_secret = "";
        } else if (!config.client_secret_encrypted && config.client_secret) {
            config.client_secret_encrypted = encryptText(config.client_secret);
            config.client_secret = "";
        }
        if (ambiente) config.ambiente = ambiente;

        if (soap_pass && soap_pass.trim().length > 0) {
            config.soap_pass_encrypted = encryptText(soap_pass.trim());
        }

        config.fecha_actualizacion = new Date();
        await config.save();

        // Actualizar FolioConfigs si se proporcionaron
        if (Array.isArray(folios)) {
            for (let f of folios) {
                if (f.serie) {
                    await FolioConfig.findOneAndUpdate(
                        { serie: f.serie },
                        { folio_siguiente: parseInt(f.folio_siguiente || 1) },
                        { upsert: true, new: true }
                    );
                }
            }
        }

        // Intentar sincronizar con el PAC CUCC si se tienen credenciales
        let syncStatus = { sincronizado: false, mensaje: "" };
        const soapPassPlain = soap_pass ? soap_pass.trim() : decryptText(config.soap_pass_encrypted);
        
        const clientSecretPlain = obtenerClientSecret(config);
        if (config.client_id && clientSecretPlain && config.soap_user && soapPassPlain) {
            const tokenRes = await obtenerOAuthToken({
                cucc_api_base: config.cucc_api_base,
                client_id: config.client_id,
                client_secret: clientSecretPlain,
                soap_user: config.soap_user,
                soap_pass_plain: soapPassPlain
            });

            if (tokenRes.ok && tokenRes.access_token) {
                const putRes = await actualizarPerfilCUCC(
                    {
                        rfc: config.emisor_rfc,
                        razon_social: config.emisor_nombre,
                        cp: config.emisor_cp,
                        regimen_fiscal: config.emisor_regimen
                    },
                    tokenRes.access_token,
                    config
                );

                if (putRes.ok) {
                    syncStatus.sincronizado = true;
                    syncStatus.mensaje = "Datos fiscales guardados y sincronizados exitosamente con el PAC CUCC";
                } else {
                    syncStatus.mensaje = "Guardado localmente. Advertencia PAC: " + putRes.mensaje;
                }
            } else {
                syncStatus.mensaje = "Guardado localmente. No se pudo autenticar con PAC CUCC: " + tokenRes.mensaje;
            }
        } else {
            syncStatus.mensaje = "Guardado localmente. Configure las credenciales completas para sincronizar con CUCC.";
        }

        res.send({ ok: true, mensaje: syncStatus.mensaje, sync: syncStatus });
    } catch (err) {
        console.error("Error al guardar perfil fiscal:", err);
        res.send({ ok: false, mensaje: "Error al guardar la configuración fiscal: " + err.message });
    }
}
