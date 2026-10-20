import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { Factura } from "../../../models/factura";
import { Pago } from "../../../models/pago";
import { decryptText, obtenerClientSecret } from "../../../services/cryptoService";
import { descargarDeCUCC } from "../../../services/cuccPacService";
import * as accesos from "../accesos";

export async function get(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.status(401).send("Sesión expirada");
    }
    const rol = req.user && req.user.rol;
    if (!["administrador", "gerente", "vendedor"].includes(rol)) {
        return res.status(403).send("Acceso no autorizado");
    }

    try {
        const { uuid, tipo } = req.query;
        if (!/^[0-9a-f-]{36}$/i.test(String(uuid || "")) || !["xml", "pdf"].includes(tipo)) {
            return res.status(400).send("La solicitud de descarga no es válida.");
        }

        const comprobanteUuid = String(uuid).toUpperCase();

        // Buscar primero en Factura, luego en Pago por rep.uuid
        const factura = await Factura.findOne({ uuid: comprobanteUuid }).select("uuid serie folio").lean().exec();
        const pago = !factura ? await Pago.findOne({
            $or: [
                { "rep.uuid": comprobanteUuid },
                { uuid: comprobanteUuid }
            ]
        }).select("_id folio rep").lean().exec() : null;

        if (!factura && !pago) {
            return res.status(404).send("No se encontró el comprobante solicitado.");
        }

        let folioFactura;
        let prefijo;
        if (factura) {
            folioFactura = (factura.serie && factura.folio)
                ? `${factura.serie}${factura.folio}`
                : (factura.folio ? String(factura.folio) : comprobanteUuid);
            prefijo = (factura.serie && factura.folio)
                ? `${factura.serie}-${factura.folio}`
                : (factura.serie || "factura");
        } else {
            const serie = (pago.rep && pago.rep.serie) || "P";
            const folio = (pago.rep && pago.rep.folio) || (pago.folio ? String(pago.folio) : "");
            folioFactura = (serie && folio) ? `${serie}${folio}` : comprobanteUuid;
            prefijo = (serie && folio) ? `${serie}-${folio}` : "pago";
        }

        const config = await ConfiguracionFiscal.findOne().exec();
        if (!config) {
            return res.status(500).send("No hay configuración de CUCC.");
        }

        // Si es XML y ya lo tenemos timbrado en la base de datos para Pago, devolverlo rápido
        if (tipo === "xml" && pago && (pago.rep && pago.rep.xml_timbrado)) {
            res.setHeader("Content-Type", "application/xml; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${prefijo}-${comprobanteUuid}.xml"`);
            res.setHeader("Cache-Control", "private, no-store");
            return res.status(200).send(pago.rep.xml_timbrado);
        }

        const resultado = await descargarDeCUCC({
            uuid: comprobanteUuid,
            folioFactura,
            tipo,
            config,
            soapPassword: decryptText(config.soap_pass_encrypted),
            clientSecret: obtenerClientSecret(config)
        });

        // Si descargamos el XML timbrado y el pago no lo tenía guardado, lo persistimos en la base de datos
        if (tipo === "xml" && pago && !(pago.rep && pago.rep.xml_timbrado) && resultado.buffer) {
            try {
                const xmlStr = resultado.buffer.toString("utf8");
                if (xmlStr.includes("xml")) {
                    await Pago.updateOne(
                        { _id: pago._id },
                        { $set: { "rep.xml_timbrado": xmlStr } }
                    ).exec();
                }
            } catch (errDb) {
                console.warn("No se pudo cachear el XML timbrado del pago:", errDb.message);
            }
        }

        const mime = tipo === "pdf" ? "application/pdf" : "application/xml; charset=utf-8";
        res.setHeader("Content-Type", resultado.contentType || mime);
        res.setHeader("Content-Disposition", `attachment; filename="${prefijo}-${comprobanteUuid}.${tipo}"`);
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(200).send(resultado.buffer);
    } catch (err) {
        console.error("Error al descargar comprobante CUCC:", err);
        return res.status(502).send(err.message || "No se pudo descargar el comprobante desde CUCC.");
    }
}
