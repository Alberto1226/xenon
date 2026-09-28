//   Como superadmin crea carritos de ruta
import { Usuario } from "../../../../models/usuario";
import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos";
import { generar_siguiente_folio } from "../_servicios/folio_service";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    const data = req.body;
    const email = req.user ? req.user.correo : "";
    const uid = req.user ? req.user._id : null;

    if (!uid) {
        res.send({
            ok: false,
            mensaje: "Usuario no identificado"
        });
        return;
    }

    try {
        const carrito_creado = await crear_su_carrito(data, email, false, req.user, req);
        res.send({
            ok: true,
            carrito_creado,
            detalle: "Se ha creado el pedido de ruta"
        });
    } catch (err) {
        console.error("Error al crear pedido de ruta:", err);
        res.send({
            ok: false,
            mensaje: (err && (err.mensaje || err.err)) ? (err.mensaje || err.err) : "Se produjo un error al crear el pedido de ruta"
        });
    }
}

function crear_su_carrito(data, email, tenia_ficha = false, usuario, req) {
    return new Promise(async (resolve, reject) => {
        let resFolio = await generar_siguiente_folio();
        if (!resFolio.ok) {
            reject({ ok: false, err: resFolio.mensaje || "No se pudo obtener el folio." });
            return;
        }

        let folio = resFolio.folio;
        let total_pedido = 0;
        let idAgenteSeleccionado = data && data.agente ? (data.agente._id || data.agente.id) : null;

        try {
            let obtener_agente = await obtener_datos_agente(idAgenteSeleccionado);
            let agente = obtener_agente.agente;

            let cliente_tmp = {
                porcentaje: 0,
                perfil: "",
            };
            let cliente = {
                nombre: "",
                id: null,
                correo: "",
                direccion: "",
                perfil: cliente_tmp,
            };

            let folio_salida = `${folio}-1`;
            let doc_nuevo = {
                folio,
                folio_salida,
                tenia_ficha,
                moneda: 'Pesos Mexicanos',
                tipo_de_cambio: 1,
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
                rutas: true,
                ruta: data && data.ruta ? {
                    id: data.ruta._id || data.ruta.id || null,
                    nombre: data.ruta.nombre_ruta || data.ruta.nombre || ""
                } : null,
                status: "Pedido"
            };

            let nuevo_carrito = new Carrito(doc_nuevo);
            let resultado = await nuevo_carrito.save();

            accesos.logActividad('pedido/nuevo/rutas', usuario, { folio: folio, id: resultado._id }, req);
            resolve({ ok: true, doc_nuevo: nuevo_carrito });
        } catch (err) {
            console.error("Error en guardar carrito de ruta:", err);
            reject({ ok: false, err: err.message || err });
        }
    });
}

function obtener_datos_agente(id_agente) {
    return new Promise((resolve, reject) => {
        if (!id_agente) {
            resolve({
                ok: true,
                agente: {
                    nombre: '',
                    comision: 0,
                    correo: '',
                    id: null
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
                            comision: 0,
                            correo: '',
                            id: null
                        }
                    });
                    return;
                }
                resolve({
                    ok: true,
                    agente: {
                        nombre: doc.nombre || '',
                        comision: doc.comision || 0,
                        correo: doc.correo || '',
                        id: doc._id
                    }
                });
            })
            .catch((err) => {
                console.error(err);
                reject({
                    ok: false,
                    err
                });
            });
    });
}
