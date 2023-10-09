

import { Producto } from '../../../models/producto';

import { categoria_producto } from './categoria_producto';
import { categorias } from './categoria';
import { caracteristicas } from './producto_caracteristica';

export async function get(req, res, next) {
    const lista = await lista_productos();
    let resultado = [];
    for (let i = 0; i < lista.length; i++) {
        const producto = lista[i];
        const prodtmp = await procesar_producto(producto);
        if(prodtmp.categoria!=null){
            producto.subcategoria.nombre = prodtmp.categoria.nombre;
            producto.subcategoria.imagen = prodtmp.categoria.imagen;
            if(prodtmp.categoria_padre){
                producto.category.nombre = prodtmp.categoria_padre.nombre;
                producto.category.imagen = prodtmp.categoria_padre.imagen;
            }
            producto.save()
            .then(()=>{

            })
            .catch((err)=>{
                console.log(err);
                
            })
            resultado.push(producto);
            if (i + 1 === lista.length) {
                res.send(resultado);
            }
        }      
        else{
            if (i + 1 === lista.length) {
                res.send(resultado);
            }
        }
        
    }



}


function procesar_producto(producto) {
    return new Promise(async (resolve, reject) => {
        try {

            const categoria = await devolver_categoria(producto.uid_previo);
            const categoria_padre = await devolver_categoria_padre_main(producto.uid_previo);

            resolve({categoria,categoria_padre})
        } catch (err) {
            console.log(err);

            reject(err)
        }
    })
}


function lista_productos() {
    return new Promise((resolve, reject) => {
        try {
            Producto.find({})
                .then((lista) => {
                    resolve(lista);
                    return;
                })
        } catch (err) {
            console.log(err);
            reject(err);
        }
    })
}

function devolver_categoria(id_producto) {
    return new Promise(async (resolve, reject) => {
        try {
            let id_categoria = await devolver_id_categoria(id_producto);
            if (id_categoria === null) {
                resolve({ error_en: id_producto })
                return;
            }
           
            const datos = await devolver_nombre_imagen_categoria(id_categoria);
            //let padre ;
            //if(datos)padre = await devolver_categoria_padre(datos.categoria_padre_id);
           // if(datos)
            resolve(datos)
        } catch (err) {
            console.log(err);

            reject(err);
        }
    })
}


function devolver_categoria_padre_main(id_producto) {
    return new Promise(async (resolve, reject) => {
        try {
            let id_categoria = await devolver_id_categoria(id_producto);
            if (id_categoria === null) {
                resolve({ error_en: id_producto })
                return;
            }
           
            const datos = await devolver_nombre_imagen_categoria(id_categoria);
            let padre ;
            if(datos)padre = await devolver_categoria_padre(datos.categoria_padre_id);
           // if(datos)
            resolve(padre)
        } catch (err) {
            console.log(err);

            reject(err);
        }
    })
}

function devolver_id_categoria(id_producto) {
   
    
    return new Promise((resolve) => {
        let categoria = categoria_producto.find((element) => element.id_producto === id_producto)
        if (categoria === null || categoria === undefined) {

      //      console.log('id catsss');
            resolve('error en id_producto ='+id_producto)
            return;
        }

       // console.log('id cat');

  //  console.log('id cat2');
        resolve(categoria.id_categoria)
    })
}


function devolver_nombre_imagen_categoria(id_categoria) {
    return new Promise((resolve) => {
        //console.log('nombre');
        
        let categoria = categorias.find(element => element.id_categoria === id_categoria);
        if (categoria === null || categoria === undefined) {
        //    console.log(id_categoria);
            
            resolve(null)
            return null
        }
      //  console.log('nombre3');
        resolve({ nombre: categoria.descripcion, imagen: categoria.imagen,categoria_padre_id:categoria.id_cat_padre})
    })
}


function devolver_categoria_padre(id_categoria_padre) {
    return new Promise((resolve) => {
        //console.log('nombre');
        
        let categoria = categorias.find(element => element.id_cat_padre === id_categoria_padre);
        if (categoria === null || categoria === undefined) {
           
            resolve(null)
            return null
        }
      //  console.log('nombre3');
        resolve({ nombre: categoria.descripcion, imagen: categoria.imagen })
    })
}