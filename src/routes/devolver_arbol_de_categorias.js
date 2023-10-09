import { Categoria } from "../models/categoria";
import { Producto } from "../models/producto";



export async function post(req, res, next) {

    /// Regresa el arbol de categorias
    try {
        Categoria.find().select(['id_cat_padre', 'id_categoria', 'descripcion', 'imagen'])
            .then(async (categoriasDB) => {
                //console.log(categoriasDB);                
                const categorias = await ordenarArbol(categoriasDB);
                res.send({ ok: true, categorias });
            })
    } catch (err) {
        console.log(err);
        res.send({ ok: false });
    }
}

function toTree(arr, item) {

    if (!item) {
        item = arr.find(item => item.id_categoria == 'null')
    }
    let parent = { ...item }
    parent.children =
        arr.filter(x => x.id_cat_padre === item.id_categoria)
            .sort((a, b) => a.id_categoria - b.id_categoria)
            .map(y => toTree(arr, y))

    return parent
}


function ordenarArbol(categorias) {

    return new Promise(async (resolve, reject) => {
        try {
            let tmp_categorias = JSON.parse(JSON.stringify(categorias))
            let desaplanado = toTree(tmp_categorias)
            resolve(desaplanado);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    })
}

