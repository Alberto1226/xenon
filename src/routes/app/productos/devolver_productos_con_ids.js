

import { Producto } from "../../../models/producto";
var mongoose = require('mongoose');
import * as accesos from "../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }



    var lista = req.body
    //console.log("id usuairo = ",usuario._id);    //  usuario:{$ne: req.user.usuario},  que no sea el mismo
    
   //console.log(lista)
    Producto.find().where('_id').in(lista)
    .then((respuesta)=>{
        res.send({ ok: true, lista: respuesta })
    })
    .catch((err)=>{
        res.send({ ok: false })
    })     

}

