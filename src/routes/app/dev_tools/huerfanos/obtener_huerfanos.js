import mongoose from 'mongoose';
import { Carrito } from '../../../../models/carrito';
import { Pedido } from '../../../../models/pedido';
import { Carrito_cancelado } from '../../../../models/carrito_cancelado';
import { Producto } from '../../../../models/producto';
import { Producto_snaplog } from '../../../../models/producto_snaplog';
import { Log } from '../../../../models/log';
import * as accesos from '../../accesos';
import fs from 'fs';
import path from 'path';

export async function get(req, res) {
    if (accesos.esta_logueado(req) === false) {
        res.status(401).send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.status(403).send({ ok: false, mensaje: "Requiere permisos administrativos" });
        return;
    }

    try {
        const huerfanos = await detectar_apartados_huerfanos();
        res.send({ ok: true, huerfanos, total: huerfanos.length });
    } catch (err) {
        console.error("Error al detectar apartados huérfanos:", err);
        res.status(500).send({ ok: false, mensaje: err.message || String(err) });
    }
}

export async function post(req, res) {
    if (accesos.esta_logueado(req) === false) {
        res.status(401).send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.status(403).send({ ok: false, mensaje: "Requiere permisos administrativos" });
        return;
    }

    try {
        const { accion, producto_id, folio, items } = req.body || {};

        if (accion === 'obtener' || !accion) {
            const huerfanos = await detectar_apartados_huerfanos();
            const total_correcciones = await obtener_total_correcciones();
            res.send({ ok: true, huerfanos, total: huerfanos.length, total_correcciones });
            return;
        }

        if (accion === 'obtener_historial') {
            const historial = await obtener_historial_correcciones();
            res.send({ ok: true, historial, total: historial.length });
            return;
        }

        if (accion === 'eliminar_uno' && producto_id) {
            const resultado = await eliminar_apartado_huerfano_especifico(req, producto_id, folio);
            const total_correcciones = await obtener_total_correcciones();
            res.send({ ok: true, mensaje: "Apartado huérfano eliminado correctamente (sin alterar inventario)", resultado, correcciones: 1, total_correcciones });
            return;
        }

        if (accion === 'limpiar_y_descontar' && producto_id) {
            const resultado = await limpiar_y_descontar_huerfano_especifico(req, producto_id, folio);
            const total_correcciones = await obtener_total_correcciones();
            res.send({ ok: true, mensaje: "Apartado eliminado, inventario descontado y registrado en producto_snaplogs", resultado, correcciones: 1, total_correcciones });
            return;
        }

        if (accion === 'eliminar_seleccionados' && Array.isArray(items)) {
            let eliminados = 0;
            for (let item of items) {
                if (item && item.producto_id) {
                    const ok = await eliminar_apartado_huerfano_especifico(req, item.producto_id, item.folio);
                    if (ok) eliminados++;
                }
            }
            const total_correcciones = await obtener_total_correcciones();
            res.send({ ok: true, mensaje: `Se limpiaron ${eliminados} apartado(s) seleccionado(s) exitosamente`, eliminados, correcciones: eliminados, total_correcciones });
            return;
        }

        if (accion === 'limpiar_y_descontar_seleccionados' && Array.isArray(items)) {
            let procesados = 0;
            for (let item of items) {
                if (item && item.producto_id) {
                    const ok = await limpiar_y_descontar_huerfano_especifico(req, item.producto_id, item.folio);
                    if (ok) procesados++;
                }
            }
            const total_correcciones = await obtener_total_correcciones();
            res.send({ ok: true, mensaje: `Se descontaron y limpiaron ${procesados} apartado(s) seleccionado(s) exitosamente`, procesados, correcciones: procesados, total_correcciones });
            return;
        }

        if (accion === 'eliminar_todos') {
            const huerfanos = await detectar_apartados_huerfanos();
            let eliminados = 0;

            for (let item of huerfanos) {
                const ok = await eliminar_apartado_huerfano_especifico(req, item.producto_id, item.folio);
                if (ok) eliminados++;
            }
            const total_correcciones = await obtener_total_correcciones();

            res.send({ ok: true, mensaje: `Se realizaron ${eliminados} corrección(es) exitosamente`, eliminados, correcciones: eliminados, total_correcciones });
            return;
        }

        if (accion === 'limpiar_y_descontar_todos_enviados') {
            const huerfanos = await detectar_apartados_huerfanos();
            const huerfanos_enviados = huerfanos.filter(h => h.tipo_ubicacion === 'pedido_historico');
            let procesados = 0;

            for (let item of huerfanos_enviados) {
                const ok = await limpiar_y_descontar_huerfano_especifico(req, item.producto_id, item.folio);
                if (ok) procesados++;
            }
            const total_correcciones = await obtener_total_correcciones();

            res.send({ ok: true, mensaje: `Se realizaron ${procesados} corrección(es) de pedidos enviados exitosamente`, procesados, correcciones: procesados, total_correcciones });
            return;
        }

        res.status(400).send({ ok: false, mensaje: "Acción no válida" });
    } catch (err) {
        console.error("Error al procesar huérfanos:", err);
        res.status(500).send({ ok: false, mensaje: err.message || String(err) });
    }
}

export async function obtener_total_correcciones() {
    try {
        const count_db = await Log.countDocuments({
            accion: { $in: ['LIMPIAR_Y_DESCONTAR_HUERFANO', 'ELIMINACION_DEVTOOLS_HUERFANO', 'BACKFILL_HUERFANO_ELIMINADO', 'BACKFILL_HUERFANOS_PROCESADO'] }
        });

        let count_archivo = 0;
        const archivo_log = path.join(process.cwd(), 'logs_correccion', 'apartados_huerfanos.log');
        if (fs.existsSync(archivo_log)) {
            const contenido = fs.readFileSync(archivo_log, 'utf-8');
            const lineas = contenido.split('\n').filter(l => l.trim().length > 0);
            count_archivo = lineas.length;
        }

        return Math.max(count_db, count_archivo);
    } catch (e) {
        return 0;
    }
}

function parsearLineaLog(linea) {
    if (!linea || !linea.trim()) return null;
    const matchFecha = linea.match(/^\[(.*?)\]\s*(.*)$/);
    if (!matchFecha) return null;
    const fecha = matchFecha[1];
    const resto = matchFecha[2];

    const partes = resto.split('|').map(p => p.trim());
    const tag = partes[0] || 'MANUAL_DEVTOOLS';

    const info = {
        fecha,
        tag,
        tipo: tag.includes('LIMPIAR_Y_DESCONTAR') ? 'limpiar_descontar' : (tag.includes('MANUAL') ? 'solo_limpiar' : 'backfill'),
        tipo_label: tag.includes('LIMPIAR_Y_DESCONTAR') ? 'Limpiar y Descontar' : (tag.includes('MANUAL') ? 'Solo Limpiar' : 'Backfill Reconciliación'),
        sku: '',
        modelo: '',
        producto: '',
        folio: '',
        cliente: '',
        cantidad: 1,
        detalle_stock: tag.includes('LIMPIAR_Y_DESCONTAR') ? 'Descuento aplicado' : 'Reserva liberada',
        usuario: 'devtools'
    };

    for (let p of partes.slice(1)) {
        if (p.startsWith('SKU:')) info.sku = p.replace(/^SKU:\s*"?/, '').replace(/"?$/, '');
        else if (p.startsWith('Modelo:')) info.modelo = p.replace(/^Modelo:\s*"?/, '').replace(/"?$/, '');
        else if (p.startsWith('Producto:')) info.producto = p.replace(/^Producto:\s*"?/, '').replace(/"?$/, '');
        else if (p.startsWith('Folio:')) info.folio = p.replace(/^Folio:\s*#?/, '');
        else if (p.startsWith('Cliente:')) info.cliente = p.replace(/^Cliente:\s*"?/, '').replace(/"?$/, '');
        else if (p.startsWith('Cantidad:')) info.cantidad = parseInt(p.replace('Cantidad:', '').trim()) || 1;
        else if (p.startsWith('Cantidad Descontada:')) info.cantidad = parseInt(p.replace('Cantidad Descontada:', '').trim()) || 1;
        else if (p.startsWith('Stock:')) info.detalle_stock = p.replace('Stock:', '').trim();
    }
    return info;
}

export async function obtener_historial_correcciones() {
    let historial = [];
    const clavesVistas = new Set();

    // 1. Obtener desde la colección Log en MongoDB
    try {
        const logs_db = await Log.find({
            accion: { $in: ['LIMPIAR_Y_DESCONTAR_HUERFANO', 'ELIMINACION_DEVTOOLS_HUERFANO', 'BACKFILL_HUERFANO_ELIMINADO', 'BACKFILL_HUERFANOS_PROCESADO'] }
        }).sort({ fecha: -1 }).limit(300).lean();

        for (let log of logs_db) {
            let body = {};
            try {
                body = typeof log.body === 'string' ? JSON.parse(log.body) : (log.body || {});
            } catch (e) {
                body = {};
            }

            const tipo = log.accion === 'LIMPIAR_Y_DESCONTAR_HUERFANO' ? 'limpiar_descontar'
                : (log.accion === 'ELIMINACION_DEVTOOLS_HUERFANO' ? 'solo_limpiar' : 'backfill');
            const tipo_label = tipo === 'limpiar_descontar' ? 'Limpiar y Descontar'
                : (tipo === 'solo_limpiar' ? 'Solo Limpiar' : 'Backfill Reconciliación');

            const folio = body.folio != null ? body.folio : (body.reserva && body.reserva.folio ? body.reserva.folio : 'S/N');
            const sku = body.sku || (body.reserva && body.reserva.sku) || '';
            const modelo = body.modelo || (body.reserva && body.reserva.modelo) || '';
            const nombre = body.nombre || (body.reserva && body.reserva.nombre) || 'Producto';
            const cliente = body.cliente || (body.reserva && body.reserva.cliente && body.reserva.cliente.nombre) || (body.reserva && body.reserva.cliente_id) || 'Cliente';
            const cantidad = body.cantidad_descontada || (body.reserva && body.reserva.cantidad) || body.cantidad || 1;

            let detalle_stock = 'Reserva liberada';
            if (body.existencias_antes != null && body.existencias_despues != null) {
                detalle_stock = `${body.existencias_antes} ➔ ${body.existencias_despues} pzas`;
            }

            const usuario = (log.usuario && log.usuario.nombre) ? log.usuario.nombre : 'devtools';
            const fecha = log.fecha || new Date();

            const clave = `${folio}_${sku}_${new Date(fecha).toISOString().slice(0, 16)}`;
            clavesVistas.add(clave);

            historial.push({
                id: String(log._id),
                fecha,
                tipo,
                tipo_label,
                sku,
                modelo,
                producto: nombre,
                folio,
                cliente,
                cantidad,
                detalle_stock,
                usuario
            });
        }
    } catch (e) {
        console.error("Error al obtener logs de correcciones en DB:", e);
    }

    // 2. Obtener desde archivo físico de auditoría si contiene registros adicionales
    try {
        const archivo_log = path.join(process.cwd(), 'logs_correccion', 'apartados_huerfanos.log');
        if (fs.existsSync(archivo_log)) {
            const contenido = fs.readFileSync(archivo_log, 'utf-8');
            const lineas = contenido.split('\n').filter(l => l.trim().length > 0);

            for (let i = lineas.length - 1; i >= 0; i--) {
                const parseado = parsearLineaLog(lineas[i]);
                if (!parseado) continue;

                const clave = `${parseado.folio}_${parseado.sku}_${new Date(parseado.fecha).toISOString().slice(0, 16)}`;
                if (!clavesVistas.has(clave)) {
                    clavesVistas.add(clave);
                    historial.push({
                        id: `file_${i}`,
                        ...parseado
                    });
                }
            }
        }
    } catch (eFile) {
        console.error("Error al leer archivo de logs:", eFile);
    }

    // Ordenar de más reciente a más antiguo
    historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return historial;
}

export async function detectar_apartados_huerfanos() {
    // 1. Obtener TODOS los carritos en la colección Carrito (sin importar su status)
    const todos_carritos = await Carrito.find({}, { _id: 1, folio: 1, status: 1 }).lean();

    const ids_carritos_existentes = new Set(todos_carritos.map(c => String(c._id)));
    const folios_carritos_existentes = new Set(
        todos_carritos.filter(c => c && c.folio != null).map(c => String(c.folio))
    );

    // 2. Obtener folios en otras colecciones (Cancelados y Pedidos históricos)
    const todos_cancelados = await Carrito_cancelado.find({}, { folio: 1 }).lean();
    const todos_pedidos = await Pedido.find({}, { folio: 1 }).lean();

    const folios_cancelados = new Set(todos_cancelados.filter(c => c && c.folio != null).map(c => String(c.folio)));
    const folios_pedidos = new Set(todos_pedidos.filter(p => p && p.folio != null).map(p => String(p.folio)));

    // 3. Buscar productos que tengan elementos en carritos
    const productos_con_carritos = await Producto.find({ "carritos.0": { $exists: true } }).lean();

    let apartados_huerfanos = [];
    let idx = 0;

    for (let producto of productos_con_carritos) {
        if (!producto || !Array.isArray(producto.carritos)) continue;

        for (let reserva of producto.carritos) {
            if (!reserva || typeof reserva !== 'object') continue;
            let es_valido = false;

            // Si su carrito_id o folio existe en Carrito (sin importar su status), NO es huérfano
            if (reserva.carrito_id && ids_carritos_existentes.has(String(reserva.carrito_id))) {
                es_valido = true;
            }
            if (!es_valido && reserva.folio != null && folios_carritos_existentes.has(String(reserva.folio))) {
                es_valido = true;
            }

            if (!es_valido) {
                idx++;
                const cliente_info = reserva.cliente || {};
                const cliente_nombre = cliente_info.nombre || reserva.cliente_id || 'Cliente no disponible';
                const cliente_correo = cliente_info.correo || '';

                const fecha_apartado = reserva.fecha || reserva.created_at || reserva.fecha_apartado || producto.updatedAt || null;
                const folio_str = reserva.folio != null ? String(reserva.folio) : null;

                let ubicacion_folio = "No existe en DB";
                let tipo_ubicacion = "no_existe";

                if (folio_str) {
                    if (folios_cancelados.has(folio_str)) {
                        ubicacion_folio = "Carrito Cancelado";
                        tipo_ubicacion = "cancelado";
                    } else if (folios_pedidos.has(folio_str)) {
                        ubicacion_folio = "Pedido Histórico";
                        tipo_ubicacion = "pedido_historico";
                    }
                }

                apartados_huerfanos.push({
                    id_unico: `${producto._id}_${reserva.folio || 'SN'}_${idx}`,
                    producto_id: String(producto._id),
                    sku: producto.sku || 'S/SKU',
                    modelo: producto.modelo || 'S/M',
                    nombre: producto.nombre || 'Producto sin nombre',
                    imagen: (producto.imagenes && producto.imagenes[0]) ? producto.imagenes[0] : (producto.imagen || null),
                    inventario: (producto.existencia && producto.existencia.actual != null) ? producto.existencia.actual : (producto.inventario != null ? producto.inventario : (producto.existencias || 0)),
                    cantidad_apartada: reserva.cantidad || 1,
                    folio: reserva.folio != null ? reserva.folio : 'S/N',
                    ubicacion_folio,
                    tipo_ubicacion,
                    cliente: {
                        id: cliente_info.id || cliente_info._id || reserva.cliente_id || '',
                        nombre: cliente_nombre,
                        correo: cliente_correo
                    },
                    fecha_pedido_eliminado: fecha_apartado,
                    carrito_id: reserva.carrito_id || null,
                    reserva_original: reserva
                });
            }
        }
    }

    return apartados_huerfanos;
}

async function eliminar_apartado_huerfano_especifico(req, producto_id, folio) {
    const producto = await Producto.findById(producto_id);
    if (!producto || !Array.isArray(producto.carritos)) return false;

    let carritos_filtrados = [];
    let eliminado = false;
    let reserva_removida = null;

    for (let reserva of producto.carritos) {
        if (!reserva) continue;
        const match_folio = (folio != null && reserva.folio != null && String(reserva.folio) === String(folio));
        const match_sin_folio = (folio === 'S/N' || folio == null) && reserva.folio == null;

        if (!eliminado && (match_folio || match_sin_folio)) {
            eliminado = true;
            reserva_removida = reserva;
        } else {
            carritos_filtrados.push(reserva);
        }
    }

    if (eliminado) {
        producto.carritos = carritos_filtrados;
        producto.markModified('carritos');
        await producto.save();

        // Registrar en log físico y DB Log
        try {
            const dir_logs = path.join(process.cwd(), 'logs_correccion');
            if (!fs.existsSync(dir_logs)) fs.mkdirSync(dir_logs, { recursive: true });
            const archivo_log = path.join(dir_logs, 'apartados_huerfanos.log');
            const fecha_iso = new Date().toISOString();
            const cliente_nom = (reserva_removida.cliente && reserva_removida.cliente.nombre) ? reserva_removida.cliente.nombre : (reserva_removida.cliente_id || 'Desconocido');
            const linea = `[${fecha_iso}] MANUAL_DEVTOOLS | SKU: "${producto.sku || ''}" | Modelo: "${producto.modelo || ''}" | Producto: "${producto.nombre || ''}" | Folio: #${reserva_removida.folio || 'S/N'} | Cliente: "${cliente_nom}" | Cantidad: ${reserva_removida.cantidad || 1}\n`;
            fs.appendFileSync(archivo_log, linea);

            const usuario_req = (req && req.user) || (req && req.session && req.session.usuario) || {};
            await Log.create({
                activo: true,
                fecha: new Date(),
                usuario: {
                    nombre: usuario_req.usuario || usuario_req.nombre || 'devtools_huerfanos',
                    id: usuario_req._id || usuario_req.id || 'devtools'
                },
                accion: 'ELIMINACION_DEVTOOLS_HUERFANO',
                body: JSON.stringify({
                    producto_id: producto._id,
                    sku: producto.sku,
                    modelo: producto.modelo,
                    nombre: producto.nombre,
                    folio,
                    cliente: cliente_nom,
                    cantidad: reserva_removida.cantidad || 1,
                    reserva: reserva_removida
                })
            });
        } catch (eLog) {
            console.error("Error al registrar log de eliminación manual:", eLog);
        }
    }

    return eliminado;
}

async function limpiar_y_descontar_huerfano_especifico(req, producto_id, folio) {
    const producto = await Producto.findById(producto_id);
    if (!producto || !Array.isArray(producto.carritos)) return false;

    let carritos_filtrados = [];
    let eliminado = false;
    let reserva_removida = null;

    const total_apartados_antes = producto.carritos.reduce((sum, r) => sum + (r.cantidad || 1), 0);
    const existencias_antes = (producto.existencia && producto.existencia.actual != null)
        ? producto.existencia.actual
        : (producto.existencias != null ? producto.existencias : (producto.inventario || 0));

    for (let reserva of producto.carritos) {
        if (!reserva) continue;
        const match_folio = (folio != null && reserva.folio != null && String(reserva.folio) === String(folio));
        const match_sin_folio = (folio === 'S/N' || folio == null) && reserva.folio == null;

        if (!eliminado && (match_folio || match_sin_folio)) {
            eliminado = true;
            reserva_removida = reserva;
        } else {
            carritos_filtrados.push(reserva);
        }
    }

    if (eliminado && reserva_removida) {
        const cantidad_descontar = reserva_removida.cantidad || 1;
        const total_apartados_despues = carritos_filtrados.reduce((sum, r) => sum + (r.cantidad || 1), 0);
        const existencias_despues = Math.max(0, existencias_antes - cantidad_descontar);

        // Actualizar existencias e inventario del producto
        producto.carritos = carritos_filtrados;
        if (!producto.existencia) {
            producto.existencia = { actual: existencias_despues };
        } else {
            producto.existencia.actual = existencias_despues;
        }
        producto.markModified('existencia');

        if (producto.existencias != null) producto.existencias = existencias_despues;
        if (producto.inventario != null) producto.inventario = existencias_despues;

        producto.markModified('carritos');
        await producto.save();

        const usuario_req = (req && req.user) || (req && req.session && req.session.usuario) || {};
        let usuario_id_obj = null;
        if (usuario_req._id && mongoose.Types.ObjectId.isValid(usuario_req._id)) {
            usuario_id_obj = usuario_req._id;
        } else if (usuario_req.id && mongoose.Types.ObjectId.isValid(usuario_req.id)) {
            usuario_id_obj = usuario_req.id;
        }

        // 1. Crear registro en Producto_snaplog
        try {
            const cliente_info = reserva_removida.cliente || {};

            let cliente_id_obj = null;
            if (cliente_info.id && mongoose.Types.ObjectId.isValid(cliente_info.id)) {
                cliente_id_obj = cliente_info.id;
            } else if (cliente_info._id && mongoose.Types.ObjectId.isValid(cliente_info._id)) {
                cliente_id_obj = cliente_info._id;
            } else if (reserva_removida.cliente_id && mongoose.Types.ObjectId.isValid(reserva_removida.cliente_id)) {
                cliente_id_obj = reserva_removida.cliente_id;
            }

            await Producto_snaplog.create({
                producto: {
                    nombre: producto.nombre || producto.sku || 'Producto',
                    id: producto._id
                },
                usuario: {
                    nombre: usuario_req.usuario || usuario_req.nombre || 'Soporte Isotech',
                    id: usuario_id_obj
                },
                fecha: new Date(),
                accion: "2", // 2: descuento de inventario por envío de pedido
                cantidad: cantidad_descontar,
                cantidad_anterior: cantidad_descontar,
                pedido: {
                    folio: parseInt(reserva_removida.folio) || (parseInt(folio) || 0),
                    cliente: {
                        nombre: cliente_info.nombre || reserva_removida.cliente_id || 'Cliente',
                        id: cliente_id_obj
                    }
                },
                inventario_antes: {
                    existencias: existencias_antes,
                    apartados: total_apartados_antes
                },
                inventario_despues: {
                    existencias: existencias_despues,
                    apartados: total_apartados_despues
                },
                folios: []
            });
        } catch (errSnaplog) {
            console.error("Error creando Producto_snaplog:", errSnaplog);
        }

        // 2. Registrar en log físico y DB Log
        try {
            const dir_logs = path.join(process.cwd(), 'logs_correccion');
            if (!fs.existsSync(dir_logs)) fs.mkdirSync(dir_logs, { recursive: true });
            const archivo_log = path.join(dir_logs, 'apartados_huerfanos.log');
            const fecha_iso = new Date().toISOString();
            const cliente_nom = (reserva_removida.cliente && reserva_removida.cliente.nombre) ? reserva_removida.cliente.nombre : (reserva_removida.cliente_id || 'Desconocido');
            const linea = `[${fecha_iso}] LIMPIAR_Y_DESCONTAR | SKU: "${producto.sku || ''}" | Modelo: "${producto.modelo || ''}" | Producto: "${producto.nombre || ''}" | Folio: #${reserva_removida.folio || 'S/N'} | Cliente: "${cliente_nom}" | Cantidad Descontada: ${cantidad_descontar} | Stock: ${existencias_antes} -> ${existencias_despues}\n`;
            fs.appendFileSync(archivo_log, linea);

            await Log.create({
                activo: true,
                fecha: new Date(),
                usuario: {
                    nombre: (usuario_req && (usuario_req.usuario || usuario_req.nombre)) || 'devtools_huerfanos',
                    id: usuario_id_obj || 'devtools'
                },
                accion: 'LIMPIAR_Y_DESCONTAR_HUERFANO',
                body: JSON.stringify({
                    producto_id: producto._id,
                    sku: producto.sku,
                    modelo: producto.modelo,
                    nombre: producto.nombre,
                    folio,
                    cliente: cliente_nom,
                    cantidad_descontada: cantidad_descontar,
                    existencias_antes,
                    existencias_despues
                })
            });
        } catch (eLog) {
            console.error("Error al registrar Log:", eLog);
        }
    }

    return eliminado;
}
