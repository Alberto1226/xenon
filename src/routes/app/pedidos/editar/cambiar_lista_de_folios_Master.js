
import { Inyeccion } from "../../../../models/inyeccion";
import { Carrito } from "../../../../models/carrito";
import { Pedido } from "../../../../models/pedido";
import * as accesos from "../../accesos"

function normalizarCodigoProducto(texto) {
    return String(texto || '').toUpperCase().replace(/[\s-]+/g, '');
}

function validarCodigoProductoBase(folios, codigoProductoBase) {
    if (!Array.isArray(folios) || folios.length === 0) {
        return { ok: false, mensaje: 'No hay folios para validar' };
    }

    const codigoBase = normalizarCodigoProducto(codigoProductoBase);
    if (!codigoBase) {
        return {
            ok: false,
            mensaje: 'No se pudo determinar el código base del producto'
        };
    }

    for (let i = 0; i < folios.length; i++) {
        const folioComparable = normalizarCodigoProducto(folios[i]);
        if (!folioComparable.startsWith(codigoBase)) {
            const detectado = folioComparable.slice(0, codigoBase.length);
            return {
                ok: false,
                mensaje: `El folio ${folios[i]} no coincide con el código base. Detectado: ${detectado || '(vacio)'} | Esperado: ${codigoBase}`
            };
        }
    }

    return { ok: true };
}

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
    const modoUnSoloTipo = req.body.registro.modo_un_solo_tipo === true;
    const codigoProductoBaseFront = req.body.registro.codigo_producto_base;
    console.log(registro);
    console.log(req.body)

    if (!Array.isArray(folios) || folios.length !== Number(registro.cantidad)) {
        res.send({
            ok: false,
            error: 'Debes registrar exactamente la cantidad solicitada de folios'
        })
        return;
    }

    const foliosNormalizados = folios.map((folio) => String(folio || '').toUpperCase().trim());
    const foliosUnicos = [...new Set(foliosNormalizados)];

    if (foliosUnicos.length !== foliosNormalizados.length) {
        res.send({
            ok: false,
            error: 'La lista contiene folios repetidos'
        })
        return;
    }

    if (modoUnSoloTipo) {
        const resultadoTipo = validarCodigoProductoBase(foliosNormalizados, codigoProductoBaseFront);
        if (resultadoTipo.ok === false) {
            res.send({ ok: false, error: resultadoTipo.mensaje })
            return;
        }
    }

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

                if (modoUnSoloTipo) {
                    const codigoProductoReal = registro_tmp && registro_tmp.producto
                        ? registro_tmp.producto.codigo
                        : '';
                    const resultadoTipoConCodigoReal = validarCodigoProductoBase(
                        foliosNormalizados,
                        codigoProductoReal,
                    );
                    if (resultadoTipoConCodigoReal.ok === false) {
                        res.send({ ok: false, error: resultadoTipoConCodigoReal.mensaje });
                        return;
                    }
                }



                const folios_previos = JSON.parse(JSON.stringify(registro_tmp.folios));
                registro_tmp.folios = foliosNormalizados;

                const folios_nuevos = JSON.parse(JSON.stringify(foliosNormalizados));
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
                    lista: foliosNormalizados
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
