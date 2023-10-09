import {Carrito} from "../../../models/carrito";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    let doc_post = req.body;
    let mensajeria= doc_post.mensajeria;
    Carrito.findByIdAndUpdate(doc_post.id,{mensajeria})
    .then(()=>{
        res.send({ok:true})
        return;
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false})
    })
}
  