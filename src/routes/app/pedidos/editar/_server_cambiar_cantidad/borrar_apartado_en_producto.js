//      Borra lo apartado dentor del modelo de Producto

import {devolver_producto_db} from './devolver_producto_db';

export async function borrar_apartado_en_producto(id_producto, cliente_id, carrito_id = null) {
    try {
        const producto_proc = await devolver_producto_db(id_producto);
        if (producto_proc.ok === false) {
            return { ok: false };
        }
        const producto = producto_proc.producto;
        let lista_modificada_carritos = JSON.parse(JSON.stringify(producto.carritos || []));

        lista_modificada_carritos = lista_modificada_carritos.filter(element => {
            if (carrito_id && element.carrito_id && String(element.carrito_id) === String(carrito_id)) {
                return false;
            }
            const c_id = element.cliente_id || (element.cliente ? (element.cliente.id || element.cliente._id) : null);
            if (c_id && String(c_id) === String(cliente_id)) {
                return false;
            }
            return true;
        });

        producto.carritos = lista_modificada_carritos;
        producto.markModified('carritos');
        return producto.save()
        .then((ress) => {
            return { ok: true };
        });
        
    } catch (err) {
        throw err;
    }
}