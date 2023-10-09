
import {Carrito} from '../../../../../models/carrito';


export async function devolver_carrito_db(id) {
    return Carrito.findById(id)
    .then((resultadoDB)=>{
        if(!resultadoDB){
            return {mensaje:"el id:"+id+" no fue encontrado.",carrito:resultadoDB,fn:'devolver_carrito_db',ok:false}
        }
        
        return {ok:true,carrito:resultadoDB}
    })
    .catch((err)=>{
        throw {err,ok:false};
    })
}
