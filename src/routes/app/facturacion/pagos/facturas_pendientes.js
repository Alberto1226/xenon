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
            Factura.find({
                cliente_id: req.body.cliente_id,
                status: "Vigente",
                metodo_pago: "PPD",
                saldo_pendiente: { $gt: 0.004 }
            })
                .select("uuid serie folio folio_pedido subtotal impuestos total saldo_pendiente total_pagado status_pago fecha_emision fecha_limite traslados retenciones parcialidades moneda receptor")
                .sort({ fecha_emision: 1 })
                .lean()
                .exec(),
            Cliente.findById(req.body.cliente_id).select("saldo_a_favor nombre rfc datos_fiscales").lean().exec(),
            CuentaBancaria.find({ activa: true }).sort({ banco: 1 }).lean().exec()
        ]);

        const facturasProcesadas = (facturas || []).map(f => {
            const parcialidades = Array.isArray(f.parcialidades) ? f.parcialidades : [];
            const maxParcialidad = parcialidades.reduce((max, p) => Math.max(max, Number(p.num_parcialidad) || 0), 0);
            const parcialidad_siguiente = maxParcialidad > 0 ? maxParcialidad + 1 : (parcialidades.length + 1);

            let traslados = Array.isArray(f.traslados) && f.traslados.length > 0 ? f.traslados : [];
            const total = Number(f.total) || 0;
            const subtotal = Number(f.subtotal) || 0;
            const impuestos = Number(f.impuestos) || 0;

            if (traslados.length === 0 && total > subtotal) {
                const base = subtotal > 0 ? subtotal : Math.round((total / 1.16) * 100) / 100;
                const importe = impuestos > 0 ? impuestos : Math.round((total - base) * 100) / 100;
                traslados = [{
                    impuesto: "002",
                    factor: "Tasa",
                    tasa: 0.16,
                    base,
                    importe
                }];
            }

            return {
                ...f,
                parcialidad_siguiente,
                traslados,
                objeto_impuesto: traslados.length > 0 ? "02" : "01"
            };
        });

        res.send({
            ok: true,
            facturas: facturasProcesadas,
            cliente,
            saldo_a_favor: (cliente && cliente.saldo_a_favor) || 0,
            cuentas
        });
    } catch (err) {
        console.error("Error al consultar facturas pendientes:", err);
        res.send({ ok: false, mensaje: "No se pudieron consultar las facturas." });
    }
}
