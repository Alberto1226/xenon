import { Carrito } from "../../../models/carrito";
import { generar_siguiente_folio } from "../../app/pedidos/_servicios/folio_service";

export async function post(req, res) {
    try {
        const body = req.body || {};
        let resFolio = await generar_siguiente_folio();
        let folio = resFolio.ok ? resFolio.folio : Math.floor(Math.random() * 10000);

        let doc_nuevo = {
            folio,
            moneda: 'Pesos Mexicanos',
            tipo_de_cambio: 1,
            lista: body.lista || [],
            fecha: new Date(),
            usuario_que_registro: body.usuario || { nombre: "App Móvil" },
            agente: body.agente || { nombre: "" },
            cliente: body.cliente || { nombre: "Cliente Móvil" },
            status: "Pedido",
            rutas: true
        };

        let nuevo_carrito = new Carrito(doc_nuevo);
        let resultado = await nuevo_carrito.save();

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
            ok: true,
            carrito_creado: { doc_nuevo: resultado }
        }));
    } catch (err) {
        console.error("Error en POST /carritos/crear_pedido:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, mensaje: err.message }));
    }
}
