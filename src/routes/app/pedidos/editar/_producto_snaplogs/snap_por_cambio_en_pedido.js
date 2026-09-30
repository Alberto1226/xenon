import { devolver_producto_db } from './../_server_cambiar_cantidad/devolver_producto_db'
import { Producto_snaplog } from '../../../../../models/producto_snaplog'
import mongoose from 'mongoose';

function sanitizeObjectId(val) {
    if (!val) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    if (mongoose.Types.ObjectId.isValid(val)) return val;
    return null;
}

export async function snap_por_cambio_en_pedido(producto, usuario, cantidad, cantidad_anterior, accion, pedido, producto_antes, folios = []) {
    try {
        const producto_despues_proceso = await devolver_producto_db(producto.id);
        if (!producto_despues_proceso || producto_despues_proceso.ok == false) {
            return { ok: false, mensaje: "El producto fue borrado y no se podra agregar." }
        }
        const producto_despues = producto_despues_proceso.producto || {};

        const carritosAntes = (producto_antes && Array.isArray(producto_antes.carritos)) ? producto_antes.carritos : [];
        const carritosDespues = (producto_despues && Array.isArray(producto_despues.carritos)) ? producto_despues.carritos : [];

        let total_reservado_antes = carritosAntes.reduce((a, b) => +a + (parseInt(b.cantidad) || 0), 0);
        let total_reservado_despues = carritosDespues.reduce((a, b) => +a + (parseInt(b.cantidad) || 0), 0);

        let existenciasAntes = (producto_antes && producto_antes.existencia) ? (producto_antes.existencia.actual || 0) : 0;
        let existenciasDespues = (producto_despues && producto_despues.existencia) ? (producto_despues.existencia.actual || 0) : 0;

        let inventario_antes = { existencias: existenciasAntes, apartados: total_reservado_antes };
        let inventario_despues = { existencias: existenciasDespues, apartados: total_reservado_despues };

        const prodId = sanitizeObjectId(producto ? (producto.id || producto._id) : null);
        const userId = sanitizeObjectId(usuario ? (usuario.id || usuario._id) : null);
        const pedidoId = sanitizeObjectId(pedido ? (pedido.id || pedido._id) : null);
        const clienteId = sanitizeObjectId((pedido && pedido.cliente) ? (pedido.cliente.id || pedido.cliente._id) : null);

        const snapDocData = {
            producto: {
                nombre: (producto && producto.nombre) ? producto.nombre : '',
                id: prodId
            },
            usuario: {
                nombre: (usuario && usuario.nombre) ? usuario.nombre : 'Rutas',
                id: userId
            },
            fecha: new Date(),
            accion: accion || '',
            cantidad: parseInt(cantidad) || 0,
            cantidad_anterior: parseInt(cantidad_anterior) || 0,
            pedido: {
                folio: (pedido && pedido.folio) ? parseInt(pedido.folio) || 0 : 0,
                id: pedidoId,
                cliente: {
                    nombre: (pedido && pedido.cliente && pedido.cliente.nombre) ? pedido.cliente.nombre : 'Ruta',
                    id: clienteId
                }
            },
            inventario_antes,
            inventario_despues,
            folios: Array.isArray(folios) ? folios : []
        };

        const nuevo_snap = new Producto_snaplog(snapDocData);
        await nuevo_snap.save();
        console.log("✅ Snaplog guardado exitosamente:", nuevo_snap._id, accion, "Folio:", snapDocData.pedido.folio);
        return { ok: true, snap: nuevo_snap };
    } catch (err) {
        console.error("❌ Error al guardar snaplog en snap_por_cambio_en_pedido:", err);
        return { ok: false, error: err.message };
    }
}

