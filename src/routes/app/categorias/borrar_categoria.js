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
  
    let id =  req.body.id;
  

    const proceso_borrar =await borrar(id);
    res.send(proceso_borrar)

}


const borrar=(id)=>{
    return new Promise((resolve,reject)=>{
        Categoria.findByIdAndDelete(id)
        .then((res)=>{
           
            resolve({ok:true})
        })
        .catch((err)=>{
            console.log(err)
            reject({ok:false});
        })
    })
}




const cambiar_categoria_en_productos=(nombre,nombre_anterior)=>{
    return new Promise((resolve,reject)=>{
        //console.log({'subcategoria.nombre':nombre_anterior})
        Producto.updateMany({'subcategoria.nombre':nombre_anterior},{'subcategoria.nombre':nombre})
        .then((res)=>{
            //console.log(res)
            resolve({ok:true})
        })
        .catch((err)=>{
            console.log(err)
            reject({ok:false});
        })
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
