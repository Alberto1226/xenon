
//   Como superadmin crea usuarios
import {Usuario} from "../../../../models/usuario";
import * as accesos from "../../accesos";

export function post(req, res, next) {
  
    //console.log(req.body);
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    if(accesos.tiene_permisos_administrativos== false) {
        res.send({ok:false,mensaje:"requiere mas permisos"})
        return;
    }
    

    accesos.logActividad('usuarios/editar_usuario',req.user,{},req);
   
    let nuevo_usuario = req.body;
    delete nuevo_usuario.password;
    Usuario.findByIdAndUpdate(req.body._id ,nuevo_usuario)
    .then(()=>{
        res.send({ok:true,mensaje:"Usuario editado"});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false})
            return;
    })    

}