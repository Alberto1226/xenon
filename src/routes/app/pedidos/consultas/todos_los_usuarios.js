import { Usuario, Usuarios } from "../../../../models/usuario";
import * as mongoose from 'mongoose';
import * as accesos from "../../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    // let tipo = req.body.tipo;
    try {

        Usuario.aggregate()
            .match(
                {
                    // rol: tipo,
                    // activo: true
                }
            )
            .project(
                {
                    nombre: "$nombre",
                    rol: "$rol"
                }
            )
            .sort(
                {
                    nombre: 1
                }
            )
            .then((usuarios) => {
                if (usuarios.length == 0) {
                    res.send({
                        ok: false,
                        resumen: "no existen usuarios"
                    });
                    return
                }
                res.send({
                    ok: true,
                    datos: usuarios
                });
            })

    } catch (err) {
        console.log(err);
        res.send({
            ok: false,
            error: "error en la consulta",
            e: err.message
        });

    }
}