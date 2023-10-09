
//   Como superadmin crea carritos
import { Usuario } from "../../../../models/usuario";
import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";
import * as accesos from "../../accesos";
import { Producto } from "../../../../models/producto";
import { Ficha_de_descuento } from "../../../../models/ficha_de_descuento";


export function post(req, res, next) {

    // Seguridad

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    // Seguridad termina
    const data = req.body;
    const email = req.user.correo;
    const uid = req.user._id;
    if (uid === undefined || uid === null || uid === "") {
        res.send({
            ok: false,
            mensaje: "aja"
        })
        return;
    }


    // analizar si tiene las cosas necesarias para realizar los siguietnes pasos
    if (
        data.pedido_nuevo.lista_productos_en_pedido_nuevo.length == 0 ||
        data.pedido_nuevo.lista_productos_en_pedido_nuevo == undefined ||
        data.pedido_nuevo.lista_productos_en_pedido_nuevo == null
    ) {
        res.send({
            ok: false,
            mensaje: "aja"
        })
        return;
    }

    //  Apartar los productos
    apartar_productos(data.pedido_nuevo)
        .then((async (contador_suficientes) => {

            //console.log(contador_suficientes);
            //res.send(contador_suficientes);
            const proceso_apartado = contador_suficientes;

            // Insuficientes
            if (proceso_apartado.insuficientes > 0) {
                deshacer_reservas(
                    data.pedido_nuevo.cliente._id,
                    data.pedido_nuevo.lista_productos_en_pedido_nuevo
                )
                    .then(() => {
                        res.send({
                            contador_suficientes,
                            ok: false,
                            detalle:
                                "Hicieron falta algunos productos, se deshicieron los apartados de forma correcta"
                        });
                        return
                    })
                    .catch(err => {
                        console.log(err);
                        res.send({
                            contador_suficientes,
                            ok: false,
                            detalle:
                                "Hicieron falta algunos productos, NO se deshicieron realizados."
                        });
                    });
            } else {   // SUFICIENTES
                //console.log(contador_suficientes);
                //      Borrar ficha de descuento 

                const borrado_ficha = await borrar_ficha_si_existe(
                    data.pedido_nuevo.cliente._id
                );
                if (borrado_ficha.ok == false) {
                    res.send({
                        borrado_ficha,
                        ok: true,
                        contador_suficientes,
                        detalle:
                            "Error al buscar ficha de descuento"
                    });
                }
                ///     Crear Carrito 
                let carrito_creado = await crear_su_carrito(data, email, borrado_ficha.tenia_ficha, req.user);
                //console.log("carrito_creado =");
                //console.log(carrito_creado);

                res.send({
                    borrado_ficha,
                    ok: true,
                    contador_suficientes,
                    carrito_creado,
                    detalle:
                        "Se apartaron los productos y produjo un pedido , de forma correcta."
                });
            }
        }
        )

            //  crear el carrito

            // responder exito
        )
        .catch(err => {
            console.log(err);
            return res.send({ err, ok: false, detalle: "Error al apartar productos" });
        })


}



//   Aparta los productos en el registor de cada producto para que nadie pueda exceder existencias
function apartar_productos(data) {
    //  Ciclo producto por producto apartando su cantidad respectiva
    return new Promise((resolve, reject) => {
        let contador = {
            suficientes: 0,
            insuficientes: 0
        };
        //console.log('*****************')
        //console.log(contador)
        const lista_productos = data.lista_productos_en_pedido_nuevo;
        ////console.log(lista_productos);
        //ciclo;
        //console.log('******ciclo ***********')
        //console.log(lista_productos.length);
        if (lista_productos.length == 0) {
            resolve(contador);
            return;
        }
        for (let i = 0; i < lista_productos.length; i++) {
            const registro = lista_productos[i];
            //console.log(registro);
            //console.log(data.cliente._id);
            //console.log(data.cliente.nombre);
            //  se apartan los productos antres de checar su disponibilidad , se borraran al finalizar si nhubo algun producto que faltara
            Producto.findByIdAndUpdate(registro.producto._id, {
                $push: {
                    carritos:
                    {
                        cantidad: parseInt(registro.cantidad),
                        cliente: {
                            id: data.cliente._id,
                            nombre: data.cliente.nombre,
                            correo: data.cliente.correo,
                        },
                        fecha: new Date()
                    }
                }

            })
                .then(async () => {

                    const hay_suficientes = await si_hay_suficientes_productos(registro.producto._id, registro.cantidad);
                    if (hay_suficientes.suficientes) contador.suficientes++;
                    else contador.insuficientes++;
                    if (i + 1 == lista_productos.length) {
                        resolve(contador);
                    }
                })
                .catch((err) => {
                    console.log(err);
                    contador.insuficientes++;
                    if (i + 1 == lista_productos.length) {
                        reject(contador);
                    }
                    return;
                })
        }

    });
}
//  SI no hay existencias suficientes se deden de deshacer los apratados
function deshacer_reservas(
    id_cliente,
    lista_productos
) {
    return new Promise((resolve, reject) => {

        //console.log(lista_productos);
        for (let i = 0; i < lista_productos.length; i++) {
            const element = lista_productos[i];
            //console.log(element.producto);
            //console.log(element.producto.nombre);
            //console.log("correo=" + correo_cliente);
            Producto.findByIdAndUpdate(element.producto._id, {
                $pull: {
                    carritos: {
                        'cliente.id': { $in: [id_cliente] }
                    }
                }
            })
                .then(() => {
                    if (i + 1 == lista_productos.length) {
                        resolve();
                    }
                })
                .catch((err) => {
                    console.log(err);
                    if (i + 1 == lista_productos.length) {
                        reject(err);
                    }
                })
        }
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
    total_reservado =
        carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0) + +parseInt(necesarios);
    //console.log("total_reservado = " + total_reservado);
    //console.log("existencias = " + existencias);
    //console.log('necesarios='+necesarios);
    const suficientes = ((+existencias - +total_reservado) >= 0);
    //console.log('suficientes='+suficientes + ' res= '+(+existencias - +total_reservado));


    return suficientes;
}

function crear_su_carrito(data, email, tenia_ficha, usuario) {
    return new Promise(async (resolve, reject) => {



        let referencia_folio = await obtener_folio_actual();
        if (referencia_folio.ok == false) {
            //console.log("No se pudo obtener el folio");
            reject({ ok: false, err: "No se pudo obtener el folio." });
            return;
        }
        let folio = referencia_folio.folio;
        let obtener_total_pedido = await sumar_cantidades(
            data.pedido_nuevo.lista_productos_en_pedido_nuevo
        );
        let total_pedido = obtener_total_pedido.total_dinero;


        obtener_datos_agente(data.pedido_nuevo.agente.id)
            .then((obtener_agente) => {
                //console.log(obtener_agente);
                if (obtener_agente.ok == false) {
                    reject({
                        ok: false,
                        err: "No se pudo obtener el agente para guardar sus detalles"
                    });
                    return;
                }
                let agente = obtener_agente.agente;
                let cliente = {
                    nombre: data.pedido_nuevo.cliente.nombre,
                    id: data.pedido_nuevo.cliente._id,
                    correo: data.pedido_nuevo.cliente.correo,
                    direccion: data.pedido_nuevo.cliente_direccion,
                    perfil: data.pedido_nuevo.cliente.perfil,
                };
                //console.log(agente);
                let doc_nuevo = {
                    folio,
                    tenia_ficha,
                    moneda: data.pedido_nuevo.moneda,
                    descuento: data.pedido_nuevo.descuento,
                    lista: data.pedido_nuevo.lista_productos_en_pedido_nuevo,
                    fecha: new Date(),
                    usuario_que_registro: {
                        id: usuario._id,
                        nombre: usuario.nombre,
                        correo: usuario.correo,
                        usuario: usuario.usuario,
                    },
                    total_pedido,
                    agente,
                    cliente,
                    status: "Pedido"
                };
                let nuevo_carrito = new Carrito(doc_nuevo);
                nuevo_carrito.save()
                    .then(() => {
                        resolve({ ok: true, doc_nuevo: nuevo_carrito });
                    })
                    .catch((err) => {
                        console.log(err);
                        reject({ ok: false, err });
                    });
            })
            .catch(err => {
                console.log(err);
                reject({ ok: false, mesnaje: 'Error en obtener agent.firebase' });
            });
    });
}

// funcion que tra el auincrementable apara folio
function obtener_folio_actual() {
    return new Promise((resolve, reject) => {

        Carrito.findOne({}).sort({ fecha: -1 })
            .then(doc_carrito => {
                //console.log(docFirebase.data());  
                const folio_carritos = 0;
                if (doc_carrito === null || doc_carrito === undefined) {
                    folio_carritos = 0;
                }
                else {
                    folio_carritos = parseInt(doc_carrito.folio) + 1
                }
                Pedido.findOne({}).sort({ fecha: -1 })
                    .then((docPedido) => {
                        if (folio_carritos === 0 && docPedido === null) {
                            resolve({ ok: true, folio: 7765 });
                            return;
                        }
                        const folio_Pedido = parseInt(docPedido.folio) + 1;
                        // Update folio_siguiente contador
                        //storyRef.update({ folio_siguiente: increment });
                        resolve({ ok: true, folio: Math.max(folio_carritos, folio_Pedido) });
                    })
                    .catch((err) => {
                        console.log(err);
                        reject({ ok: false, err });
                    })

            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err });
            });
    });
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

//   Obtener los datos necesarios del agente

function obtener_datos_agente(id_agente) {
    return new Promise((resolve, reject) => {
        //console.log("correo agente =" + correo_agente);
        Usuario.findById(id_agente)
            .then((doc) => {
                if (doc === null) {
                    resolve({
                        ok: true,
                        agente: {
                            nombre: '',
                            comision: '',
                            correo: '',
                            id: ''
                        }
                    });
                    return;
                }
                resolve({
                    ok: true,
                    agente: {
                        nombre: doc.nombre,
                        comision: doc.comision,
                        correo: doc.correo,
                        id: doc._id
                    }
                });
                return;
            })
            .catch((err) => {
                console.log(err);
                reject({
                    ok: false,
                    err
                });
            });
    });
}

function borrar_ficha_si_existe(id_cliente) {
    return new Promise((resolve, reject) => {
        const query = {
            'cliente.id': id_cliente
        }
        Ficha_de_descuento.findOne(query)
            .then(function (doc) {
                if (doc !== null) {
                    //console.log("Document data:", doc.data());

                    Ficha_de_descuento.findOneAndDelete(query)
                        .then(() => {
                            //  //console.log("Document successfully deleted!");
                            //    Documento borrado
                            resolve({ ok: true, tenia_ficha: true });
                        })
                        .catch(function (err) {
                            //      Error al borrar el documento de ficha
                            reject({ ok: false, err, tenia_ficha: true });
                            console.log(err);
                        });
                } else {
                    // doc.data() will be undefined in this case
                    ////console.log("No such document!");
                    // No tiene ficha ficha
                    resolve({ ok: true, tenia_ficha: false });
                }
            })
            .catch(function (err) {
                //console.log("Error getting document:", error);
                console.log(err);
                reject({ ok: false, err, tenia_ficha: true });
            });
    });
}
