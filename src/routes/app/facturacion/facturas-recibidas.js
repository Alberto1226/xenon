import * as accesos from "../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../services/corecfdi";

// Facturas recibidas (gastos / proveedores) descargadas del SAT por CoreCFDI.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { CoreCfdiFacturas } = await serviciosCoreCfdi(req);
        const filtros = req.body.filtros || {};
        const page = Math.max(parseInt(req.body.page) || 1, 1);
        const resultado = await CoreCfdiFacturas.listarRecibidas(
            {
                categoria: filtros.categoria,
                buscar: filtros.buscar,
                fecha_inicio: filtros.fecha_inicio,
                fecha_fin: filtros.fecha_fin,
                status: filtros.status,
                per_page: filtros.per_page
            },
            page
        );
        return res.send({ ok: true, ...resultado });
    } catch (err) {
        console.error("Error al consultar facturas recibidas:", err.message);
        return res.send(respuestaDeError(err));
    }
}
