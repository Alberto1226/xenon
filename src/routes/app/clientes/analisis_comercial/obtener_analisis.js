import { Pedido } from '../../../../models/pedido';
import { Cliente } from '../../../../models/cliente';
import * as accesos from '../../accesos';
import * as mongoose from 'mongoose';

export async function post(req, res) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }

    let { cliente_id, clientes_ids, cliente_ids, periodicidad } = req.body;

    // Normalizar lista de IDs de cliente
    let ids = clientes_ids || cliente_ids;
    if (!ids && cliente_id) {
        ids = [cliente_id];
    } else if (typeof ids === 'string') {
        ids = [ids];
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.send({ ok: false, mensaje: "Debe proporcionar al menos un ID de cliente" });
    }

    try {
        const usuario = req.user;

        // 1. Obtener los datos de los clientes seleccionados
        const clientes = await Cliente.find({ _id: { $in: ids } });
        if (!clientes || clientes.length === 0) {
            return res.send({ ok: false, mensaje: "No se encontraron los clientes solicitados" });
        }

        // 2. Control de accesos de vendedor: verificar que los clientes pertenezcan a este agente si aplica
        if (accesos.tiene_permisos_vendedor(req)) {
            const noAutorizado = clientes.some(c => c.agente && c.agente.id && c.agente.id.toString() !== usuario._id.toString());
            if (noAutorizado) {
                return res.send({ ok: false, mensaje: "Permisos insuficientes para consultar alguno de los clientes seleccionados." });
            }
        }

        // 3. Obtener todos los pedidos de todos los clientes seleccionados ordenados por fecha ascendente
        const idsString = ids.map(id => id.toString());
        const queryPedidos = {
            "cliente.id": { $in: idsString }
        };
        const todosLosPedidos = await Pedido.find(queryPedidos).sort({ fecha: 1 });

        const primerCliente = clientes[0];
        const clientesInfo = clientes.map(c => ({
            _id: c._id,
            nombre: c.nombre,
            alias: c.alias,
            correo: c.correo,
            telefono: c.telefono,
            perfil: c.perfil ? c.perfil.perfil : "Público en general",
            porcentaje_descuento: c.perfil ? c.perfil.porcentaje : 0,
            fecha_creacion: c.createdAt || c.fecha_creacion
        }));

        if (todosLosPedidos.length === 0) {
            return res.send({
                ok: true,
                cliente: clientesInfo[0], // Compatibilidad individual
                clientes: clientesInfo,   // Lista multi-cliente
                metricas: {
                    total_historico: 0,
                    total_compras: 0,
                    ticket_promedio: 0,
                    ultima_compra: null,
                    primera_compra: null,
                    estado_comercial: "Inactivo",
                    crecimiento_porcentaje: 0
                },
                compras_por_anio: [],
                compras_por_mes: [],
                pedidos: []
            });
        }

        // 4. Calcular métricas básicas acumuladas de todos los clientes
        const total_historico = todosLosPedidos.reduce((sum, p) => sum + (p.total_pedido || 0), 0);
        const total_compras = todosLosPedidos.length;
        const ticket_promedio = total_historico / total_compras;
        const primera_compra = todosLosPedidos[0];
        const ultima_compra = todosLosPedidos[todosLosPedidos.length - 1];

        // 5. Filtrar los pedidos según la periodicidad solicitada por el frontend
        let pedidosFiltrados = todosLosPedidos;
        if (periodicidad && periodicidad.desde && periodicidad.hasta) {
            const fechaDesde = new Date(periodicidad.desde);
            const fechaHasta = new Date(periodicidad.hasta);
            pedidosFiltrados = todosLosPedidos.filter(p => {
                const f = new Date(p.fecha);
                return f >= fechaDesde && f <= fechaHasta;
            });
        }

        // 6. Agrupación por Año y Mes
        const anioAgregado = {};
        const mesAgregado = {};

        const mesesNombres = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        // A. Acumulado anual comparativo
        todosLosPedidos.forEach(pedido => {
            const fechaPedido = new Date(pedido.fecha);
            const anio = fechaPedido.getFullYear();

            if (!anioAgregado[anio]) {
                anioAgregado[anio] = { anio, total: 0, compras: 0 };
            }
            anioAgregado[anio].total += (pedido.total_pedido || 0);
            anioAgregado[anio].compras += 1;
        });

        // B. Acumulado mensual de tendencia
        pedidosFiltrados.forEach(pedido => {
            const fechaPedido = new Date(pedido.fecha);
            const anio = fechaPedido.getFullYear();
            const mesIdx = fechaPedido.getMonth();
            const mesNombre = mesesNombres[mesIdx];
            const mesAnioKey = `${mesNombre} ${anio}`;

            if (!mesAgregado[mesAnioKey]) {
                mesAgregado[mesAnioKey] = { mesAnio: mesAnioKey, anio, mesIdx, total: 0, compras: 0 };
            }
            mesAgregado[mesAnioKey].total += (pedido.total_pedido || 0);
            mesAgregado[mesAnioKey].compras += 1;
        });

        const compras_por_anio = Object.values(anioAgregado).sort((a, b) => a.anio - b.anio);
        const compras_por_mes = Object.values(mesAgregado).sort((a, b) => {
            if (a.anio !== b.anio) return a.anio - b.anio;
            return a.mesIdx - b.mesIdx;
        });

        // 7. Determinar el Estado Comercial Consolidado
        let estado_comercial = "Cliente frecuente";
        const ahora = new Date();
        const minFechaCreacion = Math.min(...clientes.map(c => new Date(c.createdAt || c.fecha_creacion).getTime()));
        const diasDesdeCreacion = (ahora - new Date(minFechaCreacion)) / (1000 * 60 * 60 * 24);
        const diasDesdeUltimaCompra = (ahora - new Date(ultima_compra.fecha)) / (1000 * 60 * 60 * 24);

        if (diasDesdeUltimaCompra > 180) {
            estado_comercial = "Inactivo";
        } else if (diasDesdeCreacion <= 90) {
            estado_comercial = "Cliente nuevo";
        } else {
            const comprasUltimos30Dias = todosLosPedidos.filter(p => (ahora - new Date(p.fecha)) / (1000 * 60 * 60 * 24) <= 30).length;
            if (comprasUltimos30Dias >= 3) {
                estado_comercial = "Frecuente";
            } else {
                const mesesActivos = new Set();
                const ultimos3Meses = [0, 1, 2].map(i => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    return `${d.getFullYear()}-${d.getMonth()}`;
                });
                todosLosPedidos.forEach(p => {
                    const f = new Date(p.fecha);
                    const key = `${f.getFullYear()}-${f.getMonth()}`;
                    if (ultimos3Meses.includes(key)) {
                        mesesActivos.add(key);
                    }
                });

                if (mesesActivos.size === 3) {
                    estado_comercial = "Recurrente";
                }
            }
        }

        // Crecimiento / Riesgo
        const anioEnCurso = ahora.getFullYear();
        const totalCurso = anioAgregado[anioEnCurso] ? anioAgregado[anioEnCurso].total : 0;
        const totalAnterior = anioAgregado[anioEnCurso - 1] ? anioAgregado[anioEnCurso - 1].total : 0;

        let crecimiento_porcentaje = 0;
        if (totalAnterior > 0) {
            crecimiento_porcentaje = ((totalCurso - totalAnterior) / totalAnterior) * 100;
            if (diasDesdeCreacion > 180 && estado_comercial !== "Inactivo") {
                if (crecimiento_porcentaje <= -30) {
                    estado_comercial = "En riesgo";
                } else if (crecimiento_porcentaje > 5) {
                    estado_comercial = "En crecimiento";
                }
            }
        }

        // 8. Mapear los pedidos retornados para el frontend con identificación clara del cliente
        const pedidosSimplificados = pedidosFiltrados.map(p => ({
            _id: p._id,
            folio: p.folio,
            fecha: p.fecha,
            total_pedido: p.total_pedido,
            metodo_pago: p.moneda || 'MXN',
            sucursal: p.usuario_que_registro ? p.usuario_que_registro.nombre : 'Sin registrar',
            cliente_nombre: p.cliente ? p.cliente.nombre : 'Cliente Desconocido',
            cliente_id: p.cliente ? p.cliente.id : '',
            cliente_correo: p.cliente ? p.cliente.correo : '',
            lista: (p.lista || []).map(item => ({
                cantidad: item.cantidad,
                codigo: item.producto ? item.producto.codigo : 'S/C',
                nombre: item.producto ? item.producto.nombre : 'Producto sin nombre',
                precio: item.producto ? item.producto.precio : 0
            }))
        })).reverse();

        return res.send({
            ok: true,
            cliente: clientesInfo[0],
            clientes: clientesInfo,
            metricas: {
                total_historico,
                total_compras,
                ticket_promedio,
                ultima_compra: {
                    fecha: ultima_compra.fecha,
                    total: ultima_compra.total_pedido,
                    folio: ultima_compra.folio,
                    cliente_nombre: ultima_compra.cliente ? ultima_compra.cliente.nombre : ''
                },
                primera_compra: {
                    fecha: primera_compra.fecha,
                    total: primera_compra.total_pedido,
                    folio: primera_compra.folio,
                    cliente_nombre: primera_compra.cliente ? primera_compra.cliente.nombre : ''
                },
                estado_comercial,
                crecimiento_porcentaje
            },
            compras_por_anio,
            compras_por_mes,
            pedidos: pedidosSimplificados
        });

    } catch (err) {
        console.error("Error al calcular el análisis comercial:", err);
        return res.send({ ok: false, mensaje: "Error interno del servidor al procesar el análisis." });
    }
}
