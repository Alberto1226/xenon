
//      Que hace esta ruta : Devuelve el producto para usar de paqueteria, este no tendra relevancia sus existencias
//      Solo impactara en costo unitario por pedido
//      Si tiene varios productos con esta caracteristica , solo va a devolver uno,
//      Si no tiene alguno , 404
import { Producto } from '../../../../models/producto'
export async function post(req, res, next) {

    try {
        const respuesta = await buscar_para_paqueteria();
        if (!respuesta) {
            return res.status(404).send({ mensaje: 'No se ha podido encontrar el registro, modifica algun producto destinado para paqueteria.' })
        }
        return res.status(200).send(respuesta)

    } catch (err) {
        console.log(err);
        res.status(500).send({ mensaje: 'El servicio no se encuentra disponible por el momento' })
    }

}


async function buscar_para_paqueteria() {
    try {
        return Producto.findOne({ recomendar_como_paqueteria: true })
            .then((resultadoDB) => {
                return resultadoDB;
            })
    } catch (err) {
        console.log(err);
    }
}