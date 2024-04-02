
//  Se EMPLEA EN LISTA DE ClienteS PRINCIPAL Y EN LISTAS PARA PRODUCIR PEDIDO NUEVO

import { Cliente } from "../../../models/cliente";
import * as accesos from "../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    const usuario = req.user;
    let buscando = req.body.buscando;
    buscando = buscando.replace("\\","")
    if (buscando.length > 60 || buscando.includes('+')) return res.send({ ok: false, mensaje: 'error#876TLV' });
    const pagina_actual = req.body.pagina_actual - 1;
   // console.log(req.body);
    //console.log("id usuairo = ",producto._id);    //  producto:{$ne: req.user.producto},  que no sea el mismo
    //var query = buscando.length==0?{}:{$text:{$search:buscando}};
    //let query = buscando===''? {} :{nombre:{$regex : buscando,$options:"gmi" }};


    if (buscando === '') {
        res.send(await consulta(pagina_actual, usuario));
        return;
    }
    else {

        let query = await arreglo_de_buscando_separado_por_comas(buscando,usuario);
       // console.log(query)
        res.send(await consullta_con_texto(query, res, pagina_actual));
    }
}



const arreglo_de_buscando_separado_por_comas = (buscando,usuario) => {
    return new Promise((resolve, reject) => {
        try {
            console.log(buscando);
            let buscando_pipes = String(buscando).replace(' ', '|');
            //let palabras_a_buscar = buscando.split(' ');
            //let array_resultado = [];
            // console.log(palabras_a_buscar);
            let query;
            if (buscando.includes('"')) {
                buscando_pipes = buscando.replace('"', '')
            }
            if (usuario.rol === 'vendedor') {   //  Vendedores solo deben de ver a sus clientes

                query = {
                    $and:
                        [{ "agente.id": usuario._id },
                        {
                            $or: [
                                { alias: { '$regex': buscando_pipes, '$options': "im" } },
                                { nombre: { '$regex': buscando_pipes, '$options': "im" } },
                                { correo: { '$regex': buscando_pipes, '$options': "im" } },
                                { 'direcciones_asociadas.correo': { '$regex': buscando_pipes, '$options': "im" } },
                                { 'direcciones_asociadas.estado': { '$regex': buscando_pipes, '$options': "im" } },
                                { 'direcciones_asociadas.cp': { '$regex': buscando_pipes, '$options': "im" } },
                                { 'direcciones_asociadas.estado': { '$regex': buscando_pipes, '$options': "im" } },
                                { 'direcciones_asociadas.municipio': { '$regex': buscando_pipes, '$options': "im" } }
                            ]
                        }
                        ]}

                
            }
            else if (usuario.rol === 'administrador' || usuario.rol === 'gerente') {
                query =     {
                    $or: [
                        { alias: { '$regex': buscando_pipes, '$options': "im" } },
                        { nombre: { '$regex': buscando_pipes, '$options': "im" } },
                        { correo: { '$regex': buscando_pipes, '$options': "im" } },
                        { 'direcciones_asociadas.correo': { '$regex': buscando_pipes, '$options': "im" } },
                        { 'direcciones_asociadas.estado': { '$regex': buscando_pipes, '$options': "im" } },
                        { 'direcciones_asociadas.cp': { '$regex': buscando_pipes, '$options': "im" } },
                        { 'direcciones_asociadas.estado': { '$regex': buscando_pipes, '$options': "im" } },
                        { 'direcciones_asociadas.municipio': { '$regex': buscando_pipes, '$options': "im" } }
                    ]
                }
            }



//se crashea el server al buscar clientes por nombre
            console.log(query);

            // console.log(JSON.stringify(array_resultado))

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

            Cliente.aggregate().match(query).count("numero_total")
                .then((numero_total) => {
                    Cliente.find(query)
                        .sort({ nombre: 1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .exec()
                        .then(async (resDB) => {
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
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
        try {
            let query = {};

            if (usuario.rol === 'vendedor') {
                query = 
                    { "agente.id": usuario._id }
            }
            else if (usuario.rol === 'administrador' || usuario.rol === 'gerente') {
                query = {}
            }
            Cliente.countDocuments(query)
                .then((numero_total) => {
                    console.log(query);
                    Cliente.find(query)
                        .sort({ nombre: 1 })
                        .limit(10)
                        .skip(pagina_actual * 10)
                        .exec()
                        .then(async (resDB) => {
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

