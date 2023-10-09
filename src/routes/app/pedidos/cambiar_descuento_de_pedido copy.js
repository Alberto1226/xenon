
//   Como superadmin crea productos
import { Carrito } from "../../../models/carrito";
import * as accesos from "../accesos";
import { Producto } from "../../../models/producto";
//import e from "express";
//import { resume } from "pdfkit";
//import { result } from "underscore";

export async function post(req, res, next) {

    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    //console.log(req.body);
    if (accesos.tiene_permisos_gerenciales(req) === false && accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }


    let id;
    let descuento_nuevo;
    try {
        id = req.body.id;
        descuento_nuevo = parseFloat(req.body.descuento_nuevo);
        if (isNaN(descuento_nuevo) || descuento_nuevo > 99) {
            res.send({ ok: false, mensaje: 'error al recibir los valores a cambiar 1' });
            return;
        }
    } catch (err) {
        res.send({ ok: false, mensaje: 'error al recibir los valores a cambiar 2' });
        return;
    }




    //  Obtener carrito a modificar
    let carrito_proceso = await carrito_a_cambiar(id);
    if (carrito_proceso.ok === false) {
        res.send({ ok: false, mensaje: 'Error al encontrar el carrito' });
        return;
    }
    let carrito = carrito_proceso.carrito;
    const descuentoOriginal = carrito.descuento;
    const resumenPrevio = await resumen_de_costos(carrito.lista, req);

    //  Devuelve la lista--
    //  usando la lista de prods, consultar productos base
    //  y usarlos para aplicar el descuento deseado    
    let resultado = await mutar_lista_con_descuento_nuevo(carrito.lista, carrito.folio, descuento_nuevo, req).catch((err) => {
        res.send({ ok: false, mensaje: 'Error al cambiar el carrito' });
        return;
    })
    let nueva_lista = resultado.nueva_lista_productos;
    let historial_precios_originales = resultado.historial_precios_originales;
    //console.log(resultado)
    //console.log('nueva=' + nueva_lista.length)
    //console.log('historial=' + historial_precios_originales.length)
    const resumenPosterior = await resumen_de_costos(nueva_lista, req);

    //  Calcular total
    let total_pedido = await sumar_cantidades_dinero(nueva_lista).catch((err) => {
        res.send({ ok: false, mensaje: 'Error al cambiar el carrito' });
        return;
    })
    //console.log(total_pedido);
    //  Aplicar_cambios_a_pedido
    let aplicacion_cambios_en_mongo = await guardar_en_db(id, nueva_lista, total_pedido, descuento_nuevo).catch((err) => {
        res.send({ ok: false, mensaje: 'Error al aplicar el descuento, favor de intentar de nuevo.' });
        return;
    })
    //console.log(aplicacion_cambios_en_mongo);
    const autocheck = await descuento_aplicado_correctamente(historial_precios_originales,resumenPosterior,descuento_nuevo);
    accesos.logActividad('pedidos/cambiar_descuento_de_pedido', req.user, { descuentoAnterior: descuentoOriginal, descuentoNuevo: descuento_nuevo, resumenOriginal: historial_precios_originales, resumenPrevio, resumenPosterior, detalles: resultado.detalles,autocheck }, req);
    if(autocheck.exito){
        return res.send({ nueva_lista, total_pedido, descuento_nuevo, ok: true });
    }
    else{
        //         error mandar info a usuario 
        return res.send({ nueva_lista, total_pedido, descuento_nuevo, ok: false,mensaje:'El descuento no pudo ser realizado, intentalo de nuevo.' });

    }
}



async function resumen_de_costos(lista, req) {
    return new Promise((resolve, reject) => {
        if (lista.length === 0) {
            resolve([]);
        }
        try {
            var resumen = [];
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];
                resumen.push({ id: element.producto._id, aplica_descuento: element.producto.aplica_descuento, nombre: element.producto.nombre, precio: element.producto.precio })
                if (i + 1 == lista.length) {
                    return resolve(resumen);
                }
            }
        } catch (error) {
            console.log(error);
            accesos.logActividad('pedidos/cambiar_descuento_de_pedido/error', req.user, error, req);
            reject();
        }
    })


}


//  Guardar en DB


async function guardar_en_db(id, lista, total_pedido, descuento_nuevo) {

    try {
        let update = { lista: lista, total_pedido: total_pedido, descuento: descuento_nuevo }
        //console.log(update);

        // resolve({ok:true});
        //return;
        Carrito.findByIdAndUpdate(id, update)
            .then((res) => {
                return res;
            })
    } catch (err) {
        console.log(err)
        return err;
    }

}



////   Sumar el total neto del pedido

function sumar_cantidades_dinero(lista) {
    return new Promise((resolve) => {
        //console.log('--------')
        //console.log(lista.length)
        let total_dinero = 0;
        if (lista == undefined) {
            total_dinero = 0;
            resolve(total_dinero);
            return;
        }
        if (lista.length == 0) {
            total_dinero = 0;
            resolve(total_dinero);
            return;
        }
        total_dinero = lista.reduce(
            (a, b) => +a + +b.producto.precio * +b.cantidad,
            0
        );

        resolve(total_dinero)
        return;
    });
}



function mutar_lista_con_descuento_nuevo(lista, folio, descuento_nuevo, req) {
    return new Promise(async (resolve, reject) => {
        ////console.log(lista.length);
        let nueva_lista_productos = [];
        let historial_precios_originales = [];
        let detalles = { num_productos: lista.length, num_afectados: 0, folio: folio }

        if (lista.length == 0) {
            resolve([]);
            return;
        }
        try {
            for (let i = 0; i < lista.length; i++) {
                const registro = lista[i];
                let producto_orig = await producto_original(registro.producto._id);
                //console.log(producto_orig.producto._id);
                //  sin descuento para productos que no aplica descuento de distribuidor
                let nuevo_precio = producto_orig.producto.precio;
                historial_precios_originales.push({ id: producto_orig.producto._id, nombre: producto_orig.producto.nombre, precio: producto_orig.producto.precio, aplica_descuento: producto_orig.producto.aplicar_descuento_distribuidor })
                //  PROMO es ?
                var es_promo = false ;
                if(registro.promo){
                    es_promo = registro.promo.con_promo;                        
                }
                //  Descontar en caso de que no cuente con esta propiedad en true
                if (producto_orig.producto.aplicar_descuento_distribuidor == true) {
                    //     NO ES PROMO , aplicar descuento 
                    if(es_promo ==false){
                        nuevo_precio = +producto_orig.producto.precio - (+producto_orig.producto.precio * +descuento_nuevo / 100);
                    }      
                }
                //console.log("indice "+i + " aplica descuento = "+ producto_orig.producto.aplicar_descuento_distribuidor);
                //console.log("original "+ producto_orig.producto.precio );
                //console.log(nuevo_precio);
                //let producto = JSON.parse(JSON.stringify(producto_orig.producto));
                //producto.precio = nuevo_precio;
                //console.log(nuevo_precio + "  <=== "+ producto_orig.producto.precio)
                let nuevo_registro = JSON.parse(JSON.stringify(registro));
                nuevo_registro.producto.precio = nuevo_precio;
                //nuevo_registro.aplica_descuento = producto_orig.producto.aplicar_descuento_distribuidor;
                detalles.num_afectados++;

                nueva_lista_productos.push(nuevo_registro);
                if (i + 1 == lista.length) {
                    //console.log(nueva_lista_productos.length)
                    //console.log(historial_precios_originales.length)
                    resolve({ nueva_lista_productos, historial_precios_originales, detalles });
                }
            }
        } catch (err) {
            console.log(err);
            accesos.logActividad('pedidos/cambiar_descuento_de_pedido/error', req.user, error, req);
            reject(err);
        }
    })
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




function producto_original(id_carrito) {
    return new Promise((resolve, reject) => {
        Producto.findById(id_carrito)
            .then((producto) => {
                resolve({ ok: true, producto });
            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err });
            })
    })
}


//      Devuelve exito:Boolean, contador: Int
async function descuento_aplicado_correctamente(lista_original, lista_nueva, descuento_nuevo) {
    let contador_base = 0;
    let contador_exito = 0;
    for (let i = 0; i < lista_original.length; i++) {
        contador_base++;
        const element = lista_original[i];
        const precio_correcto = element.precio - (element.precio * descuento_nuevo / 100);
        let exito = precio_correcto === lista_nueva[i].precio;
        if(element.aplica_descuento === false){
            exito = element.precio === lista_nueva[i].precio;
        }
        if (exito) contador_exito++;
        if (i + 1 === lista_original.length) {
            return { exito: contador_base === contador_exito, contador: contador_base };
        }
    }
}