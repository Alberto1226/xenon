import { resume } from 'pdfkit';
import {analisis_de_carritos_con_promos} from './_funciones/analisis_de_carritos_con_promos';
import * as accesos from './../accesos';
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    const id = req.body.id;
    const resumen = await analisis_de_carritos_con_promos(id);
    console.log("------2--------RESUMEN---------2222");
    console.log(resumen);
    return res.send(resumen);
}