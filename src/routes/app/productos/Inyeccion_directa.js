
import * as accesos from "../accesos";
import { Producto } from "../../../models/producto";
import { Inyeccion } from "../../../models/inyeccion";

export async function post(req, res, next) {


    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    console.log(req.body.lista);
    let lista = req.body.lista;
    let producto_id = req.body.producto_id;
    let usuario = req.user;

    console.log({
        lista,
        producto_id,
        usuario
    });


    let productoDB = await regrear_producto(producto_id);
    if (!productoDB) {
        return { ok: false, mensaje: "El producto ya no existe" }
    }
    let guardado = await guardar_inyeccion_pendiente(lista, usuario, productoDB);
    return res.send(guardado);

}


async function guardar_inyeccion_pendiente(lista, usuario, producto) {
    let inyeccion_nueva = new Inyeccion({
        procesado: {
            estado_actual: 'pendiente',
            iniciado: false,
            terminado: false,
        },
        producto: {
            nombre: producto.nombre,
            id: producto._id,
            imagen: producto.galeria_imagenes[0]
        },
        usuario: {
            nombre: usuario.usuario,
            id: usuario._id
        },
        lista: lista
    });
    // try {
    //     const resultado = await inyeccion_nueva.save();
    //     const nuevoRegistroId = resultado._id;

    //     // Ahora enviamos un POST al otro código
    //     const url = 'app/productos/inyectar_un_pendiente'; // Reemplazar con la URL correcta
    //     const data = {
    //         inyeccion_id: nuevoRegistroId,
    //         solo_agregar_folios: false, // O el valor que necesites
    //         // Otros datos que necesites enviar
    //     };

    //     const response = await fetch(url, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(data),
    //     });

    //     const responseData = await response.json();
    //     return responseData;
    // } catch (error) {
    //     console.log(error);
    //     return { ok: false, mensaje: "Error al guardar la inyección pendiente" };
    // }
    try {
        const resultado = await inyeccion_nueva.save();
        return { ok: true, id: resultado._id };
    } catch (error) {
        console.log(error);
        return { ok: false, mensaje: "Error al guardar la inyección pendiente" };
    }
}


async function regrear_producto(id) {
    return Producto.findById(id)
        .then((resultado) => {
            return resultado
        })
}