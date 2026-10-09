import { Factura } from "../../../models/factura";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const facturas = await Factura.find({})
            .select("uuid serie folio pedido_id receptor subtotal impuestos total moneda metodo_pago forma_pago status fecha_emision")
            .sort({ fecha_emision: -1 })
            .limit(200)
            .lean()
            .exec();
        return res.send({ ok: true, facturas });
    } catch (err) {
        console.error("Error al consultar facturas emitidas:", err);
        return res.send({ ok: false, mensaje: "No se pudieron consultar las facturas emitidas." });
    }
}
