import {Categoria} from '../../../models/categoria';
import * as accesos from "./../accesos";

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

   // console.log(req.body)
    let categoria_nueva = req.body.categoria;
    categoria_nueva.creado = new Date();
    categoria_nueva.actualizado = null;
    categoria_nueva.borrado = null;
    let no_existe_una_igual =await categoria_no_existe(categoria_nueva.descripcion);
    if(no_existe_una_igual===false){
        res.send({ok:false,mensaje:'Ya existe otra categoría con ese nombre'})
        return
    }
    let categoria = new Categoria(categoria_nueva)
    categoria.save()
    .then(()=>{
        res.send({ ok: true });
    })
    .catch((err)=>{
        console.log(err);
        
        res.send({ok:false})
    })


    

}



const categoria_no_existe=(nombre)=>{
    return new Promise((resolve,reject)=>{
        Categoria.find({descripcion:nombre})
        .then((res)=>{
           // console.log(res)
            resolve(res.length===0)
        })
        .catch((err)=>{
            reject(err);
        })
    })
}
