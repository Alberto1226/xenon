

import { Cliente } from "../../../models/cliente";
import * as accesos from "../accesos"

export function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    Cliente.find({})
        .sort({ nombre: 1 })
        .exec()
        .then(async (resDB) => {
            res.send({ ok: true, lista: resDB,   });
        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false, mensaje: "error al buscar resultados." });
        })
}

