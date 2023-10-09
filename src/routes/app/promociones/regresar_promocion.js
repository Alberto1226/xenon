

import {Promocion} from "../../../models/promocion";
import * as accesos from "../accesos"

export function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    
    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo
    let doc = req.body;
    console.log(doc);
    Promocion.findById(doc.id)
    .then((promocion)=>{
        res.send({ok:true,promocion});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false, mensaje:"error al buscar resultados."});
    })
    
}
