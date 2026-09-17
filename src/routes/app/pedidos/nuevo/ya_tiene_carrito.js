

import { Carrito } from "./../../../../models/carrito";
import { Cliente } from "./../../../../models/cliente";
import * as accesos from "./../../accesos"
import { evaluar_datos_completos, LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS } from "./../../clientes/_datos_completos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo
    var doc = req.body;
    //var query = {'cliente.id': doc.id};
   //console.log(doc);

    try {
        // Solo los estados en borrador/previos a pago ('Pedido' y 'Ficha pago') bloquean crear otro pedido simultáneo.
        // Al estar en 'Pagado' o posterior, el pedido queda bloqueado y se permite crear un nuevo pedido para el cliente.
        const carrito = await Carrito.findOne().or([
            { 'cliente.id': doc.id, status: 'Pedido' },
            { 'cliente.id': doc.id, status: 'Ficha pago' }
        ]);

        const cliente = await Cliente.findById(doc.id);

        let datos_completos = true;
        let campos_faltantes = [];
        let cotizaciones_con_datos_incompletos = 0;
        let cotizaciones_disponibles = LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS;

        if (cliente) {
            const resultado = evaluar_datos_completos(cliente);
            datos_completos = resultado.completos;
            campos_faltantes = resultado.campos_faltantes;
            cotizaciones_con_datos_incompletos = cliente.cotizaciones_con_datos_incompletos || 0;
            cotizaciones_disponibles = Math.max(0, LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS - cotizaciones_con_datos_incompletos);
        }

        res.send({
            ok: true,
            carrito,
            datos_completos,
            campos_faltantes,
            cotizaciones_con_datos_incompletos,
            cotizaciones_disponibles,
            bloqueado_por_datos_incompletos: datos_completos === false && cotizaciones_disponibles <= 0,
        });
    } catch (err) {
        console.log(err);
        res.send({ ok: false, mensaje: "error al buscar resultados." });
    }
}
