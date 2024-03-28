import { Pedido } from "../../../../models/pedido";
// import { Producto } from "../../../../models/producto";
import { Cliente } from "../../../../models/cliente";
import * as mongoose from 'mongoose';
import * as accesos from "../../accesos";
//import { categorias } from "../../_importaciones/categoria";
var _ = require('underscore');

export async function post(req, res, next) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }








    let pagina_actual = req.body.pagina_actual;
    pagina_actual = +pagina_actual - 1;
    let step = req.body.step;
    let orden = req.body.orden;
    //console.table(pagina_actual);
    //console.table(step);
    let periodicidad = { desde: new Date(req.body.desde), hasta: new Date(req.body.hasta) }
    // let periodicidad = { desde: new Date(), hasta: new Date() }
    // periodicidad.desde.setMonth(periodicidad.desde.getMonth() - 2);

    try {
        const fechasFiltro = { $and: [{ fecha: { $gte: periodicidad.desde } }, { fecha: { $lt: periodicidad.hasta } }] };
        //  Agrupar productos en listas de pedidos entregados, 
        //  POner el total de ventas
        //  sumar sus unidades (cantidades vendidas)

        Pedido.aggregate()
            .match(fechasFiltro)
            .group({
                _id: '$cliente.id',
            }).count('productos_distintos_en_pedidos_de_periodo')
            .then((cantidad_de_registros_en_db) => {
                Pedido.aggregate()
                    .match(fechasFiltro)
                    .group({
                        _id: '$cliente.id',
                        name: { $first: '$cliente.nombre' },
                        ventas_totales: { $sum: "$total_pedido" },// total de ventas del periodo
                        unidades_vendidas: { $sum: 1 }, // multiplicar por cantidad en pedido
                    }).sort({ ventas_totales: orden }).skip(pagina_actual * step).limit(10)
                    .then(async (suma_ventas_por_producto) => {
                        if (suma_ventas_por_producto.length == 0) {
                            res.send({ resumen: 'No existen ventas en el periodo' })
                            return
                        }
                        //  construir consulta que involucra a los productos agregados
                        const consultaProductosInvolucrados = await crear_or(suma_ventas_por_producto)
                        //  ejecutar consulta de productos asociados 
                        Cliente.find().where(consultaProductosInvolucrados)
                            .then(async (productos_completos) => {
                                const children = await ordenarArbol(suma_ventas_por_producto, productos_completos);
                                res.send({ ok: true, name: 'Barras productos paginados', children: children, cantidad_de_registros_en_db: cantidad_de_registros_en_db[0].productos_distintos_en_pedidos_de_periodo });
                            })
                    })
            })

    } catch (err) {
        console.log(err);
        res.send({ ok: false });
    }
}



let unflatten = async function (array, productos_completos, parent, tree, tree2) {

    tree = typeof tree !== 'undefined' ? tree : [];
    tree2 = typeof tree2 !== 'undefined' ? tree2 : [];
    parent = typeof parent !== 'undefined' ? parent : { id_categoria: null };
    parent.name = parent.descripcion;

    var children = _.filter(array, function (child) { return child.id_cat_padre == parent.id_categoria; });
    var productos_a_hijos = await devolverChildrenConProductos(children, productos_completos);
    children = productos_a_hijos;

    // const productos_pertenecientes = productos_completos.filter(element => element.subcategoria == parent.descripcion );

    if (!_.isEmpty(children)) {
        if (parent.id_categoria == null) {//solo la primera vez
            tree = children;
        } else {
            parent['children'] = children

        }
        _.each(children, function (child) { unflatten(array, productos_completos, child, tree2) });
    }
    return tree;
}




function ordenarArbol(suma_ventas_por_producto, productos_completos) {
    return new Promise(async (resolve, reject) => {
        try {
            // simplificar productos_Completos
            let lista = await unir_productos_a_su_agregacion(productos_completos, suma_ventas_por_producto);


            //let desaplanado = unflatten(categorias_importado,lista)
            resolve(lista);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    })
}








function unir_productos_a_su_agregacion(productos_completos, agregaciones) {
    return new Promise((resolve, reject) => {
        try {
            //console.log('resolviendo cats cantidad='+ .length);
            let lista = [];
            for (let i = 0; i < agregaciones.length; i++) {
                const element = agregaciones[i];
                //console.log(element);
                //console.log(agregaciones);
                let producto_completo = productos_completos.find((prod) => JSON.stringify(prod._id) === JSON.stringify(element._id));
                let nuevo_super_producto = JSON.parse(JSON.stringify(element));
                // nuevo_super_producto.categoria = producto_completo.category.nombre;
                // nuevo_super_producto.subcategoria = producto_completo.subcategoria.nombre;
                // nuevo_super_producto.precio = producto_completo.precio;
                // nuevo_super_producto.unidad = producto_completo.unidad;
                nuevo_super_producto.name2 = producto_completo.alias;
                nuevo_super_producto.id = producto_completo._id;
                // nuevo_super_producto.imagen = producto_completo.galeria_imagenes[0];
                lista.push(nuevo_super_producto);
                if (i + 1 === productos_completos) {
                    resolve(lista);
                }
            }
            resolve(lista);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    })
}

function crear_or(lista, periodicidad) {
    return new Promise((resolve, reject) => {
        try {
            let objectId = mongoose.Types.ObjectId;
            let consulta_or = { $or: [] };
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];
                consulta_or.$or.push({ "_id": objectId(JSON.parse(JSON.stringify(element._id))) })
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

