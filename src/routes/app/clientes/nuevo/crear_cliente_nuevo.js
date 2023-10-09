
import {Cliente} from "../../../../models/cliente";
import * as accesos from "../../accesos";

export function post(req, res, next) {
  
    
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
  
   //console.log(req.body);
    let usuario = req.user;
    let cliente_nuevo_tmp =req.body;
    if(usuario.rol==='vendedor'){
        cliente_nuevo_tmp.agente={
            id:usuario._id,
            nombre:usuario.nombre,
            correo:usuario.correo            
        }
    }
    Cliente.find({correo:cliente_nuevo_tmp.correo}, (err, docs) => {
        if (err) {
            console.log(err);
            return;
        }
        if (docs.length > 0) {
           // console.log('ya se creo un cliente con ese correo');
            res.send({ok:false ,mensaje:"Correo de cliente ya fue registrado, intente cambiarlo."})
            return;
        } 
        let cliente_nuevo = new Cliente(cliente_nuevo_tmp);
      //  console.log(cliente_nuevo);
        cliente_nuevo.password = cliente_nuevo.encryptPassword(cliente_nuevo.password);
        cliente_nuevo.save((err) => {
            if (err) {
                console.log(err);
                res.send({ok:false,mensaje:"No se pudo crear"});
                return;
            }
           //console.log('cliente creado !');
            res.send({ok:true,mensaje:"cliente creado" ,cliente:cliente_nuevo});
        })

    })

}