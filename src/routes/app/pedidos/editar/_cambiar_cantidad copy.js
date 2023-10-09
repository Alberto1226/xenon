

import { Carrito } from "../../../../models/carrito";
import { Producto } from "../../../../models/producto";
import { devolver_producto_db } from './_server_cambiar_cantidad/devolver_producto_db';
import * as accesos from "../../accesos"

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

    const registro = req.body.registro;
    const id = req.body.id_carrito;


    //          checar suficiencia version 2 
    const son_suficientes = await suficientes_productos_version_2(registro.producto._id, registro.cantidad).catch(console.error)


    if (son_suficientes.suficientes === false) {
        return res.send({ ok: false, total_reservado: son_suficientes.total_reservado, mensaje: 'Cantidad insuficiente, solo quedan ' + (son_suficientes.existencias - son_suficientes.total_reservado) + ' disponibles.' })
    }


    Carrito.findById(id)
        .then(async (resultado) => {
            if (resultado === null) {
                res.send({ ok: false, mensaje: 'El pedido ya no existe' })
                return;
            }
            if (resultado.status === 'Envío') {
                res.send({ ok: false, mensaje: 'El pedido no se puede modificar en status Envío' })
                return;
            }
            let lista = resultado.lista;

            let producto_temp = lista.find(element => JSON.stringify(element.producto._id) === JSON.stringify(registro.producto._id));
            const producto_antes_de_cualquier_cambio_proceso = await devolver_producto_db(registro.producto._id)
                .catch((err) => {
                    let error_body = JSON.stringify(err);
                    registrar_error(error_body, 'pedidos/editar/cambiar_cantidad_nuevo-producto_antes_de_cualquier_cambio_proceso').catch(console.error)
                })
            if (producto_antes_de_cualquier_cambio_proceso.ok == false) {
                res.send({ ok: false, mensaje: "El producto fue borrado y no se podra agregar." })
                return;
            }
            const producto_constante = producto_antes_de_cualquier_cambio_proceso.producto;

            //const producto_constante_proceso= await devolver_producto_db(registro.producto._id);
            const descuento_a_usar = producto_constante.aplicar_descuento_distribuidor ? resultado.descuento : 0;
            let producto_seguro = JSON.parse(JSON.stringify(producto_constante));
            producto_seguro.precio = producto_seguro.precio - (producto_seguro.precio * descuento_a_usar / 100);
            let registro_seguro = { cantidad: registro.cantidad, producto: producto_seguro };
            //      datos para logs
            let precios = { aplica_descuento: producto_constante.aplicar_descuento_distribuidor, precio_original: producto_constante.precio, precio_despues_de_descuento: producto_seguro.precio, descuento: descuento_a_usar }
            const carritos_previos = producto_constante.carritos;
            const existencias_antes = producto_constante.existencia.actual;
            let total_reservado_previo = carritos_previos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
            let inventario = {
                existencias_antes,
                total_reservado_previo
            }
            var log = {};
            //  datos de logs

            if (producto_temp != undefined) {
                const producto_const = JSON.parse(JSON.stringify(producto_temp));
                const cantidad_previa = producto_const.cantidad
                //   > a cero
                if (registro.cantidad > 0) producto_temp.cantidad = registro.cantidad;
                //    == a cero
                if (registro.cantidad == 0) lista = lista.filter(element => JSON.stringify(element.producto._id) !== JSON.stringify(registro.producto._id));
                let accion = registro.cantidad == 0 ? 'borrar-producto' : 'cambiar-cantidad';
                accion += ' producto="' + registro.producto.nombre + '" cantidad="' + registro.cantidad + '" cantidad-previa="' + cantidad_previa + '"'
                //      logActividad(ruta, usuario, body, req, previousValue = 'ninguno')
                log = { registro_cantidades: registro_seguro, registro_previo: producto_temp, precios, inventario, folio: resultado.folio };
                //accesos.logActividad('carrito/cambiar_cantidad_v2/', req.user, log, req);
            }
            else {
                lista.push(registro_seguro);
                //      logActividad(ruta, usuario, body, req, previousValue = 'ninguno')
                //  modificar el precio de acuerdo al descuento del pedido         
                log = { registro_cantidades: registro_seguro, registro_previo: 'El producto no existia previamente en pedido', precios, inventario, folio: resultado.folio }

            }
            //console.log('lista despues de proceso *****');
            //console.log('registro.producto id=' + registro.producto._id);
            //console.log(lista);
            sumar_cantidades_dinero(lista).then((proceso) => {
                let total_dinero = proceso.total_dinero;
                Carrito.findByIdAndUpdate(id, { lista, total_pedido: total_dinero, fecha: new Date() })
                    .then(async () => {
                        const proceso_apartado = await apartar_producto(registro_seguro, resultado.cliente, resultado.folio)
                        if (proceso_apartado.ok === false) {
                            accesos.logActividad('carrito/cambiar_cantidad_v2/', req.user, log, req);
                            res.send({ ok: false, mensaje: proceso_apartado.mensaje })
                        } else {
                            //      datos para logs
                            const producto_despues = await devolver_producto_db(registro.producto._id);
                            const carritos_despues = producto_despues.carritos;
                            const existencias_despues = producto_despues.existencia.actual;
                            let total_reservado_despues = carritos_despues.reduce((a, b) => +a + parseInt(b.cantidad), 0);
                            log.inventario.existencias_despues = existencias_despues;
                            log.inventario.total_reservado_despues = total_reservado_despues;
                            log.producto_despues = producto_despues;
                            accesos.logActividad('carrito/cambiar_cantidad_v2/', req.user, log, req);
                            //      datos pra logs
                            res.send({ ok: true })
                        }
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

function sumar_cantidades_dinero(lista) {
    return new Promise((resolve) => {
        ////console.log(lista);

        ////console.log(lista.length);
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




//   Aparta los productos en el registor de cada producto para que nadie pueda exceder existencias
function apartar_producto(registro, cliente, folio) {
    //  Ciclo producto por producto apartando su cantidad respectiva
    return new Promise(async (resolve, reject) => {
        //console.log(cliente);
        //console.log('*********APARTAR RPODUCTO********');
        let hay_suficientes = await si_hay_suficientes_productos(registro.producto._id, registro.cantidad)
        /// Borrar de lista
        if (hay_suficientes.ok === false || hay_suficientes.suficientes === false) {
            reject({ ok: false, mensaje: 'Productos insuficientes para apartado' })
            return;
        }
        Producto.findByIdAndUpdate(registro.producto._id, {
            $pull: {
                carritos: {
                    'cliente.id': { $in: [id_cliente] }
                }
            }
        })
            .then(() => {
                // Volver a poner en lista si es > 0
                if (registro.cantidad === 0) {
                    resolve({ ok: true });
                    return;
                }
                //  mayor a 0
                Producto.findByIdAndUpdate(registro.producto._id, {
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
                        resolve({ ok: true });
                        return;
                    })
                    .catch((err) => {
                        console.log(err);
                        reject({ ok: false })
                        return;
                    })
            })
            .catch((err) => {
                console.log(err);
                contador.insuficientes++;
                if (i + 1 == lista_productos.length) {
                    reject(contador);
                }
                return;
            })
    });
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
    if (producto_antes_de_cualquier_cambio_proceso.ok == false) {
        res.send({ ok: false, mensaje: "El producto fue borrado y no se podra agregar." })
        return;
    }
    const producto = producto_antes_de_cualquier_cambio_proceso.producto;

    const carritos = producto.carritos;
    const existencias = producto.existencia.actual;

    let total_reservado = carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);

    let total_reservado_mas_necesarios = total_reservado + parseInt(necesarios);
    const suficientes = ((+existencias - +total_reservado_mas_necesarios) >= 0);

    return { suficientes, total_reservado, existencias };
}
