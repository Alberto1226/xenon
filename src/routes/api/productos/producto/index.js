
import { Producto } from './../../../../models/producto'
export async function post(req, res, next) {

    try {
        const respuesta = await buscar_con_id(req.body.id)
        if (!respuesta) {
            return res.status(404).send({ mensaje: 'No se ha podido encontrar el registro' })
        }
        return res.status(200).send({ ...respuesta })

    } catch (err) {
        console.log(err);
        res.status(500).send({ mensaje: 'El servicio no se encuentra disponible por el momento' })
    }

}


async function buscar_con_id(id) {
    try {
        return Producto.findById(id)
            .then((resultadoDB) => {
                return resultadoDB;
            })
    } catch (err) {
        console.log(err);
    }
}