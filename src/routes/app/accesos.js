import fs from 'fs';
import {Log} from './../../models/log';
export function esta_logueado(req) {
    var usuario = req.user;
    return usuario !== undefined && usuario.activo === true
}


/*
export function es_admin(req){
    var usuario = req.user;
    if (usuario ==undefined) return false;
    return usuario.areas_acceso.admin;
}
*/

export function tiene_permisos_administrativos(req) {
    var usuario = req.user;
    if (usuario == undefined) return false;
    return usuario.rol == "administrador";
}

export function tiene_permisos_vendedor(req) {
    var usuario = req.user;
    if (usuario == undefined) return false;
    return usuario.rol == "vendedor" || usuario.rol == "marketing" || usuario.rol == "ComercioExterior";
}



export function tiene_permisos_gerenciales(req) {
    var usuario = req.user;
    if (usuario == undefined) return false;
    return usuario.rol == "gerente";
}

export async function logActividad(ruta, usuario, body,req, error = false) {
    // console.log("logActividad");
    // console.log(ruta);
    // console.log(usuario);
    // console.log(body);
    // console.log(req);
    // console.log(error);

    // 'a' flag stands for 'append'
    return new Promise( async(resolve,reject)=>{
        try {
            // console.log("logActividad2---try");
            let id = await Log.registrarLog(ruta,usuario,body,req,error);
            
            resolve(id)
        } catch (err) {
            // console.log("logActividad2---catch");
            reject(err)
        }
    })
    /*
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const log = fs.createWriteStream('../log-especifico.txt', { flags: 'a' });
    const fecha = Date().toLocaleString('es-MX');
    // on new log entry ->
    log.write(`\n ${fecha} - usuario:${usuario.usuario} 
    \n - ruta:${ruta} 
    \n- body:${JSON.stringify(body)} 
    \n ip :${ip}
    \n browser 
        \n` );

    // you can skip closing the stream if you want it to be opened while
    // a program runs, then file handle will be closed
    log.end();*/
}