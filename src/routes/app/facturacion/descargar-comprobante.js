import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { Factura } from "../../../models/factura";
import { decryptText, obtenerClientSecret } from "../../../services/cryptoService";
import { descargarDeCUCC } from "../../../services/cuccPacService";
import * as accesos from "../accesos";

export async function get(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.status(401).send("Sesión expirada");
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.status(403).send("Acceso no autorizado");
    }

    try {
        const { uuid, tipo } = req.query;
        if (!/^[0-9a-f-]{36}$/i.test(String(uuid || "")) || !["xml", "pdf"].includes(tipo)) {
            return res.status(400).send("La solicitud de descarga no es válida.");
        }
        const factura = await Factura.findOne({ uuid: String(uuid).toUpperCase() }).select("uuid").lean().exec();
        if (!factura) {
            return res.status(404).send("No se encontró la factura solicitada.");
        }
        const config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            return res.status(500).send("No hay configuración de CUCC.");
        }
        const resultado = await descargarDeCUCC({
            uuid: factura.uuid,
            tipo,
            config,
            soapPassword: decryptText(config.soap_pass_encrypted),
            clientSecret: obtenerClientSecret(config)
        });
        const mime = tipo === "pdf" ? "application/pdf" : "application/xml; charset=utf-8";
        res.setHeader("Content-Type", resultado.contentType || mime);
        res.setHeader("Content-Disposition", `attachment; filename="CFDI-${factura.uuid}.${tipo}"`);
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(200).send(resultado.buffer);
    } catch (err) {
        console.error("Error al descargar comprobante CUCC:", err);
        return res.status(502).send(err.message || "No se pudo descargar el comprobante desde CUCC.");
    }
}
