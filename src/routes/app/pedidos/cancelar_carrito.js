
//   Como superadmin crea productos
import { Carrito } from "../../../models/carrito";
import { Carrito_cancelado } from "../../../models/carrito_cancelado";
import * as accesos from "../accesos";
import { Producto } from "../../../models/producto";
import { devolver_producto_db } from './../pedidos/editar/_server_cambiar_cantidad/devolver_producto_db';
import { snap_por_cambio_en_pedido } from './editar/_producto_snaplogs/snap_por_cambio_en_pedido';
import * as mongoose from 'mongoose';

export async function post(req, res, next) {

    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    let solicitud = req.body;
    const usuario = req.user;
    //  CARRITO
    let carrito_proceso = await carrito_a_cambiar(solicitud.id);
    if (carrito_proceso.ok === false) {
        res.send({ ok: false, mensjae: 'error al encontrar el carrito' });
        return;
    }
    let carrito = carrito_proceso.carrito;
    if (carrito.status == 'Envío') {
        res.send({
            ok: false, mensaje: 'El pedido no se puede cancelar en fase de Envío'
        })
        return;
    }
    //      SI no tiene productos guardar el log y despues cancelarlo
    if (carrito.lista.length == 0) {
        accesos.logActividad('carrito/cancelar/', usuario, { folio: carrito.folio, req });
        const cancelar_carrito_proceso = await cancelar_carrito(carrito, usuario);
        res.send(cancelar_carrito_proceso);
        return;
    }

    //      Obtener los productos de DB en su estado antes de ser cambiados por el proceso
    let productos_previos_proceso = await obtener_productos_previos(carrito.lista);

    let quitar_apartados_y_descontar_proceso = await quitar_apartados2(carrito.cliente.id);
    if (quitar_apartados_y_descontar_proceso.ok == false) {
        res.send({ ok: false, mensaje: 'Error al borrar apartados' });
        return;
    }
    const proceso_ciclo_snaps = await ciclo_snaps(productos_previos_proceso, carrito.folio, carrito.cliente.nombre, carrito.cliente.id, req);
    //console.log('-----------------')
    //console.log(proceso_ciclo_snaps);

    const cancelar_carrito_proceso = await cancelar_carrito(carrito, usuario);
    accesos.logActividad('carrito/cancelar/', req.user, { folio: carrito.folio, req });
    res.send(cancelar_carrito_proceso);


}




function cancelar_carrito(carrito, usuario) {
    return new Promise((resolve, reject) => {
        //  Respaldo en cancelados
        let carrito_temp = JSON.parse(JSON.stringify(carrito));
        let id = carrito_temp._id;
        delete carrito_temp._id;
        delete carrito_temp.__v;
        let carrito_cancelado = new Carrito_cancelado(carrito_temp);
        carrito_cancelado.status = 'Cancelado';
        carrito_cancelado.fecha_de_cancelacion = new Date();
        carrito_cancelado.notas += ` cancelado por : ` + usuario.usuario;
        //console.log('----------------nuevo carrito --');
        //console.log(carrito_cancelado);
        carrito_cancelado.save()
            .then(() => {
                //     Borrar original
                Carrito.findByIdAndDelete(id)
                    .then(() => {
                        resolve({ ok: true });
                    })
                    .catch((err) => {
                        console.log(err);
                        reject({ ok: false, err })
                    })
            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err, mensaje: 'error al escribir cancelado historico' });
                return;
            })


    })
}

/**
 

function quitar_apartados(lista , id_cliente) {
    return new Promise((resolve,reject)=>{
        if(lista.length===0){
            resolve({ok:true});
            return;
        }
     for (let i = 0; i < lista.length; i++) {
         const registro = lista[i];
         Producto.findByIdAndUpdate(registro.producto._id, {  
           $pull:{
               carritos: {
                   'cliente.id':id_cliente
               }
           }
       }).then((resultado)=>{
           console.log(resultado);
           if(i+1== lista.length){
            resolve({ok:true});
            return;
           }
       })
       .catch((err)=>{
           console.log(err);          
           if(i+1== lista.length){
            reject({ok:false,err})
            return;
           }
       })
     }
     

    })
 }

 */


async function quitar_apartados2(id_cliente) {
    return Producto.updateMany({ "carritos.cliente.id": id_cliente }, {
        $pull: {
            carritos: {
                'cliente.id': { $in: [id_cliente] }
            }
        }
    })
        .then((resultado) => {
            console.log(resultado);
            return { ok: true };
        })
        .catch((err) => {
            console.log(err);
            return { ok: false };
        })
}

async function obtener_productos_previos(lista) {
    const consulta = await crear_or(lista);
    //console.log("1|||------->>>>>>>>>>");
    //console.log(consulta);
    const lista_de_productos_db_proceso = await lista_de_productos_db(consulta);
    //console.log(lista_de_productos_db_proceso);
    //console.log("2|||------->>>>>>>>>>");
    const lista_productos = await JSON.parse(JSON.stringify(lista_de_productos_db_proceso.resultadoDB));
    //console.log("3|||------->>>>>>>>>>");
    const lista_barajeada = await barajear_listas_agregar_cantidad_en_registro(lista, lista_productos)
    return lista_barajeada;


}

async function barajear_listas_agregar_cantidad_en_registro(lista_registros, lista_productos) {

    try {
        var lista_resultante = [];
        //console.log("dentro de ciclo|||------->>>>>>>>>>");
        for (let i = 0; i < lista_productos.length; i++) {
            //console.log(i);
            let element = lista_productos[i];
            const registro_en_pedido = lista_registros.find(elem => elem.producto._id == element._id);
            element.cantidad_en_pedido = registro_en_pedido.cantidad;
            //console.log("|||-element.cantidad_en_pedido------>>>>>>>>>>");
            //console.log({cantidad_en_pedido:element.cantidad_en_pedido});
            lista_resultante.push(element)
            if (i + 1 == lista_productos.length) {
                //console.log("||||||--fin---|||||")
                //console.log(lista_resultante);
                //console.log("||||||--fin---|||||")
                return lista_resultante;
            }
        }
    } catch (err) {
        console.log(err)
        return err;
    }



}

async function lista_de_productos_db(consulta) {
    return Producto.find(consulta)
        .then((resultadoDB) => {
            //console.log(resultadoDB);
            return { ok: true, resultadoDB };
        })
        .catch((err) => {
            console.log(err);
            return { ok: false };
        })
}

async function ciclo_snaps(lista_de_productos_previo, folio, cliente_nombre, cliente_id, req) {
    for (let i = 0; i < lista_de_productos_previo.length; i++) {
        const element = lista_de_productos_previo[i];
        await guardar_snap(element, folio, cliente_nombre, cliente_id, req)
        if (i + 1 == lista_de_productos_previo.length) {
            //console.log("||---termina ciclo snaps----||");
            return { ok: true };
        }
    }
}

async function guardar_snap(producto_constante_previo, folio, cliente_nombre, cliente_id, req) {
    const guardado = await snap_por_cambio_en_pedido({ nombre: producto_constante_previo.nombre, id: producto_constante_previo._id },
        { nombre: req.user.nombre, id: req.user._id },
        producto_constante_previo.cantidad_en_pedido,
        producto_constante_previo.cantidad_en_pedido,
        "4d",
        { folio, cliente: { nombre: cliente_nombre, id: cliente_id } },
        producto_constante_previo
    )
    return guardado;
}

async function quitar_apartados(lista, id_cliente) {

    if (lista.length === 0) {
        return { ok: true };
    }
    for (let i = 0; i < lista.length; i++) {


        const registro = lista[i];
        const devolver_producto_db_proceso = await devolver_producto_db(registro.producto._id);
        //console.log("|||---------->");
        //console.log(devolver_producto_db_proceso)

        return Producto.findByIdAndUpdate(registro.producto._id, {
            $pull: {
                carritos: {
                    'cliente.id': { $in: [id_cliente] }
                }
            }
        }).then((resultado) => {
            //console.log(resultado);
            if (i + 1 == lista.length) {
                return { ok: true };
            }
        })
            .catch((err) => {
                console.log(err);
                if (i + 1 == lista.length) {
                    return { ok: false, err };
                }
            })
    }
}



function carrito_a_cambiar(id_carrito) {
    return new Promise((resolve, reject) => {
        Carrito.findById(id_carrito)
            .then((carrito) => {
                resolve({ ok: true, carrito });
            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err });
            })
    })
}



function crear_or(lista) {
    return new Promise((resolve, reject) => {
        try {
            let objectId = mongoose.Types.ObjectId;
            let consulta_or = { $or: [] };
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];
                //console.log("-->");
                //console.log(element);
                consulta_or.$or.push({ "_id": objectId(JSON.parse(JSON.stringify(element.producto._id))) })
                if (i + 1 === lista.length) {
                    //console.log(consulta_or);
                    resolve(consulta_or);
                }
            }
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}