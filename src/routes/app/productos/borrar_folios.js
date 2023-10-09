
//   Como superadmin crea productos
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";
import mongoose from "mongoose";

import { snap_por_cambio_en_pedido } from './../pedidos/editar/_producto_snaplogs/snap_por_cambio_en_pedido';

export async function post(req, res, next) {

    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    var folios = req.body.folios;
    var producto_id = req.body.producto_id;
    var producto = await devolver_producto(producto_id);
    if (!producto) {
        return res.send({ ok: false, mensaje: "El producto ya no existe." })
    }
    var borrado = await borrar_folios(folios, producto_id);
    if (borrado == false) {
        return res.send({ ok: false, mensaje: "No se pudieron borrar los folios." })
    }


    const snap_proceso = await snap_por_cambio_en_pedido(
        { nombre: producto.nombre, id: producto._id },
        { nombre: req.user.nombre, id: req.user._id },
        folios.length,
        producto.existencia.actual,
        "5",  //  5:Borrar folios
        { folio: "", cliente: { nombre: "" } },
        producto,
        folios
    )



    console.log({ producto_id, folios, borrado, snap_proceso });
    res.send({ ok: true });
}


async function devolver_producto(id) {
    return Producto.findById(id)
        .then((resultado) => {
            return resultado;
        })
}

async function borrar_folios(folios, id) {
    return Producto.updateOne({ _id: mongoose.Types.ObjectId(id) }, { $pull: { "existencia.folios": { $in: folios } } })
        .then((resultado) => {
            console.log({ resultadoBorrado: resultado });
            return true;
        })
        .catch((err) => {
            console.log(err);
            return false
        })
}