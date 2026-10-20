import mongoose from "mongoose";
import { Cliente } from "../models/cliente";
import { Factura } from "../models/factura";
import { Pago } from "../models/pago";
import { MovimientoSaldoCliente } from "../models/movimiento_saldo_cliente";
import { reservarFolioFiscal } from "./folioFiscalService";

const FORMAS_PAGO_REP = new Set(["01", "02", "03", "04", "05", "06", "08", "12", "13", "14", "15", "17", "23", "24", "25", "26", "27", "28", "29", "30", "31"]);
const MARGEN = 0.004;

export function r2(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function usuarioDe(user) {
    if (!user) return { id: null, nombre: "" };
    return { id: user._id || null, nombre: user.nombre || "" };
}

async function ajustarEstadoFactura(facturaId) {
    const factura = await Factura.findById(facturaId).select("saldo_pendiente total_pagado").lean().exec();
    if (!factura) return;
    const saldo = r2(factura.saldo_pendiente);
    const pagado = r2(factura.total_pagado);
    await Factura.updateOne({ _id: facturaId }, {
        $set: {
            saldo_pendiente: saldo < MARGEN ? 0 : saldo,
            total_pagado: pagado < MARGEN ? 0 : pagado,
            status_pago: saldo < MARGEN ? "pagada" : (pagado < MARGEN ? "pendiente" : "parcial")
        }
    }).exec();
}

export async function revertirAplicacion(facturaId, pagoId, importe) {
    await Factura.updateOne(
        { _id: facturaId },
        {
            $inc: { saldo_pendiente: importe, total_pagado: -importe },
            $pull: { parcialidades: { pago_id: pagoId } }
        }
    ).exec();
    await ajustarEstadoFactura(facturaId);
}

export async function registrarPago(datos, user) {
    const clienteId = datos.cliente_id;
    if (!mongoose.Types.ObjectId.isValid(clienteId)) {
        throw new Error("Selecciona un cliente válido.");
    }
    if (!FORMAS_PAGO_REP.has(String(datos.forma_pago))) {
        throw new Error("Selecciona una forma de pago válida.");
    }
    const fechaPago = new Date(datos.fecha_pago || Date.now());
    if (isNaN(fechaPago.getTime())) {
        throw new Error("La fecha de pago no es válida.");
    }

    const claveIdem = String(datos.clave_idempotencia || "").trim().slice(0, 80);
    if (claveIdem) {
        const existente = await Pago.findOne({ clave_idempotencia: claveIdem }).lean().exec();
        if (existente) return { pago: existente, repetido: true };
    }

    const lineas = Array.isArray(datos.aplicaciones) ? datos.aplicaciones : [];
    if (lineas.length === 0) {
        throw new Error("Selecciona al menos una factura con abono.");
    }

    const vistas = new Set();
    const aplicacionesProcesar = [];
    for (const linea of lineas) {
        const id = String(linea.factura_id || linea._id);
        const importe = r2(linea.importe_pagado !== undefined ? linea.importe_pagado : linea.importe);
        if (!mongoose.Types.ObjectId.isValid(id) || vistas.has(id)) {
            throw new Error("Factura duplicada o no válida en las aplicaciones.");
        }
        if (!(importe > 0)) {
            throw new Error("El importe a abonar debe ser mayor a cero.");
        }
        vistas.add(id);
        aplicacionesProcesar.push({
            factura_id: id,
            importe,
            num_parcialidad: Number(linea.num_parcialidad) || null
        });
    }

    const cliente = await Cliente.findById(clienteId).select("nombre rfc datos_fiscales saldo_a_favor").lean().exec();
    if (!cliente) {
        throw new Error("No se encontró el cliente.");
    }

    const pagoId = new mongoose.Types.ObjectId();
    const aplicacionesGuardadas = [];
    const deshacer = [];

    try {
        for (const item of aplicacionesProcesar) {
            const factura = await Factura.findOneAndUpdate(
                {
                    _id: item.factura_id,
                    cliente_id: clienteId,
                    status: "Vigente",
                    metodo_pago: "PPD",
                    saldo_pendiente: { $gte: item.importe - 0.00001 }
                },
                { $inc: { saldo_pendiente: -item.importe, total_pagado: item.importe } },
                { new: false }
            ).exec();

            if (!factura) {
                throw new Error("Una de las facturas no está disponible o su saldo es menor al importe a abonar.");
            }

            const saldoAnterior = r2(factura.saldo_pendiente);
            const saldoInsoluto = Math.max(0, r2(saldoAnterior - item.importe));
            
            // Si el usuario especificó parcialidad respetarla, si no, calcular max + 1
            let numParcialidad = item.num_parcialidad;
            if (!numParcialidad || numParcialidad <= 0) {
                const previas = Array.isArray(factura.parcialidades) ? factura.parcialidades : [];
                const maxNum = previas.reduce((max, p) => Math.max(max, Number(p.num_parcialidad) || 0), 0);
                numParcialidad = maxNum > 0 ? maxNum + 1 : (previas.length + 1);
            }

            deshacer.push(() => revertirAplicacion(factura._id, pagoId, item.importe));

            await Factura.updateOne(
                { _id: factura._id },
                {
                    $push: {
                        parcialidades: {
                            pago_id: pagoId,
                            num_parcialidad: numParcialidad,
                            importe: item.importe,
                            saldo_anterior: saldoAnterior,
                            saldo_insoluto: saldoInsoluto,
                            fecha: fechaPago
                        }
                    }
                }
            ).exec();

            await ajustarEstadoFactura(factura._id);

            aplicacionesGuardadas.push({
                factura_id: factura._id,
                uuid_factura: factura.uuid,
                serie: factura.serie || "",
                folio_factura: factura.folio || "",
                folio_pedido: factura.folio_pedido || 0,
                num_parcialidad: numParcialidad,
                saldo_anterior: saldoAnterior,
                importe_pagado: item.importe,
                saldo_insoluto: saldoInsoluto
            });
        }

        const montoTotal = r2(aplicacionesGuardadas.reduce((sum, a) => sum + a.importe_pagado, 0));
        const esSaldoAFavor = (datos.origen === "saldo_a_favor" || datos.usar_saldo_a_favor === true);

        if (esSaldoAFavor) {
            const saldoDisponible = r2((cliente && cliente.saldo_a_favor) || 0);
            if (saldoDisponible < montoTotal - 0.00001) {
                throw new Error("El cliente solo dispone de $" + saldoDisponible.toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " de saldo a favor. El abono solicitado es de $" + montoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 }));
            }
            const saldoNuevoCliente = Math.max(0, r2(saldoDisponible - montoTotal));
            await Cliente.updateOne({ _id: clienteId }, { $set: { saldo_a_favor: saldoNuevoCliente } }).exec();

            const descFacturas = aplicacionesGuardadas.map(function(a) { return (a.serie || "") + (a.folio_factura || ""); }).join(", ");
            const movSaldo = new MovimientoSaldoCliente({
                cliente_id: clienteId,
                tipo: "aplicacion",
                importe: -montoTotal,
                pago_id: pagoId,
                saldo_anterior: saldoDisponible,
                saldo_nuevo: saldoNuevoCliente,
                nota: "Aplicación de saldo a favor a facturas: " + descFacturas,
                fecha: fechaPago,
                usuario: usuarioDe(user)
            });
            await movSaldo.save();

            deshacer.push(async function() {
                await Cliente.updateOne({ _id: clienteId }, { $inc: { saldo_a_favor: montoTotal } }).exec();
                await MovimientoSaldoCliente.deleteOne({ _id: movSaldo._id }).exec();
            });
        }

        const folioBase = Number(await reservarFolioFiscal("PAGO"));

        const cuentaDestino = mongoose.Types.ObjectId.isValid(datos.cuenta_destino_id) ? datos.cuenta_destino_id : null;
        const ord = datos.cuenta_ordenante || {};

        const nuevoPago = new Pago({
            _id: pagoId,
            folio: folioBase,
            origen: esSaldoAFavor ? "saldo_a_favor" : "cobro",
            clave_idempotencia: claveIdem || undefined,
            cliente: {
                id: clienteId,
                nombre: cliente.nombre || "",
                rfc: (cliente.datos_fiscales && cliente.datos_fiscales.rfc) || cliente.rfc || ""
            },
            fecha_pago: fechaPago,
            forma_pago: String(datos.forma_pago),
            moneda: String(datos.moneda || "MXN"),
            tipo_cambio: Number(datos.tipo_cambio) || 1,
            monto_total: montoTotal,
            monto_aplicado: montoTotal,
            saldo_a_favor_generado: 0,
            excedente_disponible: 0,
            referencia: String(datos.referencia || "").slice(0, 100),
            notas: String(datos.notas || "").slice(0, 300),
            cuenta_destino_id: cuentaDestino,
            cuenta_ordenante: {
                banco: String(ord.banco || "").slice(0, 80),
                rfc_banco: String(ord.rfc_banco || "").slice(0, 13).toUpperCase(),
                numero_cuenta: String(ord.numero_cuenta || "").slice(0, 18)
            },
            aplicaciones: aplicacionesGuardadas,
            rep: {
                estado: "sin_timbrar",
                uuid: "",
                serie: "",
                folio: "",
                error: ""
            },
            status: "Registrado",
            usuario: usuarioDe(user)
        });

        await nuevoPago.save();
        return { pago: nuevoPago, repetido: false };
    } catch (err) {
        for (const paso of deshacer.reverse()) {
            try { await paso(); } catch (e) { console.error("Error al revertir una aplicación:", e); }
        }
        if (err && err.code === 11000 && claveIdem) {
            const existente = await Pago.findOne({ clave_idempotencia: claveIdem }).lean().exec();
            if (existente) return { pago: existente, repetido: true };
        }
        throw err;
    }
}

export async function cancelarPago(pagoId, user, motivo) {
    const pago = await Pago.findOne({
        _id: pagoId,
        status: "Registrado",
        "rep.estado": { $in: ["sin_timbrar", "fallido", "requiere_revision"] }
    }).exec();

    if (!pago) {
        throw new Error("El pago no existe, ya está cancelado o su REP ya fue timbrado.");
    }

    for (const aplicacion of (pago.aplicaciones || [])) {
        const factura = await Factura.findById(aplicacion.factura_id).select("parcialidades").lean().exec();
        const posteriores = factura && (factura.parcialidades || []).some(p => p.num_parcialidad > aplicacion.num_parcialidad);
        if (posteriores) {
            throw new Error(`La factura ${aplicacion.serie}${aplicacion.folio_factura} tiene parcialidades posteriores; cancela primero los pagos más recientes.`);
        }
    }

    const marcado = await Pago.updateOne(
        { _id: pago._id, status: "Registrado" },
        {
            $set: {
                status: "Cancelado",
                motivo_cancelacion: String(motivo || "").slice(0, 200),
                fecha_cancelacion: new Date()
            }
        }
    ).exec();

    if (marcado.nModified !== 1) {
        throw new Error("El pago ya fue cancelado.");
    }

    for (const aplicacion of (pago.aplicaciones || [])) {
        await revertirAplicacion(aplicacion.factura_id, pago._id, aplicacion.importe_pagado);
    }

    if (pago.origen === "saldo_a_favor" && pago.cliente && pago.cliente.id) {
        try {
            const clienteDoc = await Cliente.findById(pago.cliente.id).select("saldo_a_favor").exec();
            if (clienteDoc) {
                const sAnt = r2(clienteDoc.saldo_a_favor || 0);
                const sRevertido = r2(sAnt + pago.monto_total);
                await Cliente.updateOne({ _id: pago.cliente.id }, { $set: { saldo_a_favor: sRevertido } }).exec();

                const movReversa = new MovimientoSaldoCliente({
                    cliente_id: pago.cliente.id,
                    tipo: "reversa",
                    importe: pago.monto_total,
                    pago_id: pago._id,
                    saldo_anterior: sAnt,
                    saldo_nuevo: sRevertido,
                    nota: "Reversión por cancelación de cobro Folio #" + pago.folio,
                    fecha: new Date(),
                    usuario: usuarioDe(user)
                });
                await movReversa.save();
            }
        } catch (errRev) {
            console.error("Error al revertir saldo a favor en cancelación:", errRev);
        }
    }

    return pago;
}
