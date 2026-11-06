import mongoose from 'mongoose';
import { Carrito } from '../../../../models/carrito';
import { Pedido } from '../../../../models/pedido';
import { Carrito_cancelado } from '../../../../models/carrito_cancelado';
import { Producto } from '../../../../models/producto';
import { Producto_snaplog } from '../../../../models/producto_snaplog';
import * as accesos from '../../accesos';
import criterios from './_criterios';

function validarFolio(valor) {
    if (!/^[1-9]\d*$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) {
        throw new Error('El folio debe ser un número entero positivo.');
    }
    return Number(valor);
}

async function consultar(folio) {
    const opciones = {};
    const modelos = [Carrito, Pedido, Carrito_cancelado];
    const encontrados = [];
    for (const modelo of modelos) {
        encontrados.push(await modelo.collection.find({ folio: { $in: [folio, String(folio)] } }, opciones).limit(2).toArray());
    }
    const pedidos = [].concat(...encontrados);
    if (pedidos.length !== 1) {
        throw new Error(pedidos.length ? 'Existe más de un pedido con este folio; se requiere revisión manual.' : 'No se encontró el pedido.');
    }
    const pedido = pedidos[0];
    if (!Array.isArray(pedido.lista)) throw new Error('El pedido no contiene una lista válida.');
    const ids = pedido.lista.map(item => item && item.producto && item.producto._id);
    const validos = ids.filter(id => id && mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(String(id)));
    const movimientos = await Producto_snaplog.collection.find({
        'pedido.folio': { $in: [folio, String(folio)] },
        accion: '2',
        'producto.id': { $in: validos.concat(validos.map(String)) }
    }, opciones).sort({ fecha: 1, _id: 1 }).toArray();
    const productos = await Producto.collection.find({ _id: { $in: validos } }, opciones).toArray();
    const items = pedido.lista.map((item, index) => {
        if (!item || typeof item !== 'object') throw new Error('El pedido contiene una partida inválida.');
        const id = ids[index];
        const producto = productos.find(p => String(p._id) === String(id));
        const salidas = movimientos.filter(m => String(m.producto && m.producto.id) === String(id));
        const repetido = ids.filter(otro => String(otro) === String(id)).length !== 1;
        const correccion = producto && Array.isArray(producto.correcciones_salida_duplicada)
            ? producto.correcciones_salida_duplicada.find(c => c.folio === folio) : null;
        let evaluacion = criterios.evaluar(item.cantidad, salidas, !!correccion);
        if (encontrados[2].length) {
            evaluacion = { elegible: false, motivo: 'El pedido está cancelado; requiere revisión manual antes de ajustar inventario.' };
        } else if (!id || !mongoose.Types.ObjectId.isValid(id) || !producto || repetido) {
            evaluacion = { elegible: false, motivo: 'Producto inexistente, identificador inválido o producto repetido en el pedido.' };
        } else if (!producto.existencia || !Number.isFinite(producto.existencia.actual)) {
            evaluacion = { elegible: false, motivo: 'El inventario actual del producto no es válido.' };
        }
        return {
            producto_id: id ? String(id) : null,
            nombre: (item.producto && item.producto.nombre) || 'Producto sin nombre',
            codigo: (item.producto && item.producto.codigo) || '',
            cantidad: item.cantidad,
            stock: producto && producto.existencia ? producto.existencia.actual : null,
            salidas: salidas.map(m => ({
                id: String(m._id), fecha: m.fecha, cantidad: m.cantidad,
                antes: m.inventario_antes && m.inventario_antes.existencias,
                despues: m.inventario_despues && m.inventario_despues.existencias
            })),
            correccion: correccion ? { auditoria_pendiente: correccion.auditoria_pendiente === true } : null,
            ...evaluacion
        };
    });
    return { pedido, items };
}

const escrituraSegura = { writeConcern: { w: 1, j: true } };

async function recuperarSnaplog(productoId, folio) {
    const producto = await Producto.collection.findOne({ _id: new mongoose.Types.ObjectId(productoId) });
    const correccion = producto && Array.isArray(producto.correcciones_salida_duplicada)
        ? producto.correcciones_salida_duplicada.find(c => c.folio === folio) : null;
    if (!correccion || !correccion.snaplog || !correccion.snaplog_id) {
        throw new Error('No existe una auditoría pendiente recuperable para este producto y folio.');
    }
    const snap = correccion.snaplog;
    if (String(snap._id) !== String(correccion.snaplog_id) || String(snap.producto.id) !== String(productoId) ||
        snap.pedido.folio !== folio || snap.accion !== '1c') {
        throw new Error('La evidencia de la corrección es inválida; requiere revisión manual.');
    }
    try {
        await Producto_snaplog.collection.updateOne(
            { _id: correccion.snaplog_id }, { $setOnInsert: snap }, { ...escrituraSegura, upsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
    const guardado = await Producto_snaplog.collection.findOne({ _id: correccion.snaplog_id });
    if (!guardado || guardado.accion !== '1c' || String(guardado.producto.id) !== String(productoId) ||
        guardado.pedido.folio !== folio || guardado.cantidad !== snap.cantidad) {
        throw new Error('El snaplog existente no coincide con la corrección; requiere revisión manual.');
    }
    const confirmado = await Producto.collection.updateOne(
        { _id: producto._id, 'correcciones_salida_duplicada.snaplog_id': correccion.snaplog_id },
        { $set: { 'correcciones_salida_duplicada.$.auditoria_pendiente': false } }, escrituraSegura
    );
    const encontrados = confirmado.matchedCount !== undefined ? confirmado.matchedCount : confirmado.result.n;
    if (encontrados !== 1) throw new Error('No se pudo confirmar la marca de auditoría del producto.');
}

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) return res.status(401).send({ ok: false, mensaje: 'Sesión expirada.' });
    if (!accesos.tiene_permisos_administrativos(req) || req.user.usuario !== 'isotech_Xenonymas') {
        return res.status(403).send({ ok: false, mensaje: 'Acceso restringido.' });
    }
    try {
        const folio = validarFolio(req.body && req.body.folio);
        if (req.body.accion === 'consultar') {
            const resultado = await consultar(folio);
            return res.send({ ok: true, folio, cliente: resultado.pedido.cliente && resultado.pedido.cliente.nombre, items: resultado.items });
        }
        if (req.body.accion === 'movimientos') {
            const { producto_id, pagina } = req.body;
            if (typeof producto_id !== 'string' || !/^[a-f\d]{24}$/i.test(producto_id) ||
                !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000) {
                return res.status(400).send({ ok: false, mensaje: 'Producto o página inválidos.' });
            }
            const tamano = 20;
            const movimientos = await Producto_snaplog.collection.find(
                { 'producto.id': { $in: [new mongoose.Types.ObjectId(producto_id), producto_id] } },
                { projection: { fecha: 1, accion: 1, cantidad: 1, cantidad_anterior: 1, pedido: 1, usuario: 1, inventario_antes: 1, inventario_despues: 1 } }
            ).sort({ fecha: -1, _id: -1 }).skip((pagina - 1) * tamano).limit(tamano + 1).toArray();
            return res.send({ ok: true, movimientos: movimientos.slice(0, tamano), hay_mas: movimientos.length > tamano });
        }
        if (req.body.accion === 'recuperar_auditoria') {
            if (typeof req.body.producto_id !== 'string' || !/^[a-f\d]{24}$/i.test(req.body.producto_id)) {
                return res.status(400).send({ ok: false, mensaje: 'Producto inválido.' });
            }
            await recuperarSnaplog(req.body.producto_id, folio);
            return res.send({ ok: true, mensaje: 'Snaplog recuperado sin modificar existencias.' });
        }
        if (req.body.accion !== 'corregir' || !Array.isArray(req.body.productos) || !req.body.productos.length) {
            return res.status(400).send({ ok: false, mensaje: 'Selecciona al menos un producto.' });
        }
        const seleccion = req.body.productos;
        if (seleccion.some(p => !p || typeof p.id !== 'string' || !mongoose.Types.ObjectId.isValid(p.id) ||
            !Array.isArray(p.salidas) || p.salidas.length !== 2 || !Number.isFinite(p.stock) || !Number.isSafeInteger(p.cantidad)) ||
            new Set(seleccion.map(p => p.id)).size !== seleccion.length) {
            return res.status(400).send({ ok: false, mensaje: 'Selección de productos inválida.' });
        }
        const corregidos = [];
        try {
            for (const seleccionado of seleccion) {
                    const resultado = await consultar(folio);
                    const item = resultado.items.find(p => p.producto_id === seleccionado.id);
                    if (!item || !item.elegible || item.stock !== seleccionado.stock || item.cantidad !== seleccionado.cantidad ||
                        item.salidas.map(s => s.id).join(',') !== seleccionado.salidas.join(',')) {
                        throw new Error(`Los datos del producto ${seleccionado.id} cambiaron. Consulta el pedido nuevamente.`);
                    }
                    const producto = await Producto.collection.findOne({ _id: new mongoose.Types.ObjectId(seleccionado.id) });
                    if (!producto || !producto.existencia || !Number.isFinite(producto.existencia.actual)) throw new Error('El inventario cambió; consulta el pedido nuevamente.');
                    if (producto.carritos != null && !Array.isArray(producto.carritos)) throw new Error('Los apartados del producto no son válidos.');
                    const apartados = (producto.carritos || []).reduce((total, reserva) => {
                        if (!reserva || reserva.cantidad == null || reserva.cantidad === '') throw new Error('Los apartados del producto no son válidos.');
                        const cantidad = Number(reserva.cantidad);
                        if (!Number.isFinite(cantidad)) throw new Error('Los apartados del producto no son válidos.');
                        return total + cantidad;
                    }, 0);
                    if (!Number.isFinite(producto.existencia.actual + item.cantidad)) throw new Error('La existencia resultante no es válida.');
                    const snapId = new mongoose.Types.ObjectId();
                    const snap = new Producto_snaplog({
                        _id: snapId,
                        producto: { id: producto._id, nombre: producto.nombre },
                        usuario: { id: req.user._id, nombre: req.user.nombre },
                        accion: '1c', cantidad: item.cantidad,
                        pedido: { folio, cliente: { nombre: (resultado.pedido.cliente || {}).nombre } },
                        inventario_antes: { existencias: producto.existencia.actual, apartados },
                        inventario_despues: { existencias: producto.existencia.actual + item.cantidad, apartados },
                        correccion_salida_duplicada: { salidas: item.salidas.map(s => new mongoose.Types.ObjectId(s.id)) }
                    });
                    const errorValidacion = snap.validateSync();
                    if (errorValidacion) throw errorValidacion;
                    const filtro = { _id: producto._id, 'correcciones_salida_duplicada.folio': { $ne: folio }, 'existencia.actual': item.stock };
                    filtro.carritos = producto.carritos === undefined ? { $exists: false } : producto.carritos;
                    const cambio = await Producto.collection.updateOne(
                        filtro,
                        { $inc: { 'existencia.actual': item.cantidad }, $push: { correcciones_salida_duplicada: {
                            folio, snaplog_id: snapId, cantidad: item.cantidad, auditoria_pendiente: true,
                            snaplog: snap.toObject()
                        } } }, escrituraSegura
                    );
                    const modificados = cambio.modifiedCount !== undefined ? cambio.modifiedCount : cambio.result.nModified;
                    if (modificados !== 1) throw new Error('El inventario o los apartados cambiaron, o el producto ya fue corregido.');
                    corregidos.push({ producto_id: seleccionado.id, cantidad: item.cantidad });
                    await recuperarSnaplog(seleccionado.id, folio);
            }
        } catch (error) {
            console.error('Corrección interrumpida; consultar estado antes de reintentar:', error);
            return res.status(409).send({ ok: false, corregidos, mensaje: 'La operación se interrumpió. Puede haber correcciones aplicadas o auditorías pendientes. Consulta el folio antes de continuar.' });
        }
        return res.send({ ok: true, corregidos });
    } catch (error) {
        console.error('Error en corrección de salidas duplicadas:', error);
        return res.status(400).send({ ok: false, mensaje: error.message });
    }
}
