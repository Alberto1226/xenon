
//   Solo se debe de usaruna vez , cuando manuyalmente se requiera , deshabilitar en uso
import {Cliente} from "../../../../models/cliente";
import {Usuario} from "../../../../models/usuario";
import * as accesos from "../../accesos";
export function post(req, res, next) {
 ////console.log(req.body.usuario);
 
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }


    if(accesos.tiene_permisos_gerenciales(req)===false && accesos.tiene_permisos_administrativos(req) === false ){
        res.send({ok:false,mensaje:"sesion expirada 2"})
        return;
    }

    let cliente_id = req.body.cliente_id;
    let agente_id = req.body.agente_id;
   // console.log(req.body)
  
    Cliente.findById(cliente_id, (err, dbdoc) => {
        if (err) {
            //console.log(err);
            return;
        }
        if (dbdoc===undefined || dbdoc ===null) {
           //console.log('no se encontro el Cliente con dicho id' );
            res.send({ok:false ,mensaje:"Nombre no se encontro al clietne."})
            return;
        }
        Usuario.findById(agente_id)
        .then((dbAgente)=>{
            if(dbAgente===null|| dbAgente === undefined){
                res.send({ok:false,mensaje:"No se pudo encontro al agente."});
                return
            }
            dbdoc.agente={
                nombre:dbAgente.nombre,
                id:dbAgente._id,
                correo:dbAgente.correo
            }
            dbdoc.save((err) => {
                if (err) {
                    console.log(err);
                    res.send({ok:false,mensaje:"No se pudo cambiar el agente."});
                    return;
                }
                //console.log('Cliente creado !');
                res.send({ok:true,mensaje:"Agente se ha cambiado con exito.",id:req.body.id});
            })
        })

    }).catch((err)=>{

        console.log(err);
        res.send({ok:false,mensaje:"No se pudo cambiar el agente."});
    })

}