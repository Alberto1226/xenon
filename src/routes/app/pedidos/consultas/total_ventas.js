import {Pedido} from "../../../../models/pedido";
import * as mongoose from 'mongoose';
import * as accesos from "../../accesos";

export async function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    let objectId = mongoose.Types.ObjectId;

    let id= req.body.id;
    Pedido.aggregate().match({'cliente.id': id}).group({
        _id:id,
        count: { $sum: 1 },
        lista_pedidos: { $push:  { id: "$_id", total_pedido: "$total_pedido",fecha: "$fecha" } },
        total_ventas: { $sum: "$total_pedido"}
    }).then((respuesta)=>{
        res.send({ok:true,respuesta});
    })
    .catch((err=>{
        console.log(err);
        res.send({ok:false})
    }))

}