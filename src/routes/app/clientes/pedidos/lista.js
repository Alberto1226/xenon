
import { Pedido } from '../../../../models/pedido';
import * as accesos from '../../accesos';
import * as mongoose from 'mongoose';


export async function post(req, res, next) {
    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }


    if (accesos.tiene_permisos_gerenciales(req) === false && accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "permisos insuficientes" })
        return;
    }
    const producto_id = req.body.producto_id;
    const cliente_id = req.body.cliente_id;
    const pagina_actual = req.body.pagina_actual;
    const periodicidad = req.body.periodicidad;
    const step = 50;




    const or_consulta = await crear_or(periodicidad, cliente_id);
    //console.log("||||||||||||||||||||||||||||------------------")
    //console.log(JSON.stringify(or_consulta));
    const skip = pagina_actual * step;
    const { lista, coincidencias, paginas, ok } = await consulta(pagina_actual, skip, step, or_consulta)
    //console.log({lista,coincidencias,paginas,ok})
    //console.log(consulta_proceso);
    //console.log({pagina_actual,skip,coincidencias})
    //console.log(lista.length)
    if (ok == false) {
        return res.send({ ok: false, mensaje: "No se ha podido encontrar datos del producto selecto." })
    } else {
        return res.send({ lista, coincidencias, paginas, ok })
    }

}




async function consulta(pagina_actual, skip, step, or_consulta) {
    let query = {};

    ////console.log("5e7f8b470382191c8b82897c")
    ////console.log(usuario._id)
    //console.log(query)
    try {
        return Pedido.countDocuments(or_consulta)
            .then((total_registros) => {
                return Pedido.find(or_consulta).skip(skip).limit(step).sort({ fecha: -1 })
                    .then((lista) => {
                        let paginas;
                        let coincidencias;
                        if (total_registros == 0) {
                            paginas = 0;
                            coincidencias = 0;
                        }
                        else {

                            paginas = Math.floor((total_registros + step - 1) / (step));
                            coincidencias = total_registros;
                        }
                        return { lista, coincidencias, paginas, ok: true }
                    })
            })
    } catch (err) {
        return { ok: false, err, lista: [], coincidencias: 0, paginas: 0 }
    }


}


function crear_or(periodicidad, cliente_id) {

    try {
        //let objectId = mongoose.Types.ObjectId;
        let consulta_or = { 'cliente.id': cliente_id };
        //let consulta_or = { $and: [{ fecha: { $gte: new Date(periodicidad.desde) } }, { fecha: { $lt: new Date(periodicidad.hasta) } }, {'lista.producto._id':objectId(id_producto)}] };
        //let consulta_or = { $and: [{ fecha: { $gte: new Date(periodicidad.desde) } }, { fecha: { $lt: new Date(periodicidad.hasta) } }, {'lista.producto.codigo':"880 Bicolor"}] };
        return consulta_or;
    } catch (error) {
        console.log(error);
        return error;
    }

}