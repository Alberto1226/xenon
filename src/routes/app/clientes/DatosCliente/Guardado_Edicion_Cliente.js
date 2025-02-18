import { Cliente } from "../../../../models/cliente";
import * as accesos from "../../accesos";

export function post(req, res, next) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    console.log("Guardado_Edicion_Cliente", req.body);

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
            let cliente_Acomodado = AcomodarCliente(req.body.cliente, req.body.direccion, req.user);

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


}

function AcomodarCliente(cliente, direccion, usuario) {
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

    cliente_nuevo_tmp.direcciones_asociadas.push(direccion);

    return cliente_nuevo_tmp;

};