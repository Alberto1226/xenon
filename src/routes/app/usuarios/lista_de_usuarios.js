import {Usuario} from "../../../models/usuario";
import * as accesos from "../accesos"

export function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }


    let buscando= req.body.buscando;
    if(!buscando)buscando='';
    const pagina_actual= req.body.pagina_actual-1;
    
    //console.log("id usuairo = ",usuario._id);    
    //usuario:{$ne: req.user.usuario},  que no sea el mismo
    //var query = buscando.length==0?{}:{$text:{$search:buscando}};
    //let query = buscando===''? {} :{nombre:{$regex : buscando,$options:"gmi" }};
    let query = {nombre:{ '$regex':buscando,'$options':"gi"}};

    Usuario.countDocuments({})
    .then((numero_total) => {
        Usuario.find(query)
        .sort({ nombre: 1 })
        .skip(pagina_actual*10)
        .exec()
        .then(async (resDB) => {            
            //let lista_filtrada= await filtrar_lista(buscando,resDB);
            res.send({ ok: true, lista: resDB ,numero_total });
        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false, mensaje: "error al buscar resultados." });
        })
        
    })
    .catch((err) => {
        console.log(err)
        res.send({ ok: false })
    }
    )    
}

