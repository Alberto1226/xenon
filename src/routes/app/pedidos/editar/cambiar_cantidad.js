

import { Carrito } from "../../../../models/carrito";
import { Promocion } from './../../../../models/promocion';
import { Producto } from "../../../../models/producto";
import { devolver_producto_db } from './_server_cambiar_cantidad/devolver_producto_db';
import { devolver_carrito_db } from './_server_cambiar_cantidad/devolver_carrito_db';
import * as accesos from "../../accesos";
import { snap_por_cambio_en_pedido } from './_producto_snaplogs/snap_por_cambio_en_pedido';
import { devolver_prod_snap_log_fixBug } from './_server_cambiar_cantidad/devolver_prod_snap_log_fixBug';
import { isEmpty } from "underscore";
import mongoose from 'mongoose';

export async function post(req, res, next) {
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

    var registro = req.body.registro;
    const id = req.body.id_carrito;
    const donde = req.body.donde;
    const canMB = req.body.cantMB;

    //          checar suficiencia version 2 
    const son_suficientes = await suficientes_productos_version_2(registro.producto._id, registro.cantidad).catch(console.error);

    if (!son_suficientes || son_suficientes.suficientes === false) {
        return res.send({ ok: false, total_reservado: son_suficientes ? son_suficientes.total_reservado : 0, mensaje: 'Cantidad insuficiente, solo quedan ' + (son_suficientes ? (son_suficientes.existencias - son_suficientes.total_reservado) : 0) + ' disponibles.' })
    }

    const carritoDB_proceso = await devolver_carrito_db(id)
        .catch((err) => {
            console.log(err);
            res.send({ ok: false });
            throw err;
        });
    const carritoDB = carritoDB_proceso.carrito;
    if (carritoDB === null || !carritoDB || carritoDB_proceso.ok == false) {
        return res.send({ ok: false });
    }
    if (['Pagado', 'Empaque', 'Envío', 'Envio', 'En Ruta', 'Entregado', 'Finalizada'].includes(carritoDB.status)) {
        return res.send({ ok: false, mensaje: `El pedido no se puede modificar en estatus ${carritoDB.status}` });
    }

    let lista = carritoDB.lista;
    let producto_temp = lista.find(element => JSON.stringify(element.producto._id) === JSON.stringify(registro.producto._id));

    let session = null;
    try {
        try {
            session = await mongoose.startSession();
            session.startTransaction();
        } catch (eSession) {
            console.warn("⚠️ MongoDB Standalone detectado en cambiar_cantidad: ejecutando sin transacción");
            session = null;
        }

        const producto_antes_de_cualquier_cambio_proceso = await devolver_producto_db(registro.producto._id)
            .catch((err) => {
                let error_body = JSON.stringify(err);
                registrar_error(error_body, 'pedidos/editar/cambiar_cantidad_nuevo-producto_antes_de_cualquier_cambio_proceso').catch(console.error)
            });

        if (!producto_antes_de_cualquier_cambio_proceso || producto_antes_de_cualquier_cambio_proceso.ok == false) {
            if (session) { await session.abortTransaction(); session.endSession(); }
            res.send({ ok: false, mensaje: "El producto fue borrado y no se podra agregar." })
            return;
        }
        const producto_constante = JSON.parse(JSON.stringify(producto_antes_de_cualquier_cambio_proceso.producto));

        //  PRECIO SEGURO PARA APLICAR : aplica descuento ? 
        const descuento_a_usar = producto_constante.aplicar_descuento_distribuidor ? carritoDB.descuento : 0;
        let producto_seguro = JSON.parse(JSON.stringify(producto_constante));
        producto_seguro.precio = producto_seguro.precio - (producto_seguro.precio * descuento_a_usar / 100);
        let promo = { con_promo: false }

        if (!registro.promo) {
            registro.promo = { con_promo: false }
        }

        if (producto_seguro.promo && producto_seguro.promo.tiene_promo == true && registro.promo.con_promo == true) {
            var devolver_promocionDB_proceso = await devolver_promocionDB(producto_seguro.promo.id_promocion);
            if (devolver_promocionDB_proceso.ok == true) {
                if (devolver_promocionDB_proceso.promocion.activa == true) {
                    producto_seguro.precio = devolver_promocionDB_proceso.promocion.precio;
                    promo.con_promo = true;
                }
            }
        }

        let registro_seguro = { cantidad: registro.cantidad, producto: producto_seguro, promo, canMB: canMB };
        let precios = { aplica_descuento: producto_constante.aplicar_descuento_distribuidor, precio_original: producto_constante.precio, precio_despues_de_descuento: producto_seguro.precio, descuento: descuento_a_usar }
        const carritos_previos = producto_constante.carritos || [];
        const existencias_antes = producto_constante.existencia ? producto_constante.existencia.actual : 0;
        let total_reservado_previo = carritos_previos.reduce((a, b) => +a + parseInt(b.cantidad || 0), 0);
        let inventario = {
            existencias_antes,
            total_reservado_previo,
            cantidad: registro.cantidad
        }
        var log = {};
        var snap_tipo_Accion = "pendiente";// 4 cambio_de_cantidad => 4a:nuevo ,4b:cambio_cantidad, 4c:borro_de_pedido
        let cantidad_anterior = 0;

        if (producto_temp != undefined) {
            const producto_const = JSON.parse(JSON.stringify(producto_temp));
            const cantidad_previa = producto_const.cantidad
            if (registro.cantidad > 0 && donde == "agregar") {
                producto_temp.cantidad = registro.cantidad;
                producto_temp.canMB = canMB;
                producto_temp.promo = registro.promo;
                producto_temp.producto.precio = producto_seguro.precio;
                snap_tipo_Accion = "4b"; // 4b:cambio_cantidad
                cantidad_anterior = cantidad_previa
            }
            if (registro.cantidad == 0 && donde == "eliminar") {
                lista = lista.filter(element => JSON.stringify(element.producto._id) !== JSON.stringify(registro.producto._id));
                snap_tipo_Accion = "4c"; // 4c:borro_de_pedido
                cantidad_anterior = cantidad_previa
            }
            let accion = registro.cantidad == 0 ? 'borrar-producto' : 'cambiar-cantidad';
            accion += ' producto="' + registro.producto.nombre + '" cantidad="' + registro.cantidad + '" cantidad-previa="' + cantidad_previa + '"'
            log = { registro_cantidades: registro_seguro, registro_previo: producto_const, precios, inventario, folio: carritoDB.folio };
        }
        else {
            if (donde == "agregar") {
                lista.push(registro_seguro);
                snap_tipo_Accion = "4a"; // 4a:nuevo en pedido
                cantidad_anterior = 0;
                log = { registro_cantidades: registro_seguro, registro_previo: 'El producto no existia previamente en pedido', precios, inventario, folio: carritoDB.folio }
            }
        }

        const total_dinero = await sumar_cantidades_dinero(lista);
        const proceso_apartado = await apartar_producto(registro_seguro, carritoDB.cliente, carritoDB.folio);

        if (proceso_apartado.ok === true) {
            const proceso_cambiar_carrito_de_cliente = await cambiar_carrito_de_cliente(id, lista, total_dinero, log, req, registro.producto._id);
            if (proceso_cambiar_carrito_de_cliente.ok == true) {
                const usuarioSnap = (req.user && req.user.nombre) ? { nombre: req.user.nombre, id: req.user._id } : { nombre: "Usuario", id: null };
                const clienteObj = carritoDB.cliente || {};
                const snap_proceso = await snap_por_cambio_en_pedido(
                    { nombre: producto_constante.nombre, id: producto_constante._id },
                    usuarioSnap,
                    registro.cantidad,
                    cantidad_anterior,
                    snap_tipo_Accion,
                    { folio: carritoDB.folio, cliente: { nombre: clienteObj.nombre || "Cliente", id: clienteObj.id || null } },
                    producto_constante
                );

                if (session) {
                    await session.commitTransaction();
                    session.endSession();
                }
                return res.send({ ok: true, registro_agregado: registro_seguro })
            }
            else {
                if (session) { await session.abortTransaction(); session.endSession(); }
                log.error = {
                    linea: 124,
                    mensaje: "Se aparto el producto, pero no se pudo cambiar el carrito del cliente",
                    solucion: "Es necesario desapartar el producto"
                }
                accesos.logActividad('carrito/cambiar_cantidad_v2.1/', req.user, log, req);
                return res.send({ ok: false, mensaje: "Error al actualizar carrito del cliente" });
            }
        }

        if (proceso_apartado.ok === false) {
            if (session) { await session.abortTransaction(); session.endSession(); }
            log.error = {
                linea: 108,
                mensaje: "Error en apartar_producto",
                solucion: "No es necesario algun cambio en inventario o apartados"
            }
            accesos.logActividad('carrito/cambiar_cantidad_v2.1/', req.user, log, req);
            return res.send({ ok: false, mensaje: proceso_apartado.mensaje })
        }

    } catch (error) {
        console.error("Error en cambiar_cantidad.js:", error);
        if (session) {
            try {
                await session.abortTransaction();
                session.endSession();
            } catch (e) {}
        }
        return res.status(500).send({ ok: false, mensaje: "Error al cambiar cantidad", error: error.message });
    }


    //----------------------------------------------------------------------------------------- *fb3

    // if (proceso_apartado.ok === false) {
    //     log.error = {
    //         linea: 108,
    //         mensaje: "Error en apartar_producto, retornando antes de actualizar el carrito y agregar el producto sin haber apartado correctamente",
    //         solucion: "No es necesario algun cambio en inventario o apartados"
    //     }
    //     accesos.logActividad('carrito/cambiar_cantidad_v2.1/', req.user, log, req);
    //     return res.send({ ok: false, mensaje: proceso_apartado.mensaje })
    // }
    // else {
    //     const proceso_cambiar_carrito_de_cliente = await cambiar_carrito_de_cliente(id, lista, total_dinero, log, req, registro.producto._id);
    //     if (proceso_cambiar_carrito_de_cliente.ok == true) {
    //         //  exito , proseguir
    //         const snap_proceso = await snap_por_cambio_en_pedido({ nombre: producto_constante.nombre, id: producto_constante._id },
    //             { nombre: req.user.nombre, id: req.user._id },
    //             registro.cantidad,
    //             cantidad_anterior,
    //             snap_tipo_Accion,  //
    //             { folio: carritoDB.folio, cliente: { nombre: carritoDB.cliente.nombre, id: carritoDB.cliente.id } },
    //             producto_constante
    //         )
    //         //console.log("---|||");
    //         //console.log(snap_proceso)
    //         return res.send({ ok: true, registro_agregado: registro_seguro })
    //     }
    //     else {
    //         //      falla log acceso
    //         log.error = {
    //             linea: 124,
    //             mensaje: "Se aparto el producto, pero no se pudo cambiar el carrito del cliente",
    //             solucion: "Es necesario desapartar el producto"
    //         }
    //         console.log("Error al cambiar carrito de cliente")
    //         accesos.logActividad('carrito/cambiar_cantidad_v2.1/', req.user, log, req);
    //     }
    // }


}

async function cambiar_carrito_de_cliente(id, lista, total_dinero, log, req, producto_id) {
    //console.log("id-ar", id, "lista-ar", isEmpty(lista), "*--*", lista, "total", isEmpty(total_dinero), "*--*", total_dinero, "req", isEmpty(req), "producto_id", isEmpty(producto_id), "*--*", producto_id);
    try {
        const updateResult = await Carrito.findByIdAndUpdate(id, {
            lista,
            total_pedido: total_dinero,
            fecha: new Date()
        }, { new: true });

        // console.log("updateResult", updateResult);
        // console.log("88888888888888888888888]]88888888888888888888888888888888888");

        if (!updateResult) {
            throw new Error("No se pudo actualizar el carrito del cliente");
        }

        // Registrar el cambio en el log de actividades
        // await accesos.logActividad('carrito/cambiar_carrito_de_cliente', req, { id, lista, total_dinero, producto_id });
        const producto_despues_proceso = await devolver_producto_db(producto_id);
        const producto_despues = (producto_despues_proceso && producto_despues_proceso.producto) ? producto_despues_proceso.producto : {};
        const carritos_despues = (producto_despues && Array.isArray(producto_despues.carritos)) ? producto_despues.carritos : [];
        let total_reservado_despues = carritos_despues.reduce((a, b) => +a + (parseInt(b ? b.cantidad : 0) || 0), 0);
        const existencias_despues = (producto_despues && producto_despues.existencia) ? (producto_despues.existencia.actual || 0) : 0;
        let log_tmp = log;
        if (log_tmp && log_tmp.inventario) {
            log_tmp.inventario.existencias_despues = existencias_despues;
            log_tmp.inventario.total_reservado_despues = total_reservado_despues;
            log_tmp.producto_despues = producto_despues;
        }

        accesos.logActividad('carrito/cambiar_cantidad_v2.1/', req.user, log_tmp, req);

        // Retornar éxito
        return { ok: true, carrito: updateResult };

    } catch (error) {
        console.error("Error en cambiar_carrito_de_cliente:", error);

        // Registrar el error en el log
        await accesos.logActividad('carrito/cambiar_carrito_de_cliente/error', req, { error, id, lista, total_dinero, producto_id });

        return { ok: false, error: error.message };
    }
}



// async function cambiar_carrito_de_cliente(id, lista, total_dinero, log, req, id_producto) {
//     return Carrito.findByIdAndUpdate(id, { lista, total_pedido: total_dinero, fecha: new Date() })
//         .then((async () => {
//             //      datos para logs
//             const producto_despues_proceso = await devolver_producto_db(id_producto);
//             const producto_despues = producto_despues_proceso.producto;
//             const carritos_despues = producto_despues.carritos;
//             const existencias_despues = producto_despues.existencia.actual;
//             let total_reservado_despues = carritos_despues.reduce((a, b) => +a + parseInt(b.cantidad), 0);
//             let log_tmp = log;
//             log_tmp.inventario.existencias_despues = existencias_despues;
//             log_tmp.inventario.total_reservado_despues = total_reservado_despues;
//             log_tmp.producto_despues = producto_despues;
//             accesos.logActividad('carrito/cambiar_cantidad_v2.1/', req.user, log_tmp, req);
//             //      datos pra logs
//             return { ok: true, log_tmp }
//         }))
//         .catch((err) => {
//             console.log(err)
//             return { ok: false, log }
//         })
// }


////   Sumar el total neto del pedido

async function sumar_cantidades_dinero(lista) {

    ////console.log(lista);

    ////console.log(lista.length);
    let total_dinero = 0;
    if (lista == undefined) {
        total_dinero = 0;
        return total_dinero;

    }
    if (lista.length == 0) {
        total_dinero = 0;
        return total_dinero;

    }
    total_dinero = lista.reduce(
        (a, b) => +a + +b.producto.precio * +b.cantidad,
        0
    );
    return total_dinero;


}



//   Aparta los productos en el registor de cada producto para que nadie pueda exceder existencias
async function apartar_producto(registro, cliente, folio) {
    //  Ciclo producto por producto apartando su cantidad respectiva
    //var contador = 0;
    //console.log(cliente);
    //console.log('*********APARTAR RPODUCTO********');
    let hay_suficientes = await si_hay_suficientes_productos(registro.producto._id, registro.cantidad)
    /// Borrar de lista
    if (hay_suficientes.ok === false || hay_suficientes.suficientes === false) {
        reject({ ok: false, mensaje: 'Productos insuficientes para apartado' })
        return;
    }
    return Producto.findByIdAndUpdate(registro.producto._id, {
        $pull: {
            carritos: {
                // 'cliente.id': { $in: [cliente.id] },
                folio: folio
            }
        }
    })
        .then((resultadodb) => {
            // Volver a poner en lista si es > 0
            // console.log({ resultado_primer: resultadodb });
            if (registro.cantidad === 0) {
                // aqui es cuando se borra un producto
                return { ok: true }
            }
            //  mayor a 0
            return Producto.findByIdAndUpdate(registro.producto._id, {
                $push: {
                    carritos:
                    {
                        cantidad: parseInt(registro.cantidad),
                        cliente: {
                            id: cliente.id,
                            nombre: cliente.nombre,
                            correo: cliente.correo,
                        },
                        fecha: new Date(),
                        folio: folio
                    }
                }
            })
                .then(() => {

                    return { ok: true }

                })
                .catch((err) => {
                    console.log(err);
                    return { ok: false, err };
                })
        })
        .catch((err) => {
            console.log(err);
            //contador.insuficientes++;



            return { ok: false, err };
        })

}



function si_hay_suficientes_productos(id_producto, cantidad_necesaria) {
    return new Promise((resolve, reject) => {
        Producto.findById(id_producto)
            .then((documento) => {
                if (documento === null) {
                    reject({ ok: false, mensaje: 'El producto ya no existe', suficientes: false });
                    return;
                }
                //console.log(documento.nombre+'-------');

                const hay_suficientes = suficientes_productos(documento.existencia.actual, documento.carritos, cantidad_necesaria);
                resolve({ ok: true, suficientes: hay_suficientes });
                return;
            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err, suficientes: false });
                return;
            });
    })
}


function suficientes_productos(
    existencias,
    carritos,
    necesarios) {
    let total_reservado = 0;
    if (carritos.length == 0 || carritos == [""]) {
        total_reservado = 0;
        return existencias >= necesarios;
    }
    total_reservado = carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0) + +parseInt(necesarios);
    //console.log("total_reservado = " + total_reservado);
    //console.log("existencias = " + existencias);
    //console.log('necesarios='+necesarios);
    const suficientes = ((+existencias - +total_reservado) >= 0);
    //console.log('suficientes='+suficientes + ' res= '+(+existencias - +total_reservado));


    return suficientes;
}



async function suficientes_productos_version_2(
    id_producto,
    necesarios) {
    const producto_antes_de_cualquier_cambio_proceso = await devolver_producto_db(id_producto)
        .catch((err) => {
            let error_body = JSON.stringify(err);
            registrar_error(error_body, 'pedidos/editar/cambiar_cantidad_nuevo-producto_antes_de_cualquier_cambio_proceso').catch(console.error)
        })
    if (!producto_antes_de_cualquier_cambio_proceso || producto_antes_de_cualquier_cambio_proceso.ok == false) {
        return { suficientes: false, total_reservado: 0, existencias: 0 };
    }
    const producto = producto_antes_de_cualquier_cambio_proceso.producto || {};

    const carritos = (producto && Array.isArray(producto.carritos)) ? producto.carritos : [];
    const existencias = (producto && producto.existencia) ? (producto.existencia.actual || 0) : 0;

    let total_reservado = carritos.reduce((a, b) => +a + (parseInt(b ? b.cantidad : 0) || 0), 0);

    let total_reservado_mas_necesarios = total_reservado + parseInt(necesarios || 0);
    const suficientes = ((+existencias - +total_reservado_mas_necesarios) >= 0);

    return { suficientes, total_reservado, existencias };
}


async function devolver_promocionDB(id_promocion) {
    return Promocion.findById(id_promocion)
        .then((promocion) => {
            return { ok: true, promocion };
        })
        .catch((err) => {
            console.log(err);
            return { ok: false, mensaje: "error al buscar resultados." };
        })
}