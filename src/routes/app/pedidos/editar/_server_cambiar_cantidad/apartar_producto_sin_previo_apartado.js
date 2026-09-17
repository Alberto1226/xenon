//      Borra lo apartado dentor del modelo de Producto

import {devolver_producto_db} from './devolver_producto_db';

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

        lista_modificada_carritos.push({
            carrito_id: carrito_id ? String(carrito_id) : undefined,
            cliente_id: String(c_id),
            cantidad: parseInt(cantidad) || 0,
            folio,
            fecha: new Date(),
            cliente: {
                id: String(c_id),
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