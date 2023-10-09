import { Cliente_preaprobado } from "../../../models/cliente_preaprobado";
import {Cliente} from '../../../models/cliente';
import {Usuario} from '../../../models/usuario';
import * as accesos from "../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    const body = req.body;
    //console.log({body});
    //      PARAMETROS ESPERADOS
    const cliente_a_borrar_id = body.cliente_a_borrar_id;
    //      PARAMETROS ESPERADOS


    //console.log({cliente_a_borrar_id});


    //      Obtener el cliente original 
    const proceso_obtener_cliente_preaprobado = await obtener_cliente_preaprobado(cliente_a_borrar_id);

    console.log({proceso_obtener_cliente_preaprobado});

    if(proceso_obtener_cliente_preaprobado.ok ==false || proceso_obtener_cliente_preaprobado.respuestaDB ==null){
        console.log("No existe");
        return res.send({ok:false,mensaje:"El cliente ya no existe"});
    }
    let cliente_a_borrar = JSON.parse(JSON.stringify(proceso_obtener_cliente_preaprobado.respuestaDB));

    //      BORRAR CLIENTE PREAPORBADO
    const borrado = await borrar_cliente_preautorizado(cliente_a_borrar_id)

    console.log({borrado});
    if(borrado.ok ==false){

    //      REGISTRAR EXITO DE BORRAR CLIENTE
        accesos.logActividad('clientes_nuevos/borrar_registro',req.user,cliente_a_borrar,req,true);
        return res.send({ok:false,mensaje:"No se pudo borrar el registro para nuevo cliente"})
    }


    //      REGISTRAR EXITO DE BORRAR CLIENTE
    delete cliente_a_borrar.agente;
    delete cliente_a_borrar.location;
    delete cliente_a_borrar.perfil;
    delete cliente_a_borrar.publica;
    delete cliente_a_borrar.activo;
    delete cliente_a_borrar.alias;
    accesos.logActividad('clientes_nuevos/borrar_registro',req.user,cliente_a_borrar,req);

    return  res.send({ok:true})

}

async function borrar_cliente_preautorizado(cliente_preaprobado_id) {
    
    return Cliente_preaprobado.findOneAndDelete (cliente_preaprobado_id)
    .then((respuestaDB)=>{
        return {ok:true}
    })
    .catch((err)=>{
        return {ok:false, err}
    })
}



async function obtener_cliente_preaprobado(id) {
    return Cliente_preaprobado.findById(id)
    .then((respuestaDB)=>{
        return {ok:true,respuestaDB};
    })
    .catch((err)=>{
        console.log(err);
        return {ok:false , err}
    })
}