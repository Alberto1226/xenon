import { Pedido } from "../../../models/pedido";
import { Pedimento } from "../../../models/pedimento";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const { fecha_inicio, fecha_fin, id_pedimento } = req.body;

    try {
        // Si se filtra por un pedimento específico, cargamos ese pedimento primero
        let pedimentoFiltrado = null;
        if (id_pedimento) {
            pedimentoFiltrado = await Pedimento.findById(id_pedimento).lean().exec();
            if (!pedimentoFiltrado) {
                res.send({
                    ok: true,
                    resumen: {
                        totalVendidoMXN: 0,
                        totalCostoMXN: 0,
                        utilidadBrutaMXN: 0,
                        margenUtilidad: 0
                    },
                    desglose: []
                });
                return;
            }
        }

        // Construir filtro de fechas para los pedidos
        const queryPedido = { status: { $in: ['Entregado', 'Enviado'] } }; // Solo pedidos completados/entregados
        if (fecha_inicio || fecha_fin) {
            queryPedido.fecha_entregado = {};
            if (fecha_inicio) queryPedido.fecha_entregado.$gte = new Date(fecha_inicio);
            if (fecha_fin) queryPedido.fecha_entregado.$lte = new Date(fecha_fin);
        } else if (!id_pedimento) {
            // Rango por defecto si no hay fechas ni pedimento: últimos 30 días para evitar lentitud
            const hace30Dias = new Date();
            hace30Dias.setDate(hace30Dias.getDate() - 30);
            queryPedido.fecha_entregado = { $gte: hace30Dias };
        }

        // Si filtramos por pedimento, optimizamos la consulta en la BD para traer solo pedidos vinculados
        if (id_pedimento && pedimentoFiltrado) {
            const prodIds = (pedimentoFiltrado.productos || []).map(p => {
                const id = p.producto && p.producto._id ? p.producto._id : p.producto;
                return id ? id.toString() : null;
            }).filter(Boolean);

            queryPedido.$or = [
                { 'lista.producto._id': { $in: prodIds } },
                { 'lista.pedimento_origen': id_pedimento }
            ];
        }

        // Obtener pedidos filtrados
        const pedidos = await Pedido.find(queryPedido).lean().exec();

        // Mapeo rápido para costos de productos de pedimentos en memoria
        const cacheCostos = {}; 

        // Obtener todos los pedimentos para asociar costos de ventas normales
        const todosPedimentos = await Pedimento.find({ status: 'arribado' })
            .sort({ fecha_arribo: -1 })
            .lean()
            .exec();

        // 1. Recopilar IDs únicos de productos y de pedimentos de preventa de una sola vez
        const idsProductosSet = new Set();
        const idsPedimentosOrigenSet = new Set();

        for (const pedido of pedidos) {
            if (!pedido.lista || !Array.isArray(pedido.lista)) continue;
            for (const item of pedido.lista) {
                if (item.producto) {
                    const prodId = item.producto._id || item.producto;
                    if (prodId) {
                        idsProductosSet.add(prodId.toString());
                    }
                }
                if (item.preventa && item.pedimento_origen) {
                    idsPedimentosOrigenSet.add(item.pedimento_origen.toString());
                }
            }
        }

        const idsProductos = Array.from(idsProductosSet);
        const idsPedimentosOrigen = Array.from(idsPedimentosOrigenSet);

        // 2. Consultar costos base de productos involucrados en una sola consulta
        const productosInfo = await Producto.find(
            { _id: { $in: idsProductos } },
            'precio_compra'
        ).lean().exec();

        const mapaPreciosCompra = {};
        for (const p of productosInfo) {
            mapaPreciosCompra[p._id.toString()] = p.precio_compra || 0;
        }

        // 3. Consultar todos los pedimentos de preventa involucrados de una sola consulta
        const pedimentosOrigenInfo = await Pedimento.find({
            _id: { $in: idsPedimentosOrigen }
        }).lean().exec();

        const mapaPedimentosOrigen = {};
        for (const ped of pedimentosOrigenInfo) {
            mapaPedimentosOrigen[ped._id.toString()] = ped;
        }

        let totalVendidoMXN = 0;
        let totalCostoMXN = 0;
        const desgloseProductos = {};

        for (const pedido of pedidos) {
            if (!pedido.lista || !Array.isArray(pedido.lista)) continue;

            for (const item of pedido.lista) {
                if (!item.producto) continue;
                
                const prodIdStr = item.producto._id.toString();
                const precioVentaUnitario = item.producto.precio || 0; 
                const cantidadVendida = item.cantidad || 0;
                
                if (id_pedimento && item.preventa && item.pedimento_origen && item.pedimento_origen.toString() !== id_pedimento) {
                    continue;
                }

                let costoFiscalUnitario = 0;
                let pedimentoUsadoId = null;
                let pedimentoUsadoNumero = "Ninguno / Base";

                if (item.preventa && item.pedimento_origen) {
                    pedimentoUsadoId = item.pedimento_origen.toString();
                    const cacheKey = `${prodIdStr}_${pedimentoUsadoId}`;
                    
                    if (cacheCostos[cacheKey] !== undefined) {
                        costoFiscalUnitario = cacheCostos[cacheKey];
                    } else {
                        const pedObj = mapaPedimentosOrigen[pedimentoUsadoId];
                        if (pedObj) {
                            pedimentoUsadoNumero = pedObj.numero_pedimento;
                            const prodItem = pedObj.productos.find(p => p.producto.toString() === prodIdStr);
                            if (prodItem) {
                                costoFiscalUnitario = prodItem.costo_fiscal_unitario_mxn || 0;
                            }
                        }
                        cacheCostos[cacheKey] = costoFiscalUnitario;
                    }
                } else {
                    if (id_pedimento) {
                        if (!pedimentoFiltrado) continue;
                        // Solo califica si el pedimento ya había arribado para la fecha de entrega del pedido
                        if (pedimentoFiltrado.fecha_arribo && new Date(pedimentoFiltrado.fecha_arribo) > new Date(pedido.fecha_entregado)) {
                            continue;
                        }
                        const prodItem = pedimentoFiltrado.productos.find(p => p.producto.toString() === prodIdStr);
                        if (!prodItem) {
                            continue; // No califica para este pedimento
                        }
                        costoFiscalUnitario = prodItem.costo_fiscal_unitario_mxn || 0;
                        pedimentoUsadoId = id_pedimento;
                        pedimentoUsadoNumero = pedimentoFiltrado.numero_pedimento;
                    } else {
                        // Buscar el último pedimento arribado antes de la entrega del pedido
                        const pedMatch = todosPedimentos.find(p => 
                            p.fecha_arribo && 
                            new Date(p.fecha_arribo) <= new Date(pedido.fecha_entregado) &&
                            p.productos.some(prod => prod.producto.toString() === prodIdStr)
                        );
                        if (pedMatch) {
                            pedimentoUsadoId = pedMatch._id.toString();
                            pedimentoUsadoNumero = pedMatch.numero_pedimento;
                            const prodItem = pedMatch.productos.find(p => p.producto.toString() === prodIdStr);
                            costoFiscalUnitario = prodItem.costo_fiscal_unitario_mxn || 0;
                        } else {
                            costoFiscalUnitario = mapaPreciosCompra[prodIdStr] || 0;
                        }
                    }
                }

                const ventaItemTotal = precioVentaUnitario * cantidadVendida;
                const costoItemTotal = costoFiscalUnitario * cantidadVendida;

                totalVendidoMXN += ventaItemTotal;
                totalCostoMXN += costoItemTotal;

                if (!desgloseProductos[prodIdStr]) {
                    desgloseProductos[prodIdStr] = {
                        nombre: item.producto.nombre,
                        codigo: item.producto.codigo,
                        cantidad_vendida: 0,
                        ventas_totales_mxn: 0,
                        costos_totales_mxn: 0,
                        utilidad_mxn: 0,
                        pedimento: pedimentoUsadoNumero
                    };
                }

                desgloseProductos[prodIdStr].cantidad_vendida += cantidadVendida;
                desgloseProductos[prodIdStr].ventas_totales_mxn += ventaItemTotal;
                desgloseProductos[prodIdStr].costos_totales_mxn += costoItemTotal;
                desgloseProductos[prodIdStr].utilidad_mxn += (ventaItemTotal - costoItemTotal);
            }
        }

        const utilidadBrutaMXN = totalVendidoMXN - totalCostoMXN;
        const margenUtilidad = totalVendidoMXN > 0 ? (utilidadBrutaMXN / totalVendidoMXN) * 100 : 0;

        res.send({
            ok: true,
            resumen: {
                totalVendidoMXN: Math.round(totalVendidoMXN * 100) / 100,
                totalCostoMXN: Math.round(totalCostoMXN * 100) / 100,
                utilidadBrutaMXN: Math.round(utilidadBrutaMXN * 100) / 100,
                margenUtilidad: Math.round(margenUtilidad * 100) / 100
            },
            desglose: Object.values(desgloseProductos)
        });

    } catch (err) {
        console.error("Error al calcular reporte de utilidades:", err);
        res.send({ ok: false, mensaje: "Error al calcular utilidades: " + err.message });
    }
}
