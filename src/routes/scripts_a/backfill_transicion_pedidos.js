// Script de transición y backfill para producción:
// 1. Asigna carrito_id a apartados existentes en producto.carritos
// 2. Limpia reservas huérfanas
// 3. Pobla la colección de folios e inicializa FolioConfig
// Invocación vía GET por un administrador: GET /scripts_a/backfill_transicion_pedidos

import fs from 'fs';
import path from 'path';
import { Carrito } from '../../models/carrito';
import { Pedido } from '../../models/pedido';
import { Carrito_cancelado } from '../../models/carrito_cancelado';
import { Producto } from '../../models/producto';
import { Folio } from '../../models/folio';
import { FolioConfig } from '../../models/folio_config';
import { Log } from '../../models/log';
import * as accesos from '../app/accesos';

var FgBlack = "\x1b[30m";
var FgRed = "\x1b[31m";
var FgGreen = "\x1b[32m";
var FgYellow = "\x1b[33m";
var FgBlue = "\x1b[34m";
var BgGreen = "\x1b[42m";
var FgWhite = "\x1b[37m";
var Reset = "\x1b[0m";

// Objeto global de estado de migración en servidor
if (!global.estado_backfill) {
    global.estado_backfill = {
        ejecutando: false,
        total_pedidos: 0,
        pedidos_procesados: 0,
        folio_actual: '',
        cliente_actual: '',
        apartados_actualizados: 0,
        apartados_huerfanos_limpiados: 0,
        folios_poblados: 0,
        folio_siguiente_configurado: 0,
        completado: false,
        error: null,
        logs: []
    };
}

export async function get(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.status(401).send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.status(403).send({ ok: false, mensaje: "Requiere permisos administrativos" });
        return;
    }

    const accion = req.query.accion || 'estado';

    if (accion === 'estado') {
        res.send({ ok: true, estado: global.estado_backfill });
        return;
    }

    if (accion === 'iniciar') {
        if (global.estado_backfill.ejecutando) {
            res.send({ ok: true, mensaje: "Ya hay un proceso de actualización en curso", estado: global.estado_backfill });
            return;
        }

        // Inicializar estado
        global.estado_backfill = {
            ejecutando: true,
            total_pedidos: 0,
            pedidos_procesados: 0,
            folio_actual: '',
            cliente_actual: '',
            apartados_actualizados: 0,
            apartados_huerfanos_limpiados: 0,
            folios_poblados: 0,
            folio_siguiente_configurado: 0,
            completado: false,
            error: null,
            logs: ["Iniciando análisis de base de datos..."]
        };

        res.send({ ok: true, mensaje: "Proceso de actualización iniciado", estado: global.estado_backfill });

        // Ejecutar en segundo plano
        ejecutar_backfill_en_servidor().catch(err => {
            console.error("Error en ejecución en segundo plano de backfill:", err);
            global.estado_backfill.ejecutando = false;
            global.estado_backfill.error = err.message || String(err);
        });
        return;
    }

    res.send({ ok: false, mensaje: "Acción no reconocida" });
}

async function ejecutar_backfill_en_servidor() {
    try {
        let apartados_actualizados = 0;
        let apartados_huerfanos_limpiados = 0;
        let folios_poblados = 0;

        // 1. Buscar todos los carritos activos en fase previa a envío
        const carritos_activos = await Carrito.find({
            status: { $in: ['Pedido', 'pedido', 'Ficha pago', 'Ficha Pago', 'ficha pago', 'Pagado', 'pagado', 'Empaque', 'empaque', /^pedido$/i, /^ficha pago$/i, /^pagado$/i, /^empaque$/i] }
        });

        const total_pedidos = carritos_activos.length;
        global.estado_backfill.total_pedidos = total_pedidos;
        global.estado_backfill.logs.push(`Analizando ${total_pedidos} pedido(s) activo(s)...`);

        // 2. Asignar carrito_id y cliente_id en los apartados de producto.carritos
        for (let i = 0; i < carritos_activos.length; i++) {
            const carrito = carritos_activos[i];
            let productos_en_pedido = 0;
            let apartados_en_este_pedido = 0;

            try {
                const cliente_id_carrito = String(
                    carrito && carrito.cliente ? (carrito.cliente.id || carrito.cliente._id || '') : ''
                );
                const cliente_nombre_carrito = (carrito && carrito.cliente && carrito.cliente.nombre) ? carrito.cliente.nombre : 'Cliente';
                const cliente_correo_carrito = (carrito && carrito.cliente && carrito.cliente.correo) ? carrito.cliente.correo : '';
                const lista_items = (carrito && Array.isArray(carrito.lista)) ? carrito.lista : [];

                global.estado_backfill.pedidos_procesados = i + 1;
                global.estado_backfill.folio_actual = carrito ? carrito.folio : 'S/N';
                global.estado_backfill.cliente_actual = cliente_nombre_carrito;

                console.log(FgBlue + `[${i + 1}/${total_pedidos}] Carrito: ` + Reset + FgWhite + (carrito ? carrito._id : 'N/A') + FgGreen + " Cliente: " + FgBlue + cliente_id_carrito + FgGreen);

                for (let item of lista_items) {
                    console.log(FgBlue + "Item: " + Reset + FgWhite + item.producto._id);
                    if (!item || !item.producto || !item.producto._id) continue;
                    productos_en_pedido++;

                    const producto = await Producto.findById(item.producto._id);
                    if (!producto || !Array.isArray(producto.carritos)) continue;

                    let modificado = false;
                    producto.carritos = producto.carritos.map(reserva => {
                        if (!reserva || typeof reserva !== 'object') return reserva;

                        const reserva_cliente_id = String(
                            reserva.cliente_id ||
                            (reserva.cliente ? (reserva.cliente.id || reserva.cliente._id || '') : '')
                        );

                        const match_folio = (reserva.folio != null && carrito.folio != null) && String(reserva.folio) === String(carrito.folio);
                        const match_cliente = cliente_id_carrito !== '' && reserva_cliente_id !== '' && (cliente_id_carrito === reserva_cliente_id);
                        const match_carrito_id = (reserva.carrito_id != null) && String(reserva.carrito_id) === String(carrito._id);

                        if (match_folio || match_cliente || match_carrito_id) {
                            if (!reserva.carrito_id || String(reserva.carrito_id) !== String(carrito._id)) {
                                reserva.carrito_id = carrito._id;
                                modificado = true;
                            }
                            if (!reserva.cliente_id || String(reserva.cliente_id) !== cliente_id_carrito) {
                                reserva.cliente_id = cliente_id_carrito;
                                modificado = true;
                            }
                            if (!reserva.folio && carrito.folio) {
                                reserva.folio = carrito.folio;
                                modificado = true;
                            }
                            if (!reserva.cliente && carrito.cliente) {
                                reserva.cliente = {
                                    id: cliente_id_carrito,
                                    nombre: cliente_nombre_carrito,
                                    correo: cliente_correo_carrito
                                };
                                modificado = true;
                            }
                            if (modificado) {
                                apartados_actualizados++;
                                apartados_en_este_pedido++;
                            }
                        }
                        return reserva;
                    });

                    if (modificado) {
                        producto.markModified('carritos');
                        await producto.save();
                    }
                }

                global.estado_backfill.apartados_actualizados = apartados_actualizados;
                global.estado_backfill.logs.push(
                    `[${i + 1}/${total_pedidos}] Folio #${carrito ? carrito.folio : 'S/N'} (${cliente_nombre_carrito}): ${productos_en_pedido} prod., ${apartados_en_este_pedido} apartado(s) asignado(s)`
                );
            } catch (errOrder) {
                console.error(`Error procesando carrito [${i + 1}/${total_pedidos}]:`, errOrder);
                global.estado_backfill.logs.push(`[${i + 1}/${total_pedidos}] Error en pedido #${carrito ? carrito.folio : 'S/N'}`);
            }
        }

        // 3. Limpiar reservas huérfanas que no pertenezcan a ningún carrito en la colección Carrito
        global.estado_backfill.logs.push("Verificando y limpiando reservas huérfanas...");
        try {
            const todos_carritos = await Carrito.find({}, { _id: 1, folio: 1, status: 1, cliente: 1 }).lean();
            const ids_carritos_existentes = new Set(todos_carritos.map(c => String(c._id)));
            const folios_carritos_existentes = new Set(todos_carritos.filter(c => c && c.folio != null).map(c => String(c.folio)));
            const clientes_carritos_existentes = new Set(todos_carritos.map(c => (c && c.cliente) ? String(c.cliente.id || c.cliente._id || '') : '').filter(id => id !== ''));

            const productos_con_carritos = await Producto.find({ "carritos.0": { $exists: true } });
            for (let producto of productos_con_carritos) {
                if (!producto || !Array.isArray(producto.carritos)) continue;
                let carritos_validos = [];
                let hubo_cambio = false;

                for (let reserva of producto.carritos) {
                    if (!reserva || typeof reserva !== 'object') continue;
                    let es_valido = false;

                    if (reserva.carrito_id && ids_carritos_existentes.has(String(reserva.carrito_id))) {
                        es_valido = true;
                    }
                    if (!es_valido && reserva.folio != null && folios_carritos_existentes.has(String(reserva.folio))) {
                        es_valido = true;
                    }
                    if (!es_valido) {
                        const cliente_id_res = String(
                            reserva.cliente_id ||
                            (reserva.cliente ? (reserva.cliente.id || reserva.cliente._id || '') : '')
                        );
                        if (cliente_id_res && clientes_carritos_existentes.has(cliente_id_res)) {
                            es_valido = true;
                        }
                    }

                    if (es_valido) {
                        carritos_validos.push(reserva);
                    } else {
                        apartados_huerfanos_limpiados++;
                        hubo_cambio = true;
                        const cliente_nom = (reserva.cliente && reserva.cliente.nombre) ? reserva.cliente.nombre : (reserva.cliente_id || 'Desconocido');
                        const prod_info = producto.sku || producto.modelo || producto.nombre || producto._id;
                        const msg_huerfano = `Apartado huérfano eliminado en '${prod_info}' (Folio #${reserva.folio || 'S/N'}, Cliente: ${cliente_nom}, Cant: ${reserva.cantidad || 1})`;
                        console.log(FgYellow + msg_huerfano + Reset);
                        global.estado_backfill.logs.push(`⚠️ ${msg_huerfano}`);

                        // 1. Escribir registro persistente en archivo de log en servidor
                        try {
                            const dir_logs = path.join(process.cwd(), 'logs_correccion');
                            if (!fs.existsSync(dir_logs)) {
                                fs.mkdirSync(dir_logs, { recursive: true });
                            }
                            const archivo_log = path.join(dir_logs, 'apartados_huerfanos.log');
                            const fecha_iso = new Date().toISOString();
                            const linea_archivo = `[${fecha_iso}] SKU: "${producto.sku || ''}" | Modelo: "${producto.modelo || ''}" | Producto: "${producto.nombre || ''}" | ID_Prod: ${producto._id} | Folio: #${reserva.folio || 'S/N'} | Cliente: "${cliente_nom}" | Cantidad: ${reserva.cantidad || 1} | CarritoID_Reserva: ${reserva.carrito_id || 'N/A'}\n`;
                            fs.appendFileSync(archivo_log, linea_archivo);
                        } catch (errFile) {
                            console.error("Error escribiendo log físico de huérfanos:", errFile);
                        }

                        // 2. Registrar en la colección 'Log' de MongoDB para auditoría
                        try {
                            await Log.create({
                                activo: true,
                                fecha: new Date(),
                                usuario: { nombre: 'sistema_backfill_apartados', id: 'system' },
                                accion: 'LIMPIEZA_APARTADO_HUERFANO',
                                body: JSON.stringify({
                                    producto: {
                                        id: producto._id,
                                        sku: producto.sku,
                                        modelo: producto.modelo,
                                        nombre: producto.nombre
                                    },
                                    reserva_eliminada: reserva
                                })
                            });
                        } catch (errDbLog) {
                            console.error("Error registrando Log en DB:", errDbLog);
                        }
                    }
                }

                if (hubo_cambio) {
                    producto.carritos = carritos_validos;
                    producto.markModified('carritos');
                    await producto.save();
                }
            }
        } catch (errLimpieza) {
            console.error("Error en limpieza de huérfanos:", errLimpieza);
        }
        global.estado_backfill.apartados_huerfanos_limpiados = apartados_huerfanos_limpiados;

        // 4. Poblado de colección de Folios e inicialización de FolioConfig
        global.estado_backfill.logs.push("Poblando colección de folios e inicializando FolioConfig...");
        let max_folio = 0;
        try {
            const todos_carritos = await Carrito.find({}, { folio: 1, fecha: 1 }).lean();
            const todos_pedidos = await Pedido.find({}, { folio: 1, fecha: 1 }).lean();
            const todos_cancelados = await Carrito_cancelado.find({}, { folio: 1, fecha: 1 }).lean();

            const folios_existentes_docs = await Folio.find({}, { folio: 1, serie: 1 }).lean();
            const folios_existentes_set = new Set(folios_existentes_docs.map(f => `${f.serie || 'A'}_${f.folio}`));

            let nuevos_folios = [];

            const agregar_folio = (item, tipo, id_key) => {
                if (item && item.folio) {
                    const num_folio = parseInt(item.folio) || 0;
                    if (num_folio > max_folio) max_folio = num_folio;

                    const key = `A_${item.folio}`;
                    if (!folios_existentes_set.has(key)) {
                        folios_existentes_set.add(key);
                        let folio_doc = {
                            folio: item.folio,
                            serie: "A",
                            tipo: tipo,
                            fecha: item.fecha || new Date()
                        };
                        folio_doc[id_key] = item._id;
                        nuevos_folios.push(folio_doc);
                    }
                }
            };

            for (let c of (todos_carritos || [])) agregar_folio(c, 'carrito', 'carrito_id');
            for (let p of (todos_pedidos || [])) agregar_folio(p, 'pedido', 'pedido_id');
            for (let ca of (todos_cancelados || [])) agregar_folio(ca, 'cancelado', 'carrito_cancelado_id');

            if (nuevos_folios.length > 0) {
                await Folio.insertMany(nuevos_folios, { ordered: false }).catch(err => {
                    console.warn("Algunos folios no se insertaron por duplicado:", err.message);
                });
                folios_poblados = nuevos_folios.length;
            }
        } catch (errFolios) {
            console.error("Error en poblado de folios:", errFolios);
        }
        global.estado_backfill.folios_poblados = folios_poblados;

        const folio_siguiente = max_folio + 1;
        try {
            await FolioConfig.findOneAndUpdate(
                { serie: "A" },
                { $set: { folio_siguiente: folio_siguiente } },
                { upsert: true, new: true }
            );
        } catch (errConfig) {
            console.error("Error inicializando FolioConfig:", errConfig);
        }
        global.estado_backfill.folio_siguiente_configurado = folio_siguiente;

        global.estado_backfill.ejecutando = false;
        global.estado_backfill.completado = true;
        global.estado_backfill.logs.push("Actualización de apartados y pedidos completada con éxito.");
    } catch (err) {
        console.error("Error general en ejecutar_backfill_en_servidor:", err);
        global.estado_backfill.ejecutando = false;
        global.estado_backfill.error = err.message || String(err);
        global.estado_backfill.logs.push("ERROR: " + (err.message || String(err)));
    }
}
