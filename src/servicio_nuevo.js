
import { Cliente } from './models/cliente'
import { Producto } from './models/producto'
import { Carrito_cancelado } from './models/carrito_cancelado'
import { Carrito } from './models/carrito'
import { Pedido } from './models/pedido'
import { Cliente_preaprobado } from './models/cliente_preaprobado'
import { Ficha_de_descuento } from './models/ficha_de_descuento'
import { Inyeccion } from './models/inyeccion'
import { Inyeccion_historica } from './models/inyeccion_historica'
import { Log } from './models/log'
import { Usuario } from './models/usuario'
import { Producto_snaplog } from './models/producto_snaplog'


export async function inicializacion_completa() {
    console.log("Inicializando DB ");

    console.log("Borrare clientes ");
    let borrado_de_clientes =await  reiniciar_clientes()
    console.log({borrado_de_clientes});

    console.log("Borrare clientes preaprobados ");
    let borrado_de_clientes_preaprobados =await  reiniciar_clientespreaprobados()
    console.log({borrado_de_clientes_preaprobados});

    console.log("Borrare usuarios");
    let borrado_de_usuarios =await  reiniciar_usuarios()
    console.log({borrado_de_usuarios});

    console.log("Borrare  pedidos");

    let borrado_de_pedidos=await  reiniciar_pedidos()
    console.log({borrado_de_pedidos});

    console.log("Borrare existencias y dejare productos");
    let borrado_de_productos=await  reiniciar_productos()
    console.log({borrado_de_productos});


    console.log("Borrare pedidos cancelados");
    let borrado_de_cancelados=await  reiniciar_cancelados()
    console.log({borrado_de_cancelados});


    console.log("Borrare carritos");

    let borrado_de_carritos=await  reiniciar_carritos()
    console.log({borrado_de_carritos});


    console.log("Borrare carritos apartados");
    let borrado_de_carritos_carritos=await  reiniciar_productos_carritos()
    console.log({borrado_de_carritos});




    console.log("Borrare fichas");
    let borrado_de_fichas=await  reiniciar_fichas()
    console.log({borrado_de_fichas});


    console.log("Borrare logs");
    let borrado_de_logs=await  reiniciar_logs()
    console.log({borrado_de_logs});


    console.log("Borrare productos snaplogs");
    let borrado_de_snaplogs=await  reiniciar_snaplogs()
    console.log({borrado_de_snaplogs});



    console.log("Borrare inyecciones e inyecciones historicas");
    let borrado_de_inyecciones=await  reiniciar_inyecciones()
    let borrado_de_inyeccioneshistoricas=await  reiniciar_inyeccioneshistoricas()
    console.log({borrado_de_inyecciones});

    
}


async function reiniciar_inyecciones() {
    return Inyeccion.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}

async function reiniciar_inyeccioneshistoricas() {
    return Inyeccion_historica.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}

async function reiniciar_clientes() {
    return Cliente.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function reiniciar_clientespreaprobados() {
    return Cliente_preaprobado.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}

async function reiniciar_usuarios() {
    return Usuario.deleteMany({usuario:{$not:{$in:["isotech_Xenonymas","isotech_vendedor","isotech_gerente","isotech_vendedor","almacen","gerente"]}}}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}


async function reiniciar_pedidos() {
    return Pedido.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function reiniciar_productos() {
    return Producto.updateMany({},{$set:{existencia:{actual:0,minimo:0,maximo:0,folios:[]}}}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function reiniciar_productos_carritos() {
    return Producto.updateMany({},{$set:{carritos:[]}}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function reiniciar_cancelados() {
    return Carrito_cancelado.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function reiniciar_carritos() {
    return Carrito.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function reiniciar_fichas() {
    return Ficha_de_descuento.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}


async function reiniciar_logs() {
    return Log.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}


async function reiniciar_snaplogs() {
    return Producto_snaplog.deleteMany({}).then(()=>{
        return {ok:true}
    }).catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}