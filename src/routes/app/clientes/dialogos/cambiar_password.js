
//   Solo se debe de usaruna vez , cuando manuyalmente se requiera , deshabilitar en uso
import { Cliente } from "./../../../../models/cliente";
import * as accesos from "./../../accesos";
export function post(req, res, next) {
    ////console.log(req.body.cliente);

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    if (accesos.tiene_permisos_administrativos == false) {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }


    accesos.logActividad('clientes/cambiar_password', req.user, {}, req);

    Cliente.findById(req.body.id, (err, dbdoc) => {
        if (err) {
            console.log(err);
            return;
        }
        if (dbdoc.length === 0) {
            //console.log('no se encontro el cliente con dicho id' );
            res.send({ ok: false, mensaje: "Nombre de cliente ya fue registrado, intente cambiarlo." })
            return;
        }
        dbdoc.password = dbdoc.encryptPassword(req.body.password);
        dbdoc.save((err) => {
            if (err) {
                console.log(err);
                res.send({ ok: false, mensaje: "No se pudo cambiar el password." });
                return;
            }
            //console.log('Cliente creado !');
            res.send({ ok: true, mensaje: "Password se ha cambiado con exito.", id: req.body.id });
        })

    })

}