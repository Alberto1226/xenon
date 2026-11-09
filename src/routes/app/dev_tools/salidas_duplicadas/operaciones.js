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

/**
 * Escanea los snaplogs de acción '2' (salidas) generados en los últimos N meses (por defecto 6),
 * agrupando por producto y folio para identificar aquellos con 2 o más salidas registradas.
 */
async function escanearSalidasDuplicadas(meses = 6) {
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaLimite.getMonth() - meses);

    // Agregación para agrupar salidas de los últimos N meses
    const pipeline = [
        {
            $match: {
                accion: '2',
                fecha: { $gte: fechaLimite },
                'pedido.folio': { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: {
                    folio: '$pedido.folio',
                    producto_id: '$producto.id'
                },
                total_salidas: { $sum: 1 },
                fechas: { $push: '$fecha' },
                cantidades: { $push: '$cantidad' },
                salida_ids: { $push: '$_id' },
                cliente_nombre: { $first: '$pedido.cliente.nombre' },
                producto_nombre: { $first: '$producto.nombre' }
            }
        },
        {
            $match: {
                total_salidas: { $gte: 2 }
            }
        },
        {
            $sort: { '_id.folio': -1 }
        }
    ];

    const grupos = await Producto_snaplog.collection.aggregate(pipeline).toArray();

    // Obtener información adicional de folios y productos
    const foliosUnicos = Array.from(new Set(grupos.map(g => Number(g._id.folio)).filter(f => Number.isSafeInteger(f) && f > 0)));
    const productosIds = Array.from(new Set(grupos.map(g => g._id.producto_id).filter(id => id && mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(String(id)))));

    // Consultar pedidos y productos
    const [carritos, pedidosHist, cancelados, productosDB] = await Promise.all([
        Carrito.collection.find({ folio: { $in: foliosUnicos.concat(foliosUnicos.map(String)) } }, { projection: { folio: 1, cliente: 1, status: 1 } }).toArray(),
        Pedido.collection.find({ folio: { $in: foliosUnicos.concat(foliosUnicos.map(String)) } }, { projection: { folio: 1, cliente: 1, status: 1 } }).toArray(),
        Carrito_cancelado.collection.find({ folio: { $in: foliosUnicos.concat(foliosUnicos.map(String)) } }, { projection: { folio: 1, cliente: 1, status: 1 } }).toArray(),
        Producto.collection.find({ _id: { $in: productosIds } }, { projection: { _id: 1, nombre: 1, codigo: 1, existencia: 1, correcciones_salida_duplicada: 1 } }).toArray()
    ]);

    const mapaCancelados = new Set(cancelados.map(c => Number(c.folio)));
    const mapaPedidos = new Map();
    carritos.concat(pedidosHist).forEach(p => {
        mapaPedidos.set(Number(p.folio), p);
    });

    const mapaProductos = new Map();
    productosDB.forEach(p => {
        mapaProductos.set(String(p._id), p);
    });

    // Mapear cada caso con estado y diagnóstico
    const casos = grupos.map(g => {
        const folioNum = Number(g._id.folio);
        const prodIdStr = String(g._id.producto_id);
        const producto = mapaProductos.get(prodIdStr);
        const pedido = mapaPedidos.get(folioNum);
        const estaCancelado = mapaCancelados.has(folioNum);

        // Verificar si ya fue corregido por la herramienta
        const correccion = producto && Array.isArray(producto.correcciones_salida_duplicada)
            ? producto.correcciones_salida_duplicada.find(c => Number(c.folio) === folioNum)
            : null;

        let estado = 'sospechoso';
        let motivo = `${g.total_salidas} salidas registradas para este pedido.`;

        if (correccion) {
            estado = correccion.auditoria_pendiente ? 'auditoria_pendiente' : 'corregido';
            motivo = correccion.auditoria_pendiente
                ? 'Inventario corregido pero auditoría de snaplog pendiente.'
                : 'Ya corregido por la herramienta.';
        } else if (estaCancelado) {
            estado = 'cancelado';
            motivo = 'El pedido figura como cancelado; requiere revisión manual.';
        } else if (g.total_salidas === 2) {
            estado = 'elegible_revision';
            motivo = 'Exactamente 2 salidas registradas. Listo para revisar y corregir.';
        } else if (g.total_salidas > 2) {
            estado = 'anomalia_grave';
            motivo = `Tiene ${g.total_salidas} salidas. Requiere revisión técnica manual.`;
        }

        return {
            folio: folioNum,
            producto_id: prodIdStr,
            producto_nombre: (producto && producto.nombre) || g.producto_nombre || 'Producto sin nombre',
            producto_codigo: (producto && producto.codigo) || '',
            stock_actual: producto && producto.existencia ? producto.existencia.actual : null,
            cliente: (pedido && pedido.cliente && pedido.cliente.nombre) || g.cliente_nombre || 'Cliente sin nombre',
            total_salidas: g.total_salidas,
            fechas_salidas: g.fechas,
            cantidades_salidas: g.cantidades,
            estado,
            motivo
        };
    });

    // Agrupar resumen por folios
    const foliosAfectados = Array.from(new Set(casos.map(c => c.folio)));
    const totalElegibles = casos.filter(c => c.estado === 'elegible_revision').length;
    const totalCorregidos = casos.filter(c => c.estado === 'corregido').length;
    const totalPendientesAuditoria = casos.filter(c => c.estado === 'auditoria_pendiente').length;

    // Agrupar por pedidos (folios)
    const mapaFolios = new Map();
    for (const caso of casos) {
        if (!mapaFolios.has(caso.folio)) {
            mapaFolios.set(caso.folio, {
                folio: caso.folio,
                cliente: caso.cliente,
                total_productos: 0,
                total_elegibles: 0,
                total_corregidos: 0,
                total_pendientes_auditoria: 0,
                total_anomalias: 0,
                esta_cancelado: caso.estado === 'cancelado',
                productos: []
            });
        }
        const grupoPedido = mapaFolios.get(caso.folio);
        grupoPedido.total_productos++;
        if (caso.estado === 'elegible_revision') grupoPedido.total_elegibles++;
        if (caso.estado === 'corregido') grupoPedido.total_corregidos++;
        if (caso.estado === 'auditoria_pendiente') grupoPedido.total_pendientes_auditoria++;
        if (caso.estado === 'anomalia_grave') grupoPedido.total_anomalias++;
        grupoPedido.productos.push(caso);
    }

    const pedidos = Array.from(mapaFolios.values()).map(p => {
        let estado = 'pendiente';
        let estado_etiqueta = 'Pendiente de corregir';
        if (p.esta_cancelado) {
            estado = 'cancelado';
            estado_etiqueta = 'Cancelado';
        } else if (p.total_elegibles === 0 && p.total_pendientes_auditoria === 0 && p.total_corregidos > 0) {
            estado = 'corregido';
            estado_etiqueta = 'Completamente corregido';
        } else if (p.total_pendientes_auditoria > 0) {
            estado = 'auditoria_pendiente';
            estado_etiqueta = 'Auditoría pendiente';
        } else if (p.total_corregidos > 0 && p.total_elegibles > 0) {
            estado = 'parcial';
            estado_etiqueta = 'Parcialmente corregido';
        } else if (p.total_anomalias > 0 && p.total_elegibles === 0) {
            estado = 'anomalia_grave';
            estado_etiqueta = 'Revisión técnica requerida';
        }
        return {
            ...p,
            estado,
            estado_etiqueta
        };
    });

    // Ordenar pedidos poniendo primero los que tienen pendientes de corrección
    pedidos.sort((a, b) => {
        if (a.total_elegibles > 0 && b.total_elegibles === 0) return -1;
        if (a.total_elegibles === 0 && b.total_elegibles > 0) return 1;
        return b.folio - a.folio;
    });

    return {
        fecha_desde: fechaLimite,
        meses_analizados: meses,
        total_casos: casos.length,
        total_folios: foliosAfectados.length,
        total_elegibles: totalElegibles,
        total_corregidos: totalCorregidos,
        total_pendientes_auditoria: totalPendientesAuditoria,
        pedidos,
        casos
    };
}

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) return res.status(401).send({ ok: false, mensaje: 'Sesión expirada.' });
    if (!accesos.tiene_permisos_administrativos(req) || req.user.usuario !== 'isotech_Xenonymas') {
        return res.status(403).send({ ok: false, mensaje: 'Acceso restringido.' });
    }
    try {
        if (req.body && req.body.accion === 'escanear_ultimos_meses') {
            const meses = req.body.meses ? Number(req.body.meses) : 6;
            const reporte = await escanearSalidasDuplicadas(meses);
            return res.send({ ok: true, reporte });
        }

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
