//  Borra lo que tiene el carrito o pedido del cliente, en el modelo Carrito


export async function borrar_de_carrito_de_cliente_recalcular_total(id_producto, carrito_db ) {
    try {
        
        const lista_original_de_carrito = JSON.parse(JSON.stringify(carrito_db.lista));
        let lista_modificada_de_carrito = JSON.parse(JSON.stringify(lista_original_de_carrito));
        let registro_producto_temp = lista_original_de_carrito.find(element => JSON.stringify(element.producto._id) === JSON.stringify(id_producto));
        console.log("------------------------------------------------------------------")
        console.log(id_producto);
        console.log("----registro_producto_temp ------------------------**************")
        console.log(registro_producto_temp);
        //console.log("voy a filtrar producto con id ="+id);
        lista_modificada_de_carrito = lista_modificada_de_carrito.filter(element => element.producto._id != id_producto);
        console.log("----lista modificada  en carrito")
        console.log(lista_modificada_de_carrito); 
        carrito_db.lista = lista_modificada_de_carrito;
        carrito_db.total_pedido = await sumar_cantidades_dinero(lista_modificada_de_carrito);
        return carrito_db.save()
        .then((ress)=>{
            let cantidad = 0;
            if(registro_producto_temp!=undefined && registro_producto_temp!=null){
                cantidad =registro_producto_temp.cantidad
            }
            console.log(ress)
            return {ok:true,cantidad_anterior :cantidad , cantidad_despues:0};
        })
        
    } catch (err) {
        return {ok:false ,err};
    }
}



////   Sumar el total neto del pedido

async function sumar_cantidades_dinero(lista) {
   
        ////console.log(lista);

        ////console.log(lista.length);
        let total_dinero = 0;
        if (lista == undefined) {
            total_dinero = 0;
            
            return total_dinero ;
        }
        if (lista.length == 0) {
            total_dinero = 0;
            
            return total_dinero ;
        }
        total_dinero = lista.reduce(
            (a, b) => +a + (+b.producto.precio * +b.cantidad),
            0
        );
        
        return total_dinero ;
    
}
