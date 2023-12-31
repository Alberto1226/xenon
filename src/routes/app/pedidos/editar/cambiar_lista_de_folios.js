

import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos"

export function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }



    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo

    const registro = req.body.registro;
    const id = req.body.id_carrito;
    console.log(registro);
    console.log(req.body)



    Carrito.findById(id)
        .then((resultado) => {
            if (resultado === null) {
                res.send({ ok: false, mensaje: 'El pedido ya no existe' })
                return;
            }

            let lista = resultado.lista;
            console.log({ lista });
            let registro_tmp = lista.find(element => element.producto._id == registro.producto_id);
            console.log({ registro_tmp });
            console.log("producto id = " + registro.producto_id);



            const folios_previos = JSON.parse(JSON.stringify(registro_tmp.folios));
            registro_tmp.folios = registro.folios;

            const folios_nuevos = JSON.parse(JSON.stringify(registro.folios));
            console.log({ lista })
            console.log({ registro_tmp });
            console.log({ folios_previos });
            console.log({ folios_nuevos });

            // producto_temp.folios = registro.folios;
            //res.send();
            //return;

            Carrito.findByIdAndUpdate(id, { lista })
                .then(() => {
                    accesos.logActividad('pedidos/cambiar_folios', req.user, { folios_previos, folios_nuevos, registro: registro_tmp }, req);
                    res.send({ ok: true })
                    return;
                })
                .catch((err) => {
                    console.log(err);
                    res.send({ ok: false });
                    return;
                })



        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false });
            return;
        })

}


//      checar folio por folio 
//      que existan en su producto
//      Cuando se cierre el pedido, se debe de checar disponibilidad
//      

async function checar_folio_por_folio(folios) {

}