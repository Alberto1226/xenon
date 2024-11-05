// Objetivo: Verificar si un folio de pedido existe en algun pedido o carrito
import { Producto_snaplog } from '../../../../models/producto_snaplog';
import { Carrito } from '../../../../models/carrito';
import { Pedido } from '../../../../models/pedido';
import { Producto } from '../../../../models/producto';
import * as accesos from '../../accesos';
import * as mongoose from 'mongoose';


export async function post(req, res, next) {
    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    var folio_a_buscar = req.body.folio_a_buscar
    var existe_en_carrito_resultado = await existe_en_carrito(folio_a_buscar);
    var existe_en_pedido_resultado = await existe_en_pedido(folio_a_buscar);
    var existe_registro_de_salida = await existe_salida(folio_a_buscar);
    var existe_en_la_bodega_resultado = await existe_en_la_bodega(folio_a_buscar);
    var buscar_folio_con_regex_resultado = await buscar_folio_con_regex(folio_a_buscar);
    var existe_registro_de_borrado_de_folios = await existe_borrado_de_folios(folio_a_buscar);
    res.send({ existe_en_carrito_resultado, existe_en_pedido_resultado, existe_registro_de_salida, existe_registro_de_borrado_de_folios, existe_en_la_bodega_resultado, buscar_folio_con_regex_resultado });
}


async function existe_en_carrito(folio_a_buscar) {
    return Carrito.findOne({ "lista.folios": folio_a_buscar })
        .then((resultadoDB) => {
            return resultadoDB
        })
}

//esta funcion se ejecuta pero no se usa en la interface
async function existe_en_pedido(folio_a_buscar) {
    return Pedido.findOne({ "lista.folios": folio_a_buscar })
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

//esta funcion obtiene los folios que han sido borrados manualmente
async function existe_borrado_de_folios(folio_a_buscar) {
    return Producto_snaplog.findOne({ "folios": folio_a_buscar, accion: "5" })
        .then((resultadoDB) => {
            return resultadoDB
        })
}

async function existe_en_la_bodega(folio_a_buscar) {
    return Producto.find({ "existencia.folios": folio_a_buscar })
        .then((resultadoDB) => {
            return resultadoDB
        })
}

async function buscar_folio_con_regex(folio_a_buscar) {
    return Pedido.findOne({
        lista: {
            $elemMatch: {
                "folios": {
                    $elemMatch: {
                        $regex: folio_a_buscar
                    }
                }
            }
        }
    }).then((resultadoDB) => {
        return resultadoDB;
    });
}