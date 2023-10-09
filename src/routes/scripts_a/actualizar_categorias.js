//      ACtualizar las categorias, agregalas como tags , en orden , como si se hiciera de forma manual dce un o por uno 
import {Producto} from '../../models/producto';
import {Categoria} from '../../models/categoria';
import {cambiar_categoria_producto } from './cambiar_categoria_producto';


export async function get(req,res,next) {
    const categorias = await obtener_categorias();
    const productos = await obtener_productos();
    //console.log(categorias);
    const porducto1=productos[0];
    const catego_de_producto =await obtener_categoriadb_usando_un_productodb(porducto1)
    console.log(catego_de_producto);
    //const categoria_correspondiente = await 
    const nueva_lista =  await Promise.all(productos.map( async elem=>{
        const resultado = await obtener_categoriadb_usando_un_productodb(elem)
        const producto_id = elem._id;
        let resultado_cambio = "nada"
        if(resultado.resDB){
            const categoria_nueva =resultado.resDB;

            resultado_cambio = await cambiar_categoria_producto({producto_id,categoria_nueva})
        }
        return {
            nombre:elem.nombre,
            subcategoria:elem.subcategoria,
            nuevo:resultado.resDB,
            resultado_cambio
        }
    }))
    return res.send(nueva_lista)
}

async function obtener_categoriadb_usando_un_productodb(producto){
    const subcategoria =producto.subcategoria;
    const resDB = await obtener_categoria_con_descripcion(subcategoria.nombre);
    return resDB
}

// NOTA  descripcion == nombre = true
async function obtener_categoria_con_descripcion(descripcion) { 
    return Categoria.findOne({descripcion})
    .then((resDB)=>{
        return {resDB};
    })
    .catch((err)=>{
        console.log(err);
        return {resDB:null}
    })
}

async function obtener_categorias() {
    return Categoria.find({})
    .then((resDB)=>{
        return resDB;
    })
    .catch((err)=>{
        console.log(err);
        return []
    })
}

async function obtener_productos() {
    return Producto.find({activo:true,subcategoria:{$exists:true}})
    .then((resDB)=>{
        return resDB;
    })
    .catch((err)=>{
        console.log(err);
        return []
    })
}