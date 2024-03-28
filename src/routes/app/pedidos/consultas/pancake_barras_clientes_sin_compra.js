import { Pedido } from "../../../../models/pedido";
import { Producto } from "../../../../models/producto";
import { Cliente } from "../../../../models/cliente";
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






    let pagina_actual = req.body.pagina_actual;
    pagina_actual = +pagina_actual - 1;
    //console.table(pagina_actual);
    //console.table(step);
    //  usar esta  let periodicidad = { desde: new Date(req.body.desde), hasta: new Date(req.body.hasta) }
    let periodicidad = { desde: new Date(), hasta: new Date() }
    periodicidad.desde.setMonth(periodicidad.desde.getMonth() - 2);

    try {
        const fechasFiltro = { $and: [{ fecha: { $gte: periodicidad.desde } }, { fecha: { $lt: periodicidad.hasta } }] };
        //  Agrupar productos en listas de pedidos entregados, 
        //  POner el total de ventas
        //  sumar sus unidades (cantidades vendidas)

        //  Obtener los IDs de clientes que han realizado pedidos en el periodo
        Pedido.distinct('cliente.nombre', fechasFiltro)
            .then(async (clientesConPedidos) => {
                // Obtener todos los clientes
                // const todosLosClientes = await Cliente.find({ activo: true }).select(['_id', 'nombre', 'correo']);
                const todosLosClientes = await Cliente.find().select(['_id', 'nombre', 'correo']);

                // Filtrar los clientes que no han realizado pedidos en el periodo
                const clientesSinCompras = todosLosClientes.filter(cliente => !clientesConPedidos.includes(cliente.nombre));

                // Ordenar los clientes sin compras por nombre
                clientesSinCompras.sort((a, b) => a.nombre.localeCompare(b.nombre));

                res.send({ ok: true, clientesSinCompras, cantidad: clientesSinCompras.length });
            });

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
    //console.log(parent.id_categoria + "----------")
    //console.log(productos_pertenecientes)
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
                nuevo_super_producto.categoria = producto_completo.category.nombre;
                nuevo_super_producto.subcategoria = producto_completo.subcategoria.nombre;
                nuevo_super_producto.precio = producto_completo.precio;
                nuevo_super_producto.unidad = producto_completo.unidad;
                nuevo_super_producto.id = producto_completo._id;
                nuevo_super_producto.imagen = producto_completo.galeria_imagenes[0];
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
            let consulta_or = { $nin: [] };
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];
                consulta_or.$nin.push(objectId(JSON.parse(JSON.stringify(element._id))))
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

