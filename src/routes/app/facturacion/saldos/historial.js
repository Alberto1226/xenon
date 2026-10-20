import mongoose from "mongoose";
import { Cliente } from "../../../../models/cliente";
import { CuentaBancaria } from "../../../../models/cuenta_bancaria";
import { MovimientoSaldoCliente } from "../../../../models/movimiento_saldo_cliente";
import { Pago } from "../../../../models/pago";
import { autorizar } from "../pagos/_autorizar";

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;

    try {
        const clienteId = req.body.cliente_id;
        if (!mongoose.Types.ObjectId.isValid(clienteId)) {
            return res.send({ ok: false, mensaje: "Cliente no válido." });
        }

        const cliente = await Cliente.findById(clienteId)
            .select("nombre rfc datos_fiscales saldo_a_favor")
            .lean()
            .exec();

        if (!cliente) {
            return res.send({ ok: false, mensaje: "No se encontró el cliente." });
        }

        const movimientos = await MovimientoSaldoCliente.find({ cliente_id: clienteId })
            .sort({ fecha: -1, _id: -1 })
            .limit(100)
            .populate("cuenta_destino_id", "banco numero_cuenta clabe")
            .populate("pago_id", "folio rep aplicaciones fecha_pago")
            .lean()
            .exec();

        const movsFormateados = (movimientos || []).map(function(m) {
            var pago = m.pago_id;
            var repInfo = null;
            var facturasAbonadas = [];
            if (pago) {
                repInfo = {
                    folio: pago.folio,
                    estado: (pago.rep && pago.rep.estado) || "sin_timbrar",
                    serie: (pago.rep && pago.rep.serie) || "",
                    folio_rep: (pago.rep && pago.rep.folio) || "",
                    uuid: (pago.rep && pago.rep.uuid) || ""
                };
                if (Array.isArray(pago.aplicaciones)) {
                    facturasAbonadas = pago.aplicaciones.map(function(a) {
                        return {
                            serie: a.serie || "",
                            folio: a.folio_factura || "",
                            importe: a.importe_pagado || 0
                        };
                    });
                }
            }

            var cuenta = m.cuenta_destino_id;
            var cuentaInfo = null;
            if (cuenta) {
                cuentaInfo = {
                    banco: cuenta.banco || "",
                    numero_cuenta: cuenta.numero_cuenta || "",
                    clabe: cuenta.clabe || ""
                };
            }

            return {
                _id: m._id,
                tipo: m.tipo,
                importe: Math.round(((m.importe || 0) + Number.EPSILON) * 100) / 100,
                saldo_anterior: Math.round(((m.saldo_anterior || 0) + Number.EPSILON) * 100) / 100,
                saldo_nuevo: Math.round(((m.saldo_nuevo || 0) + Number.EPSILON) * 100) / 100,
                forma_pago: m.forma_pago || "03",
                referencia: m.referencia || "",
                nota: m.nota || "",
                fecha: m.fecha,
                usuario: (m.usuario && m.usuario.nombre) || "",
                cuenta_destino: cuentaInfo,
                pago: repInfo,
                facturas: facturasAbonadas
            };
        });

        res.send({
            ok: true,
            cliente: {
                _id: cliente._id,
                nombre: cliente.nombre,
                rfc: (cliente.datos_fiscales && cliente.datos_fiscales.rfc) || cliente.rfc || "",
                saldo_a_favor: Math.round(((cliente.saldo_a_favor || 0) + Number.EPSILON) * 100) / 100
            },
            movimientos: movsFormateados
        });
    } catch (err) {
        console.error("Error al consultar historial de saldos:", err);
        res.send({ ok: false, mensaje: "Error al consultar el historial del cliente." });
    }
}
