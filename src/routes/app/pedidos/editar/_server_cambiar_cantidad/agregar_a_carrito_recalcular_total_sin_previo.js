//  Borra lo que tiene el carrito o pedido del cliente, en el modelo Carrito


export async function agregar_a_carrito_recalcular_total_sin_previo(producto_original,cantidad, carrito_db ) {
    try {
        
        const lista_original_de_carrito = JSON.parse(JSON.stringify(carrito_db.lista));
        let lista_modificada_de_carrito = JSON.parse(JSON.stringify(lista_original_de_carrito));
        let registro_producto_temp = lista_original_de_carrito.find(element => JSON.stringify(element.producto._id) === JSON.stringify(id_producto));
        
        const cantidad_original = JSON.parse(JSON.stringify(registro_producto_temp.cantidad) )
       // console.log(registro_producto_temp);
        //console.log("voy a filtrar producto con id ="+id);
        lista_modificada_de_carrito.push({
            cantidad,            
            fecha:Date.now(),
            producto:producto_original
        })
       
        carrito_db.lista = lista_modificada_de_carrito;
        carrito_db.total_pedido = await sumar_cantidades_dinero(lista_modificada_de_carrito);
        return carrito_db.save()
        .then((ress)=>{
            let cantidad = 0;
            if(registro_producto_temp!=undefined && registro_producto_temp!=null){
                cantidad =registro_producto_temp.cantidad
            }
          
            return {ok:true,cantidad_anterior :cantidad_original , cantidad_despues:cantidad};
        })
        
    } catch (err) {
        console.log(err)
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
