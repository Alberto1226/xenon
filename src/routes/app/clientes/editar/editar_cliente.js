
import {Cliente} from "../../../../models/cliente";
import { Usuario } from "../../../../models/usuario";
import * as accesos from "../../accesos";
import {
    filtrarCamposEditablesCliente,
    puedeEditarCliente
} from "../../../../services/permisosEdicionClientes";

export async function post(req, res, next) {
  
    //console.log(req.body);
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    accesos.logActividad('clientes/editar',req.user,req.body,req);
    try {
        const clienteExistente = await Cliente.findById(req.body._id).exec();
        if (!clienteExistente) {
            return res.send({ ok: false, mensaje: "Cliente no encontrado" });
        }
        // Este endpoint antiguo comparte la política para que no permita omitirla por URL directa.
        if (!(await puedeEditarCliente(req.user, clienteExistente))) {
            return res.send({ ok: false, mensaje: "No tienes permiso para editar este cliente." });
        }

        const nuevo_cliente = filtrarCamposEditablesCliente(req.body);
        if (req.user.rol === "administrador" && req.body.agente) {
            const agente = await Usuario.findById(req.body.agente.id).select("nombre correo").lean().exec();
            if (!agente) {
                return res.send({ ok: false, mensaje: "El agente seleccionado no existe." });
            }
            nuevo_cliente.agente = {
                id: agente._id,
                nombre: agente.nombre,
                correo: agente.correo
            };
        } else {
            nuevo_cliente.agente = clienteExistente.agente;
        }

        await Cliente.findByIdAndUpdate(
            clienteExistente._id,
            { $set: nuevo_cliente },
            { new: true }
        ).exec();
        return res.send({ ok: true, mensaje: "Cliente editado" });
    } catch (err) {
        console.log(err);
        return res.send({ ok: false, mensaje: "No se pudo editar el cliente" });
    }

}