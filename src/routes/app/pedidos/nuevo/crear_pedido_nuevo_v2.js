
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

    // Seguridad

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    

    // Seguridad termina
    const data = req.body;
    //console.log('***********');
   // console.log(data);

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
    const tiene_carrito_ = await tiene_carrito(data.pedido_nuevo.cliente._id)
    // const tiene_carrito_ = false;
    if(tiene_carrito_){
        res.send({
            ok: false,
            mensaje: "El cliente ya tiene un pedido ",
            // variable: tiene_carrito_,
        })
        return;
    }
    //  Continuar si no tiene carrito

        console.log(data)
        console.log(data.pedido_nuevo.cliente._id);
        
    //

    borrar_ficha_si_existe(
        data.pedido_nuevo.cliente._id
    ).then((borrado_ficha) => {
        crear_su_carrito(data, email, borrado_ficha.tenia_ficha, req.user,req).then((carrito_creado) => {

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


            .catch(err => {
                console.log(err);
                return res.send({ err, ok: false, detalle: "Error al apartar productos" });
            })
    })
}




function crear_su_carrito(data, email, tenia_ficha, usuario,req) {
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
        const cliente_db = await obtener_cliente(data.pedido_nuevo.cliente._id)
        const descuento_sin_ficha = cliente_db.perfil.porcentaje;
        console.log("***---- Cliente db")
        console.log(descuento_sin_ficha);
        console.log("***---- Cliente db")
        obtener_datos_agente(cliente_db.agente.id)
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
                    porcentaje:cliente_db.perfil.porcentaje,
                    perfil:cliente_db.perfil.perfil.replace(' ',""),
                }
                let cliente = {
                    nombre: data.pedido_nuevo.cliente.nombre,
                    id: data.pedido_nuevo.cliente._id,
                    correo: data.pedido_nuevo.cliente.correo,
                    direccion: data.pedido_nuevo.cliente_direccion,
                    perfil: cliente_tmp,
                };
                //console.log(agente);
                let doc_nuevo = {
                    folio,
                    tenia_ficha,
                    moneda: data.pedido_nuevo.moneda,
                    tipo_de_cambio: parseFloat(data.pedido_nuevo.tipo_de_cambio),
                    descuento: tenia_ficha? data.pedido_nuevo.descuento: descuento_sin_ficha,
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
                        accesos.logActividad('pedido/nuevo',usuario,{folio:folio,id:resultado._id},req);
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

////   Sumar el total neto del pedido

function sumar_cantidades(lista) {
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


async function tiene_carrito(id) {
    return new Promise((resolve, reject) => {

        Carrito.findOne().or([{ 'cliente.id': id, status: 'Pedido' }
            , { 'cliente.id': id, status: 'Ficha pago' }
            , { 'cliente.id': id, status: 'Pagado' }
            , { 'cliente.id': id, status: 'Empaque' }])
            .then((resDB) => {
                console.log(resDB)
                resolve(resDB!=null)
            })
            .catch((err) => {
                console.log(err);
                reject(err);
            })
    })
}


async function obtener_cliente(id){
    console.log("--------en funcion->")
    console.log(id)
    return Cliente.findById(id)
    .then((cliente_db)=>{
        return cliente_db;
    })
    .catch((err)=>{
        console.log(err);
        return err;
    })
}