

import { Cliente } from "../../../models/cliente";
import * as accesos from "../accesos"

export function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }

    
    
    var cliente = req.body.cliente
    //console.log("id usuairo = ",usuario._id);    //  usuario:{$ne: req.user.usuario},  que no sea el mismo
    var query = {
        'cliente.id':cliente.id,        
    }
   Cliente.findById(cliente.id)
   .then((respuesta)=>{
        res.send({ok:true, cliente:respuesta})
   })
   .catch((err)=>{
       console.log(err);
       res.send({ok:false})
   })
    
}
