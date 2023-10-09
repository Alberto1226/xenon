

import { Ficha_de_descuento } from "../../../models/ficha_de_descuento";
import * as accesos from "../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) == false && accesos.tiene_permisos_gerenciales(req) == false) {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }
    var usuario = req.user;
    if (usuario == null || usuario.usuario == undefined) return;
    var ficha = req.body;
    accesos.logActividad('clientes/crear_ficha_de_descuento',req.user,ficha,req);
    //console.log("id usuairo = ",usuario._id);    //  usuario:{$ne: req.user.usuario},  que no sea el mismo
    const proceso_checar_existencia = await checar_si_existe_y_actualizar(ficha);
    ///  Error al intentar saber si existe ficha y editar
    if(proceso_checar_existencia.ok===false){
        res.send({ok:false})
        return
    }
    //  Si existia y se actualizo
    if(proceso_checar_existencia.ok===true && proceso_checar_existencia.existe && proceso_checar_existencia.editado ){
        res.send({ok:true,ficha:proceso_checar_existencia.ficha});
        return;
    }
    // No existe y se va a crear
    let nueva_ficha = new Ficha_de_descuento(ficha);
    nueva_ficha.save()
        .then((respuesta) => {
            res.send({ ok: true, ficha: nueva_ficha });
        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false })
        })
}


function checar_si_existe_y_actualizar(ficha){
    return new Promise((resolve,reject)=>{
        var query = {
            'cliente.id':ficha.cliente.id,        
        }
        Ficha_de_descuento.findOne(query)
        .then((resDB)=>{
            if(resDB===null){
                resolve({ok:true,existe:false ,ficha:null});
            }
            Ficha_de_descuento.findByIdAndUpdate(resDB._id,ficha)
            .then((res)=>{
                resolve({ok:true,existe:true,editado:true ,ficha:resDB})
            })
            .catch((err)=>{
                console.log(err);
                reject({ok:false,existe:true,editado:false,ficha:null})
            })
        })
        .catch((err)=>{
            console.log(err);
            reject({ok:false,existe:false,editado:false,ficha:null})
        })
    })
}