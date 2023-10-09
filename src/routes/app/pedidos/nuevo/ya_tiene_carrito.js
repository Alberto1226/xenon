

import { Carrito } from "./../../../../models/carrito";
import * as accesos from "./../../accesos"

export function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo
    var doc = req.body;
    //var query = {'cliente.id': doc.id};
   //console.log(doc);

    Carrito.findOne().or([{ 'cliente.id': doc.id, status: 'Pedido' }
    ,{ 'cliente.id': doc.id, status: 'Ficha pago' }
    ,{ 'cliente.id': doc.id, status: 'Pagado' }
    ,{ 'cliente.id': doc.id, status: 'Empaque' }])
        .then((resDB) => {
            res.send({ ok: true, carrito: resDB });
        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false, mensaje: "error al buscar resultados." });
        })

}
