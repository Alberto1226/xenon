import { Pedido } from "../../../models/pedido";
import * as accesos from "../accesos";

const POR_PAGINA_DEFAULT = 15;

function escaparRegex(texto) {
    return String(texto || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const buscar = String(req.body.buscar || "").trim().slice(0, 80);
        const pagina = Math.max(1, Math.floor(Number(req.body.pagina)) || 1);
        const por_pagina = Math.min(100, Math.max(5, Math.floor(Number(req.body.por_pagina)) || POR_PAGINA_DEFAULT));

        const filtro = {
            status: { $in: ["Enviado", "Entregado"] },
            "facturacion.0": { $exists: false },
            "preparacion_factura.estado": { $nin: ["emitiendo", "emitida", "requiere_revision"] }
        };

        // Filtro por Estatus del pedido
        if (req.body.status && req.body.status !== "Todos") {
            filtro.status = req.body.status;
        }

        // Filtro por Estado de Preparación
        if (req.body.preparacion && req.body.preparacion !== "Todos") {
            if (req.body.preparacion === "pendiente") {
                filtro["preparacion_factura.estado"] = "pendiente";
            } else if (req.body.preparacion === "sin_preparar") {
                filtro.$or = (filtro.$or || []).concat([
                    { "preparacion_factura.estado": { $exists: false } },
                    { "preparacion_factura.estado": "" },
                    { "preparacion_factura.estado": null }
                ]);
            }
        }

        // Filtro por Mes y Año (sobre fecha del pedido)
        const tieneAnio = req.body.anio && req.body.anio !== "Todos";
        const tieneMes = req.body.mes && req.body.mes !== "Todos";

        if (tieneAnio && tieneMes) {
            const anioNum = parseInt(req.body.anio, 10);
            const mesNum = parseInt(req.body.mes, 10);
            if (!isNaN(anioNum) && !isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
                const fInicio = new Date(anioNum, mesNum - 1, 1, 0, 0, 0, 0);
                const fFin = new Date(anioNum, mesNum, 1, 0, 0, 0, 0);
                filtro.fecha = { $gte: fInicio, $lt: fFin };
            }
        } else if (tieneAnio && !tieneMes) {
            const anioNum = parseInt(req.body.anio, 10);
            if (!isNaN(anioNum)) {
                const fInicio = new Date(anioNum, 0, 1, 0, 0, 0, 0);
                const fFin = new Date(anioNum + 1, 0, 1, 0, 0, 0, 0);
                filtro.fecha = { $gte: fInicio, $lt: fFin };
            }
        } else if (!tieneAnio && tieneMes) {
            const mesNum = parseInt(req.body.mes, 10);
            const anioNum = new Date().getFullYear();
            if (!isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
                const fInicio = new Date(anioNum, mesNum - 1, 1, 0, 0, 0, 0);
                const fFin = new Date(anioNum, mesNum, 1, 0, 0, 0, 0);
                filtro.fecha = { $gte: fInicio, $lt: fFin };
            }
        }

        // Búsqueda rápida por folio o cliente
        if (buscar) {
            const condiciones = [{ "cliente.nombre": { $regex: escaparRegex(buscar), $options: "i" } }];
            if (/^\d+$/.test(buscar)) {
                condiciones.push({ folio: Number(buscar) });
            }
            if (filtro.$or) {
                filtro.$and = [{ $or: filtro.$or }, { $or: condiciones }];
                delete filtro.$or;
            } else {
                filtro.$or = condiciones;
            }
        }

        const traerTodos = req.body.todos === true || req.body.sin_paginar === true;
        const queryPedidos = Pedido.find(filtro)
            .select("folio cliente.nombre total_pedido moneda status fecha fecha_entregado preparacion_factura.estado preparacion_factura.tipo")
            .sort({ folio: -1 })
            .lean();

        if (!traerTodos) {
            queryPedidos.skip((pagina - 1) * por_pagina).limit(por_pagina);
        }

        const [total, pedidos, totalesAgregados] = await Promise.all([
            Pedido.countDocuments(filtro).exec(),
            queryPedidos.exec(),
            Pedido.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: null,
                        total_monto: { $sum: "$total_pedido" },
                        enviados: { $sum: { $cond: [{ $eq: ["$status", "Enviado"] }, 1, 0] } },
                        entregados: { $sum: { $cond: [{ $eq: ["$status", "Entregado"] }, 1, 0] } }
                    }
                }
            ]).exec()
        ]);

        const resumen = totalesAgregados && totalesAgregados[0] ? totalesAgregados[0] : { total_monto: 0, enviados: 0, entregados: 0 };

        res.send({
            ok: true,
            pedidos,
            total,
            paginas: Math.max(1, Math.ceil(total / por_pagina)),
            pagina_actual: pagina,
            resumen: {
                total_monto: resumen.total_monto || 0,
                enviados: resumen.enviados || 0,
                entregados: resumen.entregados || 0
            }
        });
    } catch (err) {
        console.error("Error en pedidos_pendientes:", err);
        res.send({ ok: false, mensaje: "No se pudieron consultar los pedidos." });
    }
}
