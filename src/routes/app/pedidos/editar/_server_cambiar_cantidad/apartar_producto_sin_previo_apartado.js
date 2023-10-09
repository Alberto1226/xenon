//      Borra lo apartado dentor del modelo de Producto

import {devolver_producto_db} from './devolver_producto_db';

export async function apartar_producto_sin_previo_apartado(id_producto,cantidad, cliente_como_en_carrito ,folio) {
    try {
        const producto_proc = await devolver_producto_db(id_producto)
        if(producto_proc.ok ===false){
            return {ok:false}
        }
        const producto =producto_proc.producto ;
        const lista_original_carritos = JSON.parse(JSON.stringify(producto.carritos));
        let lista_modificada_carritos = JSON.parse(JSON.stringify(lista_original_carritos));
        
        lista_modificada_carritos.push({
            cantidad,
            folio,
            fecha:new Date(),
            cliente:{
                id:cliente_como_en_carrito.id,
                nombre:cliente_como_en_carrito.nombre,
                correo:cliente_como_en_carrito.correo,
            }
        })
        //lista_modificada_carritos = lista_modificada_carritos.filter(element => element.cliente.id != cliente_id);
     
        producto.carritos = lista_modificada_carritos;
        return producto.save()
        .then((ress)=>{
            console.log(ress)
            return {ok:true};
        })
        
    } catch (err) {
        return {err , ok:false}       
    }
}