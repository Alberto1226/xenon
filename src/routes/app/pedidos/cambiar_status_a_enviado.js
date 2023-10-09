
//   Como superadmin crea productos
import {Carrito} from "../../../models/carrito";
import {Pedido} from "../../../models/pedido";
import * as accesos from "../accesos";

export async function post(req, res, next) {
  
  // //console.log(req.body);
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }


    
    
    let solicitud = req.body;
    //  CARRITO a CAMBIAR
     carrito_a_cambiar(solicitud.id).then((carrito_proceso)=>{
        let carrito = carrito_proceso.carrito;
         guardar_como_pedido(carrito).then((guardar_como_pedido_proceso)=>{
            accesos.logActividad('cambio_status_pedidos/enviado',req.user,{folio:carrito.folio,idcarrito:carrito._id},req);
             borrar_carrito(carrito).then((borrar_carrito_proceso)=>{
                res.send(({ok:true,}));
                return;
            })
            .catch((err)=>{
                console.log(err);
                res.send({ok:false,mensjae:'error al borrar carrito'});
                return;
            })
        })
        .catch((err)=>{
            console.log(err);
            res.send({ok:false,mensjae:'error al guardar resplado en pedidos'});
            return;
        })
    })
    .catch((err)=>{
        console.log(err);
        res.send({ok:false,mensjae:'error al encontrar el carrito'});
        return;
    })
   
    
    
        
   // const activo = req.body.activo;
  

}



function carrito_a_cambiar(id_carrito) {
    return new Promise((resolve,reject)=>{
     Carrito.findById(id_carrito)
     .then((carrito)=>{
         resolve({ok:true,carrito});
     })
     .catch((err)=>{
         console.log(err);
         reject({ok:false,err});
     })
    })
 }




 function guardar_como_pedido(carrito) {
   return new Promise((resolve , reject)=>{
    let pedido_temp = JSON.parse(JSON.stringify(carrito))
    pedido_temp.fecha_enviado = new Date();
    pedido_temp.status='Enviado';
    delete pedido_temp._id;
    delete pedido_temp.__v;
    var pedido_nuevo =  new Pedido(pedido_temp);
    pedido_nuevo.save()
    .then(()=>{
        resolve({ok:true,mensaje:"carrito editado"});
        return;
    })
    .catch((err)=>{
        console.log(err);
        reject({ok:false})
            return;
    })    
   })
 }



 function borrar_carrito(carrito) {
    return new Promise((resolve , reject)=>{
    Carrito.findByIdAndDelete(carrito._id)
     .then(()=>{
         resolve({ok:true,mensaje:"carrito borrado"});
         return;
     })
     .catch((err)=>{
         //console.log(err);
         reject({ok:false})
             return;
     })    
    })
  }