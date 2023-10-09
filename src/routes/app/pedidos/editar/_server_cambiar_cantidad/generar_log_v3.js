import * as accesos from './../../../accesos';
import {devolver_producto_db} from "./devolver_producto_db";
import {devolver_carrito_db} from './devolver_carrito_db';

export async function generar_log_v3(producto_antes, cantidad_en_pedido_antes, cantidad_en_pedido_despues, carrito_db,breve_descripcion,req) {

    const folio_pedido = carrito_db.folio;
    const descuento = carrito_db.descuento;
    
    const nombre_cliente = carrito_db.cliente.nombre
    const cliente_id = carrito_db.cliente.id
    const producto_antes_de_cualquier_cambio_proceso = await devolver_producto_db(producto_antes._id)
    .catch((err)=>{
        let error_body = JSON.stringify(err);
        registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-generar_log_v3-productodb').catch(console.error)
    })
    if( producto_antes_de_cualquier_cambio_proceso.ok==false){
        res.send({ ok: false, mensaje: "El producto fue borrado y no se podra agregar." })
        return;
    }
   
    const producto_despues = producto_antes_de_cualquier_cambio_proceso.producto;
   
    const carrito_en_DB_proceso = await devolver_carrito_db(carrito_db._id)
    .catch((err)=>{
        let error_body = JSON.stringify(err);
        registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-generar_log_v3-carrito_en_DB').catch(console.error)        
    })    
    if(carrito_en_DB_proceso.ok !=true){
        res.send({ ok: false, mensaje: "Carrito ha sido borrado" })
        return;
    }
   
    const carrito_en_DB_despues= carrito_en_DB_proceso.carrito;
  
    const registro_en_carrito= carrito_en_DB_despues.lista.find((elem)=>JSON.stringify(elem.producto._id)== JSON.stringify( producto_antes._id))
   
    const producto_en_carrito =registro_en_carrito?registro_en_carrito.producto :null;

    const producto = await return_datos_producto(producto_antes, producto_despues, cantidad_en_pedido_antes, cantidad_en_pedido_despues, producto_en_carrito)
    const log = {
        folio:folio_pedido,
        descuento,
        cliente:nombre_cliente,
        cliente_id,
        breve_descripcion,
        producto
    }
   
    accesos.logActividad('carrito/cambiar_cantidad_v3/', req.user, log, req);
}

async function return_datos_producto(producto_antes, producto_despues, cantidad_en_pedido_antes, cantidad_en_pedido_despues, producto_en_carrito) {
    const apartados_antes = await sumar_cantidades_de_producto_apartado(producto_antes.carritos);
    const apartados_despues = await sumar_cantidades_de_producto_apartado(producto_despues.carritos);
    return {
        nombre: producto_antes.nombre,
        aplica: producto_antes.aplicar_descuento_distribuidor,
        p_original: producto_antes.precio,
        p_descuento: producto_en_carrito ? producto_en_carrito.precio : "borrado",
        c_en_pedido_a:cantidad_en_pedido_antes,//        cantidad en pedido antes
        c_en_pedido_d:cantidad_en_pedido_despues,//      cantidad en pedido despues
        id_producto: producto_antes._id,
        apartados_a:apartados_antes, //     apartados antes
        apartados_d:apartados_despues,//  apartadops despues
        existencias: producto_despues.existencia.actual,
        promo_id:""
    }
}



////   Sumar el total neto del pedido

async function sumar_cantidades_de_producto_apartado(carritos) {

    ////console.log(lista);
    ////console.log(lista.length);
    let cantidad = 0;
    if (carritos == undefined) {
        cantidad = 0;
        return cantidad;
    }
    if (carritos.length == 0) {
        cantidad = 0;
        return cantidad;
    }
    cantidad = carritos.reduce(
        (a, b) => +a + +b.cantidad,
        0
    );
    return cantidad;

}