import mongoose from "mongoose";
import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { Factura } from "../../../models/factura";
import { Pago } from "../../../models/pago";
import { Pedido } from "../../../models/pedido";
import { decryptText } from "../../../services/cryptoService";
import { cancelarConCUCC } from "../../../services/cuccPacService";
import * as accesos from "../accesos";

const MOTIVOS_SAT = new Set(["01", "02", "03", "04"]);

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { factura_id, uuid, motivo, uuid_sustitucion } = req.body;
        const motivoClave = String(motivo || "").trim();

        if (!MOTIVOS_SAT.has(motivoClave)) {
            return res.send({ ok: false, mensaje: "Selecciona un motivo de cancelación SAT válido (01, 02, 03, 04)." });
        }

        if (motivoClave === "01") {
            const uuidSust = String(uuid_sustitucion || "").trim().toUpperCase();
            if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(uuidSust)) {
                return res.send({ ok: false, mensaje: "El motivo 01 requiere un UUID de sustitución válido." });
            }
        }

        let filtro = null;
        if (mongoose.Types.ObjectId.isValid(factura_id)) {
            filtro = { _id: factura_id };
        } else if (uuid) {
            filtro = { uuid: String(uuid).toUpperCase() };
        }

        if (!filtro) {
            return res.send({ ok: false, mensaje: "Identificador de factura no válido." });
        }

        const factura = await Factura.findOne(filtro).exec();
        if (!factura) {
            return res.send({ ok: false, mensaje: "No se encontró la factura." });
        }

        if (factura.status === "Cancelada") {
            return res.send({ ok: false, mensaje: "La factura ya se encuentra cancelada." });
        }

        // Si la factura es PPD y tiene parcialidades pagadas, verificar si tiene pagos activos
        if (factura.metodo_pago === "PPD" && (Number(factura.total_pagado) > 0 || (factura.parcialidades && factura.parcialidades.length > 0))) {
            const pagosActivos = await Pago.find({
                "aplicaciones.factura_id": factura._id,
                status: "Registrado"
            }).select("folio rep").lean().exec();

            if (pagosActivos.length > 0) {
                const foliosPagos = pagosActivos.map(p => "#" + p.folio).join(", ");
                return res.send({
                    ok: false,
                    mensaje: `La factura tiene complementos de pago asociados (${foliosPagos}). Por regla del SAT, primero debes cancelar los pagos asociados antes de cancelar la factura.`
                });
            }
        }

        // Intentar cancelar con PAC CUCC si está configurado
        const config = await ConfiguracionFiscal.findOne().exec();
        let mensajePac = "";
        if (config && config.soap_user && config.soap_pass_encrypted) {
            try {
                const soapPassword = decryptText(config.soap_pass_encrypted);
                if (soapPassword) {
                    const resPac = await cancelarConCUCC({
                        uuid: factura.uuid,
                        motivo: motivoClave,
                        uuidSustitucion: motivoClave === "01" ? uuid_sustitucion : "",
                        config,
                        soapPassword
                    });
                    if (resPac && resPac.mensaje) mensajePac = resPac.mensaje;
                }
            } catch (errPac) {
                console.warn("Aviso al cancelar en PAC CUCC:", errPac.message);
                if (config.ambiente === "produccion") {
                    return res.send({
                        ok: false,
                        mensaje: `El PAC CUCC rechazó la cancelación: ${errPac.message}`
                    });
                }
            }
        }

        const ahora = new Date();
        factura.status = "Cancelada";
        factura.fecha_cancelacion = ahora;
        factura.motivo_cancelacion = motivoClave;
        factura.uuid_sustitucion = motivoClave === "01" ? String(uuid_sustitucion || "").toUpperCase() : "";
        if (factura.metodo_pago === "PPD") {
            factura.saldo_pendiente = 0;
            factura.status_pago = "";
        }
        await factura.save();

        // Actualizar en el pedido vinculado si existe
        if (factura.pedido_id) {
            await Pedido.updateOne(
                { _id: factura.pedido_id, "facturacion.uuid": factura.uuid },
                {
                    $set: {
                        "facturacion.$.status": "Cancelada",
                        "facturacion.$.fecha_cancelacion": ahora,
                        "facturacion.$.motivo_cancelacion": motivoClave,
                        "facturacion.$.uuid_sustitucion": factura.uuid_sustitucion
                    }
                }
            ).exec();
        }

        return res.send({
            ok: true,
            mensaje: `Factura ${factura.serie}-${factura.folio} cancelada exitosamente.${mensajePac ? " (" + mensajePac + ")" : ""}`
        });
    } catch (err) {
        console.error("Error al cancelar factura:", err);
        return res.send({ ok: false, mensaje: err.message || "No se pudo cancelar la factura." });
    }
}
