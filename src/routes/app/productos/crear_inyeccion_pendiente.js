
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
    })
    return inyeccion_nueva.save()
        .then((res) => {
            return { ok: true }
        })
        .catch((err) => {
            console.log(err);
            return { ok: false }
        })
}


async function regrear_producto(id) {
    return Producto.findById(id)
        .then((resultado) => {
            return resultado
        })
}