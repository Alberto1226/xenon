
import {Cliente} from "../../../../models/cliente";
import * as accesos from "../../accesos";

export function post(req, res, next) {
  
    //console.log(req.body);
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    accesos.logActividad('clientes/editar',req.user,req.body,req);
    let nuevo_cliente = req.body;
    delete nuevo_cliente.password;
    Cliente.findByIdAndUpdate(req.body._id ,nuevo_cliente)
    .then(()=>{
        res.send({ok:true,mensaje:"cliente editado"});
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false})
            return;
    })    

}