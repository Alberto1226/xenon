import { Pedido } from '../../../../models/pedido';
import { Cliente } from '../../../../models/cliente';
import * as accesos from '../../accesos';
import * as mongoose from 'mongoose';

export async function post(req, res) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }

    const { cliente_id, periodicidad } = req.body;

    if (!cliente_id) {
        return res.send({ ok: false, mensaje: "ID de cliente no proporcionado" });
    }

    try {
        const usuario = req.user;

        // 1. Obtener los datos del cliente
        const cliente = await Cliente.findById(cliente_id);
        if (!cliente) {
            return res.send({ ok: false, mensaje: "Cliente no encontrado" });
        }

        // 2. Control de accesos de vendedor: verificar que el cliente pertenezca a este agente
        if (accesos.tiene_permisos_vendedor(req)) {
            if (cliente.agente && cliente.agente.id && cliente.agente.id.toString() !== usuario._id.toString()) {
                return res.send({ ok: false, mensaje: "Permisos insuficientes para consultar este cliente." });
            }
        }

        // 3. Obtener todos los pedidos del cliente ordenados por fecha ascendente
        const queryPedidos = {
            "cliente.id": cliente_id
        };
        const todosLosPedidos = await Pedido.find(queryPedidos).sort({ fecha: 1 });

        if (todosLosPedidos.length === 0) {
            return res.send({
                ok: true,
                cliente: {
                    nombre: cliente.nombre,
                    alias: cliente.alias,
                    correo: cliente.correo,
                    telefono: cliente.telefono,
                    perfil: cliente.perfil ? cliente.perfil.perfil : "Público en general",
                    porcentaje_descuento: cliente.perfil ? cliente.perfil.porcentaje : 0,
                    fecha_creacion: cliente.createdAt || cliente.fecha_creacion
                },
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

        // 4. Calcular métricas básicas e históricos
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

        // A. Acumulado anual comparativo (sobre todos los pedidos históricos del cliente)
        todosLosPedidos.forEach(pedido => {
            const fechaPedido = new Date(pedido.fecha);
            const anio = fechaPedido.getFullYear();

            if (!anioAgregado[anio]) {
                anioAgregado[anio] = { anio, total: 0, compras: 0 };
            }
            anioAgregado[anio].total += (pedido.total_pedido || 0);
            anioAgregado[anio].compras += 1;
        });

        // B. Acumulado mensual de tendencia (sobre los pedidos del periodo filtrado)
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

        // 6. Determinar el Estado Comercial
        let estado_comercial = "Cliente frecuente";
        const ahora = new Date();
        const diasDesdeCreacion = (ahora - new Date(cliente.createdAt || cliente.fecha_creacion)) / (1000 * 60 * 60 * 24);
        const diasDesdeUltimaCompra = (ahora - new Date(ultima_compra.fecha)) / (1000 * 60 * 60 * 24);

        // A. Cliente Inactivo (sin compras en los últimos 6 meses / 180 días)
        if (diasDesdeUltimaCompra > 180) {
            estado_comercial = "Inactivo";
        }
        // B. Cliente Nuevo (< 90 días de registro y pocas compras)
        else if (diasDesdeCreacion <= 90) {
            estado_comercial = "Cliente nuevo";
        }
        else {
            // C. Cliente Frecuente (> 3 compras en los últimos 30 días)
            const comprasUltimos30Dias = todosLosPedidos.filter(p => (ahora - new Date(p.fecha)) / (1000 * 60 * 60 * 24) <= 30).length;
            if (comprasUltimos30Dias >= 3) {
                estado_comercial = "Frecuente";
            } else {
                // D. Cliente Recurrente (al menos 1 compra mensual en los últimos 3 meses consecutivos)
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

        // E. Cliente de Alto Valor (Facturación acumulada en el top 10% del mismo perfil)
        const perfil_cliente = cliente.perfil && cliente.perfil.perfil ? cliente.perfil.perfil : "Público en general";
        const resumen_clientes_perfil = await Pedido.aggregate([
            { $match: { "cliente.perfil.perfil": perfil_cliente } },
            { $group: { _id: "$cliente.id", total: { $sum: "$total_pedido" } } },
            { $sort: { total: -1 } }
        ]);

        const numClientes = resumen_clientes_perfil.length;
        if (numClientes > 0) {
            const indexCliente = resumen_clientes_perfil.findIndex(item => item._id === cliente_id);
            if (indexCliente !== -1) {
                const percentil = indexCliente / numClientes;
                if (percentil <= 0.10) { // Top 10% superior
                    estado_comercial = "Alto valor";
                }
            }
        }

        // F. Crecimiento / Riesgo (Año en curso vs Año anterior)
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

        // 7. Mapear los pedidos retornados para el frontend

        // Mapear los pedidos filtrados al formato simplificado que requiere la tabla del UI
        const pedidosSimplificados = pedidosFiltrados.map(p => ({
            _id: p._id,
            folio: p.folio,
            fecha: p.fecha,
            total_pedido: p.total_pedido,
            metodo_pago: p.moneda || 'MXN', // Moneda o método
            sucursal: p.usuario_que_registro ? p.usuario_que_registro.nombre : 'Sin registrar',
            lista: (p.lista || []).map(item => ({
                cantidad: item.cantidad,
                codigo: item.producto ? item.producto.codigo : 'S/C',
                nombre: item.producto ? item.producto.nombre : 'Producto sin nombre',
                precio: item.producto ? item.producto.precio : 0
            }))
        })).reverse(); // Los más recientes primero para la visualización de la tabla

        return res.send({
            ok: true,
            cliente: {
                nombre: cliente.nombre,
                alias: cliente.alias,
                correo: cliente.correo,
                telefono: cliente.telefono,
                perfil: perfil_cliente,
                porcentaje_descuento: cliente.perfil ? cliente.perfil.porcentaje : 0,
                fecha_creacion: cliente.createdAt || cliente.fecha_creacion
            },
            metricas: {
                total_historico,
                total_compras,
                ticket_promedio,
                ultima_compra: {
                    fecha: ultima_compra.fecha,
                    total: ultima_compra.total_pedido,
                    folio: ultima_compra.folio
                },
                primera_compra: {
                    fecha: primera_compra.fecha,
                    total: primera_compra.total_pedido,
                    folio: primera_compra.folio
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
