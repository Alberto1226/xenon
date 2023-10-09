
//   Como superadmin crea productos
import {Carrito} from "../../../models/carrito";
import * as accesos from "../accesos";

export function post(req, res, next) {
  
  // //console.log(req.body);
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    
    
    
   // const activo = req.body.activo;
   ////console.log('activo='+activo);
    let status= {
        status:req.body.status
    }
    Carrito.findByIdAndUpdate(req.body.id ,status)
    .then(()=>{
        res.send({ok:true,mensaje:"carrito editado"});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false})
            return;
    })    

}