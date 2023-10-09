
//   Editar usuarios desde superadmin
import { Producto } from '../../../../models/producto';
import * as accesos from '../../accesos';
import * as fs from "fs";

export function post(req, res, next) {    
    
    if(accesos.esta_logueado(req)===false){
        res.send({ok:false,mensaje:"sesion expirada"})
        return;
    }
    accesos.logActividad('productos/editar/borrar_imagen_de_producto',req.user,{},req);
   
    var producto_editado = req.body.producto_editado;
    delete producto_editado.fh_creado;
    var imagen_a_borrar = req.body.imagen_a_borrar;
    /*console.log("imagen a borrar = "+ imagen_a_borrar);
   //console.log("producto_editado= ");
   //console.log(producto_editado);*/
    
    fs.unlink("static/" +imagen_a_borrar, (err) => {
        if (err) console.log(err);
       //console.log(imagen_a_borrar+'fue borrado');
      });
    Producto.findByIdAndUpdate(producto_editado._id, producto_editado, (err, dbdoc) => {
        if (err) {
            console.log(err);
            res.send({ ok: false, mensaje: "Ocurrio un erro al editar el producto" })
            return;
        }
        //console.log('Producto editado , imagen borrada!');
        res.send({ ok: true, mensaje: "Producto editado , se ha borrado una imagen." });
    })
}
