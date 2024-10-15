import { Pedido } from "../../../../models/pedido";
import { Producto } from "../../../../models/producto";
//import { Cliente } from "../../../../models/cliente";
import * as mongoose from 'mongoose';
//import * as accesos from "../../accesos";
//import { categorias } from "../../_importaciones/categoria";
var _ = require('underscore');

export async function post(req, res, next) {
    /*
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    
*/


    try {
        Producto.find()
            .then(async (productos_completos) => {
                // console.log(productos_completos);
                let nombresMarcas = obtenerMarcasUnicas(productos_completos);
                console.log(nombresMarcas);
                res.send({ ok: true, marcas: nombresMarcas });
            })
    } catch (err) {
        console.log(err);
        res.send({ ok: false });
    }
}

const obtenerMarcasUnicas = (productos) => {
    const marcas = productos.map(producto => producto.marca);
    const marcasUnicas = [...new Set(marcas)];
    return marcasUnicas;
};