import mongoose from 'mongoose';
import { Producto } from '../models/producto.js';
import { Producto_snaplog } from '../models/producto_snaplog.js';

/**
 * Obtiene los datos procesados de inventario cruzando Producto_snaplog con Producto.
 * @param {Object} params
 * @param {Date|string} params.fecha_inicio
 * @param {Date|string} params.fecha_fin
 * @param {boolean} [params.incluir_inactivos=false]
 * @param {string} [params.categoria='']
 * @param {string} [params.buscar='']
 * @returns {Promise<{ kpis: Object, muestra: Array, productos: Array }>}
 */
export async function obtenerDatosReporteInventario({
    fecha_inicio,
    fecha_fin,
    incluir_inactivos = false,
    categoria = '',
    buscar = ''
}) {
    // 1. Normalizar fechas
    const dInicio = fecha_inicio ? new Date(fecha_inicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    dInicio.setHours(0, 0, 0, 0);

    const dFin = fecha_fin ? new Date(fecha_fin) : new Date();
    dFin.setHours(23, 59, 59, 999);

    // 2. Construir filtro de productos
    const queryProducto = {};
    if (!incluir_inactivos) {
        queryProducto.activo = true;
    }
    if (categoria && categoria.trim() !== '') {
        queryProducto['category.nombre'] = categoria.trim();
    }
    if (buscar && buscar.trim() !== '') {
        const regex = new RegExp(buscar.trim(), 'i');
        queryProducto.$or = [
            { nombre: regex },
            { codigo: regex }
        ];
    }

    // 3. Consultar productos del catálogo
    const productosDB = await Producto.find(queryProducto)
        .select('_id nombre codigo precio existencia category activo unidad marca')
        .sort({ nombre: 1 })
        .lean()
        .exec();

    // 4. Agregar movimientos de Producto_snaplog en el rango de fechas
    // IMPORTANTE: Se filtran ÚNICAMENTE las acciones que alteran existencias físicas (1, 1c, 2, 3).
    // Se excluyen explícitamente los movimientos de carrito/apartados (4a, 4b, 4c, 4d, pendiente)
    // que solo reservan o liberan producto temporalmente pero no modifican existencias del almacén.
    const matchSnap = {
        fecha: { $gte: dInicio, $lte: dFin },
        accion: { $in: ["1", "1c", "2", "3"] }
    };

    const movimientosAgrupados = await Producto_snaplog.aggregate([
        { $match: matchSnap },
        {
            $project: {
                "producto.id": 1,
                accion: 1,
                cantidad: { $ifNull: ["$cantidad", 0] },
                diff_existencias: {
                    $subtract: [
                        { $ifNull: ["$inventario_despues.existencias", 0] },
                        { $ifNull: ["$inventario_antes.existencias", 0] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: "$producto.id",
                entradas: {
                    $sum: {
                        $switch: {
                            branches: [
                                // Inyección de existencias al almacén (1 y 1c)
                                {
                                    case: { $in: ["$accion", ["1", "1c"]] },
                                    then: { $cond: [{ $gt: ["$cantidad", 0] }, "$cantidad", { $max: ["$diff_existencias", 0] }] }
                                },
                                // Ajuste manual positivo por admin (3)
                                {
                                    case: { $and: [{ $eq: ["$accion", "3"] }, { $gt: ["$diff_existencias", 0] }] },
                                    then: "$diff_existencias"
                                }
                            ],
                            default: 0
                        }
                    }
                },
                salidas: {
                    $sum: {
                        $switch: {
                            branches: [
                                // Descuento de inventario por surtido/entrega de pedidos (2)
                                {
                                    case: { $eq: ["$accion", "2"] },
                                    then: { $cond: [{ $gt: ["$cantidad", 0] }, "$cantidad", { $abs: "$diff_existencias" }] }
                                },
                                // Ajuste manual negativo por admin (3)
                                {
                                    case: { $and: [{ $eq: ["$accion", "3"] }, { $lt: ["$diff_existencias", 0] }] },
                                    then: { $abs: "$diff_existencias" }
                                }
                            ],
                            default: 0
                        }
                    }
                },
                total_movimientos: {
                    $sum: {
                        $cond: [{ $ne: ["$diff_existencias", 0] }, 1, 0]
                    }
                }
            }
        }
    ]);

    // Indexar movimientos por ID de producto (string)
    const movMap = new Map();
    for (const mov of movimientosAgrupados) {
        if (mov._id) {
            movMap.set(String(mov._id), mov);
        }
    }

    // 5. Cruzar catálogo con los movimientos históricos
    let totalEntradas = 0;
    let totalSalidas = 0;
    let totalExistencias = 0;
    let totalValorInventario = 0;

    const productosProcesados = productosDB.map((p, index) => {
        const pId = String(p._id);
        const mov = movMap.get(pId) || { entradas: 0, salidas: 0, total_movimientos: 0 };

        const entradas = mov.entradas || 0;
        const salidas = mov.salidas || 0;
        const existencia = (p.existencia && typeof p.existencia.actual === 'number') ? p.existencia.actual : 0;
        const precio = typeof p.precio === 'number' ? p.precio : 0;
        const valorTotal = existencia * precio;
        const neto = entradas - salidas;

        totalEntradas += entradas;
        totalSalidas += salidas;
        totalExistencias += existencia;
        totalValorInventario += valorTotal;

        return {
            indice: index + 1,
            id: pId,
            codigo: p.codigo || 'S/C',
            nombre: p.nombre || 'Sin nombre',
            categoria: (p.category && p.category.nombre) ? p.category.nombre : 'General',
            marca: p.marca || '',
            unidad: p.unidad || 'Pza',
            activo: p.activo !== false,
            entradas,
            salidas,
            neto,
            existencia,
            precio,
            valorTotal
        };
    });

    const kpis = {
        total_productos: productosProcesados.length,
        total_entradas: totalEntradas,
        total_salidas: totalSalidas,
        total_existencias: totalExistencias,
        total_valor_inventario: Math.round(totalValorInventario * 100) / 100,
        fecha_inicio: dInicio.toISOString().slice(0, 10),
        fecha_fin: dFin.toISOString().slice(0, 10),
        incluir_inactivos
    };

    // Primeros 5 productos para vista previa en el modal
    const muestra = productosProcesados.slice(0, 5);

    return {
        kpis,
        muestra,
        productos: productosProcesados
    };
}
