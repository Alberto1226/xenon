

import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos"

export function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    if (accesos.tiene_permisos_administrativos == false) {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }

    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo

    const registro = req.body.registro;
    const id = req.body.id_carrito;


    Carrito.findById(id)
        .then((resultado) => {
            if (resultado === null) {
                res.send({ ok: false, mensaje: 'El pedido ya no existe' })
                return;
            }
            let lista = resultado.lista;

            let producto_temp = lista.find(element => JSON.stringify(element.producto._id) === JSON.stringify(registro.producto._id));
            let precio_previo = JSON.parse(JSON.stringify(producto_temp.producto.precio));
            let precio_nuevo = JSON.parse(JSON.stringify(registro.producto.precio));
            producto_temp.producto.precio = registro.producto.precio;
            sumar_cantidades(lista).then((proceso) => {
                let total_dinero = proceso.total_dinero;
                Carrito.findByIdAndUpdate(id, { lista,total_pedido:total_dinero })
                    .then(() => {
                        accesos.logActividad('pedidos/cambiar_precio',req.user,{precio_previo,precio_nuevo,producto:{producto_temp}},req);
                        res.send({ ok: true })
                        return;
                    })
                    .catch((err) => {
                        console.log(err);
                        res.send({ ok: false });
                        return;
                    })

            })

        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false });
            return;
        })

}



////   Sumar el total neto del pedido

function sumar_cantidades(lista) {
    return new Promise((resolve) => {
        
        let total_dinero = 0;
        if (lista == undefined) {
            total_dinero = 0;
            resolve({ ok: true, total_dinero });
            return;
        }
        if (lista.length == 0) {
            total_dinero = 0;
            resolve({ ok: true, total_dinero });
            return;
        }
        total_dinero = lista.reduce(
            (a, b) => +a + +b.producto.precio * +b.cantidad,
            0
        );
        resolve({ ok: true, total_dinero });
        return;
    });
}
