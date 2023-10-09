import { Cliente_preaprobado } from "../../../models/cliente_preaprobado";
import {Cliente} from './../../../models/cliente';
import {Usuario} from './../../../models/usuario';
import * as accesos from "../accesos";
import {mandar_email} from './_mandar_email';

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
    //      PARAMETROS ESPERADOS
    const agente= body.agente;
    const perfil = body.perfil;
    const cliente_nuevo_id = body.cliente_nuevo_id;
    const region = body.region;
    //      PARAMETROS ESPERADOS
    


    //      Obtener el cliente original 
    const proceso_obtener_cliente_preaprobado = await obtener_cliente_preaprobado(cliente_nuevo_id);

    if(proceso_obtener_cliente_preaprobado.ok ==false){
        return res.send({ok:false,mensaje:"El cliente ya no existe"});
    }

    //      Obtener el agente original 
    const proceso_obtener_agente = await obtener_agente(agente.id);

    if(proceso_obtener_agente.ok ==false){
        return res.send({ok:false,mensaje:"El agente ya no existe"});
    }


    //      SEPARAR DATOS NUEVOS DE OBJETOS MONGOOSE
    let cliente_nuevo = JSON.parse(JSON.stringify(proceso_obtener_cliente_preaprobado.respuestaDB));
    let agenteDB = JSON.parse(JSON.stringify(proceso_obtener_agente.respuestaDB));

    //      CHECAR si el cliente ha sido registrado antes
    const cliente_ya_existe_proceso = await cliente_ya_existe(cliente_nuevo.correo)
    
    if(cliente_ya_existe_proceso.ok==false){
        return res.send({ok:false,mensaje:"Ha ocurrido un error al guardar el cliente nuevo #101"});
    }
    //      Si existe no continuar
    if(cliente_ya_existe_proceso.existe==true){
        console.log("ya existia en clientes");
        return res.send({ok:false,mensaje:"El cliente ya existe"});
    }
    else{
        console.log("no existe aun en clientes");
    }
    
    
    //      CAmbiar los datos de agente y perfil de acuerdo con lo encotnrado y mandado por usuario
    cliente_nuevo.agente={
        nombre:agenteDB.nombre,
        id:agenteDB._id,
        correo:agenteDB.correo,
    }

    cliente_nuevo.perfil = perfil;
    cliente_nuevo.fecha_creacion = new Date();
    cliente_nuevo.fecha_update = new Date();
    cliente_nuevo.region = region;

    //      GUARDAR EL CLIENTE NUEVO
    //console.log({cliente_nuevo});
    const proceso_guardar_cliente = await guardar_cliente_nuevo(cliente_nuevo);
    
    if(proceso_guardar_cliente.ok==false){
        //  REGISTRAR ERROR
        accesos.logActividad('clientes_nuevos/guardar_cliente_nuevo',req.user,{cliente_nuevo},req,true);
        return res.send({ok:false,mensaje:"No se ha podido guardar el cliente nuevo #102"})
    }

    //      REGISTRAR EXITO DE GUARDAR CLIENTE
    accesos.logActividad('clientes_nuevos/guardar_cliente_nuevo',req.user,{cliente_nuevo},req);
    

    //      BORRAR CLIENTE PREAPORBADO
    const borrado = await borrar_cliente_preautorizado(cliente_nuevo_id)

    console.log({borrado});

    //          MANDAR EMAIL

    mandar_email(cliente_nuevo);


    return  res.send({ok:true})

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



async function obtener_agente(id) {
    return Usuario.findById(id)
    .then((respuestaDB)=>{
        return {ok:true,respuestaDB};
    })
    .catch((err)=>{
        console.log(err);
        return {ok:false , err}
    })
}

async function cliente_ya_existe(correo) {
    return Cliente.findOne({correo})
    .then((respuestaDB)=>{
        return {ok:true, existe:respuestaDB != null}
    })
    .catch((err)=>{
        return {ok:false, err,existe:true}
    })
}

async function guardar_cliente_nuevo(cliente) {
    let cliente_nuevo = new Cliente(cliente);
    return cliente_nuevo.save()
    .then((respuestaDB)=>{
        return {ok:true}
    })
    .catch((err)=>{
        return {ok:false, err}
    })
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