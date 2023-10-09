
//  Inyecciones pendientes, son las que se capturan en almacen y se espera a admin para aceptar y afectar un inventario

import { Inyeccion } from "../../../models/inyeccion";
import * as accesos from "../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }




    //if (buscando.length > 60 || buscando.includes('+')) return res.send({ ok: false, mensaje: 'error#876TLV' });
    const pagina_actual = req.body.pagina_actual - 1;
    console.log(req.body);




    res.send(await consulta(pagina_actual));
    return;


}


function consulta(pagina_actual) {
    return new Promise((resolve, reject) => {
        try {
            let filtro = {};
            Inyeccion.countDocuments(filtro)
                .then((numero_total) => {
                    Inyeccion.find(filtro)
                        .sort({ "producto.nombre": 1, "createdAt": -1 })
                        .limit(50)
                        .skip(pagina_actual * 50)
                        .exec()
                        .then(async (resDB) => {
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 50 - 1) / (50)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

