export async function producto_en_carrito(carrito, id_producto){
    const lista = carrito.lista;
    if(!lista){
        throw {mensaje:"No existia la variable lista en el carrito" , fn:'ya_existe_en_carrito'}
    }
    let producto = lista.find(element => JSON.stringify(element.producto._id) === JSON.stringify(id_producto)); 

    return producto;
    console.log("--------------------------***************************")
    console.log(producto);
    console.log("--------------------------***************************")
}

