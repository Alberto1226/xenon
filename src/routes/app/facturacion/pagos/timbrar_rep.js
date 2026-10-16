import mongoose from "mongoose";
import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { CuentaBancaria } from "../../../../models/cuenta_bancaria";
import { Factura } from "../../../../models/factura";
import { Pago } from "../../../../models/pago";
import { construirREP20 } from "../../../../services/cfdiXmlService";
import { decryptText } from "../../../../services/cryptoService";
import { timbrarConCUCC } from "../../../../services/cuccPacService";
import { reservarFolioFiscal } from "../../../../services/folioFiscalService";
import { autorizar } from "./_autorizar";

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    if (req.body.confirmar_emision !== true) {
        return res.send({ ok: false, mensaje: "Confirma explícitamente el timbrado con el PAC." });
    }
    if (!mongoose.Types.ObjectId.isValid(req.body.pago_id)) {
        return res.send({ ok: false, mensaje: "Pago no válido." });
    }

    let bloqueado = false;
    const pagoId = req.body.pago_id;
    try {
        const config = await ConfiguracionFiscal.findOne().exec();
        if (!config || !["sandbox", "produccion"].includes(config.ambiente)) {
            return res.send({ ok: false, mensaje: "Configura un ambiente CUCC válido antes de timbrar." });
        }
        if (config.ambiente === "produccion" && req.body.confirmar_produccion !== true) {
            return res.send({ ok: false, mensaje: "La configuración apunta a producción. Confirma que autorizas un timbrado real." });
        }
        if (config.ambiente === "produccion" && !config.csd_cargado) {
            return res.send({ ok: false, mensaje: "Carga y valida el CSD en el perfil de CUCC antes de timbrar." });
        }
        const soapPassword = decryptText(config.soap_pass_encrypted);
        if (!config.soap_user || !soapPassword) {
            return res.send({ ok: false, mensaje: "Faltan las credenciales SOAP de CUCC." });
        }

        const pago = await Pago.findById(pagoId).lean().exec();
        if (!pago || pago.status !== "Registrado") {
            return res.send({ ok: false, mensaje: "El pago no existe o está cancelado." });
        }
        if (!["sin_timbrar", "fallido"].includes(pago.rep.estado)) {
            return res.send({ ok: false, mensaje: "El complemento de este pago ya fue timbrado o está en revisión." });
        }
        if (!pago.aplicaciones || pago.aplicaciones.length === 0) {
            return res.send({ ok: false, mensaje: "El pago no tiene facturas aplicadas." });
        }

        const facturas = await Factura.find({ _id: { $in: pago.aplicaciones.map(a => a.factura_id) } }).lean().exec();
        const receptor = facturas[0] && facturas[0].receptor;
        if (!receptor) {
            return res.send({ ok: false, mensaje: "No se encontraron las facturas del pago." });
        }
        const cuentaDestino = pago.cuenta_destino_id ? await CuentaBancaria.findById(pago.cuenta_destino_id).lean().exec() : null;

        const serie = "P";
        const folio = await reservarFolioFiscal(serie);
        const rep = construirREP20({
            pago,
            facturas,
            emisor: { rfc: config.emisor_rfc, nombre: config.emisor_nombre, regimen: config.emisor_regimen, cp: config.emisor_cp },
            receptor: { rfc: receptor.rfc, nombre: receptor.nombre, cp: receptor.domicilio_fiscal, regimen: receptor.regimen_fiscal },
            cuentaDestino,
            serie,
            folio,
            fecha: new Date()
        });

        const bloqueo = await Pago.updateOne(
            { _id: pagoId, status: "Registrado", "rep.estado": { $in: ["sin_timbrar", "fallido"] } },
            { $set: { "rep.estado": "emitiendo", "rep.error": "" } }
        ).exec();
        if (bloqueo.nModified !== 1) {
            return res.send({ ok: false, mensaje: "El pago cambió o ya se está timbrando. Actualiza e inténtalo de nuevo." });
        }
        bloqueado = true;

        let resultadoPAC;
        try {
            resultadoPAC = await timbrarConCUCC({ xml: rep.xml, config, soapPassword });
        } catch (err) {
            const estado = err.definitivo ? "fallido" : "requiere_revision";
            await Pago.updateOne({ _id: pagoId, "rep.estado": "emitiendo" }, { $set: { "rep.estado": estado, "rep.error": err.message } }).exec();
            bloqueado = false;
            return res.send({
                ok: false,
                estado,
                mensaje: estado === "requiere_revision"
                    ? `No se confirmó la respuesta del PAC. No reintentes aún para evitar duplicar el timbre. Revisa CUCC. Detalle: ${err.message}`
                    : `CUCC rechazó el complemento: ${err.message}`
            });
        }

        await Pago.updateOne({ _id: pagoId }, {
            $set: {
                "rep.estado": "timbrado",
                "rep.uuid": resultadoPAC.uuid,
                "rep.serie": serie,
                "rep.folio": folio,
                "rep.error": "",
                "rep.fecha_timbrado": new Date()
            }
        }).exec();
        bloqueado = false;
        res.send({ ok: true, mensaje: `Complemento de pago timbrado (${config.ambiente}).`, uuid: resultadoPAC.uuid });
    } catch (err) {
        console.error("Error al timbrar REP:", err);
        if (bloqueado) {
            await Pago.updateOne({ _id: pagoId, "rep.estado": "emitiendo" }, { $set: { "rep.estado": "requiere_revision", "rep.error": "Resultado incierto. Revisa CUCC antes de reintentar." } }).exec();
        }
        res.send({ ok: false, mensaje: err.message || "No se pudo timbrar el complemento." });
    }
}
