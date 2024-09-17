import * as mongoose from 'mongoose';
import * as accesos from "../../accesos";
import { Pedido } from "../../../../models/pedido";
import { group } from 'd3';

export async function post(req, res, next) {

    // if (accesos.esta_logueado(req) === false) {
    //     res.send({ ok: false, mensaje: "sesion expirada" })
    //     return;
    // }
    // if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
    //     res.send({ ok: false, mensaje: "permisos insuficientes" })
    //     return;
    // }
    let periodicidad = { desde: new Date(req.body.desde), hasta: new Date(req.body.hasta) }

    try {
        const fechasFiltro = { $and: [{ fecha: { $gte: periodicidad.desde } }, { fecha: { $lt: periodicidad.hasta } }] };
        let total_monetario = 0;
        let total_registros = 0;
        let total_cantidad_vendida = 0;
        let total_productos_unicos = 0;

        Pedido.aggregate()
            .match(fechasFiltro)
            .group({
                _id: null,
                total_monetario: { $sum: "$total_pedido" },
                total_registros: { $sum: 1 }  // Cuenta el número de registros
            })
            .then((datos) => {
                // res.send({ ok: true, name: 'Barras productos paginados', datos});
                if (datos.length > 0) {
                    total_monetario = datos[0].total_monetario;
                    total_registros = datos[0].total_registros;
                }
                // res.send({ ok: true, name: 'Barras productos paginados', total_monetario, total_registros });
            })
        Pedido.aggregate()
            .match(fechasFiltro)
            .unwind('$lista')
            .group({
                _id: null,
                total_cantidad_vendida: { $sum: "$lista.cantidad" }  // Suma la cantidad de cada producto
            })
            .then((Datos) => {
                // res.send({ ok: true, name: 'Barras productos paginados', DATOS });
                if (Datos.length > 0) {
                    total_cantidad_vendida = Datos[0].total_cantidad_vendida;
                }
                // res.send({ ok: true, name: 'Barras productos paginados', total_monetario, total_registros, total_cantidad_vendida });
            })
        Pedido.aggregate()
            .match(fechasFiltro)
            .unwind('$lista')
            .group({
                _id: null,
                productos_unicos: { $addToSet: "$lista.producto._id" }  // Agrega productos únicos al conjunto
            })
            .project({
                total_productos_unicos: { $size: "$productos_unicos" }  // Cuenta el número de productos únicos
            })
            .then((DATOS) => {
                // res.send({ ok: true, name: 'Barras productos paginados', DATOS });
                if (DATOS.length > 0) {
                    total_productos_unicos = DATOS[0].total_productos_unicos;
                }
                res.send({ ok: true, name: 'General', total_monetario, total_registros, total_cantidad_vendida, total_productos_unicos });
            })


    } catch (err) {
        console.log(err);
        res.send({ ok: false });
    }
}