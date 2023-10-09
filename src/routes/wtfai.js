
//   Solo se debe de usaruna vez , cuando manuyalmente se requiera , deshabilitar en uso

import {devolver_nombre_db} from './../config/llaves';
export function post(req, res, next) {
    var usuario = req.user;
    const subdomains =req.subdomains;
    if(usuario==undefined || usuario == null){
        res.send({ok:false})
        return;
    }
    else{
        let usuario_temp = usuario;
        delete usuario_temp.password;
        const storage = devolver_nombre_db();
        
        res.send({usuario:usuario_temp,storage,subdomains})
    }
}