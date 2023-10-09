

import { Ficha_de_descuento } from "../../../models/ficha_de_descuento";
import * as accesos from "../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) == false && accesos.tiene_permisos_gerenciales(req) == false)  {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }
    var usuario = req.user;
    if (usuario == null || usuario.usuario == undefined) return;
    var id = req.body.id;
    accesos.logActividad('clientes/borrar_ficha_descuento',req.user,id,req);
    //console.log("id usuairo = ",usuario._id);    //  usuario:{$ne: req.user.usuario},  que no sea el mismo
    const proceso_checar_existencia = await borrar_ficha(id);
    ///  Error al intentar saber si existe ficha y editar
    res.send(proceso_checar_existencia);
   
}


function borrar_ficha(id){
    return new Promise((resolve,reject)=>{
        var query = {
            'cliente.id':id,        
        }
        Ficha_de_descuento.findOneAndDelete(query)
        .then((resDB)=>{
            resolve({ok:true});
        })
        .catch((err)=>{
            console.log(err);
            reject({ok:false})
        })
    })
}