

import { Log } from "../../../models/log";
import * as accesos from "../accesos";

import * as mongoose from 'mongoose';
import { result } from "underscore";
const step = 50;
//  Se EMPLEA EN LISTA DE PEDIDIDOS QUE EN DB SE VE COMO CARRITO

export async function post(req, res, next) {

    try {
        console.log(accesos.esta_logueado(req))
        if (accesos.esta_logueado(req) === false) {
            res.send({ ok: false, mensaje: "sesion expirada" }).status(508);
            return;
        }

        if (accesos.tiene_permisos_administrativos(req) === false) {
            res.status(509).send({ ok: false, mensaje: "sesion expirada" }).status(507)
            return;
        }
        let cantidad_por_pagina = 50; /// menos 1 por que es un array
        const body =req.body;
        const accion = body.accion;
        const buscando_texto = body.buscando_texto;
        const pagina_actual = req.body.pagina_actual - 1;  //     se le resta 1 por si viene siendo pagina 1 por ejemplo que no haga skip de ningun dato , convirtiendola en cero
        console.log('skip' + (pagina_actual * cantidad_por_pagina));
        var resultado = null;
        if(accion ==="todos" && buscando_texto ==="")resultado = await consulta_simple(pagina_actual,cantidad_por_pagina,res)
        else{
            resultado = await consulta_compleja(accion , buscando_texto , pagina_actual,cantidad_por_pagina,res);
        }       
    } catch (err) {
        console.log(err);
        throw err;
    }
}

async function consulta_simple(pagina_actual,cantidad_por_pagina,res){
    console.log("simple--------++++++++++++++++++++++++++++++")
    try {
        Log.countDocuments((err, cuenta_de_logs) => {
            console.log(cuenta_de_logs);
            Log.find({}).skip(pagina_actual * cantidad_por_pagina).limit(cantidad_por_pagina).sort({ fecha: -1 })
                .then((respuesta_db) => {
                    //console.log(respuesta_db.length);
                    let paginas;
    
                    if (respuesta_db.length === 0) {
                        paginas = 0;
                    }
                    else {
                        paginas = Math.floor((cuenta_de_logs + step - 1) / (step));
    
                    }
                    return res.send({ lista: respuesta_db, cuenta_de_logs, paginas }).status(200);
                })
        })
    } catch (err) {
        console.log(err);
        return err;
    }
}


async function consulta_compleja(accion , buscando_texto , pagina_actual,cantidad_por_pagina,res){
    console.log("complejo--------++++++++++++++++++++++++++++++")
    try {
        Log.countDocuments((err, cuenta_de_logs) => {
            if(err){
                throw err;
            }
            console.log(cuenta_de_logs);
            let consulta={$and:[]} ;
            
            if(buscando_texto!=""){
                var expresion_regular =  {body:{ '$regex': String(buscando_texto).replace(' ', '|'), '$options': "im" }} ;
                consulta = {$and:[expresion_regular ]}
            }
            if(accion!="todos")consulta.$and.push({accion});
            //aqui me quede 
            
            //if(accion!="todos")consulta.$and.push(accion);
            
            console.log(consulta)
            Log.find(consulta).skip(pagina_actual * cantidad_por_pagina).limit(cantidad_por_pagina).sort({ fecha: -1 })
                .then((respuesta_db) => {
                    //console.log(respuesta_db.length);
                    let paginas;
                    if (respuesta_db.length === 0) {
                        paginas = 0;
                    }
                    else {
                        paginas = Math.floor((cuenta_de_logs + step - 1) / (step));
                    }
                    return res.send({ lista: respuesta_db, cuenta_de_logs, paginas }).status(200);
                })
        })
    } catch (err) {
        console.log(err);
        return err;
    }
}