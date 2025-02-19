import { Cliente } from "../../../../models/cliente";
import * as accesos from "../../accesos";

export function post(req, res, next) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    // console.log("Guardado_Edicion_Cliente", req.body);

    if (req.body.accion === "crear") {
        //guardar cliente nuevo
        //valida si el correo esta registrado
        Cliente.find({ correo: req.body.cliente.correo }, (err, docs) => {
            if (err) {
                console.log(err);
                return;
            }
            if (docs.length > 0) {
                res.send({ ok: false, mensaje: "Correo de cliente ya fue registrado, intente cambiarlo." })
                return;
            }
            let cliente_Acomodado = AcomodarCliente(req.body.cliente, req.body.direccion, req.user, req.body.accion);

            let cliente_nuevo = new Cliente(cliente_Acomodado);

            cliente_nuevo.password = cliente_nuevo.encryptPassword(cliente_nuevo.password);
            cliente_nuevo.save((err) => {
                if (err) {
                    console.log(err);
                    res.send({ ok: false, mensaje: "No se pudo crear" });
                    return;
                }
                //console.log('cliente creado !');
                res.send({ ok: true, mensaje: "cliente creado", cliente: cliente_nuevo });
            })
        });

    }

    if (req.body.accion === "editar") {
        let cliente_Acomodado = AcomodarCliente(req.body.cliente, req.body.direccion, req.user, req.body.accion);
        const mongoose = require('mongoose');
        let idCliente = new mongoose.Types.ObjectId(req.body.IdClientSelected);
        Cliente.findByIdAndUpdate(idCliente, { $set: 
            { 
                newData:true,
                agente: cliente_Acomodado.agente,
                datos_fiscales: cliente_Acomodado.datos_fiscales,
                perfil: cliente_Acomodado.perfil,
                alias: cliente_Acomodado.alias,
                nombre: cliente_Acomodado.nombre,
                correo: cliente_Acomodado.correo,
                telefono: cliente_Acomodado.telefono,
                fecha_nacimiento: cliente_Acomodado.fecha_nacimiento,
                fecha_update: new Date(),
                region: cliente_Acomodado.region,
                direcciones_asociadas: cliente_Acomodado.direcciones_asociadas,

             } 
        }, { new: true })
            .then((updatedCliente) => {
                if (!updatedCliente) {
                    return res.send({ ok: false, mensaje: "Cliente no encontrado" });
                }
                res.send({ ok: true, mensaje: "cliente editado", cliente: updatedCliente });
            })
            .catch((err) => {
                console.log(err);
                res.send({ ok: false, mensaje: "No se pudo editar" });
            });
    }

    // if (req.body.accion === "editar") {
    //     //editar cliente
    //     // res.send({ ok: false, mensaje: "editar cliente" });
    //     const mongoose = require('mongoose');
    //     let idCliente = new mongoose.Types.ObjectId(req.body.IdClientSelected);
    //     console.log("idCliente", idCliente);
    //     if (!mongoose.Types.ObjectId.isValid(idCliente)) {
    //         return res.send({ ok: false, mensaje: "ID de cliente no válido" });
    //     }
    //     let cliente = {};

    //     let cliente_Acomodado = AcomodarCliente(req.body.cliente, req.body.direccion, req.user, req.body.accion);

    //     try {
    //         cliente.newData = cliente_Acomodado.newData;
    //         cliente.nombre = cliente_Acomodado.nombre;
    //         cliente.alias = cliente_Acomodado.alias;
    //         cliente.correo = cliente_Acomodado.correo;
    //         cliente.direcciones_asociadas = cliente_Acomodado.direcciones_asociadas;
    //         cliente.fecha_nacimiento = cliente_Acomodado.fecha_nacimiento;
    //         cliente.fecha_update = new Date();
    //         cliente.datos_fiscales = cliente_Acomodado.datos_fiscales;
    //         cliente.localidad = cliente_Acomodado.localidad;
    //         cliente.localidad_nombre = cliente_Acomodado.localidad_nombre;
    //         cliente.location = cliente_Acomodado.location;
    //         cliente.perfil = cliente_Acomodado.perfil;
    //         cliente.plataforma = cliente_Acomodado.plataforma;
    //         cliente.push_token = cliente_Acomodado.push_token;
    //         cliente.region = cliente_Acomodado.region;
    //         cliente.telefono = cliente_Acomodado.telefono;
    //         cliente.uid = cliente_Acomodado.uid;
    //         cliente.password = cliente_Acomodado.password;
    //         cliente.observaciones = cliente_Acomodado.observaciones;
    //         cliente.agente = cliente_Acomodado.agente;
    //     } catch (error) {
    //         console.log(error);
    //         res.send({ ok: false, mensaje: "No se pudo editar" });
    //     }

    //     // Cliente.findByIdAndUpdate(idCliente, { $set: cliente }, { new: true })
    //     Cliente.updateOne({ _id: idCliente }, { $set: cliente })
    //         .then((updatedCliente) => {
    //             if (updatedCliente.matchedCount === 0) {
    //                 return res.send({ ok: false, mensaje: "Cliente no encontrado", cliente: updatedCliente });
    //             }
    //             res.send({ ok: true, mensaje: "cliente editado", cliente: updatedCliente });
    //         }).catch((err) => {
    //             console.log(err);
    //             res.send({ ok: false, mensaje: "No se pudo editar" });
    //         });
    // }
}

function AcomodarCliente(cliente, direccion, usuario, accion) {
    let cliente_nuevo_tmp = cliente;
    if (usuario.rol === 'vendedor') {
        cliente_nuevo_tmp.agente = {
            id: usuario._id,
            nombre: usuario.nombre,
            correo: usuario.correo
        }
    }
    direccion.rfc = cliente_nuevo_tmp.datos_fiscales.rfc;
    direccion.tipo_persona = cliente_nuevo_tmp.datos_fiscales.tipo_persona;
    direccion.cfdi = cliente_nuevo_tmp.datos_fiscales.cfdi;
    direccion.rfiscal = cliente_nuevo_tmp.datos_fiscales.rfiscal;
    direccion.telefono = cliente_nuevo_tmp.telefono;
    direccion.correo = cliente_nuevo_tmp.correo;
    direccion.idPais = direccion.idPais;
    direccion.idEstado = direccion.idEstado;
    direccion.idMunicipio = direccion.idMunicipio;
    direccion.nombre = cliente_nuevo_tmp.nombre;
    direccion.notas = cliente_nuevo_tmp.notas;

    if (accion === "crear") {
        cliente_nuevo_tmp.direcciones_asociadas.push(direccion);
    }
    if (accion === "editar") {
        cliente_nuevo_tmp.direcciones_asociadas[0] = direccion;
    }

    return cliente_nuevo_tmp;

};