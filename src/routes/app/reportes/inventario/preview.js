import * as accesos from '../../accesos.js';
import { obtenerDatosReporteInventario } from '../../../../services/reporteInventarioService.js';

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }

    try {
        const { fecha_inicio, fecha_fin, incluir_inactivos, categoria, buscar } = req.body;

        const resultado = await obtenerDatosReporteInventario({
            fecha_inicio,
            fecha_fin,
            incluir_inactivos: incluir_inactivos === true,
            categoria,
            buscar
        });

        res.send({
            ok: true,
            kpis: resultado.kpis,
            muestra: resultado.muestra
        });

    } catch (err) {
        console.error("Error en preview de reporte de inventario:", err);
        res.send({
            ok: false,
            mensaje: "Error al generar la vista previa: " + err.message
        });
    }
}
