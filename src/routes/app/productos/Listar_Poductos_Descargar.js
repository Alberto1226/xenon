import * as accesos from "../accesos";


export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    console.log("entro a Listar_Poductos_Descargar");
    res.send(await consulta());

}

function consulta() {
    const mongoose = require('mongoose');
    return new Promise((resolve, reject) => {
        try {
            mongoose.connection.collection('vistaProductosDescarga').find({}).toArray().then((resDB) => {
                resolve({ ok: true, lista: resDB });
            }).catch((err) => {
                console.log(err);
                reject({ ok: false, mensaje: "error al buscar resultados." })
            });

        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

// db.createView(
//     "vistaProductosDescarga",
//     "productos",
//     [
//         {
//             $project: {
//                 codigo: 1,
//                 nombre: { $toLower: "$nombre" },
//                 marca: 1,
//                 category: 1,
//                 "existencia.actual": 1,
//                 precio: 1,
//                 carritos: 1
//             }
//         },
//         {
//             $sort: { nombre: 1 }
//         }
//     ]
// );

// db.productos2.updateMany(
//     {},
//     [
//       {
//         $set: {
//           nombre: {
//             $trim: { input: "$nombre" } // Elimina espacios al inicio y al final
//           }
//         }
//       }
//     ]
//   )