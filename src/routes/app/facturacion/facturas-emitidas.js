import { Factura } from "../../../models/factura";
import * as accesos from "../accesos";

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
        const pagina = Math.max(1, Math.floor(Number(req.body.pagina)) || 1);
        const por_pagina = Math.min(100, Math.max(5, Math.floor(Number(req.body.por_pagina)) || 15));

        const filtro = {};

        // Filtro por Estado
        if (req.body.status && req.body.status !== "Todos") {
            filtro.status = req.body.status;
        }

        // Filtro por Folio específico
        if (req.body.folio) {
            const folRegex = new RegExp(escaparRegex(req.body.folio), "i");
            const folNum = Number(req.body.folio);
            const orFol = [{ folio: folRegex }, { serie: folRegex }];
            if (!isNaN(folNum) && folNum > 0) {
                orFol.push({ folio_pedido: folNum });
            }
            filtro.$or = (filtro.$or || []).concat(orFol);
        }

        // Filtro por UUID específico
        if (req.body.uuid) {
            filtro.uuid = new RegExp(escaparRegex(req.body.uuid), "i");
        }

        // Filtro por Receptor específico (nombre o RFC)
        if (req.body.receptor) {
            const recRegex = new RegExp(escaparRegex(req.body.receptor), "i");
            filtro.$or = (filtro.$or || []).concat([
                { "receptor.nombre": recRegex },
                { "receptor.rfc": recRegex }
            ]);
        }

        // Búsqueda General rápida (coincide con UUID, folio, serie, receptor, folio_pedido)
        if (req.body.buscar) {
            const busRegex = new RegExp(escaparRegex(req.body.buscar), "i");
            const busNum = Number(req.body.buscar);
            const condicionesBusqueda = [
                { uuid: busRegex },
                { folio: busRegex },
                { serie: busRegex },
                { "receptor.nombre": busRegex },
                { "receptor.rfc": busRegex }
            ];
            if (!isNaN(busNum) && busNum > 0) {
                condicionesBusqueda.push({ folio_pedido: busNum });
            }
            filtro.$or = (filtro.$or || []).concat(condicionesBusqueda);
        }

        // Filtro por Método de Pago (PUE, PPD o Todos)
        if (req.body.metodo_pago && req.body.metodo_pago !== "Todos") {
            filtro.metodo_pago = String(req.body.metodo_pago).toUpperCase().trim();
        }

        // Filtro por Fechas (soporta Mes/Año "YYYY-MM" de type="month", año/mes independientes, o fecha completa)
        if (req.body.fecha_inicio || req.body.fecha_fin) {
            filtro.fecha_emision = {};

            if (req.body.fecha_inicio) {
                const strIni = String(req.body.fecha_inicio).trim();
                if (/^d{4}-d{2}$/.test(strIni)) {
                    const [y, m] = strIni.split("-").map(Number);
                    const fIni = new Date(y, m - 1, 1, 0, 0, 0, 0);
                    if (!isNaN(fIni.getTime())) filtro.fecha_emision.$gte = fIni;
                } else {
                    const fIni = new Date(strIni + "T00:00:00.000");
                    if (!isNaN(fIni.getTime())) filtro.fecha_emision.$gte = fIni;
                }
            }

            if (req.body.fecha_fin) {
                const strFin = String(req.body.fecha_fin).trim();
                if (/^d{4}-d{2}$/.test(strFin)) {
                    const [y, m] = strFin.split("-").map(Number);
                    const fFin = new Date(y, m, 0, 23, 59, 59, 999);
                    if (!isNaN(fFin.getTime())) filtro.fecha_emision.$lte = fFin;
                } else {
                    const fFin = new Date(strFin + "T23:59:59.999");
                    if (!isNaN(fFin.getTime())) filtro.fecha_emision.$lte = fFin;
                }
            }

            if (Object.keys(filtro.fecha_emision).length === 0) {
                delete filtro.fecha_emision;
            }
        } else if (req.body.anio && req.body.anio !== "Todos") {
            const anioNum = parseInt(req.body.anio, 10);
            if (!isNaN(anioNum)) {
                if (req.body.mes && req.body.mes !== "Todos") {
                    const mesNum = parseInt(req.body.mes, 10);
                    filtro.fecha_emision = {
                        $gte: new Date(anioNum, mesNum - 1, 1, 0, 0, 0, 0),
                        $lt: new Date(anioNum, mesNum, 1, 0, 0, 0, 0)
                    };
                } else {
                    filtro.fecha_emision = {
                        $gte: new Date(anioNum, 0, 1, 0, 0, 0, 0),
                        $lt: new Date(anioNum + 1, 0, 1, 0, 0, 0, 0)
                    };
                }
            }
        }

        const [total, facturas, totalesAgregados] = await Promise.all([
            Factura.countDocuments(filtro).exec(),
            Factura.find(filtro)
                .select("uuid serie folio folio_pedido pedido_id cliente_id receptor subtotal impuestos total moneda metodo_pago forma_pago status fecha_emision fecha_cancelacion motivo_cancelacion uuid_sustitucion saldo_pendiente total_pagado parcialidades")
                .sort({ fecha_emision: -1 })
                .skip((pagina - 1) * por_pagina)
                .limit(por_pagina)
                .lean()
                .exec(),
            Factura.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: null,
                        total_monto: { $sum: "$total" },
                        vigentes: { $sum: { $cond: [{ $eq: ["$status", "Vigente"] }, 1, 0] } },
                        canceladas: { $sum: { $cond: [{ $eq: ["$status", "Cancelada"] }, 1, 0] } }
                    }
                }
            ]).exec()
        ]);

        const resumen = totalesAgregados && totalesAgregados[0] ? totalesAgregados[0] : { total_monto: 0, vigentes: 0, canceladas: 0 };

        return res.send({
            ok: true,
            facturas,
            total,
            total_paginas: Math.max(1, Math.ceil(total / por_pagina)),
            pagina_actual: pagina,
            resumen: {
                total_monto: resumen.total_monto || 0,
                vigentes: resumen.vigentes || 0,
                canceladas: resumen.canceladas || 0
            }
        });
    } catch (err) {
        console.error("Error al consultar facturas emitidas:", err);
        return res.send({ ok: false, mensaje: "No se pudieron consultar las facturas emitidas." });
    }
}
