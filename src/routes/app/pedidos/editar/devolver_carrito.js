

import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos"

export function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo
    var id = req.body.id;
    //var query = {'cliente.id': doc.id};
   //console.log(id);

    Carrito.findById(id)
    .then((respuesta)=>{
        if(respuesta===undefined|| respuesta===null)
        {
            res.send({ok:false,mensaje:'No se encontro el carrito'})
        }
        else{
            res.send({ok:true,carrito:respuesta});
            
        }
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false,mensaje:'No se encontro el carrito'})
    })
}
