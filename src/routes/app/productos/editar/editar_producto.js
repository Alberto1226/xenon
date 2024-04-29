
import * as accesos from "../../accesos";
import { loop_guard } from "svelte/internal";
import * as fs from "fs";
import { Producto } from "../../../../models/producto";
import {devolver_producto_db} from './../../pedidos/editar/_server_cambiar_cantidad/devolver_producto_db';

//var ba64 = require("ba64")
//if (id.match(/^[0-9a-fA-F]{24}$/)) {
// Yes, it's a valid ObjectId, proceed with `findById` call.
//}
export async function post(req, res, next) {


    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
  
    var archivos = req.body.archivos;
    var numero_archivos = archivos.length;
    var producto = req.body;
    const producto_const_proceso = await devolver_producto_db(producto._id);
    if(producto_const_proceso.ok==false){
        return res.send({ok:false,message: "El producto ya no existe"})
    }
    const producto_const = JSON.parse(JSON.stringify(producto_const_proceso.producto))
    //      evitar sobreescribir existencia actual
    producto.existencia.actual = producto_const.existencia.actual;
    
    accesos.logActividad('productos/editar/editar_un_producto='+producto.nombre,req.user,producto,req);


   //console.log("archivos = " + archivos.length)
    //var fecha_prefix = new Date();
    //var terminacion = ".png";

    //var cabecera_base64 = archivos[0].base64.slice(0, 60);
    var url = "static/productos/"
    // var url_pub = "productos/"
    var url_pub = "Xenon-pruebas/static/productos/"
    var contador_errores = 0;
    var archivos_guardados = 0;
    var galeria_imagenes = [];


    if (archivos.length == 0) {

        delete producto.archivos;
        //  //console.log("hola");
        // producto.galeria_imagenes = [];
        producto.fh_creado = new Date();
        const id_producto = producto._id;
        delete producto._id;
//console.log("id_producto"+id_producto);
  //      console.log("---|||||||||||||||||||||||||||||");
    //    console.log(producto);            
        var nuevo_producto = new Producto(producto);
        Producto.findByIdAndUpdate(id_producto,producto)
            .then(() => {
                res.send({ ok: true, message: "Producto editado", producto: nuevo_producto });
               //console.log("Todo bien");
                return;
            })
            .catch((err) => {
                console.log(err);

                res.send({ ok: false, message: "Ocurrio un error al editar el producto.", err: err })
                return;
            })
          
    }
    else {
        archivos.forEach((element, i) => {
            procesar_base64(element, (ok, terminacion, base) => {
                if (ok == false) {
                    contador_errores++;
                }
                else {

                    var nombre_archivo = new Date().getTime().toString();
                    //console.log(base.split(0,50));
                    var nombre = url + nombre_archivo + i + terminacion;
                    var url_publico = url_pub + nombre_archivo + i + terminacion;
                    fs.writeFile(nombre, base, { encoding: 'base64' }, (err) => {
                        if (err) {
                            contador_errores++;
                            console.log(err);
                        }
                        archivos_guardados++;
                       //console.log("archivos_guardados=" + archivos_guardados)
                       //console.log("i = " + i)
                        galeria_imagenes.push(url_publico)
                       //console.log(galeria_imagenes)
                        if ((i + 1) == numero_archivos) {
                           //console.log("Finalizando--------------");
                            // termina el ciclo****************
                            var guardados_todos = archivos_guardados === archivos.length;
                           //console.log("i= " + i);

                           //console.log("archivos_guardados=" + archivos_guardados);
                           //console.log("archivos.length=" + archivos.length);
                           //console.log("guardados_todos=" + guardados_todos);
                           //console.log("numero_archivos =" + numero_archivos);

                            if (contador_errores > 0) {
                                //error al guardar el archivo
                               //console.log("teta");
                                res.send({ ok: false, message: "Ocurrio un erro al guardar un archivo. archivos_guardados " + archivos_guardados + " archivos length = " + archivos.length });
                                return;
                            }
                            else {
                                producto = req.body
                                delete producto.archivos;
                               //console.log("hola");
                                producto.galeria_imagenes = galeria_imagenes;
                                producto.fh_creado = new Date();
                                let id_original= producto._id
                                delete producto._id;
                               //console.log(producto);
                                
                                Producto.findByIdAndUpdate(id_original,producto)
                                .then(() => {
                                    res.send({ ok: true, message: "Producto editado", producto: nuevo_producto });
                                   //console.log("Todo bien");
                                    return;
                                })
                                .catch((err) => {
                                    console.log(err);
                    
                                    res.send({ ok: false, message: "Ocurrio un error al editar el producto.", err: err })
                                    return;
                                })
                            }
                        }
                    })
                } // else de no error en base64
            });
        });


    }




    //console.log(req.body);
    // res.send({ ok: true })
    function procesar_base64(archivo, cp) {
        var cabecera = archivo.base64.slice(0, 60);
        var terminacion = "";
        var base_puro = "";
        var ok = true;
        if (cabecera.search("image/jpeg") > -1) {
            terminacion = ".jpg";
            base_puro = archivo.base64.replace("data:image/jpeg;base64,", "");
            ok = true;
        } else if (cabecera.search("image/png") > -1) {
            terminacion = ".png";
            base_puro = archivo.base64.replace("data:image/png;base64,", "");
            ok = true;
        } else if (cabecera.search("image/gif") > -1) {
            terminacion = ".gif";
            base_puro = archivo.base64.replace("data:image/gif;base64,", "");
            ok = true;
        }
        else {
           //console.log("No se subio en algun formato compatible")
            ok = false;
            //res.send({ ok: false, message: "Alguna de las imagenes no es compatible, jpg , png y gif se permiten." });
            //return;
        }
        cp(ok, terminacion, base_puro);
    }
}

