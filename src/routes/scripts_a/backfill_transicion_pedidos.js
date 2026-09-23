// Script de transición y backfill para producción:
// 1. Asigna carrito_id, cliente_id y datos requeridos a apartados existentes en producto.carritos
// 2. Pobla la colección de folios e inicializa FolioConfig (folio_siguiente = max_folio + 1)
// Nota: La eliminación de apartados huérfanos se gestiona mediante la interfaz de Dev Tools / Huérfanos.

import { Carrito } from '../../models/carrito';
import { Pedido } from '../../models/pedido';
import { Carrito_cancelado } from '../../models/carrito_cancelado';
import { Producto } from '../../models/producto';
import { Folio } from '../../models/folio';
import { FolioConfig } from '../../models/folio_config';
import * as accesos from '../app/accesos';

var FgBlue = "\x1b[34m";
var FgGreen = "\x1b[32m";
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
            folios_poblados: 0,
            folio_siguiente_configurado: 0,
            completado: false,
            error: null,
            logs: ["Iniciando análisis de base de datos..."]
        };

        res.send({ ok: true, mensaje: "Proceso de actualización e inicialización iniciado", estado: global.estado_backfill });

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
        let folios_poblados = 0;

        // 1. Buscar todos los carritos activos en fase previa a envío
        const carritos_activos = await Carrito.find({
            status: { $in: ['Pedido', 'pedido', 'Ficha pago', 'Ficha Pago', 'ficha pago', 'Pagado', 'pagado', 'Empaque', 'empaque', /^pedido$/i, /^ficha pago$/i, /^pagado$/i, /^empaque$/i] }
        });

        const total_pedidos = carritos_activos.length;
        global.estado_backfill.total_pedidos = total_pedidos;
        global.estado_backfill.logs.push(`Analizando ${total_pedidos} pedido(s) activo(s)...`);

        // 2. Asignar carrito_id, cliente_id y datos requeridos en los apartados de producto.carritos
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
                    `[${i + 1}/${total_pedidos}] Folio #${carrito ? carrito.folio : 'S/N'} (${cliente_nombre_carrito}): ${productos_en_pedido} prod., ${apartados_en_este_pedido} apartado(s) enriquecido(s)`
                );
            } catch (errOrder) {
                console.error(`Error procesando carrito [${i + 1}/${total_pedidos}]:`, errOrder);
                global.estado_backfill.logs.push(`[${i + 1}/${total_pedidos}] Error en pedido #${carrito ? carrito.folio : 'S/N'}`);
            }
        }

        // 3. Poblado de colección de Folios e inicialización de FolioConfig
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
        global.estado_backfill.logs.push("Actualización de datos de apartados y folios completada con éxito.");
    } catch (err) {
        console.error("Error general en ejecutar_backfill_en_servidor:", err);
        global.estado_backfill.ejecutando = false;
        global.estado_backfill.error = err.message || String(err);
        global.estado_backfill.logs.push("ERROR: " + (err.message || String(err)));
    }
}
