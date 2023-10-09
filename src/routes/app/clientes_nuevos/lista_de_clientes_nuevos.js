
//  Se EMPLEA EN LISTA DE Clientes_nuevosS PRINCIPAL 

import { Cliente_preaprobado } from "../../../models/cliente_preaprobado";
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


    let buscando = req.body.buscando;
    let activo = req.body.activo;
    if (buscando.length > 60|| buscando.includes('+')) return res.send({ ok: false, mensaje: 'error#876TLV' });
    const pagina_actual = req.body.pagina_actual - 1;
    console.log(req.body);
    //console.log("id usuairo = ",producto._id);    //  producto:{$ne: req.user.producto},  que no sea el mismo
    //var query = buscando.length==0?{}:{$text:{$search:buscando}};
    //let query = buscando===''? {} :{nombre:{$regex : buscando,$options:"gmi" }};


    if (buscando === '') {
        res.send(await consulta(pagina_actual,activo));
        return;
    }
    else {

        let query = await arreglo_de_buscando_separado_por_comas(buscando,activo);
        console.log(query)
        res.send(await consullta_con_texto(query, res, pagina_actual,activo));
    }
}



const arreglo_de_buscando_separado_por_comas = (buscando ,activo) => {
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
            query = {
                $or: [
                    { nombre: { '$regex': buscando_pipes, '$options': "gi" } },
                    { correo: { '$regex': buscando_pipes, '$options': "gi" } },
                    { 'direcciones_asociadas.estado': { '$regex': buscando_pipes, '$options': "gi" } },
                    { 'direcciones_asociadas.municipio': { '$regex': buscando_pipes, '$options': "gi" } },
                    { 'direcciones_asociadas.cp': { '$regex': buscando_pipes, '$options': "gi" } },
                ]
            }

            query.activo = activo;
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

function consullta_con_texto(query, res, pagina_actual,activo) {
    return new Promise((resolve, reject) => {
        try {
            query.activo = activo;
            if(activo!=undefined && activo != null) query.activo = true;
            Cliente_preaprobado.aggregate().match(query).count("numero_total")
                .then((numero_total) => {
                    Cliente_preaprobado.find(query)
                        .sort({ createdAt: 1 })
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
                            resolve({ ok: true, lista: resDB, numero_total, paginas ,coincidencias});
                        })

                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." });
        }
    })
}



function consulta(pagina_actual,activo) {
    return new Promise((resolve, reject) => {
        try {
            let filtro ={activo:true};
            if(activo===undefined || activo === null) filtro = {};
            Cliente_preaprobado.countDocuments(filtro)
                .then((numero_total) => {
                    Cliente_preaprobado.find(filtro)
                        .sort({ createdAt: 1 })
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

