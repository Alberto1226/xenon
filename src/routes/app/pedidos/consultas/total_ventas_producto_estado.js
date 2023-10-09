import { Pedido } from "../../../../models/pedido";
import { Cliente } from "../../../../models/cliente";
import * as mongoose from 'mongoose';
import * as accesos from "../../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    let objectId = mongoose.Types.ObjectId;

    let estado = req.body.estado;
    let periodicidad = req.body.periodicidad;
    Cliente.aggregate().match({ "direcciones_asociadas.estado": estado ,activo:true}).group({
        _id: estado,
        count: { $sum: 1 },
        lista_clientes: { $push: { id: "$_id", nombre: "$nombre", location: "$location" } }
    }).then(async (clientes_en_estado) => {
        if (clientes_en_estado === null || clientes_en_estado === undefined|| clientes_en_estado.length===0 ) {
            return res.send({ ok: true, clientes_en_estado: { _id: estado, count: 0, lista_clientes: [] } });
        }
        //console.log(clientes_en_estado[0].lista_clientes);

        const or_consulta = await crear_or(clientes_en_estado[0].lista_clientes,periodicidad);

        Pedido.aggregate().match(or_consulta)
        .unwind("$lista")
        .group({_id:'$lista.producto._id',nombre:{"$first":'$lista.producto.nombre'},cantidad_total:{ $sum: "$lista.cantidad" }})
        .sort({"cantidad_total":-1}) .then((productos_por_estado)=>{
            res.send({ ok: true,clientes_en_estado, productos_por_estado});
        })
        
    })
        .catch((err => {
            console.log(err);
            res.send({ ok: false })
        }))

}

function crear_or(lista,periodicidad) {
    return new Promise((resolve, reject) => {
        try {
            let consulta_or = { $or: [],$and:[{fecha: {$gte: new Date(periodicidad.desde)}},{fecha: {$lt: new Date(periodicidad.hasta)}}]};
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];
                consulta_or.$or.push({ "cliente.id": JSON.parse(JSON.stringify(element.id ))})
                if (i + 1 === lista.length) {
                    //console.log(consulta_or);
                    resolve(consulta_or);
                }
            }
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}