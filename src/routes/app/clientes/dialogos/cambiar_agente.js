
//   Solo se debe de usaruna vez , cuando manuyalmente se requiera , deshabilitar en uso
import { Cliente } from "../../../../models/cliente";
import { Carrito } from "../../../../models/carrito";
import { Usuario } from "../../../../models/usuario";
import * as accesos from "../../accesos";
const mongoose = require('mongoose');
export function post(req, res, next) {
    ////console.log(req.body.usuario);

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    if (accesos.tiene_permisos_gerenciales(req) === false && accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada 2" })
        return;
    }
    const sessionPromise = mongoose.startSession();

    sessionPromise.then(async (session) => {
        session.startTransaction();
        try {
            let cliente_id = req.body.cliente_id;
            let agente_id = req.body.agente_id;

            // Buscar el agente
            const dbAgente = await Usuario.findById(agente_id).session(session);
            if (!dbAgente) {
                await session.abortTransaction();
                session.endSession();
                res.send({ ok: false, mensaje: "No se pudo encontrar al agente." });
                return;
            }

            // Actualizar carritos
            const carritos = await Carrito.find({ "cliente.id": cliente_id }).session(session);
            for (let carrito of carritos) {
                carrito.agente = {
                    nombre: dbAgente.nombre,
                    id: dbAgente._id,
                    correo: dbAgente.correo
                };
                await carrito.save({ session });
            }

            // Actualizar cliente
            const dbdoc = await Cliente.findById(cliente_id).session(session);
            if (!dbdoc) {
                await session.abortTransaction();
                session.endSession();
                res.send({ ok: false, mensaje: "No se encontró al cliente." });
                return;
            }
            dbdoc.agente = {
                nombre: dbAgente.nombre,
                id: dbAgente._id,
                correo: dbAgente.correo
            };
            await dbdoc.save({ session });

            await session.commitTransaction();
            session.endSession();
            res.send({ ok: true, mensaje: "Agente se ha cambiado con éxito.", id: req.body.id });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            console.log(err);
            res.send({ ok: false, mensaje: "No se pudo cambiar el agente." });
        }
    });
    //     let cliente_id = req.body.cliente_id;
    //     let agente_id = req.body.agente_id;

    //     Carrito.find({ "cliente.id": req.body.cliente_id }, (err, carritos) => {
    //         if (err) {
    //             res.send({ ok: false, mensaje: "Error al obtener los carritos." });
    //             return;
    //         }
    //         // Puedes hacer algo con los carritos aquí si lo necesitas

    //         Usuario.findById(agente_id, (err, dbAgente) => {
    //             if (err || !dbAgente) {
    //                 res.send({ ok: false, mensaje: "No se pudo encontrar al agente para los carritos." });
    //                 return;
    //             }
    //             // Actualizar todos los carritos encontrados
    //             let updatePromises = carritos.map(carrito => {
    //                 carrito.agente = {
    //                     nombre: dbAgente.nombre,
    //                     id: dbAgente._id,
    //                     correo: dbAgente.correo
    //                 };
    //                 return carrito.save();
    //             });

    //             Promise.all(updatePromises)
    //                 .then(() => {
    //                     // Los carritos se actualizaron correctamente
    //                     console.log("Carritos actualizados con el nuevo agente.");
    //                 })
    //                 .catch((err) => {
    //                     console.log(err);
    //                     // No se detiene el flujo, pero puedes manejar el error si lo deseas
    //                 });
    //         });
    //     });


    //     // console.log(req.body)

    //     Cliente.findById(cliente_id, (err, dbdoc) => {
    //         if (err) {
    //             //console.log(err);
    //             return;
    //         }
    //         if (dbdoc === undefined || dbdoc === null) {
    //             //console.log('no se encontro el Cliente con dicho id' );
    //             res.send({ ok: false, mensaje: "Nombre no se encontro al clietne." })
    //             return;
    //         }
    //         Usuario.findById(agente_id)
    //             .then((dbAgente) => {
    //                 if (dbAgente === null || dbAgente === undefined) {
    //                     res.send({ ok: false, mensaje: "No se pudo encontro al agente." });
    //                     return
    //                 }
    //                 dbdoc.agente = {
    //                     nombre: dbAgente.nombre,
    //                     id: dbAgente._id,
    //                     correo: dbAgente.correo
    //                 }
    //                 dbdoc.save((err) => {
    //                     if (err) {
    //                         console.log(err);
    //                         res.send({ ok: false, mensaje: "No se pudo cambiar el agente." });
    //                         return;
    //                     }
    //                     //console.log('Cliente creado !');
    //                     res.send({ ok: true, mensaje: "Agente se ha cambiado con exito.", id: req.body.id });
    //                 })
    //             })

    //     }).catch((err) => {

    //         console.log(err);
    //         res.send({ ok: false, mensaje: "No se pudo cambiar el agente." });
    //     })

}