import {Producto} from '../../../models/producto';
import {Categoria} from '../../../models/categoria';
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
   
    let id_categoria_a_mover =  req.body.id_categoria_a_mover;
    let id_cat_padre_nueva =  req.body.id_cat_padre_nueva;
    
    const proceso_cambiar_padre =await cambiar_nombre(id_categoria_a_mover,id_cat_padre_nueva);
    res.send(proceso_cambiar_padre)

}


const cambiar_nombre  = (id_categoria_a_mover,id_cat_padre_nueva)=>{
    return new Promise((resolve,reject)=>{
        Categoria.findByIdAndUpdate(id_categoria_a_mover,{id_cat_padre:id_cat_padre_nueva})
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


