import * as accesos from "../../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../../services/corecfdi";

// Pide al SAT la descarga de un periodo. tipo_descarga: emitidas | recibidas | ambas.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { CoreCfdiSat } = await serviciosCoreCfdi(req);
        const { fecha_inicio, fecha_fin, tipo_descarga } = req.body;
        const tipo_comprobante = req.body.tipo_comprobante || null;

        if (tipo_descarga === "ambas") {
            const intentos = await CoreCfdiSat.solicitarAmbas({ fecha_inicio, fecha_fin, tipo_comprobante });
            const resultados = intentos.map((intento) =>
                intento.ok
                    ? { tipo_descarga: intento.tipo_descarga, ok: true, solicitud: intento.solicitud }
                    : { tipo_descarga: intento.tipo_descarga, ...respuestaDeError(intento.error) }
            );
            return res.send({ ok: resultados.some((r) => r.ok), resultados });
        }

        const solicitud = await CoreCfdiSat.solicitarDescarga({ fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante });
        return res.send({ ok: true, resultados: [{ tipo_descarga, ok: true, solicitud }] });
    } catch (err) {
        console.error("Error al solicitar descarga masiva SAT:", err.message);
        return res.send(respuestaDeError(err));
    }
}
