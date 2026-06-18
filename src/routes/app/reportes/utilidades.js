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
        // Construir filtro de fechas para los pedidos
        const queryPedido = { status: 'Entregado' }; // Solo pedidos completados/entregados
        if (fecha_inicio || fecha_fin) {
            queryPedido.fecha_entregado = {};
            if (fecha_inicio) queryPedido.fecha_entregado.$gte = new Date(fecha_inicio);
            if (fecha_fin) queryPedido.fecha_entregado.$lte = new Date(fecha_fin);
        }

        // Obtener todos los pedidos
        const pedidos = await Pedido.find(queryPedido).lean().exec();

        // Si se filtra por un pedimento específico, cargamos ese pedimento
        let pedimentoFiltrado = null;
        if (id_pedimento) {
            pedimentoFiltrado = await Pedimento.findById(id_pedimento).lean().exec();
        }

        // Mapeo rápido para costos de productos de pedimentos en memoria
        const cacheCostos = {}; 

        // Obtener todos los pedimentos para asociar costos de ventas normales
        const todosPedimentos = await Pedimento.find({ status: 'arribado' })
            .sort({ fecha_arribo: -1 })
            .lean()
            .exec();

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
                        const pedObj = await Pedimento.findById(item.pedimento_origen).lean().exec();
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
                        const prodItem = pedimentoFiltrado.productos.find(p => p.producto.toString() === prodIdStr);
                        if (!prodItem) {
                            continue; // No califica para este pedimento
                        }
                        costoFiscalUnitario = prodItem.costo_fiscal_unitario_mxn || 0;
                        pedimentoUsadoId = id_pedimento;
                        pedimentoUsadoNumero = pedimentoFiltrado.numero_pedimento;
                    } else {
                        const pedMatch = todosPedimentos.find(p => p.productos.some(prod => prod.producto.toString() === prodIdStr));
                        if (pedMatch) {
                            pedimentoUsadoId = pedMatch._id.toString();
                            pedimentoUsadoNumero = pedMatch.numero_pedimento;
                            const prodItem = pedMatch.productos.find(p => p.producto.toString() === prodIdStr);
                            costoFiscalUnitario = prodItem.costo_fiscal_unitario_mxn || 0;
                        } else {
                            const prodObj = await Producto.findById(item.producto._id).lean().exec();
                            costoFiscalUnitario = prodObj ? (prodObj.precio_compra || 0) : 0;
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
