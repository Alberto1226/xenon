

import { Carrito_publico } from "../../../models/carrito_publico";
import * as accesos from "../accesos"

import * as mongoose from 'mongoose';
//  Se EMPLEA EN LISTA DE PEDIDIDOS QUE EN DB SE VE COMO CARRITO

import { Cliente } from "../../../models/cliente";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    let usuario = req.user;
    let buscando = req.body.buscando;
    if (buscando.length > 60 || buscando.includes('+')) return res.send({ ok: false, mensaje: 'error#876TLV' });
    const pagina_actual = req.body.pagina_actual - 1;
    
    //console.log("id usuairo = ",producto._id);    //  producto:{$ne: req.user.producto},  que no sea el mismo
    //var query = buscando.length==0?{}:{$text:{$search:buscando}};
    //let query = buscando===''? {} :{nombre:{$regex : buscando,$options:"gmi" }};


    if (buscando === '') {
        res.send(await consulta(pagina_actual, usuario));
        return;
    }
    else {

        let query = await arreglo_de_buscando_separado_por_comas(buscando, usuario);
        
        res.send(await consullta_con_texto(query, res, pagina_actual));
    }
}



const arreglo_de_buscando_separado_por_comas = (buscando, usuario) => {
    return new Promise((resolve, reject) => {
        try {
            
            let buscando_pipes = String(buscando).replace(' ', '|');
            //let palabras_a_buscar = buscando.split(' ');
            //let array_resultado = [];
            // //console.log(palabras_a_buscar);
            let query;
            if (buscando.includes('"')) {
                buscando_pipes = buscando.replace('"', '')
            }

            if (!isNaN(buscando)) {
                query = { folio: parseInt(buscando) }
            }
            else {

                query = {
                    $or: [
                        { 'cliente.alias': { '$regex': buscando_pipes, '$options': "gi" } },
                        { 'cliente.nombre': { '$regex': buscando_pipes, '$options': "gi" } },
                        { 'cliente.direccion': { '$regex': buscando_pipes, '$options': "gi" } },
                    ]
                }

            }
            if (usuario.rol === 'vendedor') {
                query = {
                    $and: [query, {
                        $or: [{ "usuario_que_registro.id": usuario._id }, { "agente.id": usuario._id }]
                    }]
                }
            }
            else if (usuario.rol === 'administrador' || usuario.rol === 'gerente') {
              //  query = {}
            }



            resolve(query);

        } catch (err) {
            console.log(err);
            reject([{ nombre: '' }])
            return;
        }
    })
}

function consullta_con_texto(query, res, pagina_actual) {
    return new Promise((resolve, reject) => {

        try {

            Carrito_publico.aggregate().match(query).count("numero_total")
                .then((numero_total) => {
                    Carrito_publico.find(query)
                        .sort({ fecha: -1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .exec()
                        .then(async (resDB) => {
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            //console.log(resDB)
                            //console.log(numero_total)
                            let paginas;
                            let coincidencias;
                            if (numero_total.length === 0) {
                                paginas = 0;
                                coincidencias = 0;
                            }
                            else {
                                paginas = Math.floor((numero_total[0].numero_total + 10 - 1) / (10));
                                coincidencias = numero_total[0].numero_total;
                            }
                            resolve({ ok: true, lista: resDB, numero_total, paginas, coincidencias });
                        })

                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." });
        }
    })
}



function consulta(pagina_actual, usuario) {
    return new Promise((resolve, reject) => {
        let query={};
        //let objectId = mongoose.Types.ObjectId;
        if (usuario.rol === 'vendedor') {
            query = {
                 "agente.id":String(usuario._id )
            };
        }
        else if (usuario.rol === 'administrador' || usuario.rol === 'gerente') {
            query = {}
        }
        
        
        ////console.log("5e7f8b470382191c8b82897c")
        ////console.log(usuario._id)

       
        try {
            Carrito_publico.countDocuments(query)
                .then((numero_total) => {
                    Carrito_publico.find(query)
                        .sort({ fecha: -1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .exec()
                        .then(async (resDB) => {
                            //console.log(pagina_actual)
                            //console.log(resDB)
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

