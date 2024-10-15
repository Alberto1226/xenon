

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
                    //let lista_filtrada= await filtrar_lista(buscando,resDB);
                    resolve({ ok: true, lista: resDB });
                })

        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

