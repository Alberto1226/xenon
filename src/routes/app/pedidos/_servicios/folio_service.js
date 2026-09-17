import { Folio } from "../../../../models/folio";
import { FolioConfig } from "../../../../models/folio_config";
import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";

/**
 * Obtiene el siguiente folio único de forma atómica usando Mongoose findOneAndUpdate + $inc.
 * Previene condiciones de carrera cuando múltiples usuarios crean pedidos simultáneamente.
 */
export async function generar_siguiente_folio({ serie = "A", carrito_id = null } = {}) {
    try {
        // Asegurar que FolioConfig tenga una semilla basada en el folio máximo histórico si es primera vez
        let config = await FolioConfig.findOne({ serie });
        if (!config) {
            const max_carrito = await Carrito.findOne({}).sort({ folio: -1 }).lean();
            const max_pedido = await Pedido.findOne({}).sort({ folio: -1 }).lean();
            const folio_max_carrito = max_carrito ? parseInt(max_carrito.folio) || 0 : 0;
            const folio_max_pedido = max_pedido ? parseInt(max_pedido.folio) || 0 : 0;
            const folio_inicial = Math.max(folio_max_carrito, folio_max_pedido) + 1;

            config = await FolioConfig.findOneAndUpdate(
                { serie },
                { $setOnInsert: { folio_siguiente: folio_inicial } },
                { upsert: true, new: true }
            );
        }

        // Incremento atómico
        const config_actualizada = await FolioConfig.findOneAndUpdate(
            { serie },
            { $inc: { folio_siguiente: 1 } },
            { new: false } // Retorna el valor previo a incrementar (que será el folio asignado)
        );

        const folio_asignado = config_actualizada.folio_siguiente;

        // Registrar en historial de folios
        let registro_folio = new Folio({
            folio: folio_asignado,
            serie: serie,
            tipo: 'carrito',
            carrito_id: carrito_id,
            fecha: new Date()
        });
        await registro_folio.save();

        return { ok: true, folio: folio_asignado, serie };
    } catch (err) {
        console.error("Error en generar_siguiente_folio:", err);
        return { ok: false, err, mensaje: "No se pudo generar el folio único" };
    }
}

/**
 * Vincula un folio a su nueva entidad cuando pasa a Pedido (entregado) o a Carrito_cancelado.
 */
export async function vincular_folio_a_estado(folio, { tipo, id_destino, serie = "A" }) {
    try {
        let update = { tipo };
        if (tipo === 'pedido') update.pedido_id = id_destino;
        if (tipo === 'cancelado') update.carrito_cancelado_id = id_destino;

        await Folio.findOneAndUpdate({ folio, serie }, { $set: update }, { upsert: true });
        return { ok: true };
    } catch (err) {
        console.error("Error en vincular_folio_a_estado:", err);
        return { ok: false, err };
    }
}

/**
 * Permite establecer manualmente el folio inicial (ej. en migración a producción).
 */
export async function establecer_folio_comienzo(folio_inicial, serie = "A") {
    try {
        await FolioConfig.findOneAndUpdate(
            { serie },
            { $set: { folio_siguiente: parseInt(folio_inicial) } },
            { upsert: true, new: true }
        );
        return { ok: true };
    } catch (err) {
        console.error("Error en establecer_folio_comienzo:", err);
        return { ok: false, err };
    }
}
