import { Pedido } from "../../../models/pedido";
import * as accesos from "../accesos";

const POR_PAGINA = 15;

function escaparRegex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const buscar = String(req.body.buscar || "").trim().slice(0, 80);
        const pagina = Math.max(1, Math.floor(Number(req.body.pagina)) || 1);

        const filtro = {
            status: { $in: ["Enviado", "Entregado"] },
            "facturacion.0": { $exists: false },
            "preparacion_factura.estado": { $nin: ["emitiendo", "emitida", "requiere_revision"] }
        };
        if (buscar) {
            const condiciones = [{ "cliente.nombre": { $regex: escaparRegex(buscar), $options: "i" } }];
            if (/^\d+$/.test(buscar)) {
                condiciones.push({ folio: Number(buscar) });
            }
            filtro.$or = condiciones;
        }

        const total = await Pedido.countDocuments(filtro).exec();
        const pedidos = await Pedido.find(filtro)
            .select("folio cliente.nombre total_pedido moneda status fecha_entregado preparacion_factura.estado preparacion_factura.tipo")
            .sort({ folio: -1 })
            .skip((pagina - 1) * POR_PAGINA)
            .limit(POR_PAGINA)
            .lean()
            .exec();

        res.send({
            ok: true,
            pedidos,
            total,
            paginas: Math.max(1, Math.ceil(total / POR_PAGINA))
        });
    } catch (err) {
        console.log(err);
        res.send({ ok: false, mensaje: "No se pudieron consultar los pedidos." });
    }
}
