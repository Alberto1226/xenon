import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { Factura } from "../../../models/factura";
import { Pedido } from "../../../models/pedido";
import { construirCFDIGlobal40 } from "../../../services/cfdiXmlService";
import { decryptText } from "../../../services/cryptoService";
import { timbrarConCUCC } from "../../../services/cuccPacService";
import { reservarFolioFiscal } from "../../../services/folioFiscalService";
import * as accesos from "../accesos";

export async function post(req, res) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    const pedidosIds = req.body.pedidos_ids;
    if (!Array.isArray(pedidosIds) || pedidosIds.length === 0) {
        return res.send({ ok: false, mensaje: "Selecciona al menos una venta para facturar a Público en General." });
    }

    try {
        const config = await ConfiguracionFiscal.findOne().exec();
        if (!config || !["sandbox", "produccion"].includes(config.ambiente)) {
            return res.send({ ok: false, mensaje: "Configura un ambiente CUCC válido antes de emitir." });
        }
        if (config.ambiente === "produccion" && req.body.confirmar_produccion !== true) {
            return res.send({ ok: false, requiere_confirmacion_produccion: true, mensaje: "El ambiente configurado es PRODUCCIÓN. Confirma que autorizas un timbrado real ante el SAT." });
        }
        if (config.ambiente === "produccion" && !config.csd_cargado) {
            return res.send({ ok: false, mensaje: "Carga y valida el CSD en el perfil de CUCC antes de emitir en producción." });
        }

        const soapPassword = decryptText(config.soap_pass_encrypted);
        if (!config.soap_user || !soapPassword) {
            return res.send({ ok: false, mensaje: "Faltan las credenciales SOAP de CUCC." });
        }

        // Buscar los pedidos seleccionados que no estén facturados
        const pedidos = await Pedido.find({
            _id: { $in: pedidosIds },
            "facturacion.0": { $exists: false }
        }).exec();

        if (pedidos.length === 0) {
            return res.send({ ok: false, mensaje: "Ninguno de los pedidos seleccionados está pendiente de facturar." });
        }

        const serie = "F";
        const folio = await reservarFolioFiscal(serie);
        // Por regla fiscal del SAT, las facturas a Público en General son siempre PUE (contado)
        const metodoPago = "PUE";
        const formaPago = req.body.forma_pago || "01";
        const periodicidad = req.body.periodicidad || "04";
        const ahora = new Date();
        const meses = req.body.meses ? String(req.body.meses).padStart(2, "0") : String(ahora.getMonth() + 1).padStart(2, "0");
        const anio = req.body.anio ? String(req.body.anio) : String(ahora.getFullYear());

        const comprobante = construirCFDIGlobal40({
            pedidos,
            emisor: {
                rfc: config.emisor_rfc,
                nombre: config.emisor_nombre,
                regimen: config.emisor_regimen,
                cp: config.emisor_cp
            },
            serie,
            folio,
            fecha: new Date(),
            metodoPago,
            formaPago,
            periodicidad,
            meses,
            anio
        });

        // Timbrar con el PAC CUCC
        let resultadoPAC;
        try {
            resultadoPAC = await timbrarConCUCC({
                xml: comprobante.xml,
                config,
                soapPassword
            });
        } catch (err) {
            console.error("Error al timbrar factura público en general:", err);
            return res.send({
                ok: false,
                mensaje: `El PAC rechazó el timbrado a Público en General: ${err.message}`
            });
        }

        const fechaEmision = new Date();
        const datosPago = {
            saldo_pendiente: 0,
            total_pagado: comprobante.total,
            status_pago: "pagada"
        };

        const facturaDatos = {
            uuid: resultadoPAC.uuid,
            serie,
            folio,
            pedido_id: pedidos[0]._id,
            pedidos_ids: pedidos.map(p => p._id),
            folios_pedidos: pedidos.map(p => p.folio),
            es_publico_general: true,
            informacion_global: comprobante.informacionGlobal,
            folio_pedido: pedidos[0].folio,
            cliente_id: null,
            traslados: comprobante.traslados,
            receptor: {
                rfc: "XAXX010101000",
                nombre: "PUBLICO EN GENERAL",
                domicilio_fiscal: config.emisor_cp,
                regimen_fiscal: "616",
                uso_cfdi: "S01"
            },
            subtotal: comprobante.subtotal,
            impuestos: comprobante.impuestos,
            total: comprobante.total,
            moneda: "MXN",
            metodo_pago: metodoPago,
            forma_pago: formaPago,
            status: "Vigente",
            fecha_emision: fechaEmision,
            ...datosPago,
            usuario: {
                id: req.user ? req.user._id : null,
                nombre: req.user ? (req.user.nombre || req.user.usuario) : "Administrador"
            }
        };

        const factura = new Factura(facturaDatos);
        await factura.save();

        // Actualizar todos los pedidos para marcarlos como facturados con el UUID
        const entradaFacturacion = {
            uuid: resultadoPAC.uuid,
            serie,
            folio,
            fecha_emision: fechaEmision,
            total: comprobante.total,
            rfc_receptor: "XAXX010101000",
            razon_social_receptor: "PUBLICO EN GENERAL",
            regimen_fiscal_receptor: "616",
            forma_pago: formaPago,
            metodo_pago: metodoPago,
            es_publico_general: true
        };

        await Pedido.updateMany(
            { _id: { $in: pedidos.map(p => p._id) } },
            {
                $push: { facturacion: entradaFacturacion },
                $set: {
                    "preparacion_factura.estado": "emitida",
                    "preparacion_factura.factura_uuid": resultadoPAC.uuid,
                    "preparacion_factura.fecha_actualizacion": new Date()
                }
            }
        ).exec();

        return res.send({
            ok: true,
            mensaje: `Factura a Público en General timbrada exitosamente con Folio ${serie}-${folio}`,
            uuid: resultadoPAC.uuid,
            serie,
            folio,
            total: comprobante.total,
            pedidos_afectados: pedidos.length
        });
    } catch (err) {
        console.error("Error en emitir_publico_general:", err);
        return res.send({ ok: false, mensaje: err.message || "Error al procesar la factura a Público en General." });
    }
}
