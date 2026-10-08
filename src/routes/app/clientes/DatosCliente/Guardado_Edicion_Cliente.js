import { Cliente } from "../../../../models/cliente";
import { Usuario } from "../../../../models/usuario";
import * as accesos from "../../accesos";
import { evaluar_datos_completos } from "../_datos_completos";
import {
    filtrarCamposEditablesCliente,
    puedeEditarCliente
} from "../../../../services/permisosEdicionClientes";

/**
 * Maneja la solicitud POST para crear o editar un cliente.
 *
 * @param {Object} req - El objeto de solicitud.
 * @param {Object} req.body - El cuerpo de la solicitud.
 * @param {string} req.body.accion - La acción a realizar, ya sea "crear" o "editar".
 * @param {Object} req.body.cliente - Los datos del cliente para la creación.
 * @param {string} req.body.cliente.correo - El correo electrónico del cliente.
 * @param {Object} req.body.direccion - La dirección del cliente.
 * @param {Object} req.body.cliMod - Los datos modificados del cliente para la edición.
 * @param {string} req.body.IdClientSelect - El ID del cliente a editar.
 * @param {Object} req.user - El usuario que realiza la solicitud.
 * @param {Object} res - El objeto de respuesta.
 * @param {Function} next - La siguiente función de middleware.
 */
export async function post(req, res, next) {

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
            // if (docs.length > 0) {
            //     res.send({ ok: false, mensaje: "Correo de cliente ya fue registrado, intente cambiarlo." })
            //     return;
            // }
            let cliente_Acomodado = AcomodarCliente(req.body.cliente, req.body.direccion, req.user, req.body.accion);

            if (!cliente_Acomodado.agente || !cliente_Acomodado.agente.id) {
                res.send({ ok: false, mensaje: "El agente es obligatorio" });
                return;
            }

            cliente_Acomodado.datos_completos = evaluar_datos_completos(cliente_Acomodado, req.body.direccion).completos;

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
        try {
            const clienteExistente = await Cliente.findById(req.body.IdClientSelect).exec();
            if (!clienteExistente) {
                return res.send({ ok: false, mensaje: "Cliente no encontrado" });
            }
            // La validación se hace en servidor aunque la interfaz ya consulte permisos.
            if (!(await puedeEditarCliente(req.user, clienteExistente))) {
                return res.send({ ok: false, mensaje: "No tienes permiso para editar este cliente." });
            }

            const nuevo_cliente = filtrarCamposEditablesCliente(req.body.cliMod);
            if (req.user.rol === "administrador" && req.body.cliMod && req.body.cliMod.agente) {
                const agente = await Usuario.findById(req.body.cliMod.agente.id).select("nombre correo").lean().exec();
                if (!agente) {
                    return res.send({ ok: false, mensaje: "El agente seleccionado no existe." });
                }
                nuevo_cliente.agente = {
                    id: agente._id,
                    nombre: agente.nombre,
                    correo: agente.correo
                };
            } else {
                // Ningún rol distinto al administrador puede cambiar la asignación recibida.
                nuevo_cliente.agente = clienteExistente.agente;
            }

            if (!nuevo_cliente.agente || !nuevo_cliente.agente.id) {
                return res.send({ ok: false, mensaje: "El agente del cliente no está asignado." });
            }

            const clienteActualizado = {
                ...clienteExistente.toObject(),
                ...nuevo_cliente
            };
            const resultado_completos = evaluar_datos_completos(
                clienteActualizado,
                clienteActualizado.direcciones_asociadas && clienteActualizado.direcciones_asociadas[0]
            );
            nuevo_cliente.datos_completos = resultado_completos.completos;
            if (resultado_completos.completos) {
                nuevo_cliente.cotizaciones_con_datos_incompletos = 0;
            }

            const data = await Cliente.findByIdAndUpdate(
                clienteExistente._id,
                { $set: nuevo_cliente },
                { new: true }
            ).exec();
            return res.send({ ok: true, mensaje: "Cliente editado", data });
        } catch (err) {
            console.error("Error al actualizar cliente:", err);
            return res.send({ ok: false, mensaje: "No se pudo editar el cliente" });
        }
    }
}

function AcomodarCliente(cliente, direccion, usuario, accion) {
    let cliente_nuevo_tmp = cliente;
    if (usuario.rol !== "administrador" && accion === "crear") {
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
    direccion.notas = direccion.notas;

    if (accion === "crear") {
        cliente_nuevo_tmp.direcciones_asociadas.push(direccion);
    }
    if (accion === "editar") {
        cliente_nuevo_tmp.direcciones_asociadas[0] = direccion;
    }

    return cliente_nuevo_tmp;

};