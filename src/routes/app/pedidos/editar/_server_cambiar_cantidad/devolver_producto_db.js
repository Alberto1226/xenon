
import {Producto} from '../../../../../models/producto';


export async function devolver_producto_db(id) {
    return Producto.findById(id)
    .then((resultadoDB)=>{
        if(!resultadoDB){
            return {mensaje:"el id:"+id+" no fue encontrado.",resultadoDB,fn:'devolver_carrito_db',ok:false}
        }
        else{
            return {producto:resultadoDB ,ok:true}
        }
        
    })
    .catch((err)=>{
        throw err;
    })
}
