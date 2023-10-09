
//   SOLO ISOTECH es para inicial de xenon

import {Carrito} from "./../../../models/carrito";
import * as accesos from "./../accesos";

export function post(req, res, next) {
  
    
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }

    if(accesos.tiene_permisos_administrativos== false|| req.user.usuario!='isotech_Xenonymas') {
        res.send({ok:false,mensaje:"requiere mas permisos"})
        return;
    }
    

    Carrito.deleteMany({}).then(()=>{
        res.send({ok:true})
    }).catch((err)=>{
        console.log(err);
        res.send('no se pudo')
    })
  

}