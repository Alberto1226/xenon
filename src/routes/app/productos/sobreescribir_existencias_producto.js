
import * as accesos from "../accesos";
import { loop_guard } from "svelte/internal";
import * as fs from "fs";
import { Producto } from "../../../models/producto";
import {snap_por_cambio_en_pedido} from './../pedidos/editar/_producto_snaplogs/snap_por_cambio_en_pedido';
import {devolver_producto_db} from './../pedidos/editar/_server_cambiar_cantidad/devolver_producto_db';
//var ba64 = require("ba64")
//if (id.match(/^[0-9a-fA-F]{24}$/)) {
// Yes, it's a valid ObjectId, proceed with `findById` call.
//}
export async function post(req, res, next) {


    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    
    let id = req.body.id;
    let existencia_nueva = req.body.existencia;
    //console.log(existencia_nueva)
    //return
    let previa = await existencia_previa(id);
    const proceso_devolver_producto_db =  await devolver_producto_db(id);
    
    accesos.logActividad('productos/editar/modificar_existencias_desde_listas',req.user,{previa,existencia_nueva,id},req);

    Producto.findByIdAndUpdate(id,{'existencia.actual' : existencia_nueva})
    .then(async(respuesta)=>{

        res.send({ok:true})

        
        if(proceso_devolver_producto_db.ok==false)return
        const producto_db = proceso_devolver_producto_db.producto;
        const snap_proceso = await snap_por_cambio_en_pedido({nombre:producto_db.nombre,id:producto_db._id},
            {nombre:req.user.nombre, id:req.user._id},
            existencia_nueva, 
            previa.existencia_previa,
            "3",  //  3:Sobre-escribir inventario
            { folio:"",cliente:{nombre:""}},
            producto_db
        )
        console.log(snap_proceso);

        
    })    
    .catch((err)=>{
        console.log(err);
        
        res.send({ok:false})
    })

}

function existencia_previa(id){
    return new Promise((resolve,reject)=>{
        Producto.findById(id).then((producto)=>{
            resolve({nombre:producto.nombre,existencia_previa:producto.existencia.actual});
        })
        .catch((err)=>{
            console.log(err);
            reject();
        })
    })
}


/*



const snap_proceso = await snap_por_cambio_en_pedido({nombre:producto_constante.nombre,id:producto_constante._id},
    {nombre:req.user.nombre, id:req.user._id},
    registro.cantidad, 
    cantidad_anterior,
    snap_tipo_Accion,  //
    { folio:resultado.folio,cliente:{nombre:resultado.cliente.nombre,id:resultado.cliente.id}},
    producto_constante                
)
*/