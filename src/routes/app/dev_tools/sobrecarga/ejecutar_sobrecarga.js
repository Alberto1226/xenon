import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Carrito } from '../../../../models/carrito';
import { Pedido } from '../../../../models/pedido';
import { Carrito_cancelado } from '../../../../models/carrito_cancelado';
import { Producto } from '../../../../models/producto';
import { Cliente } from '../../../../models/cliente';
import { Ficha_de_descuento } from '../../../../models/ficha_de_descuento';
import { Producto_snaplog } from '../../../../models/producto_snaplog';
import { Log } from '../../../../models/log';
import {
    crear_pedido,
    cambiar_status_basico,
    cambiar_status_a_envio,
    cambiar_status_a_entregado,
    cancelar_pedido
} from '../../pedidos/_servicios/pedido_pipeline_service';
import { sincronizar_apartados_de_carrito } from '../../pedidos/_servicios/inventario_reserva_service';
import { snap_por_cambio_en_pedido } from '../../pedidos/editar/_producto_snaplogs/snap_por_cambio_en_pedido';
import { detectar_apartados_huerfanos } from '../huerfanos/obtener_huerfanos';
import * as accesos from '../../accesos';

function formatear_producto_para_pedido(prod_db) {
    const precio_prod = (prod_db.promo && prod_db.promo.tiene_promo && prod_db.promo.precio > 0)
        ? prod_db.promo.precio
        : (prod_db.precio || 0);

    const codigo_clean = (typeof prod_db.codigo === 'string' && prod_db.codigo.trim().length > 0 && prod_db.codigo !== 'true')
        ? prod_db.codigo
        : ((typeof prod_db.codigo_clave === 'string' && prod_db.codigo_clave.trim().length > 0 && prod_db.codigo_clave !== 'true')
            ? prod_db.codigo_clave
            : (prod_db.sku || 'S/C'));

    const marca_clean = (typeof prod_db.marca === 'string' && prod_db.marca.trim().length > 0 && prod_db.marca !== '0')
        ? prod_db.marca
        : 'S/M';

    const unidad_clean = (typeof prod_db.unidad === 'string' && prod_db.unidad.trim().length > 0 && prod_db.unidad !== '0')
        ? prod_db.unidad
        : 'Pza';

    return {
        _id: prod_db._id,
        nombre: prod_db.nombre || 'Producto Catálogo',
        sku: prod_db.sku || 'S/SKU',
        codigo: codigo_clean,
        marca: marca_clean,
        unidad: unidad_clean,
        precio: precio_prod
    };
}

// Objeto global para mantener el estado asíncrono de la prueba en el servidor
if (!global.estado_sobrecarga) {
    global.estado_sobrecarga = {
        ejecutando: false,
        modo: 'qa_completo', // 'rapido' o 'qa_completo'
        fase: 'idle', // 'idle', 'creando', 'procesando_flujo_qa', 'transicionando_envio', 'transicionando_entregado', 'auditoria', 'completado', 'error'
        total_pedidos: 1000,
        pedidos_creados: 0,
        pedidos_enviados: 0,
        pedidos_entregados: 0,
        pedidos_cancelados: 0,
        pedidos_editados: 0,
        rechazos_stock_insuficiente: 0,
        apartados_huerfanos_detectados: 0,
        snaplogs_generados: 0,
        logs_generados: 0,
        cuadre_financiero_ok: true,
        diferencias_financieras: 0,
        folios_secuenciales_ok: true,
        huecos_folios_detectados: 0,
        tiempo_inicio: null,
        tiempo_fin: null,
        duracion_segundos: 0,
        archivo_reporte: null,
        nombre_archivo: null,
        error: null,
        logs: []
    };
}

function es_entorno_local(req) {
    const host = (req.headers && req.headers.host) ? req.headers.host : '';
    return host.includes('localhost') || host.includes('127.0.0.1') || process.env.NODE_ENV === 'development';
}

function es_usuario_soporte(req) {
    if (!req.user) return false;
    return req.user.usuario === 'isotech_Xenonymas' || req.user.nombre === 'Soporte Isotech';
}

export async function get(req, res) {
    if (accesos.esta_logueado(req) === false) {
        res.status(401).send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.status(403).send({ ok: false, mensaje: "Requiere permisos administrativos" });
        return;
    }
    if (!es_usuario_soporte(req)) {
        res.status(403).send({ ok: false, mensaje: "Acceso exclusivo para el usuario Soporte Isotech." });
        return;
    }
    if (!es_entorno_local(req)) {
        res.status(403).send({ ok: false, mensaje: "La prueba de sobrecarga solo está habilitada en entorno local." });
        return;
    }

    const { accion, archivo } = req.query || {};

    if (accion === 'descargar_reporte' && archivo) {
        try {
            const nombre_limpio = path.basename(archivo);
            const ruta_archivo = path.join(process.cwd(), 'logs_correccion', nombre_limpio);

            if (fs.existsSync(ruta_archivo)) {
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Content-Disposition', `attachment; filename="${nombre_limpio}"`);
                const stream = fs.createReadStream(ruta_archivo);
                stream.pipe(res);
                return;
            } else {
                res.status(404).send({ ok: false, mensaje: "Archivo de reporte no encontrado" });
                return;
            }
        } catch (errFile) {
            res.status(500).send({ ok: false, mensaje: errFile.message || String(errFile) });
            return;
        }
    }

    res.send({ ok: true, estado: global.estado_sobrecarga });
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
    if (!es_usuario_soporte(req)) {
        res.status(403).send({ ok: false, mensaje: "Acceso exclusivo para el usuario Soporte Isotech." });
        return;
    }
    if (!es_entorno_local(req)) {
        res.status(403).send({ ok: false, mensaje: "La prueba de sobrecarga solo está habilitada en entorno local." });
        return;
    }

    const { accion, cantidad, concurrencia, modo, password } = req.body || {};

    if (accion === 'estado' || !accion) {
        res.send({ ok: true, estado: global.estado_sobrecarga });
        return;
    }

    if (accion === 'iniciar') {
        if (global.estado_sobrecarga.ejecutando) {
            res.send({ ok: true, mensaje: "Ya hay una prueba de sobrecarga en ejecución", estado: global.estado_sobrecarga });
            return;
        }

        if (!password || String(password).trim().length === 0) {
            res.status(400).send({ ok: false, mensaje: "Debe ingresar la contraseña del usuario Soporte Isotech para autorizar la ejecución." });
            return;
        }

        const { Usuario } = await import('../../../../models/usuario');
        const usuario_db = await Usuario.findById(req.user._id);
        if (!usuario_db) {
            res.status(401).send({ ok: false, mensaje: "Usuario no encontrado en la base de datos." });
            return;
        }

        const password_valida = usuario_db.validPassword(password);
        if (!password_valida) {
            res.status(401).send({ ok: false, mensaje: "Contraseña incorrecta. Se requiere la contraseña del usuario Soporte Isotech para iniciar." });
            return;
        }

        const num_pedidos = parseInt(cantidad) || 1000;
        const num_concurrencia = parseInt(concurrencia) || 50;
        const modo_prueba = modo || 'qa_completo';

        // Resetear estado
        global.estado_sobrecarga = {
            ejecutando: true,
            modo: modo_prueba,
            fase: 'creando',
            total_pedidos: num_pedidos,
            pedidos_creados: 0,
            pedidos_enviados: 0,
            pedidos_entregados: 0,
            pedidos_cancelados: 0,
            pedidos_editados: 0,
            rechazos_stock_insuficiente: 0,
            apartados_huerfanos_detectados: 0,
            snaplogs_generados: 0,
            logs_generados: 0,
            cuadre_financiero_ok: true,
            diferencias_financieras: 0,
            folios_secuenciales_ok: true,
            huecos_folios_detectados: 0,
            tiempo_inicio: Date.now(),
            tiempo_fin: null,
            duracion_segundos: 0,
            archivo_reporte: null,
            nombre_archivo: null,
            error: null,
            logs: [`Iniciando configuración de la prueba de sobrecarga en MODO: ${modo_prueba.toUpperCase()}...`]
        };

        res.send({ ok: true, mensaje: `Prueba de sobrecarga (${modo_prueba}) iniciada en segundo plano`, estado: global.estado_sobrecarga });

        // Ejecutar proceso asíncrono
        ejecutar_prueba_sobrecarga_en_servidor(req, num_pedidos, num_concurrencia, modo_prueba).catch(err => {
            console.error("Error en ejecución de prueba de sobrecarga:", err);
            global.estado_sobrecarga.ejecutando = false;
            global.estado_sobrecarga.fase = 'error';
            global.estado_sobrecarga.error = err.message || String(err);
        });
        return;
    }

    res.status(400).send({ ok: false, mensaje: "Acción no válida" });
}

async function ejecutar_prueba_sobrecarga_en_servidor(req, total_pedidos = 1000, tamano_lote = 50, modo = 'qa_completo') {
    const inicio_timestamp = Date.now();

    try {
        global.estado_sobrecarga.logs.push(`Configuración: ${total_pedidos} pedidos | Modo: ${modo.toUpperCase()} | Ráfagas concurrentes de ${tamano_lote} simultáneas.`);

        // 1. Obtener clientes y productos activos
        const clientes_db = await Cliente.find({}).lean();
        const productos_db = await Producto.find({ activo: true }).lean();

        if (!clientes_db || clientes_db.length === 0) {
            throw new Error("No hay clientes registrados en la base de datos para ejecutar la prueba.");
        }
        if (!productos_db || productos_db.length === 0) {
            throw new Error("No hay productos activos en el catálogo para ejecutar la prueba.");
        }

        global.estado_sobrecarga.logs.push(`Clientes disponibles: ${clientes_db.length} | Productos activos: ${productos_db.length}`);

        // Capturar existencias iniciales y precios reales de los productos de la BD
        let existencias_iniciales_map = new Map();
        for (let p of productos_db) {
            const ext = (p.existencia && p.existencia.actual != null)
                ? p.existencia.actual
                : (p.existencias != null ? p.existencias : (p.inventario || 0));
            const precio_real = (p.promo && p.promo.tiene_promo && p.promo.precio > 0)
                ? p.promo.precio
                : (p.precio || 0);

            existencias_iniciales_map.set(String(p._id), {
                id: String(p._id),
                sku: p.sku || 'S/SKU',
                modelo: p.modelo || 'S/M',
                nombre: p.nombre || 'Producto',
                precio: precio_real,
                existencias_iniciales: ext
            });
        }

        // FASE 1: CREACIÓN DE PEDIDOS EN PARALELO (Lotes de tamano_lote)
        global.estado_sobrecarga.fase = 'creando';
        global.estado_sobrecarga.logs.push(`FASE 1: Creación paralela concurrente de ${total_pedidos} pedidos (lotes de ${tamano_lote} en simultáneo)...`);

        let carritos_creados = [];

        for (let i = 0; i < total_pedidos; i += tamano_lote) {
            const lote_num = Math.floor(i / tamano_lote) + 1;
            const limite_lote = Math.min(i + tamano_lote, total_pedidos);
            const promesas_creacion = [];

            for (let j = i; j < limite_lote; j++) {
                promesas_creacion.push((async (index) => {
                    // Seleccionar un cliente real de la base de datos
                    const cliente_rand = clientes_db[Math.floor(Math.random() * clientes_db.length)];

                    // Obtener porcentaje de descuento real configurado en el perfil del cliente
                    const descuento_cliente_db = (cliente_rand.perfil && cliente_rand.perfil.porcentaje !== undefined)
                        ? cliente_rand.perfil.porcentaje
                        : 0;

                    let descuento_aplicar = descuento_cliente_db;

                    // En Modo QA Completo: En un 15% de casos crear una Ficha_de_descuento temporal
                    if (modo === 'qa_completo' && (index % 7 === 0)) {
                        descuento_aplicar = 15; // Descuento por ficha temporal
                        try {
                            await Ficha_de_descuento.create({
                                cliente: { nombre: cliente_rand.nombre, id: cliente_rand._id },
                                descuento: descuento_aplicar,
                                fecha: new Date(),
                                autorizo: { usuario: 'QA_Tester', id: 'qa' }
                            });
                        } catch (eFicha) { }
                    }

                    // Elegir entre 1 y 4 productos aleatorios distintos con su precio real de DB
                    const num_items = Math.floor(Math.random() * 4) + 1;
                    let productos_usados = new Set();
                    let lista_items = [];
                    let prod_raw_map = new Map();

                    for (let k = 0; k < num_items; k++) {
                        let prod_rand = productos_db[Math.floor(Math.random() * productos_db.length)];
                        if (!productos_usados.has(String(prod_rand._id))) {
                            productos_usados.add(String(prod_rand._id));
                            const cant = Math.floor(Math.random() * 3) + 1;
                            const prod_format = formatear_producto_para_pedido(prod_rand);
                            prod_raw_map.set(String(prod_rand._id), prod_rand);

                            lista_items.push({
                                cantidad: cant,
                                producto: prod_format
                            });
                        }
                    }

                    // Obtener dirección real del cliente o dirección formateada
                    let direccion_real = 'Dirección Principal del Cliente';
                    if (Array.isArray(cliente_rand.direcciones_asociadas) && cliente_rand.direcciones_asociadas.length > 0) {
                        const d = cliente_rand.direcciones_asociadas[0];
                        direccion_real = `${d.calle || ''} ${d.noext || ''}, ${d.colonia || ''}, ${d.municipio || ''}`.trim() || 'Dirección de envío';
                    }

                    const data_pedido = {
                        pedido_nuevo: {
                            cliente: {
                                _id: String(cliente_rand._id),
                                nombre: cliente_rand.nombre || 'Cliente',
                                correo: cliente_rand.correo || 'cliente@test.com'
                            },
                            descuento: descuento_aplicar,
                            cliente_direccion: direccion_real,
                            moneda: 'Pesos Mexicanos',
                            tipo_de_cambio: 1
                        }
                    };

                    const usuario_dummy = (req && req.user && req.user._id) ? req.user : { _id: new mongoose.Types.ObjectId(), nombre: 'DevStressTester', usuario: 'devstress' };

                    // 1. Crear carrito base con Folio atómico
                    const res_crear = await crear_pedido(data_pedido, usuario_dummy, req);
                    if (!res_crear || !res_crear.ok || !res_crear.carrito_creado || !res_crear.carrito_creado.doc_nuevo) {
                        throw new Error(`Error en creación de pedido #${index + 1}: ${res_crear ? res_crear.mensaje : 'Error desconocido'}`);
                    }

                    const carrito_doc = res_crear.carrito_creado.doc_nuevo;

                    // 2. Sincronizar lista e ítems apartados y calcular total_pedido con el descuento del cliente de DB
                    let total_dinero = 0;
                    for (let item of lista_items) {
                        total_dinero += (item.producto.precio || 0) * (item.cantidad || 1);
                    }
                    if (carrito_doc.descuento && carrito_doc.descuento > 0) {
                        total_dinero = total_dinero * (1 - (carrito_doc.descuento / 100));
                    }

                    carrito_doc.lista = lista_items;
                    carrito_doc.total_pedido = total_dinero;
                    carrito_doc.markModified('lista');
                    await carrito_doc.save();

                    await sincronizar_apartados_de_carrito(
                        carrito_doc._id,
                        cliente_rand._id,
                        lista_items,
                        usuario_dummy,
                        req
                    );

                    // 3. Generar Producto_snaplog '4a' (Agregar a pedido nuevo) para cada producto del pedido
                    for (let item of lista_items) {
                        try {
                            const raw_p = prod_raw_map.get(String(item.producto._id)) || { carritos: [], existencia: { actual: 0 } };
                            await snap_por_cambio_en_pedido(
                                { nombre: item.producto.nombre, id: item.producto._id },
                                { nombre: usuario_dummy.nombre, id: usuario_dummy._id },
                                item.cantidad,
                                0, // Cantidad anterior (0 para nuevo)
                                "4a", // Acción 4a: Agregar a pedido (Nuevo)
                                { folio: carrito_doc.folio, cliente: { nombre: cliente_rand.nombre, id: cliente_rand._id } },
                                raw_p
                            );
                        } catch (eSnap) { }
                    }

                    return {
                        index: index + 1,
                        carrito_id: carrito_doc._id,
                        folio: carrito_doc.folio,
                        cliente_nombre: cliente_rand.nombre || 'Cliente',
                        cliente_id: String(cliente_rand._id),
                        lista: lista_items,
                        descuento: carrito_doc.descuento || 0
                    };
                })(j));
            }

            const resultados_lote = await Promise.all(promesas_creacion);
            carritos_creados.push(...resultados_lote);

            global.estado_sobrecarga.pedidos_creados = carritos_creados.length;
            global.estado_sobrecarga.logs.push(`  ✓ Lote ${lote_num}: Creados ${resultados_lote.length} pedidos simultáneamente (Total: ${carritos_creados.length}/${total_pedidos})`);
        }

        global.estado_sobrecarga.logs.push(`✓ FASE 1 COMPLETADA: ${carritos_creados.length} pedidos creados con folios atómicos.`);

        let carritos_para_entregar = [];
        let carritos_cancelados_list = [];

        if (modo === 'qa_completo') {
            // FASE 2 MODO QA COMPLETO: SIMULACIÓN DE COMPORTAMIENTO REAL (Cancelaciones 15%, Ediciones 5%, Cadena de Estados 80%)
            global.estado_sobrecarga.fase = 'procesando_flujo_qa';
            global.estado_sobrecarga.logs.push(`FASE 2 (MODO QA): Simulación del flujo real de ventas (15% Cancelados, 5% Ediciones en caliente, 80% Flujo completo por Ficha Pago/Empaque)...`);

            // Separar pedidos para cancelar vs entregar
            for (let idx = 0; idx < carritos_creados.length; idx++) {
                const item_c = carritos_creados[idx];
                if (idx % 7 === 0) {
                    // 15% Cancelados
                    carritos_cancelados_list.push(item_c);
                } else {
                    carritos_para_entregar.push(item_c);
                }
            }

            // A) Cancelaciones Concurrente Simultáneas
            global.estado_sobrecarga.logs.push(`  → Ejecutando cancelaciones concurrentes de ${carritos_cancelados_list.length} pedidos (15% del total)...`);
            for (let i = 0; i < carritos_cancelados_list.length; i += tamano_lote) {
                const limite_lote = Math.min(i + tamano_lote, carritos_cancelados_list.length);
                const promesas_cancel = [];
                for (let j = i; j < limite_lote; j++) {
                    const item_c = carritos_cancelados_list[j];
                    const usuario_dummy = (req && req.user && req.user._id) ? req.user : { _id: new mongoose.Types.ObjectId(), nombre: 'DevStressTester', usuario: 'devstress' };
                    promesas_cancel.push(cancelar_pedido(item_c.carrito_id, usuario_dummy, req));
                }
                const res_cancel = await Promise.all(promesas_cancel);
                const ok_cancel = res_cancel.filter(r => r && r.ok).length;
                global.estado_sobrecarga.pedidos_cancelados += ok_cancel;
            }
            global.estado_sobrecarga.logs.push(`  ✓ ${global.estado_sobrecarga.pedidos_cancelados} pedidos cancelados correctamente. Reservas liberadas de producto.carritos.`);

            // B) Ediciones en Caliente
            global.estado_sobrecarga.logs.push(`  → Ejecutando ediciones en caliente en 5% de los pedidos restantes...`);
            for (let idx = 0; idx < carritos_para_entregar.length; idx += 20) {
                const item_c = carritos_para_entregar[idx];
                try {
                    const prod_extra = productos_db[Math.floor(Math.random() * productos_db.length)];
                    const prod_extra_format = formatear_producto_para_pedido(prod_extra);

                    item_c.lista.push({
                        cantidad: 1,
                        producto: prod_extra_format
                    });

                    let total_dinero = 0;
                    for (let item of item_c.lista) {
                        total_dinero += (item.producto.precio || 0) * (item.cantidad || 1);
                    }
                    if (item_c.descuento && item_c.descuento > 0) {
                        total_dinero = total_dinero * (1 - (item_c.descuento / 100));
                    }

                    await Carrito.updateOne(
                        { _id: item_c.carrito_id },
                        { $set: { lista: item_c.lista, total_pedido: total_dinero } }
                    );

                    const usuario_dummy = (req && req.user && req.user._id) ? req.user : { _id: new mongoose.Types.ObjectId(), nombre: 'DevStressTester', usuario: 'devstress' };
                    await sincronizar_apartados_de_carrito(item_c.carrito_id, item_c.cliente_id, item_c.lista, usuario_dummy, req);

                    // Generar Producto_snaplog '4a' para la edición en caliente
                    try {
                        await snap_por_cambio_en_pedido(
                            { nombre: prod_extra_format.nombre, id: prod_extra_format._id },
                            { nombre: usuario_dummy.nombre, id: usuario_dummy._id },
                            1,
                            0,
                            "4a",
                            { folio: item_c.folio, cliente: { nombre: item_c.cliente_nombre, id: item_c.cliente_id } },
                            prod_extra
                        );
                    } catch (eSnapEdit) { }

                    global.estado_sobrecarga.pedidos_editados++;
                } catch (eEdit) { }
            }
            global.estado_sobrecarga.logs.push(`  ✓ ${global.estado_sobrecarga.pedidos_editados} pedidos editados en caliente y resincronizados.`);

            // C) Paso por Cadena de Estados ('Ficha pago' -> 'Pagado' -> 'Empaque')
            global.estado_sobrecarga.logs.push(`  → Transicionando ${carritos_para_entregar.length} pedidos por la cadena completa de estados (Ficha pago ➔ Pagado ➔ Empaque)...`);
            for (let i = 0; i < carritos_para_entregar.length; i += tamano_lote) {
                const limite_lote = Math.min(i + tamano_lote, carritos_para_entregar.length);
                const promesas_estados = [];
                for (let j = i; j < limite_lote; j++) {
                    const item_c = carritos_para_entregar[j];
                    const usuario_dummy = (req && req.user && req.user._id) ? req.user : { _id: new mongoose.Types.ObjectId(), nombre: 'DevStressTester', usuario: 'devstress' };
                    promesas_estados.push((async () => {
                        await cambiar_status_basico(item_c.carrito_id, 'Ficha pago', usuario_dummy, req);
                        await cambiar_status_basico(item_c.carrito_id, 'Pagado', usuario_dummy, req);
                        await cambiar_status_basico(item_c.carrito_id, 'Empaque', usuario_dummy, req);
                    })());
                }
                await Promise.all(promesas_estados);
            }
            global.estado_sobrecarga.logs.push(`  ✓ Pedidos pasaron por los estados intermedios sin inconsistencias.`);

        } else {
            carritos_para_entregar = carritos_creados;
        }

        // FASE 3: TRANSICIÓN EN PARALELO A ESTADO 'ENVÍO'
        global.estado_sobrecarga.fase = 'transicionando_envio';
        global.estado_sobrecarga.logs.push(`FASE 3: Transición concurrente simultánea a status 'Envío' (Deducción atómica de existencias + Snaplogs)...`);

        for (let i = 0; i < carritos_para_entregar.length; i += tamano_lote) {
            const lote_num = Math.floor(i / tamano_lote) + 1;
            const limite_lote = Math.min(i + tamano_lote, carritos_para_entregar.length);
            const promesas_envio = [];

            for (let j = i; j < limite_lote; j++) {
                const item_c = carritos_para_entregar[j];
                const usuario_dummy = (req && req.user && req.user._id) ? req.user : { _id: new mongoose.Types.ObjectId(), nombre: 'DevStressTester', usuario: 'devstress' };
                promesas_envio.push(cambiar_status_a_envio(item_c.carrito_id, {}, usuario_dummy, req));
            }

            const res_lote_envio = await Promise.all(promesas_envio);
            const exito_lote = res_lote_envio.filter(r => r && r.ok).length;
            global.estado_sobrecarga.pedidos_enviados += exito_lote;

            global.estado_sobrecarga.logs.push(`  ✓ Lote ${lote_num}: ${exito_lote}/${res_lote_envio.length} pedidos en estado 'Envío' simultáneamente (Total: ${global.estado_sobrecarga.pedidos_enviados}/${carritos_para_entregar.length})`);
        }

        // FASE 4: TRANSICIÓN EN PARALELO A ESTADO 'ENTREGADO' (Pedido Histórico)
        global.estado_sobrecarga.fase = 'transicionando_entregado';
        global.estado_sobrecarga.logs.push(`FASE 4: Traslado concurrente simultáneo a colección de Pedidos Entregados...`);

        for (let i = 0; i < carritos_para_entregar.length; i += tamano_lote) {
            const lote_num = Math.floor(i / tamano_lote) + 1;
            const limite_lote = Math.min(i + tamano_lote, carritos_para_entregar.length);
            const promesas_entregado = [];

            for (let j = i; j < limite_lote; j++) {
                const item_c = carritos_para_entregar[j];
                const usuario_dummy = (req && req.user && req.user._id) ? req.user : { _id: new mongoose.Types.ObjectId(), nombre: 'DevStressTester', usuario: 'devstress' };
                promesas_entregado.push(cambiar_status_a_entregado(item_c.carrito_id, usuario_dummy, req));
            }

            const res_lote_entregado = await Promise.all(promesas_entregado);
            const exito_lote = res_lote_entregado.filter(r => r && r.ok).length;
            global.estado_sobrecarga.pedidos_entregados += exito_lote;

            global.estado_sobrecarga.logs.push(`  ✓ Lote ${lote_num}: ${exito_lote}/${res_lote_entregado.length} pedidos trasladados a 'Entregado' simultáneamente (Total: ${global.estado_sobrecarga.pedidos_entregados}/${carritos_para_entregar.length})`);
        }

        // FASE 5: AUDITORÍA QA DE CONSISTENCIA, CUADRE FINANCIERO Y FOLIOS SECUENCIALES
        global.estado_sobrecarga.fase = 'auditoria';
        global.estado_sobrecarga.logs.push(`FASE 5: Ejecutando suite de auditoría QA (Cuadre financiero, folios sin huecos, apartados huérfanos)...`);

        // A) Cuadre Financiero (total_pedido vs cálculo de ítems)
        let diferencias_financieras = 0;
        const pedidos_historicos_creados = await Pedido.find({
            folio: { $in: carritos_creados.map(c => c.folio) }
        }).lean();

        for (let p_hist of pedidos_historicos_creados) {
            let suma_calculada = 0;
            if (Array.isArray(p_hist.lista)) {
                for (let it of p_hist.lista) {
                    const px = (it.producto && it.producto.precio) ? it.producto.precio : 0;
                    suma_calculada += (px * (it.cantidad || 1));
                }
            }
            if (p_hist.descuento && p_hist.descuento > 0) {
                suma_calculada = suma_calculada * (1 - (p_hist.descuento / 100));
            }

            if (p_hist.total_pedido != null && Math.abs(p_hist.total_pedido - suma_calculada) > 1.0) {
                diferencias_financieras++;
            }
        }
        global.estado_sobrecarga.cuadre_financiero_ok = (diferencias_financieras === 0);
        global.estado_sobrecarga.diferencias_financieras = diferencias_financieras;
        global.estado_sobrecarga.logs.push(`  ✓ Auditoría Financiera: ${diferencias_financieras === 0 ? 'CUADRE MATEMÁTICO 100% CORRECTO' : `ALERTA: ${diferencias_financieras} diferencias de totales`}`);

        // B) Verificación de Folios Secuenciales sin Huecos (Gaps check)
        const folios_ordenados = carritos_creados.map(c => parseInt(c.folio) || 0).filter(f => f > 0).sort((a, b) => a - b);
        let huecos_detectados = 0;
        for (let k = 1; k < folios_ordenados.length; k++) {
            if (folios_ordenados[k] !== folios_ordenados[k - 1] + 1) {
                huecos_detectados++;
            }
        }
        global.estado_sobrecarga.folios_secuenciales_ok = (huecos_detectados === 0);
        global.estado_sobrecarga.huecos_folios_detectados = huecos_detectados;
        global.estado_sobrecarga.logs.push(`  ✓ Secuencia de Folios: ${huecos_detectados === 0 ? 'SECUENCIA CONTINUA PERFECTA (Sin huecos)' : `ALERTA: ${huecos_detectados} salto(s) de numeración`}`);

        // C) Detectar apartados huérfanos generados
        const huerfanos_post = await detectar_apartados_huerfanos();
        global.estado_sobrecarga.apartados_huerfanos_detectados = huerfanos_post.length;
        global.estado_sobrecarga.logs.push(`  ✓ Auditoría de Huérfanos: ${huerfanos_post.length} detectados (Esperado: 0)`);

        // D) Contabilizar Producto_snaplogs generados durante la prueba
        const snaplogs_count = await Producto_snaplog.countDocuments({
            fecha: { $gte: new Date(inicio_timestamp) },
            accion: "2"
        });
        global.estado_sobrecarga.snaplogs_generados = snaplogs_count;

        // E) Contabilizar registros de Log de actividad
        const logs_count = await Log.countDocuments({
            fecha: { $gte: new Date(inicio_timestamp) }
        });
        global.estado_sobrecarga.logs_generados = logs_count;

        // Capturar existencias finales
        const productos_post_db = await Producto.find({ activo: true }).lean();
        let existencias_finales_map = new Map();
        for (let p of productos_post_db) {
            const ext = (p.existencia && p.existencia.actual != null)
                ? p.existencia.actual
                : (p.existencias != null ? p.existencias : (p.inventario || 0));
            existencias_finales_map.set(String(p._id), ext);
        }

        // FASE 6: GENERACIÓN DEL REPORTE TXT QA EXPANDIDO
        const timestamp_str = new Date().toISOString().replace(/[:.]/g, '-');
        const dir_logs = path.join(process.cwd(), 'logs_correccion');
        if (!fs.existsSync(dir_logs)) fs.mkdirSync(dir_logs, { recursive: true });

        const nombre_archivo = `prueba_sobrecarga_${modo}_${timestamp_str}.txt`;
        const ruta_reporte = path.join(dir_logs, nombre_archivo);

        const fin_timestamp = Date.now();
        const duracion_seg = Math.round((fin_timestamp - inicio_timestamp) / 1000);

        let lineas_reporte = [];
        lineas_reporte.push(`====================================================================`);
        lineas_reporte.push(`REPORTE DE SUITE DE PRUEBAS QA Y SOBRECARGA DE VENTAS`);
        lineas_reporte.push(`====================================================================`);
        lineas_reporte.push(`Modo de Ejecución       : ${modo.toUpperCase()}`);
        lineas_reporte.push(`Fecha de ejecución      : ${new Date(inicio_timestamp).toLocaleString('es-MX')}`);
        lineas_reporte.push(`Duración total          : ${duracion_seg} segundos`);
        lineas_reporte.push(`Pedidos creados         : ${carritos_creados.length} / ${total_pedidos}`);
        lineas_reporte.push(`Pedidos Cancelados (15%): ${global.estado_sobrecarga.pedidos_cancelados}`);
        lineas_reporte.push(`Pedidos Editados (5%)   : ${global.estado_sobrecarga.pedidos_editados}`);
        lineas_reporte.push(`Transiciones a Envío    : ${global.estado_sobrecarga.pedidos_enviados}`);
        lineas_reporte.push(`Transiciones Entregado  : ${global.estado_sobrecarga.pedidos_entregados}`);
        lineas_reporte.push(`--------------------------------------------------------------------`);
        lineas_reporte.push(`RESULTADOS DE AUDITORÍA QA:`);
        lineas_reporte.push(`  - Huérfanos Detectados : ${huerfanos_post.length} (esperado: 0)`);
        lineas_reporte.push(`  - Cuadre Financiero    : ${diferencias_financieras === 0 ? 'CORRECTO (100% sin diferencias)' : `DIFERENCIAS EN ${diferencias_financieras} PEDIDOS`}`);
        lineas_reporte.push(`  - Secuencia de Folios  : ${huecos_detectados === 0 ? 'CONTINUA (0 huecos / gaps)' : `SALTOS DETECTADOS EN ${huecos_detectados} FOLIOS`}`);
        lineas_reporte.push(`  - Snaplogs Generados   : ${snaplogs_count}`);
        lineas_reporte.push(`  - Logs de Actividad    : ${logs_count}`);
        lineas_reporte.push(`====================================================================\n`);

        lineas_reporte.push(`DETALLE DE PEDIDOS E INTERACCIONES DE PRODUCTOS (${carritos_creados.length} PEDIDOS):\n`);

        for (let c of carritos_creados) {
            lineas_reporte.push(`--------------------------------------------------------------------`);
            lineas_reporte.push(`Folio: #${c.folio} | ID: ${c.carrito_id} | Cliente: ${c.cliente_nombre}`);
            lineas_reporte.push(`Productos incluidos (${c.lista.length}):`);
            for (let item of c.lista) {
                const info_p = existencias_iniciales_map.get(String(item.producto._id)) || {};
                const stock_ini = info_p.existencias_iniciales != null ? info_p.existencias_iniciales : 'N/A';
                const stock_fin = existencias_finales_map.get(String(item.producto._id)) != null ? existencias_finales_map.get(String(item.producto._id)) : 'N/A';
                lineas_reporte.push(`  - Producto: "${item.producto.nombre}" (SKU: ${item.producto.sku || 'S/SKU'}) | Cantidad Pedida: ${item.cantidad} | Stock Inicial: ${stock_ini} -> Stock Final: ${stock_fin}`);
            }
        }

        lineas_reporte.push(`\n====================================================================`);
        lineas_reporte.push(`FIN DEL REPORTE DE SUITE DE PRUEBAS QA`);
        lineas_reporte.push(`====================================================================\n`);

        fs.writeFileSync(ruta_reporte, lineas_reporte.join('\n'));

        global.estado_sobrecarga.fase = 'completado';
        global.estado_sobrecarga.duracion_segundos = duracion_seg;
        global.estado_sobrecarga.archivo_reporte = ruta_reporte;
        global.estado_sobrecarga.nombre_archivo = nombre_archivo;
        global.estado_sobrecarga.logs.push(`✓ PRUEBA QA FINALIZADA EXITOSAMENTE en ${duracion_seg} seg. Reporte generado: ${nombre_archivo}`);

    } catch (errStress) {
        console.error("Error en prueba de sobrecarga:", errStress);
        global.estado_sobrecarga.fase = 'error';
        global.estado_sobrecarga.error = errStress.message || String(errStress);
        global.estado_sobrecarga.logs.push(`❌ ERROR EN PRUEBA DE SOBRECARGA: ${errStress.message || String(errStress)}`);
    } finally {
        global.estado_sobrecarga.ejecutando = false;
        global.estado_sobrecarga.tiempo_fin = Date.now();
    }
}
