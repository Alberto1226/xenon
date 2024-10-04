
import { Inyeccion } from "../../../../models/inyeccion";
import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";
import * as accesos from "../../accesos"

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }



    //var usuario = req.user;
    //console.log("id usuairo = ",carrito._id);    //  carrito:{$ne: req.user.carrito},  que no sea el mismo

    const registro = req.body.registro;
    const id = req.body.id_carrito;
    const folios = req.body.registro.folios;
    console.log(registro);
    console.log(req.body)

    // Verificamos si los folios están asignados a algún carrito o pedido
    // const SinAsignar = await verificarFolios(folios);
    const SinAsignar = [];

    // if (SinAsignar.length > 0) {
    //     res.send({ ok: false, mensaje: `Los folios ${SinAsignar.join(', ')} estan asignados`, foliosRepetidos: SinAsignar });
    //     return;

    // }

    if (SinAsignar.length === 0) {
        Carrito.findById(id)
            .then((resultado) => {
                if (resultado === null) {
                    res.send({ ok: false, mensaje: 'El pedido ya no existe' })
                    return;
                }

                let folioCarrito = resultado.folio;

                let lista = resultado.lista;
                console.log({ lista });
                let registro_tmp = lista.find(element => element.producto._id == registro.producto_id);
                console.log({ registro_tmp });
                console.log("producto id = " + registro.producto_id);



                const folios_previos = JSON.parse(JSON.stringify(registro_tmp.folios));
                registro_tmp.folios = registro.folios;

                const folios_nuevos = JSON.parse(JSON.stringify(registro.folios));
                console.log({ lista })
                console.log({ registro_tmp });
                console.log({ folios_previos });
                console.log({ folios_nuevos });

                // producto_temp.folios = registro.folios;
                //res.send();
                //return;

                let inyeccion_nueva = new Inyeccion({
                    procesado: {
                        estado_actual: 'En Carrito',
                        iniciado: true,
                        terminado: false,
                        carrito_folio: folioCarrito
                    },
                    producto: {
                        nombre: registro_tmp.producto.nombre,
                        id: registro_tmp.producto._id,
                    },
                    usuario: {
                        nombre: req.user.usuario,
                        id: req.user._id
                    },
                    lista: registro.folios
                })

                inyeccion_nueva.save()

                Carrito.findByIdAndUpdate(id, { lista })
                    .then(() => {
                        accesos.logActividad('pedidos/cambiar_folios', req.user, { folios_previos, folios_nuevos, registro: registro_tmp }, req);
                        res.send({ ok: true })
                        return;
                    })
                    .catch((err) => {
                        console.log(err);
                        res.send({ ok: false });
                        return;
                    })



            })
            .catch((err) => {
                console.log(err);
                res.send({ ok: false });
                return;
            })
    }




}


//      checar folio por folio 
//      que existan en su producto
//      Cuando se cierre el pedido, se debe de checar disponibilidad
//      

async function verificarFolios(folios) {
    // Utilizamos un solo arreglo para evitar hacer múltiples consultas en un bucle
    const foliosRepetidos = [];

    // Realizamos una consulta para buscar en la colección de Carrito
    const carritos = await Carrito.find({
        "lista.folios": { $in: folios }  // Busca si algún folio está presente
    }, { "lista.folios": 1 }); // Solo seleccionamos el campo necesario

    // Realizamos una consulta para buscar en la colección de Pedido
    const pedidos = await Pedido.find({
        "lista.folios": { $in: folios }  // Busca si algún folio está presente
    }, { "lista.folios": 1 });

    // Extraemos los folios repetidos de los carritos
    carritos.forEach(carrito => {
        carrito.lista.forEach(listaItem => {
            listaItem.folios.forEach(folio => {
                if (folios.includes(folio) && !foliosRepetidos.includes(folio)) {
                    foliosRepetidos.push(folio);
                }
            });
        });
    });

    // Extraemos los folios repetidos de los pedidos
    pedidos.forEach(pedido => {
        pedido.lista.forEach(listaItem => {
            listaItem.folios.forEach(folio => {
                if (folios.includes(folio) && !foliosRepetidos.includes(folio)) {
                    foliosRepetidos.push(folio);
                }
            });
        });
    });

    return foliosRepetidos;
}
