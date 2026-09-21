import { Log } from "../../../models/log";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    try {
        if (accesos.esta_logueado(req) === false) {
            return res.status(508).send({ ok: false, mensaje: "sesion expirada" });
        }

        if (accesos.tiene_permisos_administrativos(req) === false) {
            return res.status(507).send({ ok: false, mensaje: "sesion expirada" });
        }

        let cantidad_por_pagina = 50;
        const body = req.body || {};
        const accion = body.accion;
        const buscando_texto = body.buscando_texto;
        const anio = body.anio;
        const mes = body.mes;
        const pagina_actual = body.pagina_actual ? Math.max(0, body.pagina_actual - 1) : 0;

        let filtros = [];

        // Filtro por Año y Mes
        if (anio && mes) {
            const y = parseInt(anio);
            const m = parseInt(mes);
            if (!isNaN(y) && !isNaN(m)) {
                const fechaInicio = new Date(y, m - 1, 1, 0, 0, 0, 0);
                const fechaFin = new Date(y, m, 1, 0, 0, 0, 0);
                filtros.push({ fecha: { $gte: fechaInicio, $lt: fechaFin } });
            }
        }

        // Filtro por texto
        if (buscando_texto && buscando_texto.trim() !== "") {
            const expresion_regular = { body: { '$regex': String(buscando_texto).trim().replace(/ /g, '|'), '$options': "im" } };
            filtros.push(expresion_regular);
        }

        // Filtro por accion
        if (accion && accion !== "todos") {
            filtros.push({ accion });
        }

        const queryMongo = filtros.length > 0 ? { $and: filtros } : {};

        // Ejecutar conteo y búsqueda en paralelo utilizando Promise.all y lean() para evitar hidratación innecesaria de objetos Mongoose
        const [cuenta_de_logs, respuesta_db] = await Promise.all([
            Log.countDocuments(queryMongo),
            Log.find(queryMongo)
                .select({ fecha: 1, usuario: 1, accion: 1, body: 1, client: 1, error: 1, activo: 1 })
                .skip(pagina_actual * cantidad_por_pagina)
                .limit(cantidad_por_pagina)
                .sort({ fecha: -1 })
                .lean()
        ]);

        let paginas = Math.ceil(cuenta_de_logs / cantidad_por_pagina);
        if (paginas < 1) paginas = 1;

        return res.status(200).send({ lista: respuesta_db, cuenta_de_logs, paginas });
    } catch (err) {
        console.log("Error general en logsDB:", err);
        return res.status(500).send({ ok: false, mensaje: err.message });
    }
}