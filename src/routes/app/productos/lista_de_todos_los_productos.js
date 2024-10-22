

import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";
import * as mongoose from 'mongoose';

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    res.send(await consulta());

}

// esta funcion se modifico para limpiar el nombre de los productos y asi tratar de mitigar el error de orden por nombre
// function consulta() {
//     return new Promise((resolve, reject) => {
//         try {
//             Producto.find({})
//                 .exec()
//                 .then((resDB) => {
//                     // Función para limpiar caracteres no deseados en el nombre
//                     const cleanNombre = (nombre) => {
//                         return nombre.replace(/[^a-zA-Z0-9\s]/g, '').trim();
//                     };

//                     // Limpiar y ordenar los resultados por el campo "nombre"
//                     const listaOrdenada = resDB
//                         .map(producto => {
//                             producto.nombre = cleanNombre(producto.nombre);
//                             return producto;
//                         })
//                         .sort((a, b) => {
//                             if (a.nombre < b.nombre) return -1;
//                             if (a.nombre > b.nombre) return 1;
//                             return 0;
//                         });

//                     resolve({ ok: true, lista: listaOrdenada });
//                 })
//                 .catch((err) => {
//                     console.log("Error en la consulta:", err);
//                     reject({ ok: false, mensaje: "Error al buscar resultados." });
//                 });
//         } catch (err) {
//             console.log("Error capturado:", err);
//             reject({ ok: false, mensaje: "Error al buscar resultados." });
//         }
//     });
// }



// esta funcion se modifico para hacer la busqueda de los productos en una vista para que tratar de mitigar el error de orden por nombre
// function consulta() {
//     return new Promise((resolve, reject) => {
//         try {
//             mongoose.connection.collection('vistaExcelProductos').find({})
//                 .sort({ nombre: 1 })
//                 .toArray((err, resDB) => {  // Cambiar a 'toArray' para obtener los resultados
//                     if (err) {
//                         console.log("Error en la consulta:", err);
//                         reject({ ok: false, mensaje: "Error al buscar resultados." });
//                     } else {
//                         resolve({ ok: true, lista: resDB });
//                     }
//                 });
//         } catch (err) {
//             console.log("Error capturado:", err);
//             reject({ ok: false, mensaje: "Error al buscar resultados." });
//         }
//     });
// }





function consulta() {
    return new Promise((resolve, reject) => {
        try {

            Producto.find({})
                .sort({ nombre: 1 })
                .exec()
                .then(async (resDB) => {
                    // let lista_filtrada= await filtrar_lista(buscando,resDB);
                    // console.log("dato", resDB[0]);
                    // console.log(resDB[0].nombre);
                    let resDB2 = ordenarPorNombre(resDB);
                    console.log("dato", resDB2[0]);
                    resolve({ ok: true, lista: resDB2 });
                })



        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}
function normalizarNombre(str) {
    // console.log("nombre", str);
    return str.toLowerCase().replace(/[%]/g, '').trim();
}

function ordenarPorNombre(registros) {
    // Ordenamos el arreglo basado en el campo `nombre` del objeto `category` o `subcategoria`
    return registros.sort((a, b) => {
        const nombreA = normalizarNombre(a.nombre || ''.toLowerCase() || '');
        const nombreB = normalizarNombre(b.nombre || ''.toLowerCase() || '');

        if (nombreA < nombreB) return -1;
        if (nombreA > nombreB) return 1;
        return 0;
    });
}

// Producto.find({}, {
//     codigo: 1,
//     nombre: 1,
//     marca: 1,
//     category: 1,
//     'existencia.actual': 1,
//     precio: 1,
//     carritos: 1
// })
//     .sort({ nombre: 1 }) // Ordenar por nombre
//     .exec()
//     .then((resDB) => {
//         const lista_filtrada = resDB.map(producto => {
//             // Calcular existencias disponibles restando la cantidad de productos en los carritos
//             const totalEnCarritos = producto.carritos.reduce((acc, carrito) => acc + carrito.cantidad, 0);
//             const disponibles = producto.existencia.actual - totalEnCarritos;

//             return {
//                 codigo: producto.codigo || '', // Código del producto
//                 nombre: producto.nombre || '', // Nombre del producto
//                 marca: producto.marca || '',   // Marca del producto
//                 categoria: producto.category?.nombre || '', // Nombre de la categoría
//                 existencias: producto.existencia.actual || 0, // Existencias actuales
//                 disponibles: disponibles >= 0 ? disponibles : 0, // Existencias disponibles (no negativas)
//                 precio: producto.precio || 0 // Precio del producto
//             };
//         });

//         console.log("Lista filtrada:", lista_filtrada);
//         resolve({ ok: true, lista: lista_filtrada });
//     })