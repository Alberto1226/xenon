import { Usuario } from "../../../models/usuario";
import * as accesos from "../accesos"
import { SalidasVentas } from "../../../models/salidasventas";
import { Producto } from "../../../models/producto";

export async function post(req, res, next) {
    // if(accesos.esta_logueado(req)===false){
    //     res.send({ok:false,mensaje:"sesion expirada"})
    //     return;
    // }

    let tipo = req.body.tipo;
    console.log("tipo = ", req);

    /*if (tipo == 'dataFicticia') {
        console.log("Insertando registros ficticios...");
        let registrosFicticios = [];
        // Obtener algunos _id de productos de la colección antes de crear los registros ficticios
        let productosIds = await Producto.find({}, { _id: 1 }).limit(20).lean();
        productosIds = productosIds.map(p => p._id);

        for (let i = 0; i < 5; i++) {
            // Seleccionar entre 3 y 6 productos aleatorios
            const cantidadProductos = Math.floor(Math.random() * 4) + 3; // 3 a 6
            const productosSeleccionados = [];
            const productosIdsCopia = [...productosIds];
            for (let j = 0; j < cantidadProductos; j++) {
                if (productosIdsCopia.length === 0) break;
                const idx = Math.floor(Math.random() * productosIdsCopia.length);
                productosSeleccionados.push(productosIdsCopia.splice(idx, 1)[0]);
            }

            registrosFicticios.push({
                id_ruta: "686310b4304469e224498322", // Puedes asignar un ObjectId válido si tienes rutas en tu base de datos
                id_carritos: "65832dfa9020596b9bc5fd8e", // Puedes asignar un ObjectId válido si tienes carritos en tu base de datos
                id_usuario: "68658fa7f8218924792ee2b0", // Puedes asignar un ObjectId válido si tienes usuarios en tu base de datos
                Productos: productosSeleccionados,
                fecha_salina: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
                folio_salida: `FOLIO${i + 1}`,
                status: 'Activa'
            });
        }

        SalidasVentas.insertMany(registrosFicticios)
            .then(() => {
                res.send({ ok: true, mensaje: "Registros ficticios insertados correctamente." });
            })
            .catch((err) => {
                console.log(err);
                res.send({ ok: false, mensaje: "Error al insertar registros ficticios." });
            });
        return;
    }*/


    let buscando = req.body.buscando;
    if (!buscando) buscando = '';
    const pagina_actual = req.body.pagina_actual - 1;

    //console.log("id usuairo = ",usuario._id);    
    //usuario:{$ne: req.user.usuario},  que no sea el mismo
    //var query = buscando.length==0?{}:{$text:{$search:buscando}};
    //let query = buscando===''? {} :{nombre:{$regex : buscando,$options:"gmi" }};
    let query = { nombre: { '$regex': buscando, '$options': "im" } };
    // console.log(query);

    //se resolvio el bug de los usuarios que no se mostraban

    if (tipo === 'pedido') {
        query.isMovil = true;
        console.log(query);
        Usuario.find(query)
            .sort({ nombre: 1 })
            .skip(pagina_actual * 10)
            .limit(10)
            .exec()
            .then(async (resDB) => {
                let numero_total = await Usuario.countDocuments(query);
                res.send({ ok: true, lista: resDB, numero_total });
            })
            .catch((err) => {
                console.log(err);
                res.send({ ok: false, mensaje: "error al buscar resultados." });
            });
        return;
    }

    Usuario.countDocuments({})
        .then((numero_total) => {
            Usuario.find(query)
                .sort({ nombre: 1 })
                .skip(pagina_actual * 10)
                .exec()
                .then(async (resDB) => {
                    //let lista_filtrada= await filtrar_lista(buscando,resDB);
                    res.send({ ok: true, lista: resDB, numero_total });
                })
                .catch((err) => {
                    console.log(err);
                    res.send({ ok: false, mensaje: "error al buscar resultados." });
                })

        })
        .catch((err) => {
            console.log(err)
            res.send({ ok: false })
        }
        );
}

