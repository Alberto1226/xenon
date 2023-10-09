import { Promocion } from "./../../../../models/promocion";
import {devolver_producto_db} from "./../../pedidos/editar/_server_cambiar_cantidad/devolver_producto_db";
import {registrar_error} from "./../../pedidos/editar/_server_cambiar_cantidad/registrar_error";
import * as accesos from "./../../accesos";
import { Producto } from "../../../../models/producto";

export async function post(req,res,next) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Permisos insuficientes" })
        return;
    }
//      PArametros que espera este serivicio
    const body = req.body;
    console.log(body);
    const id= body.producto.id;
    const user= req.user;
    const producto= body.producto;
    const precio_promo= body.precio_promo;
    const tipo_condicion= body.tipo_condicion;
    const condiciones= body.condiciones;
    //   Obtener el producto de DB
    const productoDB_proceso = await  devolver_producto_db(producto.id)
    if(productoDB_proceso.ok==false){
        res.send({ok:false,mensaje:"El producto ya no existe"})
        return;
    }

    const productoDB = productoDB_proceso.producto;

    //  Crear la promocion
    const promo_creada_proceso =  await crear_promocion(precio_promo,tipo_condicion ,condiciones,productoDB,user);
    if(promo_creada_proceso.ok==false){
        res.send({ok:false,mensaje:"Error al crear la promocion Error 1"})
        return;
    }
    const promo_creada = promo_creada_proceso.promocion
    //console.log(promo_creada_proceso)

    const editar_producto_proceso = await editar_producto(productoDB, precio_promo ,tipo_condicion ,promo_creada._id )
    if(editar_producto_proceso.ok==false){
        res.send({ok:false,mensaje:"Error al crear la promocion Error 2"})
        return;
    }

    return res.send({ok:true})

}

//      Edita el producot para que tenga en su prop promo , los datos mas necesarios de la promo
async function editar_producto(productoDB , precio_promo, tipo_condicion, id_promocion) {
    productoDB.promo.tiene_promo = true;
    productoDB.promo.precio =precio_promo;
    productoDB.promo.tipo_condicion =tipo_condicion;
    productoDB.promo.id_promocion =id_promocion;
    return productoDB.save()
    .then((resultado)=>{
        console.log(resultado);
        return {ok:true}
    })
    .catch((err)=>{
        console.log(err);
        let error_body = JSON.stringify(err);
        registrar_error(error_body , 'promociones/nueva-editar_producto').catch(console.error) 
        return {ok:false};
    })
}




/**
 * promo:{
        tiene_promo: { type: Boolean, default: false },
        precio: { type: Number, default: 0 },//    precio del prodcuto con promocion
        tipo_condicion :{ type: Number, default: 0 },//    1: Sin condicion, 2: minimo de el mismo producto, 3: Minimo de combo
        id_promocion: { type: String, default: "" },//    id de la promocion, nunca se debe de borrar las promos solo virtualmente
    }
 */

//      Devuelve el id de la promo creada
async function crear_promocion(precio,tipo_condicion,condiciones,producto,user) {
    try {
        let nueva_promo_tmp ={
            precio,tipo_condicion,condiciones,producto:{
                id: producto._id,
                nombre:producto.nombre,
                codigo:producto.codigo
            },
            creacion:{
                usuario:{
                    id:user._id,
                    nombre:user.nombre
                }
            }
        }
        const nueva_promo = Promocion(nueva_promo_tmp);
        return nueva_promo.save()
        .then((promocion)=>{
            return {ok:true,promocion}
        })
    } catch (err) {
        console.log(err)
        let error_body = JSON.stringify(err);
        registrar_error(error_body , 'promociones/nueva-promo_nueva').catch(console.error) 
        return {ok:false,resultado:null}
    }
}


/**
 *  precio: { type: Number, default: 0 },//    precio del prodcuto con promocion
    tipo_condicion :{ type: Number, default: 0 },//    1: Sin condicion, 2: minimo de el mismo producto, 3: Minimo de combo
    condiciones :[],
    //      PRODUCTO con promocion
    producto:{
            id:{type:String , default:""},
            nombre:{type:String , default:""},
            codigo:{type:String , default:""},
    },
    //      DAtos de Creacion
    creacion:{
        fecha:{type:Date, default :Date.now},
        usuario:{
            id:{type:String, default :""},
            nombre:{type:String, default :""}
        }
    },
 */


