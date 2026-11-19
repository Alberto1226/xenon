import { Usuario } from "../../../models/usuario";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    let buscando = (req.body.buscando || '').toString().trim();
    let tipo = req.body.tipo;
    let todos = req.body.todos === true;
    let paginar = !todos && (req.body.pagina_actual !== undefined && req.body.pagina_actual !== null);
    const limite = parseInt(req.body.limite) || 10;
    const pagina_actual = Math.max(1, parseInt(req.body.pagina_actual) || 1) - 1;

    let query = {};
    if (buscando !== '') {
        const regex = { '$regex': buscando, '$options': "i" };
        query.$or = [
            { nombre: regex },
            { usuario: regex },
            { correo: regex },
            { alias: regex }
        ];
    }

    if (req.body.solo_activos === true) {
        query.activo = true;
    }

    if (tipo === 'pedido') {
        try {
            let queryMovil = { ...query, isMovil: true };
            let totalMovil = await Usuario.countDocuments(queryMovil);
            let queryFinal = totalMovil > 0 ? queryMovil : query;

            let numero_total = await Usuario.countDocuments(queryFinal);
            let consulta = Usuario.find(queryFinal).sort({ nombre: 1 });
            if (paginar) {
                consulta = consulta.skip(pagina_actual * limite).limit(limite);
            }
            let resDB = await consulta.exec();

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
        let consulta = Usuario.find(query).sort({ nombre: 1 });
        if (paginar) {
            consulta = consulta.skip(pagina_actual * limite).limit(limite);
        }
        let resDB = await consulta.exec();

        res.send({ ok: true, lista: resDB, numero_total });
    } catch (err) {
        console.log(err);
        res.send({ ok: false, mensaje: "error al buscar resultados." });
    }
}

