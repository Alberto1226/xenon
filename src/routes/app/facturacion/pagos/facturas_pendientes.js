import mongoose from "mongoose";
import { Cliente } from "../../../../models/cliente";
import { CuentaBancaria } from "../../../../models/cuenta_bancaria";
import { Factura } from "../../../../models/factura";
import { autorizar } from "./_autorizar";

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    try {
        if (!mongoose.Types.ObjectId.isValid(req.body.cliente_id)) {
            return res.send({ ok: false, mensaje: "Cliente no válido." });
        }
        const [facturas, cliente, cuentas] = await Promise.all([
            Factura.find({ cliente_id: req.body.cliente_id, status: "Vigente", metodo_pago: "PPD", saldo_pendiente: { $gt: 0.004 } })
                .select("uuid serie folio folio_pedido total saldo_pendiente total_pagado status_pago fecha_emision fecha_limite")
                .sort({ fecha_emision: 1 })
                .lean().exec(),
            Cliente.findById(req.body.cliente_id).select("saldo_a_favor nombre").lean().exec(),
            CuentaBancaria.find({ activa: true }).sort({ banco: 1 }).lean().exec()
        ]);
        res.send({ ok: true, facturas, saldo_a_favor: (cliente && cliente.saldo_a_favor) || 0, cuentas });
    } catch (err) {
        console.error(err);
        res.send({ ok: false, mensaje: "No se pudieron consultar las facturas." });
    }
}
