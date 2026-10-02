import { RutasFinalizadas } from "../../../models/rutas_finalizadas";
import * as accesos from "../accesos";

function escaparRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function construirQueryRutasFinalizadas(buscando, usuario) {
    let condiciones = [];

    if (buscando && typeof buscando === 'string' && buscando.trim() !== '') {
        const textoLimpio = buscando.trim();
        const palabras = textoLimpio.split(/\s+/).filter(Boolean);

        const condicionesTexto = palabras.map(palabra => {
            const regex = new RegExp(escaparRegex(palabra), "i");
            const orCondiciones = [
                { 'nombre_ruta': regex },
                { 'folio_salida': regex },
                { 'agente.nombre': regex },
                { 'agente.correo': regex }
            ];

            return { $or: orCondiciones };
        });

        if (condicionesTexto.length > 0) {
            condiciones.push(...condicionesTexto);
        }
    }

    if (usuario.rol === 'vendedor' || usuario.rol === 'marketing' || usuario.rol === 'ComercioExterior') {
        condiciones.push({
            "agente.id": String(usuario._id)
        });
    }

    return condiciones.length > 0 ? { $and: condiciones } : {};
}

export async function post(req, res, next) {
    try {
        if (accesos.esta_logueado(req) === false) {
            return res.send({ ok: false, mensaje: "sesion expirada" });
        }

        let usuario = req.user;
        let buscando = req.body.buscando || "";
        if (typeof buscando === 'string' && buscando.length > 60) {
            return res.send({ ok: false, mensaje: 'error#876TLV' });
        }

        const pagina_actual = Math.max(0, (req.body.pagina_actual || 1) - 1);
        const limite = 10;
        const query = construirQueryRutasFinalizadas(buscando, usuario);

        const [cuentaTotal, lista] = await Promise.all([
            RutasFinalizadas.countDocuments(query),
            RutasFinalizadas.find(query)
                .populate("pedidos_generados")
                .sort({ fecha_finalizacion: -1 })
                .skip(pagina_actual * limite)
                .limit(limite)
                .lean()
        ]);

        const paginas = Math.ceil(cuentaTotal / limite) || 0;

        return res.send({
            ok: true,
            lista,
            numero_total: cuentaTotal,
            paginas,
            coincidencias: cuentaTotal
        });
    } catch (err) {
        console.log("Error en lista_de_rutas_finalizadas:", err);
        return res.send({ ok: false, mensaje: "Error al buscar rutas finalizadas." });
    }
}
