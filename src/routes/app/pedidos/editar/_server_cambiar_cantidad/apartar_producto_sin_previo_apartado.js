/**
 * Agrega un apartado de inventario al array `producto.carritos` para un producto específico.
 * Se usa cuando el producto NO tiene una reserva previa en el pedido (primera vez).
 *
 * PROBLEMA ORIGINAL:
 * La versión anterior guardaba `carrito_id` como String:
 *   `carrito_id: carrito_id ? String(carrito_id) : undefined`
 *
 * Esto causaba que los `$pull` de `liberar_apartados_de_carrito` y
 * `descontar_fisico_inventario` (que buscan por ObjectId primero) no encontraran
 * estas reservas, dejándolas como huérfanas al cancelar o finalizar el pedido.
 *
 * CORRECCIÓN:
 * Ahora se usa `asegurarObjectId()` para guardar `carrito_id` como ObjectId cuando
 * es posible, con fallback a String si no es un ObjectId válido. Igualmente,
 * `folio` se guarda como Number (parseInt) y `cliente.id` como ObjectId cuando posible.
 * Esto asegura que los futuros $pull por ObjectId sí encuentren la reserva.
 *
 * @param {Object|string} id_producto_o_doc - Documento de producto o su _id.
 * @param {number} cantidad - Cantidad a apartar.
 * @param {Object} cliente_como_en_carrito - Objeto cliente del carrito (id, nombre, correo).
 * @param {number|string} folio - Folio del pedido.
 * @param {string|ObjectId|null} carrito_id - ID del carrito al que pertenece la reserva.
 */
import { devolver_producto_db } from './devolver_producto_db';
import { asegurarObjectId } from '../../_servicios/inventario_reserva_service';

export async function apartar_producto_sin_previo_apartado(id_producto_o_doc, cantidad, cliente_como_en_carrito, folio, carrito_id = null) {
    try {
        const id_prod = (id_producto_o_doc && id_producto_o_doc._id) ? id_producto_o_doc._id : id_producto_o_doc;
        const producto_proc = await devolver_producto_db(id_prod);
        if (producto_proc.ok === false) {
            return { ok: false };
        }
        const producto = producto_proc.producto;
        const lista_original_carritos = JSON.parse(JSON.stringify(producto.carritos || []));
        let lista_modificada_carritos = JSON.parse(JSON.stringify(lista_original_carritos));
        
        const c_id = cliente_como_en_carrito ? (cliente_como_en_carrito.id || cliente_como_en_carrito._id || '') : '';
        const cid_obj = asegurarObjectId(c_id);       // ObjectId del cliente (nuevo estándar)
        const carrid_obj = asegurarObjectId(carrito_id); // ObjectId del carrito (nuevo estándar)
        const folio_num = folio != null ? (parseInt(folio) || folio) : undefined; // Number (nuevo estándar)

        lista_modificada_carritos.push({
            // carrito_id: preferir ObjectId, fallback a String si no es válido como ObjectId
            // ANTES era: carrito_id ? String(carrito_id) : undefined  ← causaba huérfanos
            carrito_id: carrid_obj || (carrito_id ? String(carrito_id) : undefined),
            cliente_id: String(c_id),
            cantidad: parseInt(cantidad) || 0,
            folio: folio_num, // Number cuando posible (antes no se guardaba o era String)
            fecha: new Date(),
            cliente: {
                // cliente.id: preferir ObjectId, fallback a String
                id: cid_obj || String(c_id),
                nombre: cliente_como_en_carrito ? cliente_como_en_carrito.nombre : '',
                correo: cliente_como_en_carrito ? cliente_como_en_carrito.correo : ''
            }
        });

        producto.carritos = lista_modificada_carritos;
        producto.markModified('carritos');
        return producto.save()
        .then((ress) => {
            return { ok: true };
        });
        
    } catch (err) {
        return { err, ok: false };
    }
}