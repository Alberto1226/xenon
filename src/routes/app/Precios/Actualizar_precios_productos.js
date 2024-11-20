import { Producto } from "../../../models/producto";
import { Precios } from "../../../models/Precios";
import mongoose from 'mongoose';
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    if (accesos.tiene_permisos_administrativos(req) == false
        //  && accesos.tiene_permisos_gerenciales(req) == false
    ) {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }

    if (!req.body.lista) {
        res.send({ ok: false, mensaje: "No se recibió la lista de precios" });
        return;
    }

    let lista = req.body.lista;
    let respuesta = await Actualizar(lista, req.user);

    if (respuesta.ok === false) {
        res.send({ ok: false, mensaje: respuesta.mensaje, datos: respuesta.datos });
        return;
    }
    if (respuesta.ok === true) {
        res.send({ ok: true, mensaje: respuesta.mensaje });
    }
}

async function Actualizar(lista, usuario) {

    let bloqueError = [];

    try {
        const batchSize = 25;
        let allBatches = [];
        let currentBatchIndex = 0;

        for (let i = 0; i < lista.length; i += batchSize) {
            // console.log("===>", lista.length);
            const batch = lista.slice(i, i + batchSize);
            allBatches.push(batch);
        }

        let totalBatches = allBatches.length;

        for (const batch of allBatches) {


            //imprimir el index del allbatch y el total de elementos
            console.log("Index ", allBatches.indexOf(batch), " Total ", allBatches.length);


            let confirmacion = await RegistrarBloque(batch, usuario, allBatches.indexOf(batch));

            console.log("confirm", confirmacion, "indexAllbatches", allBatches.indexOf(batch));

            if (confirmacion.ok === false) {
                console.log("Error al actualizar precios.");
                bloqueError.push(...batch);
                console.log("bloqueError", bloqueError.length);
            }

            // Actualizar progreso
            currentBatchIndex++;
            const progressPercentage = Math.floor((currentBatchIndex / totalBatches) * 100);
            console.log(`Progreso: ${progressPercentage}%`);

        }

        if (bloqueError.length > 0) {
            return { ok: false, mensaje: "Error al actualizar algunos precios.", datos: bloqueError };
        }
        return { ok: true, mensaje: "Precios actualizados" };
    } catch (error) {
        console.log("Error capturado==>:", error);
        return { ok: false, mensaje: "Error al actualizar precios." };
    }
}

async function ObtenerDatosProducto(id) {
    const producto = await Producto.findOne({ _id: mongoose.Types.ObjectId(id) }, { _id: 1, precio: 1 });
    return producto;
}

// Función de reintento genérica
async function retryOperation(operation, maxRetries = 5, delay = 1000) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            attempts++;
            if (attempts >= maxRetries) throw error;
            console.log(`Intento ${attempts} fallido. Reintentando en ${delay} ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// async function RegistrarBloque(batch, usuario, indexAllbatches) {
async function RegistrarBloque(batch, usuario) {
    //esta funcion registrara la actualizacion del precio en la coleccion de productos y registrara el movimiento en precios
    //cada que esta funcion se ejecute se hara una sesion para hacer la transaccion
    //indexAllbatches solo se usara para pruebas, por ejemplo si es igual a 5 y 9 que genere error y que aborte la transaccion
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        // if (indexAllbatches == 5 || indexAllbatches == 9) {
        //     console.log("error apara prueba");
        //     throw new Error("Error generado para pruebas");
        // }
        for (const element of batch) {
            // console.log("Index ", batch.indexOf(element), " ID ", element.ID);
            let producto = await ObtenerDatosProducto(element.ID);
            // console.log("Producto", producto.precio);
            await retryOperation(() =>
                Producto.updateOne(
                    { _id: mongoose.Types.ObjectId(element.ID) },
                    { precio: element.Precio },
                    { session }
                ),
                5, // Máximo de intentos
                1000 // Intervalo entre intentos (1 segundo)
            );
            // const precioAnterior = element['Precio_Anterior\r'] ? element['Precio_Anterior\r'].trim() : undefined;
            // console.log("Precio anterior", producto.precio, typeof producto.precio, "Precio actual", element.Precio, typeof element.Precio);
            let accion = '';
            if (parseFloat(producto.precio) > parseFloat(element.Precio)) {
                accion = 'p2';
            } else if (parseFloat(element.Precio) > parseFloat(producto.precio)) {
                accion = 'p1';
            } else if (parseFloat(element.Precio) === parseFloat(producto.precio)) {
                accion = 'p3';
            }
            // console.log("Accion", accion);

            await retryOperation(() =>
                Precios.create([{
                    producto: { id: element.ID },
                    precios: {
                        anterior: parseFloat(producto.precio),
                        actual: element.Precio
                    },
                    accion: accion,
                    control: { usuario: { id: usuario._id, nombre: usuario.nombre } }
                }], { session }),
                5, // Máximo de intentos
                1000 // Intervalo entre intentos (1 segundo = 1000 ms)
            );
        }
        await session.commitTransaction();
        session.endSession();
        return { ok: true };
    } catch (error) {
        console.log("Error capturado:", error);
        await session.abortTransaction();
        session.endSession();
        return { ok: false, };
    }
}