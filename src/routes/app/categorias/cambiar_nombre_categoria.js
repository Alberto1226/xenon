import {Producto} from '../../../models/producto';
import {Categoria} from '../../../models/categoria';
import {Carrito} from '../../../models/carrito';
import {Pedido} from '../../../models/pedido';
import * as accesos from "../accesos";

export async function post(req, res) {

    //  Checar si es correcto lo que se recibe
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) == false && accesos.tiene_permisos_gerenciales(req) == false) {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }

  //checar que la categoria no exista 
    let nuevo_nombre =  req.body.nuevo_nombre;
    let nombre_anterior =  req.body.nombre_anterior;
    let id =  req.body.id;
    let no_existe_una_igual =await categoria_no_existe(nuevo_nombre);
    if(no_existe_una_igual===false){
        res.send({ok:false,mensaje:'Ya existe otra categoría con ese nombre'})
        return
    }

    const proceso_cambiar_productos = await cambiar_categoria_en_productos(nuevo_nombre, nombre_anterior)  // cambiar nombre en Producto
    const proceso_cambiar_nombre =await cambiar_nombre(nuevo_nombre,id);//  nombre en Categoria
    const proceso_cambiar_nombre_en_carritos =await cambiar_categoria_en_producto_carritos(nombre_anterior,nuevo_nombre);//  nombre en Categoria
    const proceso_cambiar_nombre_en_pedidos =await cambiar_categoria_en_producto_pedido(nombre_anterior,nuevo_nombre);//  nombre en Categoria
    res.send(proceso_cambiar_nombre)

}


const cambiar_nombre=(nombre,id)=>{
    return new Promise((resolve,reject)=>{
        Categoria.findByIdAndUpdate(id,{descripcion:nombre})
        .then((res)=>{
           // console.log(res)
            resolve({ok:true})
        })
        .catch((err)=>{
            console.log(err)
            reject({ok:false});
        })
    })
}




const cambiar_categoria_en_productos=(nombre,nombre_anterior)=>{
    return new Promise((resolve,reject)=>{
        //console.log({'subcategoria.nombre':nombre_anterior})
        Producto.updateMany({'subcategoria.nombre':nombre_anterior},{'subcategoria.nombre':nombre})
        .then((res)=>{
            //console.log(res)
            resolve({ok:true})
        })
        .catch((err)=>{
            console.log(err)
            reject({ok:false});
        })
    })
}

const categoria_no_existe=(nombre)=>{
    return new Promise((resolve,reject)=>{
        Categoria.find({descripcion:nombre})
        .then((res)=>{
           // console.log(res)
            resolve(res.length===0)
        })
        .catch((err)=>{
            reject(err);
        })
    })
}





const cambiar_categoria_en_producto_carritos = (nombre_anterior, nuevo_nombre) => {
    return new Promise((resolve, reject) => {
       //console.log({producto_id, categoria_nueva})
      //console.log({'lista.producto._id':new ObjectId(producto_id)})
        //console.log({'subcategoria.nombre':nombre_anterior})
        Carrito.updateMany({'lista.producto.subcategoria.nombre':nombre_anterior}, { 'lista.$.producto.subcategoria.nombre': nuevo_nombre })
            .then((res) => {
                 //console.log(res)
                resolve({ ok: true })
            })
            .catch((err) => {
                console.log(err)
                reject({ ok: false });
            })
    })
}


const cambiar_categoria_en_producto_pedido = (nombre_anterior, nuevo_nombre) => {
    return new Promise((resolve, reject) => {
       //console.log({producto_id, categoria_nueva})
        //console.log({'lista.producto._id':new ObjectId(producto_id)})
        //console.log({'subcategoria.nombre':nombre_anterior})
        Pedido.updateMany({'lista.producto.subcategoria.nombre':nombre_anterior}, { 'lista.$.producto.subcategoria.nombre': nuevo_nombre })
            .then((res) => {
                 //console.log(res)
                resolve({ ok: true })
            })
            .catch((err) => {
                console.log(err)
                reject({ ok: false });
            })
    })
}