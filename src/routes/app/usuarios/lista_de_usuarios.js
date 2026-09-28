import { Usuario } from "../../../models/usuario";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    let buscando = req.body.buscando || '';
    let tipo = req.body.tipo;
    const pagina_actual = (req.body.pagina_actual || 1) - 1;

    let query = { nombre: { '$regex': buscando, '$options': "im" } };

    if (tipo === 'pedido') {
        try {
            let queryMovil = { ...query, isMovil: true };
            let totalMovil = await Usuario.countDocuments(queryMovil);
            let queryFinal = totalMovil > 0 ? queryMovil : query;

            let numero_total = await Usuario.countDocuments(queryFinal);
            let resDB = await Usuario.find(queryFinal)
                .sort({ nombre: 1 })
                .skip(pagina_actual * 10)
                .limit(10)
                .exec();

            res.send({ ok: true, lista: resDB, numero_total });
            return;
        } catch (err) {
            console.log(err);
            res.send({ ok: false, mensaje: "error al buscar resultados." });
            return;
        }
    }

    try {
        let numero_total = await Usuario.countDocuments(query);
        let resDB = await Usuario.find(query)
            .sort({ nombre: 1 })
            .skip(pagina_actual * 10)
            .limit(10)
            .exec();

        res.send({ ok: true, lista: resDB, numero_total });
    } catch (err) {
        console.log(err);
        res.send({ ok: false, mensaje: "error al buscar resultados." });
    }
}

