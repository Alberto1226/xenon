import { Pago } from "../../../../models/pago";
import { Factura } from "../../../../models/factura";
import { CuentaBancaria } from "../../../../models/cuenta_bancaria";
import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { construirREP20 } from "../../../../services/cfdiXmlService";
import * as accesos from "../../accesos";

export async function get(req, res) {
    if (accesos.esta_logueado(req) === false) {
        return res.status(401).send("Sesión expirada");
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.status(403).send("Acceso no autorizado");
    }

    try {
        const pagoId = req.query.pago_id || req.query.id;
        if (!pagoId) {
            return res.status(400).send("Falta el identificador del pago.");
        }

        const pago = await Pago.findById(pagoId).lean().exec();
        if (!pago) {
            return res.status(404).send("No se encontró el registro de cobro solicitado.");
        }

        let xml = (pago.rep && (pago.rep.xml_timbrado || pago.rep.xml_generado)) || "";

        if (!xml) {
            // Si aún no se había guardado el XML, lo reconstruimos al vuelo con los datos del cobro
            const facturas = await Factura.find({ _id: { $in: (pago.aplicaciones || []).map(a => a.factura_id) } }).lean().exec();
            const receptor = facturas[0] && facturas[0].receptor;
            const config = await ConfiguracionFiscal.findOne().lean().exec();

            if (!receptor || !config) {
                return res.status(404).send("No se encontraron los datos fiscales o facturas necesarias para generar el XML del pago.");
            }

            const cuentaDestino = pago.cuenta_destino_id ? await CuentaBancaria.findById(pago.cuenta_destino_id).lean().exec() : null;
            const serie = (pago.rep && pago.rep.serie) || "P";
            const folio = (pago.rep && pago.rep.folio) || pago.folio || 1;

            const rep = construirREP20({
                pago,
                facturas,
                emisor: {
                    rfc: config.emisor_rfc,
                    nombre: config.emisor_nombre,
                    regimen: config.emisor_regimen,
                    cp: config.emisor_cp
                },
                receptor: {
                    rfc: receptor.rfc,
                    nombre: receptor.nombre,
                    cp: receptor.domicilio_fiscal,
                    regimen: receptor.regimen_fiscal
                },
                cuentaDestino,
                serie,
                folio,
                fecha: pago.fecha_pago || new Date()
            });

            xml = rep.xml;

            // Guardamos el XML generado en el documento del pago para futuras consultas inmediatas
            await Pago.updateOne({ _id: pagoId }, { $set: { "rep.xml_generado": xml } }).exec();
        }

        const esTimbrado = Boolean(pago.rep && pago.rep.estado === "timbrado" && pago.rep.uuid);
        const nombreArchivo = esTimbrado
            ? `REP-${pago.folio}-${pago.rep.uuid}.xml`
            : `REP-pago-${pago.folio}-intento.xml`;

        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
        res.setHeader("Cache-Control", "private, no-store");
        return res.status(200).send(xml);
    } catch (err) {
        console.error("Error al descargar XML del intento REP:", err);
        return res.status(500).send(err.message || "Error al generar o recuperar el XML.");
    }
}
