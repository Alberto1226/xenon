//   Como superadmin crea carritos
import { Usuario } from "../../../../models/usuario";
import { Cliente } from "../../../../models/cliente";
import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";
import * as accesos from "../../accesos";
import { Producto } from "../../../../models/producto";
import { Ficha_de_descuento } from "../../../../models/ficha_de_descuento";
import { ChecarFolioEnCarritosCancelados } from "./ChecarFolioEnCarritosCancelados";

export async function post(req, res, next) {
    // if (accesos.esta_logueado(req) === false) {
    //     res.send({ ok: false, mensaje: "sesion expirada" })
    //     return;
    // }


    // Seguridad termina
    const data = req.body;
    //console.log('***********');
    console.log(data);

    const email = req.user.correo;
    const uid = req.user._id;
    if (uid === undefined || uid === null || uid === "") {
        console.log('rechazo1')
        res.send({
            ok: false,
            mensaje: "aja"
        })
        return;
    }
    //  Checar si tiene carrito
    // const tiene_carrito_ = await tiene_carrito(data.pedido_nuevo.cliente._id)
    // // const tiene_carrito_ = false;
    // if (tiene_carrito_) {
    //     res.send({
    //         ok: false,
    //         mensaje: "El cliente ya tiene un pedido ",
    //         // variable: tiene_carrito_,
    //     })
    //     return;
    // }
    //  Continuar si no tiene carrito

    console.log(req.user);
    // console.log(data.pedido_nuevo.cliente._id);

    //


    crear_su_carrito(data, email, false, req.user, req).then((carrito_creado) => {

        res.send({

            ok: true,
            carrito_creado,
            detalle:
                "Se ha creado el pedido"
        });
        return;
    })
        .catch((err) => {
            console.log(err);
            res.send({

                ok: true,
                carrito_creado,
                detalle:
                    "Se produjo un error al crear el pedido"
            });
            return
        })
    //console.log("carrito_creado =");
    //console.log(carrito_creado);
}




function crear_su_carrito(data, email, tenia_ficha = false, usuario, req) {
    return new Promise(async (resolve, reject) => {
        let folio = 0;

        let referencia_folio = await obtener_folio_actual();
        if (referencia_folio.ok == false) {

            reject({ ok: false, err: "No se pudo obtener el folio." });
            return;
        }
        // let folio = referencia_folio.folio;
        let pCancelados = await ChecarFolioEnCarritosCancelados(referencia_folio.folio);
        if (pCancelados) {
            folio = referencia_folio.folio;
            folio += 1;
        }
        else {
            folio = referencia_folio.folio;
        }
        let total_pedido = 0;
        // const cliente_db = await obtener_cliente(data.agente._id)
        // const descuento_sin_ficha = cliente_db.perfil.porcentaje;
        console.log("***---- Cliente db")
        // console.log(descuento_sin_ficha);
        console.log("***---- Cliente db")
        obtener_datos_agente(data.agente._id)
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
                let cliente_tmp = {
                    porcentaje: 0,
                    perfil: "",
                }
                let cliente = {
                    nombre: "",
                    id: "",
                    correo: "",
                    direccion: "",
                    perfil: cliente_tmp,
                };
                //console.log(agente);
                let doc_nuevo = {
                    folio,
                    tenia_ficha,
                    moneda: 'Pesos Mexicanos',
                    tipo_de_cambio: 1,
                    // descuento: tenia_ficha ? data.pedido_nuevo.descuento : descuento_sin_ficha,
                    lista: [],
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
                //nuevo_carrito.tipo_de_cambio = parseFloat(doc_nuevo.tipo_de_cambio);
                nuevo_carrito.save()
                    .then((resultado) => {
                        // accesos.logActividad('pedido/nuevo',usuario,{folio:resultado.folio,id:resultado._id},req);
                        accesos.logActividad('pedido/nuevo/rutas', usuario, { folio: folio, id: resultado._id }, req);
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
        Carrito.findOne({}).sort({ folio: -1 })
            .then(doc_carrito => {
                //console.log(docFirebase.data());  
                var folio_carritos = 0;
                if (doc_carrito === null || doc_carrito === undefined) {
                    folio_carritos = 0;
                }
                else {
                    folio_carritos = parseInt(doc_carrito.folio) + 1
                }
                Pedido.findOne({}).sort({ folio: -1 })
                    .then((docPedido) => {
                        if (folio_carritos === 0 && docPedido === null) {
                            resolve({ ok: true, folio: 1 });
                            return;
                        }
                        if (docPedido === null && folio_carritos > 0) {
                            resolve({ ok: true, folio: parseInt(folio_carritos) + 1 });
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

//   Obtener los datos necesarios del agente

function obtener_datos_agente(id_agente) {
    return new Promise((resolve, reject) => {
        //console.log("correo agente =" + correo_agente);
        // caso de que no tenga agente
        if (id_agente === "") {
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

