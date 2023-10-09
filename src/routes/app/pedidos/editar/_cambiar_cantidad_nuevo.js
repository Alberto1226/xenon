
import {Producto} from '../../../../models/producto';
import * as accesos from '../../accesos';
import {Carrito} from '../../../../models/carrito';
import {devolver_carrito_db} from './_server_cambiar_cantidad/devolver_carrito_db';
import {registrar_error} from './_server_cambiar_cantidad/registrar_error';
import {producto_en_carrito} from './_server_cambiar_cantidad/producto_en_carrito';
import { borrar_apartado_en_producto } from './_server_cambiar_cantidad/borrar_apartado_en_producto';
import { borrar_de_carrito_de_cliente_recalcular_total } from './_server_cambiar_cantidad/borrar_de_carrito_de_cliente_recalcular_total';
import {devolver_producto_db} from "./_server_cambiar_cantidad/devolver_producto_db";
import {generar_log_v3} from './_server_cambiar_cantidad/generar_log_v3';
import {suficientes_productos} from './_server_cambiar_cantidad/suficientes_productos';
import {apartar_producto_sin_previo_apartado} from "./_server_cambiar_cantidad/apartar_producto_sin_previo_apartado";
import {agregar_a_carrito_recalcular_total_sin_previo} from './_server_cambiar_cantidad/agregar_a_carrito_recalcular_total_sin_previo';


export async function post(req,res,next){
    //  1 Solo autoriza a usuairos logueados
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    //  2 Espera dos parametrs id y registro:{cantidad , producto}
    const registro = req.body.registro;
    const id_carrito = req.body.id_carrito;
    
    
    const cantidad_parametro_validacion = registro.cantidad ===0 ?"cero":registro.cantidad;
    
    if (!registro || !id_carrito || !cantidad_parametro_validacion || !registro.producto) {
        res.send({ ok: false, mensaje: "Error 4097" })
        return;
    }
    //  3  Usar devolver_carrito_db() para recibir registro del carrito y checar  que aun exista y su status no sea Envío. Pues en ese punto ya se cierra el carrito.
    const carrito_en_DB_proceso = await devolver_carrito_db(id_carrito)
    .catch((err)=>{
        let error_body = JSON.stringify(err);
        registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-carrito_en_DB').catch(console.error)        
    })    
    if(carrito_en_DB_proceso.ok !=true){
        res.send({ ok: false, mensaje: "Carrito ha sido borrado" })
        return;
    }
    
    const carrito_en_DB= carrito_en_DB_proceso.carrito;
    const producto_antes_de_cualquier_cambio_proceso = await devolver_producto_db(registro.producto._id)
    .catch((err)=>{
        let error_body = JSON.stringify(err);
        registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-producto_antes_de_cualquier_cambio_proceso').catch(console.error)
    })
    if( producto_antes_de_cualquier_cambio_proceso.ok==false){
        res.send({ ok: false, mensaje: "El producto fue borrado y no se podra agregar." })
        return;
    }
    //  Esto sirve para el log final , para registrar de forma fidedigna el cambio en el producto.
    const producto_antes_de_cualquier_cambio = producto_antes_de_cualquier_cambio_proceso.producto;
    
    //  4 Si se va a borrar el producto llamar borrar_producto_de_pedido
    //  BORRAR DE PEDIDO
    if(registro.cantidad ===0){
        
        //      proceso borrar de apartados dentro del modelo producto
        const proceso_borrar_apartados_en_producto= await borrar_producto_de_pedido(req,res,id_carrito,registro,carrito_en_DB)
        .catch((err)=>{
            let error_body = JSON.stringify(err);
            registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-borrar_producto_de_pedido').catch(console.error)            
        })
        
        if(proceso_borrar_apartados_en_producto.ok !=true ){
            res.send({ ok: false, mensaje: "No se ha podido realizar el cambio de cantidad del producto, en el pedido" })
            return;
        }
        //      El producto se ha borrado de apartados dentro del modelo del producto de forma correcta
        //      Borrar de lista de carrtio de cliente
        const proceso_borrar_de_carrito = await borrar_de_carrito_de_cliente_recalcular_total(registro.producto._id,carrito_en_DB);
        
        if(proceso_borrar_de_carrito.ok==false){
            return res.send({ok:false, mensaje:"No se ha podido completar la operacion , se ha borrado de los apartados, pero no de el pedido del cliente"});            
        }
        const cantidades = {cantidad_anterior:proceso_borrar_de_carrito.cantidad_anterior,
        cantidad_despues :proceso_borrar_de_carrito.cantidad_despues}
        generar_log_v3(producto_antes_de_cualquier_cambio,cantidades.cantidad_anterior,cantidades.cantidad_despues,carrito_en_DB, "Se borraró del pedido" ,req)
        res.send({ ok: true })
        return;
    }

    

    const producto_en_pedido = await producto_en_carrito(carrito_en_DB ,producto_antes_de_cualquier_cambio._id )
    //      Si el producto no existia en el carrito 
    if(producto_en_pedido== undefined){
        
        //      Checar suficiencia de producto , entre existencia actual y apartados
        const {suficientes,total_reservado,existencias,disponibles} = await suficientes_productos(producto_antes_de_cualquier_cambio._id,registro.cantidad);
        //      esperamos una respuesta {suficientes,total_reservado,existencias,disponibles};
        
        if(suficientes ==false){
            return res.send({ok:false ,mensaje:"No existen suficientes piezas del producto : "+producto_antes_de_cualquier_cambio.nombre +
            " disponibles:"+disponibles +" solicitadas:" +registro.cantidad});
        }
        //  apartar producto
        const proceso_apartado = await apartar_producto_sin_previo_apartado(producto_antes_de_cualquier_cambio,registro.cantidad ,carrito_en_DB.cliente,carrito_en_DB.folio)
        .catch((err)=>{
            let error_body = JSON.stringify(err);
            registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-linea 105');
        })
        if(proceso_apartado.ok ==false){
            let error_body = JSON.stringify(proceso_apartado.err);
            registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-linea 109');
            return res.send({ok:false ,mensaje:"No se ha podido apartar el producto"});
        }
        const proceso_agregar_a_carrito = await agregar_a_carrito_recalcular_total_sin_previo(producto_antes_de_cualquier_cambio,registro.cantidad, carrito_en_DB)
        .catch((err)=>{
            let error_body = JSON.stringify(err);
            registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-linea 116');
        })
        if(proceso_agregar_a_carrito.ok ==false){
            let error_body = JSON.stringify(proceso_agregar_a_carrito.err);
            registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-linea 120');
            return res.send({ok:false ,mensaje:"Se pudo apartar, pero no se ha podido agregar el producto al pedido "+ carrito_en_DB.folio});
        }
    } //    Se el producto ya existia en el carrito
    else{
        console.log("----- SI existia en carrito ");
    }


}



async function borrar_producto_de_pedido(req,res,id,registro,carrito_en_DB) {
    //  checar que el producto aun este apartado en el carrito antes de continuar
    const registro_en_carrito = carrito_en_DB.lista.find(element => JSON.stringify(element.producto._id) === JSON.stringify(registro.producto._id));
    console.log("borrar producto-1----->")
    console.log({registro_en_carrito:!registro_en_carrito})
    //      si ya fue eliminado no continuar con la accion
    if(!registro_en_carrito){
        console.log("wtf")
        return {ok:false, mensaje:'El producto ya habia sido eliminado'};
    }
    let  cliente_id= carrito_en_DB.cliente.id
    console.log("dentro de borrar -sss-->")
    console.log(registro_en_carrito.producto._id)
    const resultado = await borrar_apartado_en_producto(registro_en_carrito.producto._id,cliente_id)
    .catch((err)=>{
        console.log(err)
        let error_body = JSON.stringify(err);
            registrar_error(error_body , 'pedidos/editar/cambiar_cantidad_nuevo-borrar_producto_de_pedido').catch(console.error)
            //
            throw err
    })
    console.log("dentro de borrar --->")
    return resultado


}


