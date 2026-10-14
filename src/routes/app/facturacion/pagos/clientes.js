import { Factura } from "../../../../models/factura";
import { Cliente } from "../../../../models/cliente";
import { autorizar } from "./_autorizar";

function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Clientes con facturas PPD vigentes y saldo pendiente, más su saldo a favor.
export async function post(req, res, next) {
    if (!autorizar(req, res)) return;
    try {
        const buscar = String(req.body.buscar || "").trim().slice(0, 80);
        const filtro = { status: "Vigente", metodo_pago: "PPD", saldo_pendiente: { $gt: 0.004 }, cliente_id: { $ne: null } };
        if (buscar) {
            filtro["receptor.nombre"] = { $regex: escaparRegex(buscar), $options: "i" };
        }
        const grupos = await Factura.aggregate([
            { $match: filtro },
            { $group: { _id: "$cliente_id", nombre: { $first: "$receptor.nombre" }, rfc: { $first: "$receptor.rfc" }, facturas: { $sum: 1 }, saldo: { $sum: "$saldo_pendiente" } } },
            { $sort: { nombre: 1 } },
            { $limit: 50 }
        ]).exec();
        const saldos = await Cliente.find({ _id: { $in: grupos.map(g => g._id) } }).select("saldo_a_favor").lean().exec();
        const porId = new Map(saldos.map(c => [String(c._id), c.saldo_a_favor || 0]));
        res.send({ ok: true, clientes: grupos.map(g => ({ ...g, saldo_a_favor: porId.get(String(g._id)) || 0 })) });
    } catch (err) {
        console.error(err);
        res.send({ ok: false, mensaje: "No se pudieron consultar los clientes." });
    }
}
