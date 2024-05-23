
//  Inyecciones pendientes, son las que se capturan en almacen y se espera a admin para aceptar y afectar un inventario

import { Inyeccion } from "../../../models/inyeccion";
import { Producto } from "../../../models/producto";
import { snap_por_cambio_en_pedido } from '../pedidos/editar/_producto_snaplogs/snap_por_cambio_en_pedido';
import { devolver_producto_db } from '../pedidos/editar/_server_cambiar_cantidad/devolver_producto_db';
import * as accesos from "../accesos"
import { Inyeccion_historica } from "../../../models/inyeccion_historica";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    // if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
    //     res.send({ ok: false, mensaje: "sesion expirada" })
    //     return;
    // }

    const inyeccion_id = req.body.inyeccion_id;
    const solo_agregar_folios = req.body.solo_agregar_folios;
    console.log(req.body);

    var inyeccion_a_surtir = await devolver_inyeccion_pendiente(inyeccion_id);
    if (!inyeccion_a_surtir || inyeccion_a_surtir.procesado.iniciado == true) {
        res.send({ ok: false, mensaje: "Ya no existe dicha inyeccion." })
        return
    }
    await apartar_inyeccion(inyeccion_a_surtir);
    console.log(inyeccion_a_surtir);
    var lista_aplanada = await aplanar_lista(inyeccion_a_surtir.lista);

    let cantidad_a_inyectar = solo_agregar_folios ? 0 : lista_aplanada.length;

    //console.log(cantidad_a_inyectar)

    let previa = await existencia_previa(inyeccion_a_surtir.producto.id);
    const existencia_nueva = +previa.existencia_previa + +cantidad_a_inyectar;
    const proceso_devolver_producto_db = await devolver_producto_db(inyeccion_a_surtir.producto.id);
    console.log({ proceso_devolver_producto_db });
    await desapartar_inyeccion(inyeccion_a_surtir)
    await guardar_historico_de_inyeccion(inyeccion_a_surtir)
    if (solo_agregar_folios == true) {
        var resultado = await agregar_folios(inyeccion_a_surtir, lista_aplanada, existencia_nueva, proceso_devolver_producto_db, req, cantidad_a_inyectar, previa)
    } else {
        var resultado = await agregar_folios_e_inventario(inyeccion_a_surtir, lista_aplanada, existencia_nueva, proceso_devolver_producto_db, req, cantidad_a_inyectar, previa)
    }
    console.log({ resultado });
    res.send(resultado);
    return;


}


async function agregar_folios(inyeccion_a_surtir, folios, existencia_nueva, proceso_devolver_producto_db, req, cantidad_a_inyectar, previa) {
    return Producto.findByIdAndUpdate(inyeccion_a_surtir.producto.id, { $push: { "existencia.folios": folios } })
        .then(async (respuesta) => {




            if (proceso_devolver_producto_db.ok == false) return
            const producto_db = proceso_devolver_producto_db.producto;
            const snap_proceso = await snap_por_cambio_en_pedido({ nombre: producto_db.nombre, id: producto_db._id },
                { nombre: req.user.nombre, id: req.user._id },
                cantidad_a_inyectar,
                previa.existencia_previa,
                "1b",  // 1b inyeccion solo folios
                { folio: "", cliente: { nombre: "" } },
                producto_db,
                folios
            )
            console.log(snap_proceso);
            return { ok: true }

        })
        .catch((err) => {
            console.log(err);

            return { ok: false }

        })




}



async function agregar_folios_e_inventario(inyeccion_a_surtir, folios, existencia_nueva, proceso_devolver_producto_db, req, cantidad_a_inyectar, previa) {
    return Producto.findByIdAndUpdate(inyeccion_a_surtir.producto.id, { $set: { 'existencia.actual': existencia_nueva }, $push: { "existencia.folios": folios } })
        .then(async (respuesta) => {




            if (proceso_devolver_producto_db.ok == false) return
            const producto_db = proceso_devolver_producto_db.producto;
            const snap_proceso = await snap_por_cambio_en_pedido({ nombre: producto_db.nombre, id: producto_db._id },
                { nombre: req.user.nombre, id: req.user._id },
                cantidad_a_inyectar,
                previa.existencia_previa,
                "1",  // 1 agregar normakl folios e inventario
                { folio: "", cliente: { nombre: "" } },
                producto_db,
                folios
            )
            console.log(snap_proceso);
            return { ok: true }

        })
        .catch((err) => {
            console.log(err);

            return { ok: false }
        })




}

async function apartar_inyeccion(inyeccion_a_surtir) {
    inyeccion_a_surtir.procesado.iniciado = true;
    return inyeccion_a_surtir.save()
        .then((res) => {
            return { ok: true }
        })
        .catch((err) => {
            console.log(err);
            return { ok: false }
        })

}

async function desapartar_inyeccion(inyeccion_a_surtir) {
    inyeccion_a_surtir.procesado.terminado = true;
    inyeccion_a_surtir.procesado.estado_actual = "procesado";
    return inyeccion_a_surtir.save()
        .then((res) => {
            return { ok: true }
        })
        .catch((err) => {
            console.log(err);
            return { ok: false }
        })

}


async function guardar_historico_de_inyeccion(inyeccion_a_surtir) {
    try {
        let id_viejo = inyeccion_a_surtir._id;
        let tmp_inyeccion = JSON.parse(JSON.stringify(inyeccion_a_surtir))
        delete inyeccion_a_surtir._id
        var nuevo = Inyeccion_historica(
            tmp_inyeccion
        );

        nuevo.procesado.fecha = new Date();
        return nuevo.save()
            .then((res) => {
                console.log({ res });
                return Inyeccion.findByIdAndDelete(id_viejo)
                    .then((res) => {
                        return { ok: true }
                    })

            })
            .catch((err) => {
                console.log(err);
                return { ok: false }
            })
    } catch (err) {
        console.log(err);
        return { ok: false }
    }

}


async function devolver_inyeccion_pendiente(id) {
    return Inyeccion.findById(id)
        .then((data) => {
            return data
        })
        .catch((err) => {
            console.log(err);

        })
}


async function aplanar_lista(lista) {
    var nueva_lista = lista.map(elem => elem.lista);
    console.log("aqui")
    console.log(nueva_lista);
    // nueva_lista = nueva_lista.flat();

    nueva_lista = [].concat.apply([], nueva_lista);
    return nueva_lista;
}



function existencia_previa(id) {
    return new Promise((resolve, reject) => {
        Producto.findById(id).then((producto) => {
            resolve({ nombre: producto.nombre, existencia_previa: producto.existencia.actual });
        })
            .catch((err) => {
                console.log(err);
                reject();
            })
    })
}
