import { devolver_producto_db } from './../_server_cambiar_cantidad/devolver_producto_db'
import { Producto_snaplog } from '../../../../../models/producto_snaplog'
export async function snap_por_cambio_en_pedido(producto, usuario, cantidad, cantidad_anterior, accion, pedido, producto_antes, folios = []) {
    const producto_despues_proceso = await devolver_producto_db(producto.id);
    if (producto_despues_proceso.ok == false) {
        return { ok: false, mensaje: "El producto fue borrado y no se podra agregar." }
    }
    const producto_despues = producto_despues_proceso.producto;
    let total_reservado_antes = producto_antes.carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
    let total_reservado_despues = producto_despues.carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
    let inventario_antes = { existencias: producto_antes.existencia.actual, apartados: total_reservado_antes };
    let inventario_despues = { existencias: producto_despues.existencia.actual, apartados: total_reservado_despues };
    const nuevo_snap = new Producto_snaplog({ producto, usuario, cantidad, cantidad_anterior, accion, pedido, inventario_antes, inventario_despues, folios });
    return nuevo_snap.save()
        .then(() => {
            return { ok: true }
        })
        .catch((err) => {
            console.log(err)
            return { ok: false }
        })
}

