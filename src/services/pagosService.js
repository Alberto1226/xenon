import mongoose from "mongoose";
import { Cliente } from "../models/cliente";
import { Factura } from "../models/factura";
import { MovimientoSaldoCliente } from "../models/movimiento_saldo_cliente";
import { Pago } from "../models/pago";
import { reservarFolioFiscal } from "./folioFiscalService";

const FORMAS_PAGO_REP = new Set(["01", "02", "03", "04", "05", "06", "08", "12", "13", "14", "15", "17", "23", "24", "25", "26", "27", "28", "29", "30", "31"]);
const MARGEN = 0.004;

export function r2(valor) {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

function usuarioDe(user) {
    return { id: user._id, nombre: user.nombre || "" };
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

// Descuenta del saldo con una condición atómica; evita que dos cobros simultáneos sobrepasen el saldo.
async function aplicarAFactura(facturaId, clienteId, pagoId, importe) {
    const factura = await Factura.findOneAndUpdate(
        {
            _id: facturaId,
            cliente_id: clienteId,
            status: "Vigente",
            metodo_pago: "PPD",
            saldo_pendiente: { $gte: importe - 0.00001 }
        },
        { $inc: { saldo_pendiente: -importe, total_pagado: importe } },
        { new: true }
    ).exec();
    if (!factura) return null;
    const numParcialidad = (factura.parcialidades || []).length + 1;
    const saldoInsoluto = Math.max(0, r2(factura.saldo_pendiente));
    await Factura.updateOne({ _id: facturaId }, {
        $push: {
            parcialidades: {
                pago_id: pagoId,
                num_parcialidad: numParcialidad,
                importe,
                saldo_anterior: r2(saldoInsoluto + importe),
                saldo_insoluto: saldoInsoluto,
                fecha: new Date()
            }
        }
    }).exec();
    await ajustarEstadoFactura(facturaId);
    return {
        factura_id: factura._id,
        uuid_factura: factura.uuid,
        serie: factura.serie || "",
        folio_factura: factura.folio || "",
        folio_pedido: factura.folio_pedido || 0,
        num_parcialidad: numParcialidad,
        saldo_anterior: r2(saldoInsoluto + importe),
        importe_pagado: importe,
        saldo_insoluto: saldoInsoluto
    };
}

export async function revertirAplicacion(facturaId, pagoId, importe) {
    await Factura.updateOne(
        { _id: facturaId },
        { $inc: { saldo_pendiente: importe, total_pagado: -importe }, $pull: { parcialidades: { pago_id: pagoId } } }
    ).exec();
    await ajustarEstadoFactura(facturaId);
}

export async function registrarPago(datos, user) {
    const clienteId = datos.cliente_id;
    if (!mongoose.Types.ObjectId.isValid(clienteId)) {
        throw new Error("Selecciona un cliente.");
    }
    if (!FORMAS_PAGO_REP.has(String(datos.forma_pago))) {
        throw new Error("Selecciona una forma de pago válida.");
    }
    const fechaPago = new Date(datos.fecha_pago);
    if (isNaN(fechaPago.getTime()) || fechaPago.getTime() > Date.now() + 86400000) {
        throw new Error("La fecha de pago no es válida.");
    }
    const monto = r2(datos.monto);
    if (!(monto >= 0)) {
        throw new Error("El monto recibido no es válido.");
    }
    const claveIdem = String(datos.clave_idempotencia || "").slice(0, 80);
    if (claveIdem) {
        const existente = await Pago.findOne({ clave_idempotencia: claveIdem }).lean().exec();
        if (existente) return { pago: existente, repetido: true };
    }

    const lineas = Array.isArray(datos.aplicaciones) ? datos.aplicaciones : [];
    if (lineas.length === 0) {
        throw new Error("Selecciona al menos una factura.");
    }
    const vistas = new Set();
    const aplicaciones = lineas.map(linea => {
        const importe = r2(linea.importe);
        if (!mongoose.Types.ObjectId.isValid(linea.factura_id) || vistas.has(String(linea.factura_id)) || !(importe > 0)) {
            throw new Error("Las facturas o importes seleccionados no son válidos.");
        }
        vistas.add(String(linea.factura_id));
        return { factura_id: linea.factura_id, importe };
    });
    const totalAplicar = r2(aplicaciones.reduce((suma, linea) => suma + linea.importe, 0));

    const cliente = await Cliente.findById(clienteId).select("nombre rfc saldo_a_favor datos_fiscales").lean().exec();
    if (!cliente) {
        throw new Error("No se encontró el cliente.");
    }

    // Fuentes de saldo a favor (FIFO): cada una se aplica como un pago hijo con su propia fecha y forma de pago.
    let fuentes = [];
    if (datos.usar_saldo === true) {
        fuentes = await Pago.find({ "cliente.id": clienteId, status: "Registrado", excedente_disponible: { $gt: MARGEN } })
            .sort({ fecha_pago: 1, _id: 1 })
            .lean()
            .exec();
    }
    let porCubrirConSaldo = Math.min(totalAplicar, r2(fuentes.reduce((s, f) => s + f.excedente_disponible, 0)));
    const efectivoNecesario = r2(totalAplicar - porCubrirConSaldo);
    if (monto + 0.00001 < efectivoNecesario) {
        throw new Error(`El monto recibido (${monto.toFixed(2)}) no cubre lo aplicado (${efectivoNecesario.toFixed(2)}).`);
    }
    const excedente = r2(monto - efectivoNecesario);

    const cuentaDestino = mongoose.Types.ObjectId.isValid(datos.cuenta_destino_id) ? datos.cuenta_destino_id : null;
    const ord = datos.cuenta_ordenante || {};
    const base = {
        cliente: { id: clienteId, nombre: cliente.nombre || "", rfc: (cliente.datos_fiscales && cliente.datos_fiscales.rfc) || cliente.rfc || "" },
        fecha_pago: fechaPago,
        forma_pago: String(datos.forma_pago),
        moneda: "MXN",
        referencia: String(datos.referencia || "").slice(0, 100),
        notas: String(datos.notas || "").slice(0, 300),
        cuenta_destino_id: cuentaDestino,
        cuenta_ordenante: {
            banco: String(ord.banco || "").slice(0, 80),
            rfc_banco: String(ord.rfc_banco || "").toUpperCase().slice(0, 13),
            numero_cuenta: String(ord.numero_cuenta || "").replace(/\s/g, "").slice(0, 18)
        },
        usuario: usuarioDe(user)
    };

    const pagoEfectivoId = new mongoose.Types.ObjectId();
    // Orden de consumo: saldo a favor primero, efectivo después.
    const pendientes = aplicaciones.map(linea => ({ ...linea, restante: linea.importe }));
    const pagosAGuardar = new Map();
    const deshacer = [];
    const movimientos = [];

    try {
        const bolsas = [];
        let porConsumir = porCubrirConSaldo;
        for (const fuente of fuentes) {
            if (porConsumir < MARGEN) break;
            const uso = r2(Math.min(fuente.excedente_disponible, porConsumir));
            const reservado = await Pago.updateOne(
                { _id: fuente._id, status: "Registrado", excedente_disponible: { $gte: uso - 0.00001 } },
                { $inc: { excedente_disponible: -uso } }
            ).exec();
            if (reservado.nModified !== 1) {
                throw new Error("El saldo a favor cambió mientras se registraba el pago. Inténtalo de nuevo.");
            }
            deshacer.push(() => Pago.updateOne({ _id: fuente._id }, { $inc: { excedente_disponible: uso } }).exec());
            const hijoId = new mongoose.Types.ObjectId();
            pagosAGuardar.set(String(hijoId), {
                ...base,
                _id: hijoId,
                origen: "saldo_a_favor",
                pago_origen_id: fuente._id,
                fecha_pago: fuente.fecha_pago,
                forma_pago: fuente.forma_pago,
                referencia: fuente.referencia || "",
                cuenta_destino_id: fuente.cuenta_destino_id || null,
                cuenta_ordenante: fuente.cuenta_ordenante || base.cuenta_ordenante,
                monto_total: uso,
                monto_aplicado: uso,
                aplicaciones: []
            });
            bolsas.push({ pagoId: hijoId, disponible: uso });
            movimientos.push({ tipo: "aplicacion", importe: -uso, pago_id: hijoId, nota: `Aplicación de saldo a favor del cobro ${fuente.folio || ""}` });
            porConsumir = r2(porConsumir - uso);
        }
        bolsas.push({ pagoId: pagoEfectivoId, disponible: efectivoNecesario });
        pagosAGuardar.set(String(pagoEfectivoId), {
            ...base,
            _id: pagoEfectivoId,
            origen: "cobro",
            clave_idempotencia: claveIdem || undefined,
            monto_total: monto,
            monto_aplicado: efectivoNecesario,
            saldo_a_favor_generado: excedente,
            excedente_disponible: excedente,
            aplicaciones: []
        });

        for (const linea of pendientes) {
            for (const bolsa of bolsas) {
                if (linea.restante < MARGEN) break;
                if (bolsa.disponible < MARGEN) continue;
                const importe = r2(Math.min(linea.restante, bolsa.disponible));
                const aplicada = await aplicarAFactura(linea.factura_id, clienteId, bolsa.pagoId, importe);
                if (!aplicada) {
                    throw new Error("Una factura ya no está disponible o su saldo es menor al importe indicado. Actualiza e inténtalo de nuevo.");
                }
                deshacer.push(() => revertirAplicacion(linea.factura_id, bolsa.pagoId, importe));
                pagosAGuardar.get(String(bolsa.pagoId)).aplicaciones.push(aplicada);
                linea.restante = r2(linea.restante - importe);
                bolsa.disponible = r2(bolsa.disponible - importe);
            }
        }

        const folioBase = Number(await reservarFolioFiscal("PAGO"));
        let indice = 0;
        const guardados = [];
        for (const datosPago of pagosAGuardar.values()) {
            datosPago.folio = folioBase * 100 + indice;
            indice++;
            if (datosPago.aplicaciones.length === 0 && datosPago.excedente_disponible <= 0) continue;
            const pago = new Pago(datosPago);
            await pago.save();
            guardados.push(pago);
            deshacer.push(() => Pago.deleteOne({ _id: pago._id }).exec());
        }

        const saldoNeto = r2(excedente - (porCubrirConSaldo));
        if (excedente > 0) {
            movimientos.push({ tipo: "abono_excedente", importe: excedente, pago_id: pagoEfectivoId, nota: "Excedente de pago" });
        }
        if (Math.abs(saldoNeto) > 0) {
            await Cliente.updateOne({ _id: clienteId }, { $inc: { saldo_a_favor: saldoNeto } }).exec();
            deshacer.push(() => Cliente.updateOne({ _id: clienteId }, { $inc: { saldo_a_favor: -saldoNeto } }).exec());
        }
        if (movimientos.length > 0) {
            await MovimientoSaldoCliente.insertMany(movimientos.map(mov => ({ ...mov, cliente_id: clienteId, fecha: new Date(), usuario: usuarioDe(user) })));
        }

        return { pago: guardados.find(p => String(p._id) === String(pagoEfectivoId)) || guardados[0], pagos: guardados, repetido: false };
    } catch (err) {
        for (const paso of deshacer.reverse()) {
            try { await paso(); } catch (e) { console.error("Error al revertir un pago:", e); }
        }
        if (err && err.code === 11000 && claveIdem) {
            const existente = await Pago.findOne({ clave_idempotencia: claveIdem }).lean().exec();
            if (existente) return { pago: existente, repetido: true };
        }
        throw err;
    }
}

export async function cancelarPago(pagoId, user, motivo) {
    const pago = await Pago.findOne({ _id: pagoId, status: "Registrado", "rep.estado": { $in: ["sin_timbrar", "fallido"] } }).exec();
    if (!pago) {
        throw new Error("El pago no existe, ya está cancelado o su REP ya fue timbrado o está en revisión.");
    }
    if (pago.origen === "cobro" && pago.saldo_a_favor_generado > 0 && r2(pago.excedente_disponible) + 0.00001 < pago.saldo_a_favor_generado) {
        throw new Error("El saldo a favor generado por este pago ya se aplicó en otros pagos. Cancela primero esos pagos.");
    }
    for (const aplicacion of pago.aplicaciones) {
        const factura = await Factura.findById(aplicacion.factura_id).select("parcialidades").lean().exec();
        const posteriores = factura && (factura.parcialidades || []).some(p => p.num_parcialidad > aplicacion.num_parcialidad);
        if (posteriores) {
            throw new Error(`La factura ${aplicacion.serie}${aplicacion.folio_factura} tiene parcialidades posteriores; cancela primero los pagos más recientes.`);
        }
    }

    // Se marca primero para que un doble clic no revierta dos veces.
    const marcado = await Pago.updateOne(
        { _id: pago._id, status: "Registrado" },
        { $set: { status: "Cancelado", motivo_cancelacion: String(motivo || "").slice(0, 200), fecha_cancelacion: new Date() } }
    ).exec();
    if (marcado.nModified !== 1) {
        throw new Error("El pago ya fue cancelado.");
    }

    for (const aplicacion of pago.aplicaciones) {
        await revertirAplicacion(aplicacion.factura_id, pago._id, aplicacion.importe_pagado);
    }

    const movimiento = (tipo, importe, nota) => MovimientoSaldoCliente.create({
        cliente_id: pago.cliente.id, tipo, importe, pago_id: pago._id, nota, usuario: usuarioDe(user)
    });
    if (pago.origen === "saldo_a_favor") {
        await Pago.updateOne({ _id: pago.pago_origen_id }, { $inc: { excedente_disponible: pago.monto_total } }).exec();
        await Cliente.updateOne({ _id: pago.cliente.id }, { $inc: { saldo_a_favor: pago.monto_total } }).exec();
        await movimiento("reversa", pago.monto_total, "Cancelación de aplicación de saldo a favor");
    } else if (pago.saldo_a_favor_generado > 0) {
        await Pago.updateOne({ _id: pago._id }, { $set: { excedente_disponible: 0 } }).exec();
        await Cliente.updateOne({ _id: pago.cliente.id }, { $inc: { saldo_a_favor: -pago.saldo_a_favor_generado } }).exec();
        await movimiento("reversa", -pago.saldo_a_favor_generado, "Cancelación del pago que generó el excedente");
    }
    return pago;
}
