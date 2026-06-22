import { Pedimento } from "../../../models/pedimento";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const { pagina_actual = 1, limite = 10 } = req.body;

    try {
        const skip = (parseInt(pagina_actual) - 1) * parseInt(limite);
        const limit = parseInt(limite);

        const total = await Pedimento.countDocuments({});
        const lista = await Pedimento.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('productos.producto', 'nombre codigo')
            .lean()
            .exec();

        res.send({ ok: true, lista, total });
    } catch (err) {
        console.error("Error al listar pedimentos:", err);
        res.send({ ok: false, mensaje: "Error al cargar pedimentos: " + err.message });
    }
}
