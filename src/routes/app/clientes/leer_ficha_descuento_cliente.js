

import { Ficha_de_descuento } from "../../../models/ficha_de_descuento";
import * as accesos from "../accesos"

export function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }

    var usuario = req.user;
    if(usuario==null|| usuario.usuario==undefined)return;
    var cliente = req.body.cliente
    //console.log("id usuairo = ",usuario._id);    //  usuario:{$ne: req.user.usuario},  que no sea el mismo
    var query = {
        'cliente.id':cliente._id,        
    }
   // console.log("--****-**-*-");
    //console.log(cliente);
    //console.log("--****-**-*-");
    Ficha_de_descuento.findOne(query)
    .then((resDB)=>{
        //console.log("--****-**-*-respuesta ");
        //console.log(resDB);
        res.send({ok:true,ficha: resDB});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false, mensaje:"error al buscar resultados."});
    })
    
}
