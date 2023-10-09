

import { Producto } from "../../../models/producto";
import * as accesos from "../accesos"

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

