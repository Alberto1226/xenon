//      CAmbia el status de un producto a fue_agregado_a_un_pedido
//      dicho producto se encuentra dentro de un pedido publico

import {Carrito_publico} from "../../../../models/carrito_publico";
import * as accesos from "../../accesos";

export async function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    let doc_post = req.body;
    let producto_agregado= doc_post.producto_agregado;
    let id_carrito= doc_post.id_carrito;
    console.log("actualizar ----***>>>");
    console.log({id_carrito});
    Carrito_publico.findById(id_carrito)
    .then((carrito_DB)=>{
        console.log(carrito_DB);
        const lista_nueva = JSON.parse(JSON.stringify(carrito_DB.lista));
        const producto_a_cambiar = lista_nueva.find(elem=> elem.producto._id ==producto_agregado._id )
        producto_a_cambiar.fue_agregado_a_un_pedido = true;
        carrito_DB.lista = lista_nueva;
        carrito_DB.save()
        .then(()=>{
            res.send({ok:true})
            return;
        })       
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false})
    })
}
  