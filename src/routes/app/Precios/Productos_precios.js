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

function consulta() {
    return new Promise((resolve, reject) => {
        try {
            Producto.find({})
                .select(
                    {
                        _id: 1,
                        codigo: 1,
                        nombre: 1,
                        precio: 1,
                    }
                ).sort(
                    { nombre: 1 }
                ).exec()
                .then((resDB) => {
                    resolve({ ok: true, lista: resDB });
                })
        } catch (error) {
            console.log("Error capturado:", err);
            return { ok: false, mensaje: "Error al obtener resultados." };
        }
    })
}