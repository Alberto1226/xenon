import { Cliente } from "../../../../models/cliente";
import { autorizar } from "../pagos/_autorizar";

function escaparRegex(texto) {
    return texto.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}

export async function post(req, res, next) {
    if (!autorizar(req, res)) return;

    try {
        const buscar = String(req.body.buscar || "").trim().slice(0, 80);
        let filtro = { activo: true };

        if (buscar) {
            const rx = { $regex: escaparRegex(buscar), $options: "i" };
            filtro["$or"] = [
                { nombre: rx },
                { rfc: rx },
                { "datos_fiscales.razon_social": rx },
                { "datos_fiscales.rfc": rx }
            ];
        }

        const lista = await Cliente.find(filtro)
            .select("nombre rfc datos_fiscales saldo_a_favor")
            .sort({ nombre: 1 })
            .limit(30)
            .lean()
            .exec();

        res.send({
            ok: true,
            clientes: (lista || []).map(function(c) {
                var rfcFiscal = (c.datos_fiscales && c.datos_fiscales.rfc) || c.rfc || "";
                var razonSocial = (c.datos_fiscales && c.datos_fiscales.razon_social) || c.nombre || "";
                return {
                    _id: c._id,
                    nombre: c.nombre || razonSocial,
                    rfc: rfcFiscal,
                    razon_social: razonSocial,
                    saldo_a_favor: Math.round(((c.saldo_a_favor || 0) + Number.EPSILON) * 100) / 100
                };
            })
        });
    } catch (err) {
        console.error("Error al buscar clientes para abono:", err);
        res.send({ ok: false, mensaje: "Error al buscar clientes." });
    }
}
