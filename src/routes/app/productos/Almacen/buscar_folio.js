import { Producto_snaplog } from '../../../../models/producto_snaplog';
import { Producto } from '../../../../models/producto';
import * as accesos from '../../accesos';
import * as mongoose from 'mongoose';


export async function post(req, res, next) {
    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    //console.log(req.body);
    var folio_a_buscar = req.body.folio_a_buscar
    //console.log({ folio_a_buscar });
    var existe_en_la_bodega_resultado = await existe_en_la_bodega(folio_a_buscar);
    var existe_registro_de_inyeccion = await existe_inyeccion(folio_a_buscar);
    var existe_registro_de_salida = await existe_salida(folio_a_buscar);
    var existe_registro_de_borrado_de_folios = await existe_borrado_de_folios(folio_a_buscar);
    res.send({ existe_en_la_bodega_resultado, existe_registro_de_inyeccion, existe_registro_de_salida, existe_registro_de_borrado_de_folios });
}


async function existe_en_la_bodega(folio_a_buscar) {
    return Producto.find({ "existencia.folios": folio_a_buscar })
        .then((resultadoDB) => {
            return resultadoDB
        })
}



async function existe_inyeccion(folio_a_buscar) {
    return Producto_snaplog.findOne({ "folios": folio_a_buscar, accion: "1" })
        .then((resultadoDB) => {
            return resultadoDB
        })
}


async function existe_salida(folio_a_buscar) {
    return Producto_snaplog.findOne({ "folios": folio_a_buscar, accion: "2" })
        .then((resultadoDB) => {
            return resultadoDB
        })
}


async function existe_borrado_de_folios(folio_a_buscar) {
    return Producto_snaplog.findOne({ "folios": folio_a_buscar, accion: "5" })
        .then((resultadoDB) => {
            return resultadoDB
        })
}