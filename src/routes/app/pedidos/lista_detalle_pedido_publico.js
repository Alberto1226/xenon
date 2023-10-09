
//      Al abrir un pedido publico , se conulta este servicio para saber la coposicion de cada producto 

import { Producto } from './../../../models/producto';
import { Carrito_publico } from './../../../models/carrito_publico'
import mongoose from 'mongoose';
import * as accesos from './../accesos';

export async function post(req, res, next) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
console.log("------->>>>");
console.log(req.body);
    const body = req.body;
    if (!body.id) {


        return { ok: false, mensaje: "Error parsing Aj9980" }
    }

    //      Traer el carrito publico en cuestion
    let carrito_publico =  await retornar_carrito_publico(body.id)
    .catch((err)=>{
        console.log(err);
       return  res.send({ok:false,mensaje: "ha ocurrido un error , intentar mas tarde  error 411"})
    })
    //      realizar el query antes de mandarlo a mongo
    const query = await armar_query(carrito_publico.lista)
    //      traer la lista de productos desde DB
    const lista_de_productos = await obtener_productos_con_query_de_ids(query)
    .catch((err)=>{
        console.log(err);
        return res.send({ok:false,mensaje: "ha ocurrido un error , intentar mas tarde  error 412"})
    })
    //      combinar los datos y mandarlos a cliente
    const lista_combinada = await combinar_datos(carrito_publico.lista, lista_de_productos) 
        .catch((err)=>{
        console.log(err);
        return res.send({ok:false,mensaje: "ha ocurrido un error , intentar mas tarde  error 413"})
    })


    return res.send({ok:true,mensaje:'wtver',carrito_publico ,query,lista_de_productos,datos_combinados:lista_combinada})
}

function combinar_datos(lista_carrito, lista_productos) {
 //   Producto.find()

    return new Promise((resolve, reject)=>{
       try {
        let producto_en_carrito_nueva_lista =[];
        for (let i = 0; i < lista_carrito.length; i++) {
            var registro_en_carrito = JSON.parse(JSON.stringify(lista_carrito[i]));
            const producto_en_carrito = lista_carrito[i].producto;
            
            
            const producto_en_db = lista_productos.find(elem =>String(elem._id) == producto_en_carrito._id);
            registro_en_carrito.carritos = producto_en_db.carritos;
            //registro_en_carrito.carritos = "blabla";
            registro_en_carrito.existencias = producto_en_db.existencia.actual;
          
            producto_en_carrito_nueva_lista.push(registro_en_carrito);
            if(i+1 === lista_carrito.length){
                resolve(producto_en_carrito_nueva_lista);
            }
        }
       } catch (err) {
          
         reject(err);
       }
    })
    
}


///     juntar ids
async function armar_query(lista) {
    return new Promise((resolve, reject) => {
        try {
            var query = { $or: [] }
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];
                const producto = element.producto;
                query.$or.push({ _id: mongoose.Types.ObjectId(producto._id )});
                if (i + 1 == lista.length) {
                  
                    resolve(query);
                }
            }
        } catch (err) {
            console.log(err);
            reject(err)
        }
    })
}


async function retornar_carrito_publico(id) {
    return Carrito_publico.findById(id)
        .then((carrito_p) => {
            return carrito_p
        })
        .catch((err) => {
            return err
        })
}

async function obtener_productos_con_query_de_ids(query) {
    return Producto.find(query)
    .then((productos)=>{
        return productos;
    })
    .catch((err)=>{
        console.log(err)
        return err
    })
}