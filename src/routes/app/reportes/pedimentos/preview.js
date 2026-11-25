import * as accesos from '../../accesos.js';
import { obtenerDatosReportePedimentos } from '../../../../services/reportePedimentosService.js';

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }

    try {
        const { fecha_inicio, fecha_fin, estatus, buscar } = req.body;

        const resultado = await obtenerDatosReportePedimentos({
            fecha_inicio,
            fecha_fin,
            estatus,
            buscar
        });

        res.send({
            ok: true,
            kpis: resultado.kpis,
            muestra: resultado.muestra
        });

    } catch (err) {
        console.error("Error en preview de reporte de pedimentos SAT:", err);
        res.send({
            ok: false,
            mensaje: "Error al generar vista previa de pedimentos: " + err.message
        });
    }
}
