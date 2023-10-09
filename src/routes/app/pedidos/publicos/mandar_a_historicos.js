import {Carrito_publico} from './../../../../models/carrito_publico'
import {Carrito_publico_historico} from './../../../../models/carrito_publico_historico'

export async function post(req,res,next) {
    const body = req.body;
    const id = body.id;
    const carrito_publico = await Carrito_publico.devolver_usando_id(id);
    if(!carrito_publico) {
        return res.send({ok:false})
    }
    console.log(carrito_publico);
    let parsed = JSON.parse(JSON.stringify(carrito_publico));
    delete parsed._id;
    delete parsed._v;
    const historico = new Carrito_publico_historico(parsed)
    try {
        historico.save()
        .then(()=>{
        Carrito_publico.findByIdAndDelete(carrito_publico._id)
        .then(()=>{
            return res.send({ok:true})
        })
    })        
    } catch (err){
        console.log(err);
        return res.send({ok:false})
    }
    

}

