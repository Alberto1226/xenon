
//   Como superadmin crea productos
import { Promocion } from "../../../models/promocion";
import { Carrito } from "../../../models/carrito";
import { Email } from "../../../models/email";
import * as accesos from "../accesos";
import { Producto } from "../../../models/producto";
import { Log } from "../../../models/log";
import { snap_por_cambio_en_pedido } from './editar/_producto_snaplogs/snap_por_cambio_en_pedido';
//import { scaleLog } from "d3";
import { analisis_de_carritos_con_promos } from './_funciones/analisis_de_carritos_con_promos';
import { checar_folios_en_pedido } from "./_fn_checar_que_todos_los_folios_esten_disponibles";

export async function post(req, res, next) {

    //console.log(req.body);
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    const { id, producto_para_envios_existe, costo_envio, producto_para_envios_id } = req.body;
    // console.log({ id, producto_para_envios_existe, costo_envio, producto_para_envios_id });




    //  CARRITO
    let carrito_proceso = await carrito_a_cambiar(id);


    if (carrito_proceso.ok === false) {
        res.send({ ok: false, mensaje: 'error al encontrar el carrito' });
        return;
    }
    if (carrito_proceso.carrito.lista.length == 0) {
        res.send({ ok: false, mensaje: 'error al encontrar el carrito' });
        return;
    }
    let carrito = carrito_proceso.carrito;
    if (carrito.procesando == true) {
        return res.send({ ok: false, mensaje: 'El pedido ya ha comenzado el mismo proceso desde otro dispositivo' });
    }

    // console.log("-------Checar promos-------");
    const resumen = await analisis_de_carritos_con_promos(id);
    //console.log({resumen});
    // console.log("--------------");
    // console.log(resumen)

    //console.log(resumen.lista_de_feedbacks);
    if (resumen.todo_bien === false) {
        // console.log("------no bien promos--------");
        return res.send({ ok: false, mensaje: 'Las promociones no cumplen con sus condiciones' });
        return;
    }
    // console.log("----Analisis_de_carritos_con_promos : SI  paso las pruebas----------");


    // console.log("*****Checar folios de salida que aun existan en sus productos respectivos");
    var asincronos = await los_folios_de_todos_los_productos_estan_disponibles(carrito.lista);
    //  DEVUELVE{  todo_bien: (contador_de_exitos == carrito.lista.length),
    //      reporte_de_folios_para_frontend}
    const { todo_bien, reporte_de_folios_para_frontend } = asincronos
    // console.log({ todo_bien });

    if (todo_bien != true) {
        // console.log("------ no bien folios--------");
        return res.send({ ok: false, mensaje: 'Algunos de los folios seleccionados no existen ya', reporte_de_folios_para_frontend });
    }


    if (carrito.procesando == true) {
        return res.send({ ok: false, mensaje: 'El pedido ya ha comenzado el mismo proceso desde otro dispositivo' });
    }
    carrito.procesando = true;
    carrito.save()
        .then(async () => {
            //      Checar que las condiciones de las promos se cumplan en todos los productos
            // console.log('-------lll')
            //console.log(carrito);
            //   LISTA DE IDS
            //let lista_ids = await lista_de_ids(carrito.lista);
            //  QUITAR PRODUCTOS APARTADOS EN CARRITOS DE CADA PRODUCTO  //{ $or:[ ...lista_ids ]} , carrito.cliente.id);
            ///     ACtualizar cuenta y apartados en un solo golpe
            let proceso_paqueteria = await actualizar_lista_con_paqueteria(carrito, producto_para_envios_existe, costo_envio, producto_para_envios_id);
            // console.log("************************");
            if (proceso_paqueteria.ok == false) {
                return res.send({ ok: false, mensaje: "Error al alterar paqueteria " })
            }
            // console.log({ proceso_paqueteria });
            //total no caqmboi checar
            //return
            //  CARRITO
            carrito_proceso = await carrito_a_cambiar(id);

            carrito = carrito_proceso.carrito;

            //console.log(carrito.lista);
            //console.log({ carrito });

            //  Checar si existen todos los folios  en _fn_checar_que_todos_los_folios...
            //await checar_folios_en_pedido();
            //return res.send({ ok: false });

            //  Borrar folios de productos
            let borrado_de_folios_en_pedido_de_su_almacen = await borrar_todos_los_folios_de_productos(carrito.lista);
            if (borrado_de_folios_en_pedido_de_su_almacen == false) {
                res.send({ ok: false, mensaje: 'error al quitar folios apartados' });
                return;
            }
            //  Descontar de inventario
            let quitar_apartados_y_descontar_proceso = await quitar_apartados_y_descontar(carrito.lista, carrito.folio, carrito.cliente.id, carrito.cliente.nombre, req);
            if (quitar_apartados_y_descontar_proceso.ok === false) {
                res.send({ ok: false, mensaje: 'error al quitar apartados' });
                return;
            }


            //  Cambiar status de carrito
            const cambiar_status_carrito_proceso = await cambiar_status_carrito(carrito._id, req);
            //const previo_registro_id = accesos.logActividad('cambio_status_pedidos/envio', req.user, { folio: carrito.folio, idcarrito: carrito._id, total: carrito.total_pedido }, req);
            const segundo_id = await log_final(carrito.lista, quitar_apartados_y_descontar_proceso.id_log_previo, carrito.folio, req);
            const resultado_autocheck = await autocheck(quitar_apartados_y_descontar_proceso.id_log_previo, segundo_id);
            if (resultado_autocheck.ok === false) {
                //      registrar el error
                accesos.logActividad("pedidos/cambiar_status_a_envio", req.user, { error: "se detecto un error en descontar de inventario", accion: 'Este error se registra cuando la cantidad de productos a los que se aplico descuento en existencias , difiere del total de productos', detalles: resultado_autocheck.detalles }, req, true)
                cambiar_status_carrito_proceso = { ok: false };
                var envio = await Email.mandarMail("Error al cambiar el status a envio y afectar inventario ", "El folio =" + carrito.folio + " ha presentado un problema al afectar inventarios.", "gerencia@ideasysolucionestecnologicas.com")
                // console.log(envio);
            }
            else {
                //      registrar el exito
                accesos.logActividad("pedidos/cambiar_status_a_envio", req.user, { exito: true, accion: 'descuento de productos en inventario', folio: carrito.folio, detalles: resultado_autocheck.detalles }, req)
                //var envio =  await Email.mandarMail("No error al cambiar el status a envio y afectar inventario ","El folio ="+carrito.folio+ " ha presentado un problema al afectar inventarios.","gerencia@ideasysolucionestecnologicas.com")
                //console.log(envio)

            }

            res.send(cambiar_status_carrito_proceso);
            return;
        })
        .catch((err) => {
            console.log(err)
        })

}


async function actualizar_lista_con_paqueteria(carrito, producto_para_envios_existe, costo_envio, producto_para_envios_id) {
    try {
        if (costo_envio == 0 || producto_para_envios_existe == false) return { ok: true };
        if (isNaN(Number(costo_envio)) == true) return { ok: false };
        var paqueteria_en_pedido = carrito.lista.find(elem => elem.producto._id == producto_para_envios_id);
        if (paqueteria_en_pedido) {
            paqueteria_en_pedido.producto.precio = Number(costo_envio);
            paqueteria_en_pedido.cantidad = 1;
            // console.log("paqueteria en pedido");
            // console.log(paqueteria_en_pedido);
            // console.log("---------- ya l tenia");
            return Carrito.findByIdAndUpdate(carrito._id, { lista: carrito.lista, total_pedido: +carrito.total_pedido + +costo_envio })
                .then((res) => {
                    // console.log("Exito **--------------");
                    // console.log({ res });
                    // console.log("Exito **--------------");
                    return { ok: true }
                })

        } else {
            var producto_de_paqueteria = await encontrar_producto(producto_para_envios_id);
            producto_de_paqueteria.precio = costo_envio;
            // console.log(producto_de_paqueteria);
            // console.log("----------1");
            if (!producto_de_paqueteria) return { ok: false }
            // console.log("----------2");
            return Carrito.findByIdAndUpdate(carrito._id, { $push: { lista: { cantidad: 1, producto: producto_de_paqueteria } }, total_pedido: +carrito.total_pedido + +costo_envio })
                .then((res) => {
                    // console.log("Exito **--------------");
                    // console.log({ res });
                    // console.log("Exito **--------------");
                    return { ok: true }
                })
        }
        //const producto_paqueteria = await 
    } catch (err) {
        // console.log(err);
        return { ok: false }
    }
}

function cambiar_status_carrito(id_carrito) {
    return new Promise((resolve, reject) => {
        Carrito.findByIdAndUpdate(id_carrito, {
            $set: { status: 'Envío' }
        }).then(() => {

            resolve({ ok: true });
        })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err })
            })

    })
}

function descontar_de_existencias(query, id_cliente) {
    return new Promise((resolve, reject) => {
        Producto.updateMany(query, {
            $pull: {
                carritos: {
                    'cliente.id': { $in: [id_cliente] }
                }
            }
        }).then(() => {
            resolve({ ok: true });
        })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err })
            })

    })
}

async function quitar_apartados_y_descontar(lista, folio, id_cliente, id_nombre, req) {

    return new Promise(async (resolve, reject) => {
        var existencias = [];
        for (let i = 0; i < lista.length; i++) {
            const registro = lista[i];
            const producto = await encontrar_producto(registro.producto._id);
            const producto_constante = JSON.parse(JSON.stringify(producto));
            if (producto) {
                const total_reservado = producto.carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
                existencias.push({ producto: producto.nombre, cantidad_nueva: registro.cantidad, id: producto._id, total_reservado, existencias_previas: producto.existencia.actual, existencias_postEnvio: producto.existencia.actual - registro.cantidad });
            }
            else accesos.logActividad("pedidos/cambiar_status_a_envio", req.user, { error: "producto no se encontro, linea 84", producto: registro.producto, accion: 'Se buscaba el producto para poder cambiar existencias y apartados, pero no existe' }, req)

            var producto_a_modificar = await encontrar_producto(registro.producto._id);
            if (!producto_a_modificar) {
                // No existe el producto
                console.log("No existe el producto");
                continue;
            }
            producto_a_modificar.existencia.actual -= registro.cantidad;

            var lista_original = JSON.parse(JSON.stringify(producto_a_modificar.carritos));

            // console.log("--------------borigianl")
            // console.log(producto_a_modificar.carritos)
            // console.log("--------------buscando " + id_cliente + " en lista")
            // console.log(id_cliente);
            // console.log(lista_original.length);
            var lista_nueva = [];
            lista_original.filter(elem => {
                // console.log(elem.cliente.id)
                // console.log(id_cliente)
                // console.log(elem.cliente.id == id_cliente)
                if (elem.cliente.id != id_cliente) {
                    lista_nueva.push(elem);

                }
                return elem.cliente.id != id_cliente
            })
            // console.log(lista_original.length);
            // console.log("--------------lista")
            // console.log(JSON.stringify({ lista_original }));
            // console.log("--------------lista")
            // console.log("--------------lista nueva")
            // console.log(lista_nueva);
            // console.log("--------------lista nueva")
            producto_a_modificar.carritos = lista_nueva;
            // console.log(producto_a_modificar.carritos);

            producto_a_modificar.save()
                .then(async (resultado) => {
                    //console.log(resultado);
                    //      CREAR SNAP de producto recien editado
                    // console.log("*** resultado de save");
                    // console.log(resultado);
                    // console.log("*** resultado de save");
                    const snap_proceso = await snap_por_cambio_en_pedido({ nombre: producto_constante.nombre, id: producto_constante._id },
                        { nombre: req.user.nombre, id: req.user._id },
                        registro.cantidad,
                        registro.cantidad,
                        "2",  // 2:Descontad de inventario
                        { folio, cliente: { nombre: id_nombre, id: id_cliente } },
                        producto_constante,
                        registro.folios
                    )
                    // console.log("|||--snap")
                    // console.log(snap_proceso);
                    //      CREAR SNAP de producto recien editado END
                    if (i + 1 == lista.length) {
                        var id_log_previo = await accesos.logActividad('pedidos/cambiar_status_a_envio', req.user, { folio, preproceso: existencias, fn: "quitar_apartados_y_descontar", linea: 98 }, req);
                        return resolve({ ok: true, id_log_previo });
                    }
                })
                .catch((err) => {
                    console.log(err);
                    accesos.logActividad('pedidos/cambiar_status_a_envio', req.user, { preproceso: existencias, err, error: true }, req);
                    if (i + 1 == lista.length) {
                        return reject({ ok: false, err });
                    }
                })
        }
    })
}

//          Agosto2021 HAcer refactor con nuevos metodos de Producto 1!!!
async function los_folios_de_todos_los_productos_estan_disponibles(lista) {
    var contador_de_exitos = 0;
    var reportes_de_productos = [];
    //      Ciclo Registro por Registro
    for (let i = 0; i < lista.length; i++) {
        const registro_en_pedido = lista[i];

        let { resultado, reporte_producto } = await los_folios_de_este_producto_estan_disponibles(registro_en_pedido);
        // console.log("**--//** los_folios_de_este_producto_estan_disponibles **--//**");
        // console.log({ resultado });
        reportes_de_productos.push(reporte_producto);
        if (resultado == true) contador_de_exitos++;
        //console.log({ contador_de_exitos });
        //console.log({largolista:lista.length});
        if (i + 1 == lista.length) {
            // console.log("******fn = los_folios....disponibles finalizando ciclo*****------");
            let reporte_de_folios_para_frontend = []
            // console.log({ contador_de_exitos });
            // console.log({ total: lista.length });
            if (contador_de_exitos < lista.length) {
                reporte_de_folios_para_frontend = await generar_reporte_para_cliente(reportes_de_productos);
            }
            return {
                todo_bien: (contador_de_exitos == lista.length),
                reporte_de_folios_para_frontend
            };
        }
    }
}


async function generar_reporte_para_cliente(reportes) {
    // console.log("Generar reporte para cliente ----------------------------------------------------------");
    var algun_error = false;
    var errores_solamente = [];
    await reportes.map((elem, i) => {
        if (elem) {
            //console.log({ i });
            //console.log({ elem });
            //console.log({ reporte: elem.folios.reporte });
            if (elem.folios.reporte.si_cuenta_con_todos == false) {
                algun_error = true

                errores_solamente.push({
                    producto: elem.producto, folios: elem.folios.reporte.detalle.filter(elem => elem.existe == false)
                }
                )
            }
        }
    })
    // console.log("**--*--*-*-");
    // console.log({ errores_solamente: JSON.stringify(errores_solamente) })
    //console.log("Generar reporte para cliente FIN -------------------------------------------------------");
    return errores_solamente;
}


async function los_folios_de_este_producto_estan_disponibles(registro) {
    let producto_tmp = await encontrar_producto(registro.producto._id);
    if (registro.folios.length == 0) return {
        resultado: true, reporte_producto: {
            producto: {
                nombre: registro.producto.nombre,
                id: registro.producto._id
            },
            disponibilidad: {
                necesarias: registro.cantidad, // solo existencias sin contar folios
                disponibles: producto_tmp.total_disponible(),
                suficientes: producto_tmp.se_le_pueden_descontar(registro.cantidad)
            },
            folios: {
                reporte: producto_tmp.reporte_folios(registro.folios ? registro.folios : [])
            }
        }
    };
    //  Los que no ocupan folios no pasan de aqui
    var contador_de_exitos = 0;
    // console.log("checando el producto " + registro.producto.nombre);

    for (let i = 0; i < registro.folios.length; i++) {
        const element = registro.folios[i];
        // console.log("Folio a checar =" + element);
        let folio_encontrado = producto_tmp.existencia.folios.find(elem => elem == element)
        if (folio_encontrado) {
            contador_de_exitos++;
        }
        if (i + 1 == registro.folios.length) {
            //  Fin de Iteracion 
            let reporte_producto = {
                producto: {
                    nombre: registro.producto.nombre,
                    id: registro.producto._id
                },
                disponibilidad: {
                    necesarias: registro.cantidad, // solo existencias sin contar folios
                    disponibles: producto_tmp.total_disponible(),
                    suficientes: producto_tmp.se_le_pueden_descontar(registro.cantidad)
                },
                folios: {
                    reporte: producto_tmp.reporte_folios(registro.folios)
                }
            }
            // console.log("Se termino de checar el producto");
            // console.log(reporte_producto);
            return { resultado: contador_de_exitos == registro.folios.length, reporte_producto }
        }
    }
}


function encontrar_producto(id) {
    return new Promise((resolve, reject) => {
        Producto.findById(id)
            .then((producto) => {
                resolve(producto);
            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err });
            })
    })
}

function carrito_a_cambiar(id_carrito) {
    return new Promise((resolve, reject) => {
        Carrito.findById(id_carrito)
            .then((carrito) => {
                resolve({ ok: true, carrito });
            })
            .catch((err) => {
                console.log(err);
                reject({ ok: false, err });
                accesos.logActividad("pedidos/cambiar_status_a_envio", req.user, { err }, req)
            })
    })
}

function lista_de_ids(lista) {
    return Promise((resolve, reject) => {
        let lista_ids = []
        for (let i = 0; i < lista.length; i++) {
            const producto = lista[i];
            query_ids.push({
                _id: producto._id
            })
            if (i + 1 === lista.length) {
                resolve(lista_ids)
            }
        }
    })
}


//      este es el segundo reporte que se guaradara en logs, post cambios
function log_final(lista, id_reporte_previo, folio, req) {
    return new Promise(async (resolve, reject) => {
        try {
            let reportes = [];
            for (let i = 0; i < lista.length; i++) {
                const element = lista[i];

                //console.log(element)
                const productoDB = await encontrar_producto(element.producto._id);

                const total_reservado = productoDB.carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);

                const reporte = {
                    total_reservado,
                    producto: productoDB.nombre, id: productoDB._id,
                    existencia_actuales: productoDB.existencia.actual,
                }
                reportes.push(reporte);
                if (lista.length == i + 1) {
                    const segundo_id = accesos.logActividad('pedidos/cambiar_status_a_envio', req.user, { fn: "log_final", id_reporte_previo, folio: folio, reportes }, req);
                    resolve(segundo_id);
                    return;
                }
            }
        } catch (err) {
            reject(err)
            console.log(err);
            return;
        }

    })
}



function autocheck(id_primer_registro, id_segundo_registro) {
    return new Promise((resolve, reject) => {
        try {
            var contador_correctos = 0;
            Log.findById(id_primer_registro)
                .then((primer_registroDB) => {
                    const primer_registro = JSON.parse(primer_registroDB.body)
                    Log.findById(id_segundo_registro)
                        .then(async (segundo_registroDB) => {

                            const segundo_registro = JSON.parse(segundo_registroDB.body)

                            let detalles = [];
                            for (let i = 0; i < segundo_registro.reportes.length; i++) {
                                const element = segundo_registro.reportes[i];
                                const corresponde_a_lo_esperado = await corresponde_al_resultado_esperado(primer_registro.preproceso, segundo_registro.reportes, element.id);
                                if (corresponde_a_lo_esperado) contador_correctos++;


                                detalles.push({
                                    producto: primer_registro.preproceso[i].producto,
                                    cantidad_producto: primer_registro.preproceso[i].cantidad_nueva,
                                    total_reservado_antes: primer_registro.preproceso[i].total_reservado,
                                    id: primer_registro.preproceso[i].id,
                                    existencias_previas: primer_registro.preproceso[i].existencias_previas,
                                    existencias_finalizando: element.existencia_actuales,
                                    total_reservado_finalizando: element.total_reservado,
                                })

                                if (i + 1 === segundo_registro.reportes.length) {

                                    //console.log("-----  FInalizando  ----");
                                    //console.log(contador_correctos);
                                    //console.log(contador_correctos === segundo_registro.reportes.length);
                                    return resolve({ contador_correctos, ok: contador_correctos === segundo_registro.reportes.length, detalles });
                                }
                            }
                        })
                })
        } catch (err) {
            console.log(err)
            return reject(err);
        }
    })
}


async function corresponde_al_resultado_esperado(lista1, lista2, id_producto) {
    return new Promise((resolve, reject) => {
        try {
            const producto_lista1 = lista1.find((element) => element.id === id_producto);
            const producto_lista2 = lista2.find((element) => element.id === id_producto);
            const cantidad_esperada = (producto_lista1.existencias_previas - producto_lista1.cantidad_nueva);
            const fue_aplicado_de_forma_correcta = cantidad_esperada === producto_lista2.existencia_actuales;

            resolve(fue_aplicado_de_forma_correcta)
            return
        } catch (err) {
            reject(err);
        }
    })
}

/*


async function todas_las_promos_cumplen_sus_condiciones(lista_de_registros){
    var error_mayor = 0;//      Solamente util cuando la promo no se puede encontrar, lo cual nunca deberia de pasar
    var contador_correctos = 0;//       Contador de correctos debe de incluir los que no son promos
    for (let i = 0; i < lista_de_registros.length; i++) {
        const registro = lista_de_registros[i];
        const producto = registro.producto;
        const con_promo = registro.promo!=undefined?registro.promo.con_promo:false;
        if(con_promo ==true){
            const promocion_proceso = await devolver_promocion(producto.promo.id_promocion);
            if(promocion_proceso.ok == false){
                error_mayor++;
            }else{
                const promocion = promocion_proceso.promocion;
                const condiciones = promocion.condiciones;
                const tipo_condicion = promocion.tipo_condicion;
                const cumple_condicion_resultado = await cumple_condicion(tipo_condicion,condiciones,lista_de_registros,registro);
                if(cumple_condicion_resultado==true) contador_correctos++;
                console.log(cumple_condicion_resultado);
            }
        }else{
            contador_correctos ++;
        }
        //console.log({registro,producto,con_promo})
        if(lista_de_registros.length == i+1){
            console.log({total_registros:lista_de_registros.length,
                contador_correctos
            })
            return ;
        }
    }
}


async function cumple_condicion(tipo_condicion,condiciones,lista_de_registros,registro) {
    let feedback = {
        nombre:registro.producto.nombre,
        tipo_condicion:0,
        cumple:false
    }
    if(tipo_condicion ==1){
        //      Sin condiciones
        console.log("----sin condiciones tipo 1");
        feedback.tipo_condicion =1;
        feedback.cumple =true;
        return true;
    }
    if(tipo_condicion==2){
        //      Minimo del mismo producto
        const cantidad_minima = condiciones[0].minimo_unidades ;
        const cantidad_en_registro = registro.cantidad;
        console.log("----minimo simple tipo 2");
        feedback.tipo_condicion =2;
        feedback.cumple =cantidad_minima <=cantidad_en_registro;
        return feedback.cumple;
    }
    if(tipo_condicion==3){
        //      Minimo compuesto
        const minimos_compuestos_cumplen_proceso = await minimos_compuestos_cumplen(condiciones,lista_de_registros,registro);
        console.log("----complejo tipo 3");
        feedback.tipo_condicion =3;
        feedback.cumple =minimos_compuestos_cumplen_proceso.cumplen;
        console.log(minimos_compuestos_cumplen_proceso);
        return feedback.cumple;
    }
}

async function minimos_compuestos_cumplen(condiciones,lista_de_registros,registro) {
    //      ciclo condicion por condicion
    var contador_suficientes = 0;
    var explicaciones=[];
    for (let i = 0; i < condiciones.length; i++) {
        const condicion = condiciones[i];
        const registro_producto_en_pedido = lista_de_registros.find(elem=>elem.producto._id == condicion.id);
        var suficientes = false;
        if(registro_producto_en_pedido){
            suficientes = registro_producto_en_pedido.cantidad >=condicion.minimo_unidades
        }
        if(suficientes==true)contador_suficientes++;
        //  Describir explicacion
        let explicacion ={
            nombre:condicion.nombre,
            suficientes,
            minimo_unidades:condicion.minimo_unidades,
            cantidad_en_pedido:registro_producto_en_pedido.cantidad
        }
        explicaciones.push(explicacion);
        if(i+1== condiciones.length){
            return {nombre:registro.producto.nombre,cumplen:contador_suficientes == condiciones.length , explicaciones};
        }
    }
}


async function devolver_promocion(id) {
    return Promocion.findById(id)
    .then((resultadoDB)=>{
        return {ok:true, promocion:resultadoDB}
    })
    .catch((err)=>{
        console.log(err)
        return {ok:false,promocion:resultadoDB}
    })
}
*/









async function borrar_todos_los_folios_de_productos(lista) {
    var contador_de_exitos = 0;
    for (let i = 0; i < lista.length; i++) {
        const element = lista[i];
        let resultado = await borrar_los_folios_de_producto(element);
        if (resultado == true) contador_de_exitos++;
        if (i + 1 == lista.length) {
            // console.log("***********------");
            // console.log({ contador_de_exitos });
            // console.log({ total: lista.length });
            return contador_de_exitos == lista.length;
        }
    }
}



async function borrar_los_folios_de_producto(registro) {
    if (registro.folios.length == 0) return true;
    var contador_de_exitos = 0;
    // console.log("filtrando/borrando folios en el Producto " + registro.producto.nombre);
    let producto_tmp = await encontrar_producto(registro.producto._id);
    var nueva_lista = producto_tmp.existencia.folios;
    for (let i = 0; i < registro.folios.length; i++) {
        const element = registro.folios[i];
        // console.log("Folio a borrar =" + element);
        nueva_lista = nueva_lista.filter(elem => elem != element)

        if (i + 1 == registro.folios.length) {
            // console.log("Se termino de borrar los folios en el producto , ahora guadare");
            producto_tmp.existencia.folios = nueva_lista;

            return producto_tmp.save()
                .then((resultado_edicion) => {
                    // console.log({ resultado_edicion });
                    return true
                })
                .catch((err) => {
                    console.log(err);
                    return false;
                })

        }
    }
}
