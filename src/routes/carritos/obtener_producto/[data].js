import { Producto } from "../../../models/producto";

export async function get(req, res) {
    try {
        const { data } = req.params;
        let regex = new RegExp(data, "i");

        let productos = await Producto.find({
            $or: [
                { nombre: regex },
                { codigo: regex }
            ]
        }).limit(20).lean();

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, productos }));
    } catch (err) {
        console.error("Error en GET /carritos/obtener_producto/:data:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, productos: [] }));
    }
}
