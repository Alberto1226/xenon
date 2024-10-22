
import { Pedido } from "../../../models/pedido";
import * as accesos from "../accesos"

// import * as mongoose from 'mongoose';
//  Se EMPLEA EN LISTA DE PEDIDIDOS QUE EN DB SE VE COMO Pedido

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
    //console.log(req.body);
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
                // console.log('es numero', query);
            }
            else {

                query = {
                    $or: [
                        { 'cliente.alias': { '$regex': buscando_pipes, '$options': "im" } },
                        { 'cliente.nombre': { '$regex': buscando_pipes, '$options': "im" } },
                        { 'cliente.direccion': { '$regex': buscando_pipes, '$options': "im" } },
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
                // query ={}
                //consulta = {}
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

            Pedido.aggregate().match(query).count("numero_total")
                .then((numero_total) => {
                    Pedido.find(query)
                        .sort({ folio: -1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .exec()
                        .then(async (resDB) => {
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            console.log(resDB)
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



// function consulta(pagina_actual, usuario) {
//     return new Promise((resolve, reject) => {
//         let query;
//         if (usuario.rol === 'vendedor') {
//             query = {
//                 $or: [{ "usuario_que_registro.id": usuario._id }, { "agente.id": usuario._id }]
//             };
//         } else if (usuario.rol === 'administrador' || usuario.rol === 'gerente') {
//             query = {};
//         }

//         try {
//             Pedido.countDocuments(query)
//                 .then((numero_total) => {
//                     Pedido.find(query)
//                         .sort({ fecha: -1 })
//                         .limit(10)
//                         .skip(pagina_actual * 10)
//                         .select({
//                             folio: 1,
//                             fecha: 1,
//                             "usuario_que_registro.usuario": 1,
//                             tenia_ficha: 1,
//                             moneda: 1,
//                             descuento: 1,
//                             total_pedido: 1,
//                             "cliente.nombre": 1,
//                             "cliente.correo": 1,
//                             "agente.nombre": 1,
//                             "agente.correo": 1,
//                             mensajeria: 1,
//                             // lista: {
//                             //     cantidad: 1,
//                             //     "producto.nombre": 1,
//                             //     "producto.descripcion": 1,
//                             //     "producto.precio": 1,
//                             // }
//                         })
//                         .allowDiskUse(true)
//                         .exec()
//                         .then(async (resDB) => {
//                             resolve({
//                                 ok: true,
//                                 lista: resDB,
//                                 numero_total,
//                                 paginas: Math.floor((numero_total + 10 - 1) / 10)
//                             });
//                         })
//                         .catch((err) => {
//                             console.log(err);
//                             reject({ ok: false, mensaje: "error al buscar resultados.", error: err });
//                         });
//                 })
//                 .catch((err) => {
//                     console.log(err);
//                     reject({ ok: false, mensaje: "error al contar documentos.", error: err });
//                 });
//         } catch (err) {
//             console.log(err);
//             reject({ ok: false, mensaje: "error al buscar resultados.", error: err });
//         }
//     });
// }



const mongoose = require('mongoose');

function consulta(pagina_actual, usuario) {
    return new Promise((resolve, reject) => {
        let query;
        if (usuario.rol === 'vendedor') {
            query = {
                $or: [{ "usuario_que_registro.id": usuario._id }, { "agente.id": usuario._id }]
            };
        } else if (usuario.rol === 'administrador' || usuario.rol === 'gerente') {
            query = {};
        }

        try {
            Pedido.countDocuments(query)
                .then((numero_total) => {
                    mongoose.connection.collection('vistaPedidosDatos')
                        .find(query)
                        .sort({ fecha: -1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .toArray()
                        .then((resDB) => {
                            const ids = resDB.map(doc => doc._id);
                            resolve({
                                ok: true,
                                lista: resDB,
                                numero_total,
                                paginas: Math.ceil(numero_total / 10)
                            });
                        })
                        .catch((err) => {
                            console.log(err);
                            reject({ ok: false, mensaje: "Error al buscar resultados.", error: err });
                        });
                })
                .catch((err) => {
                    console.log(err);
                    reject({ ok: false, mensaje: "Error al contar documentos.", error: err });
                });
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "Error al buscar resultados.", error: err });
        }
    });
}

