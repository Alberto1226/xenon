
//   Como superadmin crea productos
import {Producto} from "./../../../models/producto";
import * as accesos from "./../accesos";

export function post(req, res, next) {
  
   //console.log(req.body);
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
 
    
  
    const activo = req.body.activo;
   //console.log('activo='+activo);
    
    Producto.findByIdAndUpdate(req.body.id , req.body)
    .then(()=>{
        res.send({ok:true,mensaje:"producto editado"});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false})
            return;
    })    

}