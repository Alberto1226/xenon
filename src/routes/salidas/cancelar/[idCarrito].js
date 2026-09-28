import { Carrito } from "../../../models/carrito";

export async function post(req, res) {
    try {
        const { idCarrito } = req.params;
        await Carrito.findByIdAndUpdate(idCarrito, { status: 'Cancelado' });

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, mensaje: "Carrito cancelado correctamente" }));
    } catch (err) {
        console.error("Error en POST /salidas/cancelar/:idCarrito:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, mensaje: err.message }));
    }
}
