import { post as administrarRutaPost } from "../../app/pedidos/nuevo/administracion_carrito_ruta";

export async function post(req, res, next) {
    try {
        await administrarRutaPost(req, res, next);
    } catch (err) {
        console.error("Error en POST /carritos/administrar_producto:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, mensaje: err.message }));
    }
}
