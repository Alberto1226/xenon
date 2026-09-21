import { Log } from "../../../models/log";
import * as accesos from "../accesos";

let cacheAnios = null;
let cacheUltimaActualizacion = 0;
const CACHE_TTL = 1000 * 60 * 60 * 24 * 14; // 2 semanas en memoria

export async function post(req, res, next) {
    try {
        if (accesos.esta_logueado(req) === false) {
            return res.status(508).send({ ok: false, mensaje: "sesion expirada" });
        }
        if (accesos.tiene_permisos_administrativos(req) === false) {
            return res.status(507).send({ ok: false, mensaje: "sesion expirada" });
        }

        const ahora = Date.now();
        if (cacheAnios && (ahora - cacheUltimaActualizacion) < CACHE_TTL) {
            return res.status(200).send({ ok: true, anios: cacheAnios });
        }

        // Obtener la fecha del primer y último registro en ~1ms mediante los índices de fecha
        const [primerLog, ultimoLog] = await Promise.all([
            Log.findOne({}, { fecha: 1 }).sort({ fecha: 1 }).lean(),
            Log.findOne({}, { fecha: 1 }).sort({ fecha: -1 }).lean()
        ]);

        const currentYear = new Date().getFullYear();
        let minYear = currentYear;
        let maxYear = currentYear;

        if (primerLog && primerLog.fecha) {
            const yMin = new Date(primerLog.fecha).getFullYear();
            if (!isNaN(yMin)) minYear = yMin;
        }

        if (ultimoLog && ultimoLog.fecha) {
            const yMax = new Date(ultimoLog.fecha).getFullYear();
            if (!isNaN(yMax)) maxYear = yMax;
        }

        if (maxYear < currentYear) maxYear = currentYear;

        let anios = [];
        for (let y = maxYear; y >= minYear; y--) {
            anios.push(y);
        }

        cacheAnios = anios;
        cacheUltimaActualizacion = ahora;

        return res.status(200).send({ ok: true, anios });
    } catch (err) {
        console.log("Error al obtener años de logs:", err);
        const currentYear = new Date().getFullYear();
        return res.status(200).send({ ok: true, anios: [currentYear] });
    }
}
