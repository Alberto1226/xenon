import { ConfiguracionFacturacion } from "../../../models/configuracion_facturacion";
import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { Factura } from "../../../models/factura";
import { FolioConfig } from "../../../models/folio_config";
import { Pedido } from "../../../models/pedido";
import { Pedimento } from "../../../models/pedimento";
import { construirCFDI40 } from "../../../services/cfdiXmlService";
import { decryptText } from "../../../services/cryptoService";
import { timbrarConCUCC } from "../../../services/cuccPacService";
import * as accesos from "../accesos";

function responder(res, datos) {
    return res.send(datos);
}

async function reservarFolio(serie) {
    await FolioConfig.findOneAndUpdate(
        { serie },
        { $setOnInsert: { serie, folio_siguiente: 1 } },
        { upsert: true, new: true }
    ).exec();
    const config = await FolioConfig.findOneAndUpdate(
        { serie },
        { $inc: { folio_siguiente: 1 } },
        { new: false }
    ).exec();
    if (!config) {
        throw new Error("No se pudo reservar un folio fiscal.");
    }
    return String(config.folio_siguiente);
}

async function agregarNumerosPedimento(pedido, preparacion, requerirPedimentos) {
    if (!Array.isArray(preparacion.conceptos) || preparacion.conceptos.length !== pedido.lista.length) {
        throw new Error("La preparación fiscal no coincide con los conceptos del pedido.");
    }

    const conceptos = [];
    for (let indice = 0; indice < pedido.lista.length; indice++) {
        const conceptoGuardado = preparacion.conceptos[indice];
        const item = pedido.lista[indice];
        const producto = item && item.producto;
        if (
            !producto ||
            String(conceptoGuardado.producto_id) !== String(producto._id) ||
            conceptoGuardado.indice !== indice
        ) {
            throw new Error("La preparación fiscal no coincide con los productos del pedido.");
        }

        let numeroPedimento = "";
        if (!requerirPedimentos) {
            // Pedimentos desactivados en la configuración de facturación.
        } else if (conceptoGuardado.origen === "importado") {
            const pedimento = await Pedimento.findOne({
                _id: conceptoGuardado.pedimento_id,
                "productos.producto": producto._id
            }).select("numero_pedimento").lean().exec();
            if (!pedimento) {
                throw new Error(`No se encontró el pedimento del producto ${producto.nombre || indice + 1}.`);
            }
            numeroPedimento = pedimento.numero_pedimento;
        } else if (conceptoGuardado.origen !== "nacional") {
            throw new Error(`Indica el origen del producto ${producto.nombre || indice + 1}.`);
        }

        const datosGuardados = typeof conceptoGuardado.toObject === "function"
            ? conceptoGuardado.toObject()
            : conceptoGuardado;
        conceptos.push({ ...datosGuardados, numero_pedimento: numeroPedimento });
    }
    const datosPreparacion = typeof preparacion.toObject === "function"
        ? preparacion.toObject()
        : preparacion;
    return { ...datosPreparacion, conceptos };
}

function actualizarEstadoPedido(pedidoId, estado, mensaje) {
    return Pedido.updateOne(
        { _id: pedidoId, "preparacion_factura.estado": "emitiendo" },
        {
            $set: {
                "preparacion_factura.estado": estado,
                "preparacion_factura.error_emision": mensaje || "",
                "preparacion_factura.fecha_actualizacion": new Date()
            }
        }
    ).exec();
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return responder(res, { ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return responder(res, { ok: false, mensaje: "Acceso no autorizado" });
    }
    if (req.body.confirmar_emision !== true) {
        return responder(res, { ok: false, mensaje: "Confirma explícitamente el timbrado con el PAC." });
    }

    let pedidoId = req.body.pedido_id;
    let bloqueado = false;
    try {
        const config = await ConfiguracionFiscal.findOne().exec();
        const configFacturacion = await ConfiguracionFacturacion.findOne().select("requerir_pedimentos").lean().exec();
        const requerirPedimentos = !!(configFacturacion && configFacturacion.requerir_pedimentos);
        if (!config || !["sandbox", "produccion"].includes(config.ambiente)) {
            return responder(res, { ok: false, mensaje: "Configura un ambiente CUCC válido antes de emitir." });
        }
        if (config.ambiente === "produccion" && req.body.confirmar_produccion !== true) {
            return responder(res, { ok: false, mensaje: "La configuración apunta a producción. Confirma que autorizas un timbrado real." });
        }
        // En sandbox el PAC usa el CSD ya configurado en su perfil; solo en producción se exige la carga hecha desde el sistema.
        if (config.ambiente === "produccion" && !config.csd_cargado) {
            return responder(res, { ok: false, mensaje: "Carga y valida el CSD en el perfil de CUCC antes de emitir." });
        }
        const soapPassword = decryptText(config.soap_pass_encrypted);
        if (!config.soap_user || !soapPassword) {
            return responder(res, { ok: false, mensaje: "Faltan las credenciales SOAP de CUCC." });
        }

        const pedido = await Pedido.findById(pedidoId).exec();
        if (!pedido) {
            return responder(res, { ok: false, mensaje: "No se encontró el pedido." });
        }
        if (pedido.facturacion && pedido.facturacion.length > 0) {
            return responder(res, { ok: false, mensaje: "Este pedido ya tiene una factura; no se emitirá otra desde esta acción." });
        }
        const facturaExistente = await Factura.findOne({ pedido_id: pedido._id }).select("_id").lean().exec();
        if (facturaExistente) {
            return responder(res, { ok: false, mensaje: "Ya existe una factura registrada para este pedido." });
        }
        if (!pedido.preparacion_factura || !["pendiente", "fallida"].includes(pedido.preparacion_factura.estado)) {
            return responder(res, { ok: false, mensaje: "Guarda y revisa la preparación fiscal antes de emitir." });
        }

        const preparacion = await agregarNumerosPedimento(pedido, pedido.preparacion_factura, requerirPedimentos);
        const serie = "F";
        const folio = await reservarFolio(serie);
        const comprobante = construirCFDI40({
            pedido,
            preparacion,
            emisor: {
                rfc: config.emisor_rfc,
                nombre: config.emisor_nombre,
                regimen: config.emisor_regimen,
                cp: config.emisor_cp
            },
            serie,
            folio,
            fecha: new Date()
        });

        const estadoActual = pedido.preparacion_factura.estado;
        const pedidoBloqueado = await Pedido.findOneAndUpdate(
            {
                _id: pedido._id,
                "preparacion_factura.estado": estadoActual,
                "facturacion.0": { $exists: false }
            },
            {
                $set: {
                    "preparacion_factura.estado": "emitiendo",
                    "preparacion_factura.error_emision": "",
                    "preparacion_factura.fecha_actualizacion": new Date()
                }
            },
            { new: true }
        ).exec();
        if (!pedidoBloqueado) {
            return responder(res, { ok: false, mensaje: "El pedido cambió o ya está siendo facturado. Actualiza e inténtalo de nuevo." });
        }
        bloqueado = true;

        let resultadoPAC;
        try {
            resultadoPAC = await timbrarConCUCC({
                xml: comprobante.xml,
                config,
                soapPassword
            });
        } catch (err) {
            const estadoError = err.definitivo ? "fallida" : "requiere_revision";
            await actualizarEstadoPedido(pedido._id, estadoError, err.message);
            bloqueado = false;
            return responder(res, {
                ok: false,
                estado: estadoError,
                mensaje: estadoError === "requiere_revision"
                    ? `No se confirmó la respuesta del PAC. No reintentes aún para evitar duplicar un timbre. Revisa CUCC. Detalle: ${err.message}`
                    : `CUCC rechazó la factura: ${err.message}`
            });
        }

        const facturaDatos = {
            uuid: resultadoPAC.uuid,
            serie,
            folio,
            pedido_id: pedido._id,
            receptor: {
                rfc: preparacion.receptor.rfc,
                nombre: preparacion.receptor.nombre,
                domicilio_fiscal: preparacion.receptor.codigo_postal,
                regimen_fiscal: preparacion.receptor.regimen_fiscal,
                uso_cfdi: preparacion.receptor.uso_cfdi
            },
            subtotal: comprobante.subtotal,
            impuestos: comprobante.impuestos,
            total: comprobante.total,
            moneda: comprobante.moneda,
            metodo_pago: preparacion.metodo_pago,
            forma_pago: preparacion.metodo_pago === "PPD" ? "99" : preparacion.forma_pago,
            status: "Vigente",
            fecha_emision: new Date(),
            usuario: {
                id: req.user._id,
                nombre: req.user.nombre || ""
            }
        };

        const factura = new Factura(facturaDatos);
        await factura.save();
        pedidoBloqueado.facturacion.push({
            uuid: resultadoPAC.uuid,
            serie,
            folio,
            fecha_emision: factura.fecha_emision,
            total: comprobante.total,
            rfc_receptor: preparacion.receptor.rfc,
            razon_social_receptor: preparacion.receptor.nombre,
            regimen_fiscal_receptor: preparacion.receptor.regimen_fiscal,
            uso_cfdi: preparacion.receptor.uso_cfdi,
            metodo_pago: preparacion.metodo_pago,
            forma_pago: facturaDatos.forma_pago,
            status: "Vigente"
        });
        pedidoBloqueado.preparacion_factura.estado = "emitida";
        pedidoBloqueado.preparacion_factura.factura_uuid = resultadoPAC.uuid;
        pedidoBloqueado.preparacion_factura.error_emision = "";
        await pedidoBloqueado.save();
        bloqueado = false;

        return responder(res, {
            ok: true,
            mensaje: `Factura timbrada correctamente (${config.ambiente}).`,
            uuid: resultadoPAC.uuid,
            serie,
            folio,
            total: comprobante.total,
            moneda: comprobante.moneda
        });
    } catch (err) {
        console.error("Error al emitir CFDI:", err);
        if (bloqueado) {
            await actualizarEstadoPedido(pedidoId, "requiere_revision", "La operación terminó con resultado incierto. Revisa CUCC antes de volver a emitir.");
        }
        return responder(res, { ok: false, mensaje: err.message || "No se pudo emitir la factura." });
    }
}
