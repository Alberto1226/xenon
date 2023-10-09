//      Borra lo apartado dentor del modelo de Producto

import {devolver_producto_db} from './devolver_producto_db';

export async function borrar_apartado_en_producto(id_producto, cliente_id ) {
    try {
        const producto_proc = await devolver_producto_db(id_producto)
        if(producto_proc.ok ===false){
            return {ok:false}
        }
        const producto =producto_proc.producto ;
        const lista_original_carritos = JSON.parse(JSON.stringify(producto.carritos));
        let lista_modificada_carritos = JSON.parse(JSON.stringify(lista_original_carritos));
        console.log("----lista original")
        console.log(lista_original_carritos);
        console.log("voy a filtrar clinete con id"+cliente_id);
        lista_modificada_carritos = lista_modificada_carritos.filter(element => element.cliente.id != cliente_id);
        console.log("----lista modificada")
        console.log(lista_modificada_carritos); 
        producto.carritos = lista_modificada_carritos;
        return producto.save()
        .then((ress)=>{
            console.log(ress)
            return {ok:true};
        })
        
    } catch (err) {
        throw err       
    }
}