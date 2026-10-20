import { Cliente } from "../../../../models/cliente";
import { MovimientoSaldoCliente } from "../../../../models/movimiento_saldo_cliente";
import { autorizar } from "../pagos/_autorizar";

function escaparRegex(texto) {
    return texto.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;

    try {
        const buscar = String(req.body.buscar || "").trim().slice(0, 80);
        const soloConSaldo = req.body.solo_con_saldo !== false;

        let filtro = { activo: true };
        if (soloConSaldo) {
            filtro.saldo_a_favor = { $gt: 0.004 };
        }
        if (buscar) {
            filtro["$or"] = [
                { nombre: { $regex: escaparRegex(buscar), $options: "i" } },
                { rfc: { $regex: escaparRegex(buscar), $options: "i" } },
                { "datos_fiscales.razon_social": { $regex: escaparRegex(buscar), $options: "i" } },
                { "datos_fiscales.rfc": { $regex: escaparRegex(buscar), $options: "i" } }
            ];
        }

        const clientes = await Cliente.find(filtro)
            .select("nombre rfc datos_fiscales saldo_a_favor fecha_creacion")
            .sort({ saldo_a_favor: -1, nombre: 1 })
            .limit(100)
            .lean()
            .exec();

        // Resumen global
        const resumenAgg = await Cliente.aggregate([
            { $match: { activo: true, saldo_a_favor: { $gt: 0.004 } } },
            { $group: { _id: null, total_saldo: { $sum: "$saldo_a_favor" }, total_clientes: { $sum: 1 } } }
        ]).exec();

        const resumen = (resumenAgg && resumenAgg[0]) ? resumenAgg[0] : { total_saldo: 0, total_clientes: 0 };

        res.send({
            ok: true,
            clientes: (clientes || []).map(function(c) {
                var rfcFiscal = (c.datos_fiscales && c.datos_fiscales.rfc) || c.rfc || "";
                var razonSocial = (c.datos_fiscales && c.datos_fiscales.razon_social) || c.nombre || "";
                return {
                    _id: c._id,
                    nombre: c.nombre || razonSocial,
                    rfc: rfcFiscal,
                    razon_social: razonSocial,
                    saldo_a_favor: Math.round(((c.saldo_a_favor || 0) + Number.EPSILON) * 100) / 100
                };
            }),
            metricas: {
                total_saldo: Math.round(((resumen.total_saldo || 0) + Number.EPSILON) * 100) / 100,
                total_clientes: resumen.total_clientes || 0
            }
        });
    } catch (err) {
        console.error("Error al listar saldos a favor:", err);
        res.send({ ok: false, mensaje: "Error al consultar los saldos de clientes." });
    }
}
