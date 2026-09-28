import { RutasFinalizadas } from "../../models/rutas_finalizadas";
import mongoose from "mongoose";

export async function get(req, res) {
    try {
        const { idUsuario, fechaInicio, fechaFin } = req.query || {};
        let filtro = {};

        if (idUsuario && mongoose.Types.ObjectId.isValid(idUsuario)) {
            const userObjId = new mongoose.Types.ObjectId(idUsuario);
            filtro["agente.id"] = { $in: [idUsuario, userObjId] };
        }

        if (fechaInicio || fechaFin) {
            filtro.fecha_finalizacion = {};
            if (fechaInicio) filtro.fecha_finalizacion.$gte = new Date(fechaInicio);
            if (fechaFin) filtro.fecha_finalizacion.$lte = new Date(fechaFin);
        }

        const historial = await RutasFinalizadas.find(filtro)
            .populate("pedidos_generados")
            .sort({ fecha_finalizacion: -1 })
            .lean();

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, rutas: historial }));
    } catch (err) {
        console.error("Error en GET /salidas/historial-rutas:", err);
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, mensaje: err.message }));
    }
}
