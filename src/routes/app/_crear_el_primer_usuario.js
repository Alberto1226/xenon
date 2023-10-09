
//   Como superadmin crea usuarios

import {Usuario} from "../../models/usuario";
import * as accesos from "./accesos";

export function post(req, res, next) {
  
    
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }

    if(accesos.tiene_permisos_administrativos== false) {
        res.send({ok:false,mensaje:"requiere mas permisos"})
        return;
    }
  
    Usuario.find({usuario:req.body.usuario}, (err, docs) => {
        if (err) {
            console.log(err);
            return;
        }
        if (docs.length > 0) {
            //console.log('ya se creo un usuario con ese nombre');
            res.send({ok:false ,mensaje:"Nombre de usuario ya fue registrado, intente cambiarlo."})
            return;
        }        

        let usuario = req.body;
        let newuser = new Usuario(usuario);
        newuser.rol ='administrador'
        newuser.password = newuser.encryptPassword(newuser.password);
        newuser.save()
        .then(()=>{

            res.send({ok:true,mensaje:"Usuario creado" ,usuario:newuser});
        }).catch((err)=>{
            console.log(err);
            res.send({ok:false})
        })

    })

}