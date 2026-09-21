

import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos"
import {devolver_carrito_db} from './_server_cambiar_cantidad/devolver_carrito_db';

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo
    const id = req.body.id;
    const moneda = req.body.moneda;
    const direccion = req.body.direccion;
    const tipo_de_cambio = req.body.tipo_de_cambio;
    let notas = req.body.notas;

    const carrito_db = await devolver_carrito_db(id);
    if(!carrito_db.carrito){
        return res.send({ok:false,mensaje:'No se encontro el carrito'});
    }

    if (carrito_db.carrito.procesando == true || ['Pagado', 'Empaque', 'Envío', 'Envio', 'Entregado'].includes(carrito_db.carrito.status)) {
        return res.send({ ok: false, mensaje: 'No es posible alterar los datos de venta del pedido en estatus ' + carrito_db.carrito.status });
    }

    notas = await sanitizar_notas(notas);
    //console.log(notas)
    //var query = {'cliente.id': doc.id};
   //console.log(id);

    Carrito.findByIdAndUpdate(id,{moneda,'cliente.direccion':direccion,tipo_de_cambio,notas})
    .then((respuesta)=>{
       
            res.send({ok:true,carrito:respuesta});

    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false,mensaje:'No se encontro el carrito'})
    })
}



async function sanitizar_notas(texto) {
    let resultado =  texto;
    resultado =  replaceAll(resultado,"<","")
    resultado =  replaceAll(resultado,">","")
    resultado =  replaceAll(resultado,'"',"")
    resultado =  replaceAll(resultado,"'","")
    resultado =  replaceAll(resultado,"/","")
    resultado =  replaceAll(resultado,"&"," amperson")
    resultado =  replaceAll(resultado,"\\","")
    return resultado
}

function replaceAll(string, search, replace) {
    return string.split(search).join(replace);
  }