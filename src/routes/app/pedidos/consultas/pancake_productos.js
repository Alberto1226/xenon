import { Pedido } from "../../../../models/pedido";
import { Producto } from "../../../../models/producto";
//import { Cliente } from "../../../../models/cliente";
import * as mongoose from 'mongoose';
import * as accesos from "../../accesos";
//import { categorias } from "../../_importaciones/categoria";
var _ = require('underscore');

export async function post(req, res, next) {
    
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    

    /// Regresa el arbol para admin estudios pancake . ordenado por categoria --> subcategorias .... --> producto



    //let periodicidad = req.body.periodicidad;
    let periodicidad = { desde: new Date(req.body.desde), hasta: new Date(req.body.hasta) }


    try {
        const fechasFiltro = { $and: [{ fecha: { $gte: new Date(periodicidad.desde) } }, { fecha: { $lt: new Date(periodicidad.hasta) } }] };
        //  Agrupar productos en listas de pedidos entregados, 
        //  POner el total de ventas
        //  sumar sus unidades (cantidades vendidas)
        Pedido.aggregate()
            .match(fechasFiltro)
            .unwind('$lista')
            .group({
                _id: '$lista.producto._id',
                name: { $first: '$lista.producto.nombre' },
                value: { $sum: { $multiply: ['$lista.producto.precio', '$lista.cantidad'] } },// total de ventas del periodo
                unidades_vendidas: { $sum: 1 },
            })
            .then(async (suma_ventas_por_producto) => {
                if (suma_ventas_por_producto.length == 0) {
                    res.send({ resumen: 'No existen ventas en el periodo' })
                    return
                }
                //  construir consulta que involucra a los productos agregados
                const consultaProductosInvolucrados = await crear_or(suma_ventas_por_producto)
                //  ejecutar consulta de productos asociados 
                Producto.find().where(consultaProductosInvolucrados)
                    .then(async (productos_completos) => {
                        const children = await ordenarArbol(suma_ventas_por_producto, productos_completos);
                        res.send({ok:true,name:'Ventas en periodo',children:children});
                    })
            })
    } catch (err) {
        console.log(err);
        res.send({ ok: false });
    }
}



let unflatten = async function( array, productos_completos,parent, tree ,tree2){  
   
    tree = typeof tree !== 'undefined' ? tree : [];
    tree2 = typeof tree2 !== 'undefined' ? tree2 : [];
    parent = typeof parent !== 'undefined' ? parent : { id_categoria: null };
    parent.name = parent.descripcion;
    
    var children = _.filter( array, function(child){ return child.id_cat_padre == parent.id_categoria; });
    var productos_a_hijos = await devolverChildrenConProductos(children,productos_completos);
    children = productos_a_hijos;

  
    if( !_.isEmpty( children )  ){
        if( parent.id_categoria == null){//solo la primera vez
           tree = children;
        }else{
           parent['children'] = children
        }
        _.each( children, function( child ){ unflatten( array, productos_completos,child,tree2 ) } );                    
    }    
    return tree;
}




function devolverChildrenConProductos(children,productos) {
    return new Promise(async (resolve, reject) => {
        try {
          for (let i = 0; i < children.length; i++) {
              const hijo = children[i];            
              const productos_pertenecientes = productos.filter(element => element.subcategoria == hijo.descripcion );
              hijo.children = productos_pertenecientes;
              if(i+1==children.length){
                  resolve(children);
              }
          }
        } catch (err) {
            reject(err);
        }
    })
}


function ordenarArbol(suma_ventas_por_producto, productos_completos) {
    return new Promise(async (resolve, reject) => {
        try {
            // simplificar productos_Completos
            let lista = await unir_productos_a_su_agregacion(productos_completos, suma_ventas_por_producto);
            lista.sort((a, b) => {
                if (a.categoria > b.categoria) return 1;
                if (a.categoria < b.categoria) return -1;
                return 0;
            })
            //let ciclocat = await cicloCategorias(lista);
            let desaplanado = unflatten(categorias_importado,lista)
            resolve(desaplanado);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    })
}




function cicloCategorias(arbol) {
    return new Promise(async (resolve, reject) => {
        try {
            let lista = []; // categorias
            let categoria_previa = '---';
            for (let i = 0; i < arbol.length; i++) {
                const registro = arbol[i];
                if (categoria_previa != registro.categoria) {
                    lista.push(registro.categoria)
                    //let subcategorias = arbol.filter((element)=> element.)
                    categoria_previa = registro.categoria;
                }
                if (i + 1 === arbol.length) {
                    resolve(lista);
                }
            }
        } catch (err) {
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





const categorias_importado = [
    { "id_categoria": "1", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "1", "der": "14", "descripcion": "Audio", "orden": "0", "imagen": "1.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "2", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "12", "der": "13", "descripcion": "Accesorios", "orden": "1", "imagen": "2.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "3", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "6", "der": "7", "descripcion": "Amplificadores y modulares", "orden": "1", "imagen": "3.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "4", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "4", "der": "5", "descripcion": "Autoestereos y multimedia", "orden": "1", "imagen": "4.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "5", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "2", "der": "3", "descripcion": "Kit de cables y rollos", "orden": "1", "imagen": "5.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "6", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "8", "der": "9", "descripcion": "Material acústico y aislante", "orden": "1", "imagen": "6.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "7", "id_usuario_sistema": null, "id_cat_padre": "1", "izq": "10", "der": "11", "descripcion": "Tweeter, altavoces y sub woofer", "orden": "1", "imagen": "7.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "8", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "15", "der": "38", "descripcion": "Iluminacion LED", "orden": "0", "imagen": "8.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "9", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "18", "der": "19", "descripcion": "Accesorios de led", "orden": "1", "imagen": "9.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "10", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "16", "der": "17", "descripcion": "Barras de led", "orden": "1", "imagen": "10.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "11", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "28", "der": "37", "descripcion": "Led Headlight", "orden": "1", "imagen": "11.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "12", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "20", "der": "21", "descripcion": "Mini led", "orden": "1", "imagen": "12.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "13", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "22", "der": "23", "descripcion": "Mini led Osram", "orden": "1", "imagen": "13.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "14", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "24", "der": "25", "descripcion": "Tira de led", "orden": "1", "imagen": "14.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "15", "id_usuario_sistema": null, "id_cat_padre": "8", "izq": "26", "der": "27", "descripcion": "Unidades de led", "orden": "1", "imagen": "15.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "16", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "39", "der": "44", "descripcion": "Iluminacion Xenon", "orden": "0", "imagen": "16.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "17", "id_usuario_sistema": null, "id_cat_padre": "16", "izq": "40", "der": "41", "descripcion": "Kit 55 W", "orden": "1", "imagen": "17.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "18", "id_usuario_sistema": null, "id_cat_padre": "16", "izq": "42", "der": "43", "descripcion": "Medidas especiales", "orden": "1", "imagen": "18.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "19", "id_usuario_sistema": null, "id_cat_padre": null, "izq": "45", "der": "58", "descripcion": "Seguridad", "orden": "0", "imagen": "19.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "20", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "46", "der": "47", "descripcion": "Accesorios de seguridad", "orden": "1", "imagen": "20.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "21", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "48", "der": "49", "descripcion": "Alarmas", "orden": "1", "imagen": "21.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "22", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "50", "der": "51", "descripcion": "Camara de Reversa", "orden": "1", "imagen": "22.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "23", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "52", "der": "53", "descripcion": "GPS", "orden": "1", "imagen": "23.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "24", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "54", "der": "55", "descripcion": "Sensores de reversa", "orden": "1", "imagen": "24.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "25", "id_usuario_sistema": null, "id_cat_padre": "19", "izq": "56", "der": "57", "descripcion": "TPMS", "orden": "1", "imagen": "25.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "26", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "29", "der": "30", "descripcion": "Carbon Led", "orden": "2", "imagen": "26.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "27", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "31", "der": "32", "descripcion": "Sixty", "orden": "2", "imagen": "27.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "28", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "33", "der": "34", "descripcion": "Vision Dual", "orden": "2", "imagen": "28.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null },
    { "id_categoria": "29", "id_usuario_sistema": null, "id_cat_padre": "11", "izq": "35", "der": "36", "descripcion": "Vision", "orden": "2", "imagen": "29.jpg", "created_at": "2020-02-24 12:21:38", "updated_at": "0000-00-00 00:00:00", "deleted_at": null }
]
