
//   Como superadmin crea productos
import { Promocion } from "../../../models/promocion";
import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

export async function post(req, res, next) {

    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    /*if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    */


   if (accesos.tiene_permisos_administrativos(req) === false) {
    res.send({ ok: false, mensaje: "sesion expirada" })
    return;
}

const id_promocion = req.body.id_promocion;

const id_producto = req.body.id_producto;

    //const activo = req.body.activo;
    //console.log('activo='+activo);
    accesos.logActividad('promociones/borrar_una', req.user, JSON.stringify(req.body), req);
    var borrada_detalle={
        usuario:{
            id: req.user._id,
            nombre:req.user.nombre
        },
        fecha:Date.now()
    }
    Promocion.findByIdAndUpdate(id_promocion,{borrada:true,borrada_detalle,activa:false})
        .then((resultado_promo) => {
            let promo={
                id_promocion:'',
                precio:0,
                tiene_promo:false,
                tipo_condicion:0
            }
            
            Producto.findByIdAndUpdate(id_producto,{promo})
            .then((resultado_producto)=>{
                
                res.send({ ok: true, mensaje: "Promo borrada de forma correcta." });
                return;
            })            
        })
        .catch((err) => {
            console.log(err);
            res.send({ ok: false })
            return;
        })

}