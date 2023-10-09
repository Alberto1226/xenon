import { Producto } from '../../../../models/producto';
import { Carrito } from '../../../../models/carrito';
import { Pedido } from '../../../../models/pedido';
import { Categoria } from '../../../../models/categoria';
var ObjectId = require('mongoose').Types.ObjectId;import * as accesos from "../../accesos";

export async function post(req, res) {

    //  Checar permisos
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) == false && accesos.tiene_permisos_gerenciales(req) == false) {
        res.send({ ok: false, mensaje: "requiere mas permisos" })
        return;
    }

    //checar que la categoria no exista 
    let producto_id = req.body.producto_id;
    let categoria_nueva = req.body.categoria_nueva;
    console.log({id:categoria_nueva._id});
    const lista_proceso_categorias =await lista_de_padres_para_tags(categoria_nueva._id)
    var lista = [];
    if(lista_proceso_categorias.ok ==true){
        lista= lista_proceso_categorias.lista;
    }
    const proceso_cambiar_producto = await cambiar_categoria_en_producto(producto_id, categoria_nueva,lista)
    const proceso_cambiar_producto_en_carritos = await cambiar_categoria_en_producto_carritos(producto_id, categoria_nueva)
    const proceso_cambiar_categoria_en_producto_pedido = await cambiar_categoria_en_producto_pedido(producto_id, categoria_nueva)
    //const proceso_cambiar_nombre =await cambiar_nombre(nuevo_nombre,id);
    res.send(proceso_cambiar_producto)

}



const cambiar_categoria_en_producto = (producto_id, categoria_nueva,lista) => {
    return new Promise((resolve, reject) => {
        //console.log({producto_id, categoria_nueva})
        //console.log({'subcategoria.nombre':nombre_anterior})
        Producto.findByIdAndUpdate(producto_id, { 'subcategoria.nombre': categoria_nueva.descripcion , categoria_tags:lista })
            .then((res) => {
                // console.log(res)
                resolve({ ok: true })
            })
            .catch((err) => {
                console.log(err)
                reject({ ok: false });
            })
    })
}




const cambiar_categoria_en_producto_carritos = (producto_id, categoria_nueva) => {
    return new Promise((resolve, reject) => {
       // console.log({producto_id, categoria_nueva})
       // console.log({'lista.producto._id':new ObjectId(producto_id)})
        //console.log({'subcategoria.nombre':nombre_anterior})
        Carrito.updateMany({'lista.producto._id': ObjectId(producto_id)}, { 'lista.$.producto.subcategoria.nombre': categoria_nueva.descripcion })
            .then((res) => {
                 //console.log(res)
                resolve({ ok: true })
            })
            .catch((err) => {
                console.log(err)
                reject({ ok: false });
            })
    })
}


const cambiar_categoria_en_producto_pedido = (producto_id, categoria_nueva) => {
    return new Promise((resolve, reject) => {
        //console.log({producto_id, categoria_nueva})
        //console.log({'lista.producto._id':new ObjectId(producto_id)})
        //console.log({'subcategoria.nombre':nombre_anterior})
        Pedido.updateMany({'lista.producto._id': ObjectId(producto_id)}, { 'lista.$.producto.subcategoria.nombre': categoria_nueva.descripcion })
            .then((res) => {
                //console.log(res)
                resolve({ ok: true })
            })
            .catch((err) => {
                console.log(err)
                reject({ ok: false });
            })
    })
}



async function lista_de_padres_para_tags(id) {
    try {
        let categoriaDB_proceso = await categoria_db(id);
        if(categoriaDB_proceso.ok == false){
            return {ok:false, mensaje:"la categoria con llave :"+id+" ya no existe"};
        }
        var categoriaDB = categoriaDB_proceso.categoria;

        var tiene_padre = categoriaDB.id_cat_padre != "null";
        const maximo_iteraciones = 10;
        var i =0;
        var nuevo_id = categoriaDB.id_cat_padre;
        var {imagen,descripcion,id_cat_padre,id_categoria} = categoriaDB;
        var registro_id = categoriaDB._id
        var lista=[];
        lista.push({i,imagen,descripcion,id_cat_padre,id_categoria,id:registro_id})
        //console.log("|||||||---- dentro de funcion ");
        //console.log(categoriaDB);
        //console.log({tiene_padre});
        if(tiene_padre==false){
            // termina sin padres
            return {ok:true,lista};
            
        }
        while (tiene_padre=true && maximo_iteraciones >i ) {
            i++;
            //console.log("||||||------> "+ i)
            //console.log({nuevo_id});
            categoriaDB_proceso = await categoria_db_con_id_categoria(nuevo_id);
            if(categoriaDB_proceso.ok == false){
                return {ok:false, mensaje:"la categoria con llave :"+id+" ya no existe",lista};
            }
            categoriaDB = categoriaDB_proceso.categoria;
        
            tiene_padre = categoriaDB.id_cat_padre != "null";


            let {imagen,descripcion,id_cat_padre,id_categoria} = categoriaDB;
            let registro_id = categoriaDB._id
            //  termina la funcion de forma correcta
            lista.push({i,imagen,descripcion,id_cat_padre,id_categoria,id:registro_id})
            nuevo_id =  categoriaDB.id_cat_padre;
            if(tiene_padre == false){
                console.log(lista)
                return {ok:true, lista,mensaje:"termina la funcion de forma correcta"};
            }
            if(i+1 == maximo_iteraciones){
                var razon = "la funcion supero el maximo numeor de iteraciones";
                console.log(razon)
                return {ok:true,lista,mensaje:razon}
                break;
            }
            
        }
    } catch (err) {
        console.log(err)
        return {ok:false,mensaje:"err" ,lista :[]}
    }
}



async function categoria_db(id) {
    return Categoria.findById(id)
    .then((resultado)=>{
        return {ok:true, categoria : resultado}
    })
    .catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}



async function categoria_db_con_id_categoria(id) {
    return Categoria.findOne({id_categoria:id})
    .then((resultado)=>{
        return {ok:true, categoria : resultado}
    })
    .catch((err)=>{
        console.log(err);
        return {ok:false}
    })
}