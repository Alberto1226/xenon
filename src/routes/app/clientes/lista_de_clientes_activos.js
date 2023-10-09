

import {Cliente} from "../../../models/cliente";
import * as accesos from "../accesos"

export function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }


    let buscando= req.body.buscando;
    const pagina_actual= req.body.pagina_actual-1;
    
    //console.log("id usuairo = ",cliente._id);    //  cliente:{$ne: req.user.cliente},  que no sea el mismo
    //var query = buscando.length==0?{}:{$text:{$search:buscando}};
//let query = buscando===''? {} :{nombre:{$regex : buscando,$options:"gmi" }};
let query = {nombre:{ '$regex':buscando,'$options':"gi"},activo:true};

    Cliente.countDocuments({})
    .then((numero_total) => {
        Cliente.find(query)
        .sort({ nombre: 1 })
        .limit(10)
        .skip(pagina_actual*10)
        .exec()
        .then(async (resDB) => {            
            //let lista_filtrada= await filtrar_lista(buscando,resDB);
            if (buscando == "") {
                res.send({ ok: true, lista: resDB, numero_total });
                return;
            }
            else {
                Cliente.aggregate().match(query).count("coincidencias")
                    .then((coincidencias) => {

                        res.send({ ok: true, lista: resDB, numero_total, coincidencias });
                    })
            }
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



/*
CREAR INDICES EN MONGO

db.clientes.createIndex( { name:'text'})

db.clientes.createIndex( { nombre:'text',correo:'text'})
db.clientes.createIndex( { nombre:'text',codigo:'text'})

*/


function incluye_busqueda(cliente,buscando) {
    if (cliente.nombre.toLowerCase().indexOf(buscando.toLowerCase()) >= 0) {
      return true;
    }
    
    return false;
  }

  function filtrar_lista(buscando,lista) {
    return new Promise((resolve,reject)=>{
        var lista_previa =lista;
        var lista_temp = lista_previa.filter(elemento =>
        incluye_busqueda(elemento,buscando)
        );
        return resolve(lista_temp);
    })
  }