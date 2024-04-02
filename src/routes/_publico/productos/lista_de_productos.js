

import { Producto } from "../../../models/producto";
import * as accesos from "../../app/accesos"

export async function post(req, res, next) {
   
    //  Checar si es correcto lo que se recibe
 
    const correcto = los_datos_recibidos_son_correctos(req.body);
    if(!correcto) return res.send({ ok: false, mensaje: 'error#876-' })
    let buscando = req.body.buscando;
    if (buscando.length > 30) return res.send({ ok: false, mensaje: 'error#876' });
    const pagina_actual = req.body.pagina_actual - 1;
    //console.log(req.body); 
    let query = { nombre: { '$regex': buscando, '$options': "im" } };
    if (buscando === '') {
         res.send( await consulta(query, res, pagina_actual));
    }
    else {
        res.send( await consullta_con_texto(query, res, pagina_actual));
    }
}

function los_datos_recibidos_son_correctos({buscando,pagina_actual}) {
    console.log(pagina_actual +"-"+buscando+"**")
    return pagina_actual !=null && pagina_actual !=undefined && buscando !=null && buscando !=undefined
}


function consullta_con_texto(query, res, pagina_actual) {
return new Promise((resolve,reject)=>{
    try {
        
    Producto.aggregate().match(query).count("numero_total")
    .then((numero_total) => {
        Producto.find(query)
            .sort({ nombre: 1 })
            .limit(10)
            .skip(pagina_actual * 10)
            .exec()
            .then(async (resDB) => {
                //let lista_filtrada= await filtrar_lista(buscando,resDB);
                res.send({ ok: true, lista: resDB, numero_total });
            })

    })    
    } catch (err) {        
                console.log(err);
                res.send({ ok: false, mensaje: "error al buscar resultados." });
    }
})
}



function consulta(query, res, pagina_actual) {
    return new Promise((resolve, reject) => {
        try {
            Producto.countDocuments({})
                .then((numero_total) => {
                    Producto.find(query)
                        .sort({ nombre: 1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .exec()
                        .then(async (resDB) => {
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

