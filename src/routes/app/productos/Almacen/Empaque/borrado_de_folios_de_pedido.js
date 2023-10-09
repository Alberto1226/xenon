

import { Carrito } from "../../../../../models/carrito";
import * as accesos from "../../../accesos"

import * as mongoose from 'mongoose';
//  Se EMPLEA EN LISTA DE PEDIDIDOS QUE EN DB SE VE COMO CARRITO

import { Producto } from "../../../../../models/producto";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    var carrito_id = req.body.carrito_id;


    var producto_id = req.body.producto_id;
    var folios_selectos = req.body.selectos;
    //console.log({ folios_selectos });
    var carrito = await devolver_carrito(carrito_id);
    //console.log({ id: carrito._id });
    let borrado = await borrar_folios(carrito_id, folios_selectos, carrito, producto_id);
    console.log({ borrado });
    //var lista_de_ids_de_productos = await extraer_ids_de_productos(carrito.lista);
    //console.log({ lista_de_ids_de_productos });
    //var productos = await devolver_productos(lista_de_ids_de_productos);

    return res.send(borrado)
}



function devolver_productos(lista) {
    try {
        let ObjectId = mongoose.Types.ObjectId;
        let objetos_ids = lista.map(elem => { return ObjectId(elem) })
        //console.log({ _id: { $in: objetos_ids } });
        return Producto.find({ _id: { $in: objetos_ids } })
            .then((resultado) => {
                //console.log({ resultado });
                return resultado
            })
    } catch (err) {
        console.log(err);
        return null
    }
}

function devolver_carrito(id) {
    return Carrito.findById(id)
        .then((resultado) => {
            return resultado
        })
}


function extraer_ids_de_productos(lista) {
    let lista_nueva = lista.map(elem => {
        return elem.producto._id
    })
    //console.log(lista_nueva);
    return lista_nueva
}


function borrar_folios(carrito_id, folios, carrito, producto_id) {
    const lista_previa = carrito.lista;
    let registro_buscado = carrito.lista.find(elem => JSON.parse(JSON.stringify(elem.producto._id)) == producto_id)
    //console.log({ registro_buscado, lista_previa });
    registro_buscado.folios = registro_buscado.folios.filter(elem => !folios.includes(elem));
    //console.log({ registro_buscado })

    return Carrito.findByIdAndUpdate(carrito_id, {
        lista: carrito.lista
    }).then((resultado) => {
        //console.log({ resultado });
        return { ok: true }
    })
        .catch((err) => {
            console.log(err);
            return { ok: false }
        })


}