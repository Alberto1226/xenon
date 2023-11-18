import { Producto } from '../../../models/producto';
import { Cliente } from '../../../models/cliente';
import { Carrito } from '../../../models/carrito';
import { Pedido } from '../../../models/pedido';
import {
    usuario_db,
    cargando_mensajes_app,
    postData,
    ui,
    version,
} from "../../../routes/stores";
import * as accesos from "../../../routes/app/accesos";

var m = "";
var us = "";
var meses = 0;

export async function post(req, res, next) {
    /*if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }*/
    m = req.body.m;
    us = req.body.us;
    if (m) {
        console.log(us);
        try {

            if (us.rol == "vendedor") {
                const resultadoClientes = await consultar_clientes(us._id);
                const resultadoPedidos = await consultar_pedidos_por_agente(m, us._id);
                const resultadoCarritos = await consultar_carritos_por_agente(m, us._id);

                const er = obtenerIdsClientes(resultadoPedidos.lista, resultadoCarritos.lista);

                if (er.length < resultadoClientes.lista.length) {
                    res.send({
                        ok: true,
                        mensaje: 'con clientes sin compras',
                        clientes: resultadoClientes,
                        ids: er,
                        rol: us.rol
                    });
                } else {
                    res.send({
                        ok: true,
                        mensaje: 'sin clientes sin compras',
                        clientes: resultadoClientes,
                        ids: er,
                        rol: us.rol
                    });
                }
            }
            if (us.rol == "administrador") {
                const resultadoPedidos = await consultar_pedidos(m);
                const resultadoCarritos = await consultar_carritos(m);
                const resultadoProductos = await consultar_productos();

                const idsUnicos = combinarArreglosConCantidad(
                    resultadoCarritos.lista,
                    resultadoPedidos.lista
                );

                const product = filtrarArreglos(
                    idsUnicos,
                    resultadoProductos.lista
                );

                if (product.length) {
                    res.send({
                        ok: true,
                        mensaje: 'Activar Notis',
                        notis: true,
                        productos: product,
                        rol: us.rol
                    });
                } else {
                    res.send({
                        ok: true,
                        mensaje: 'Activar Notis',
                        notis: false
                    });
                }
            }


        } catch (error) {
            res.send({ ok: false, mensaje: 'Error en la consulta' });
        }
    }

    //res.send({ ok: true, mensaje: 'Productos', d: prueba });
    //return;
}

function obtenerIdsUnicos(arreglo1, arreglo2) {
    // Función auxiliar para obtener los IDs de un arreglo
    function obtenerIds(arreglo) {
        return arreglo.map((item) => item.cliente.id);
    }

    // Combina los IDs de ambos arreglos y elimina duplicados
    const todosLosIds = [
        ...new Set([...obtenerIds(arreglo1), ...obtenerIds(arreglo2)]),
    ];

    return todosLosIds;
}

function filtrarClientesPorIds(clientes, ids) {
    // Utiliza el método filter para obtener un nuevo arreglo sin los clientes con IDs proporcionados
    const clientesFiltrados = clientes.filter(cliente => !ids.includes(cliente._id));
    return clientesFiltrados;
}

// function filtrarClientesPorIds(ids, arregloClientes) {
//     // Filtra los clientes que no tienen un ID coincidente en el array de IDs
//     // const clientesFiltrados = arregloClientes.filter(
//     //     (cliente) => !ids.includes(cliente.id)
//     // );

//     const clientesFiltrados = arregloClientes.filter(
//         (cliente) => !ids.some((item1) => item1 === cliente._id)
//     );

//     // const arr2Final = arr2.filter(
//     //     (item2) => !arr1Filtrado.some((item1) => item1 === item2._id)
//     // );

//     return clientesFiltrados;
// }

function consultar_clientes(id) {
    return new Promise((resolve, reject) => {
        let query = { activo: true, "agente.id": id };
        try {
            Cliente.countDocuments(query)
                .then((numero_total) => {
                    Cliente.find(query)
                        .select('_id alias nombre perfil.perfil correo telefono direcciones_asociadas ')
                        .sort({ nombre: 1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            resolve({ ok: true, lista: resDB, numero_total });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

//funcion para consultar todos los productos
function consultar_productos() {
    return new Promise((resolve, reject) => {
        let query = { activo: true };
        try {
            Producto.countDocuments(query)
                .then((numero_total) => {
                    Producto.find(query)
                        .sort({ codigo: -1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

//funcion para consultar todos los pedidos realizados los ultimos N meses
function consultar_pedidos(m) {
    return new Promise((resolve, reject) => {
        let queryinicial = { /*folio: 10093,*/ fecha: { $gte: '2020-12-13T19:34:38.215+00:00', $lte: '2020-12-22T19:34:38.215+00:00' } };
        // Obtener la fecha actual
        const fechaActual = new Date();
        const fecha2 = new Date();

        // Restar N meses a la fecha actual
        fecha2.setMonth(fechaActual.getMonth() - m);

        // Convertir la fecha a formato ISO
        const fechaInicio = fechaActual.toISOString();
        const fechaFinal = fecha2.toISOString();

        // Crear la consulta para los últimos 3 meses
        let query = { fecha: { $gte: fechaFinal, $lte: fechaInicio } };
        let pruebaq = { status: "Enviado" };
        try {
            Pedido.countDocuments(query)
                .then((numero_total) => {
                    Pedido.find(query)
                        .sort({ folio: -1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}
//funcion para consultar todos los pedidos realizados los ultimos N meses y con id de agente
function consultar_pedidos_por_agente(m, id) {
    return new Promise((resolve, reject) => {
        let queryinicial = { /*folio: 10093,*/ fecha: { $gte: '2020-12-13T19:34:38.215+00:00', $lte: '2020-12-22T19:34:38.215+00:00' } };
        // Obtener la fecha actual
        const fechaActual = new Date();
        const fecha2 = new Date();

        // Restar N meses a la fecha actual
        fecha2.setMonth(fechaActual.getMonth() - m);

        // Convertir la fecha a formato ISO
        const fechaInicio = fechaActual.toISOString();
        const fechaFinal = fecha2.toISOString();

        // Crear la consulta para los últimos 3 meses
        let query = { "agente.id": id, fecha: { $gte: fechaFinal, $lte: fechaInicio } };
        let pruebaq = { status: "Enviado" };
        try {
            Pedido.countDocuments(query)
                .then((numero_total) => {
                    Pedido.find(query)
                        .sort({ folio: -1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}

// Define la función que toma dos arreglos y retorna los IDs de los clientes sin repetir
function obtenerIdsClientes(pedido, carrito) {
    // Obtén los IDs de clientes del carrito
    const idsClientesCarrito = carrito.map(item => item.cliente.id);

    // Obtén los IDs de clientes del pedido
    const idsClientesPedido = pedido.map(item => item.cliente.id);

    // Combina los dos conjuntos y elimina duplicados
    const idsClientesUnicos = [...new Set([...idsClientesCarrito, ...idsClientesPedido])];

    return idsClientesUnicos;
}

function consultar_carritos(m) {
    return new Promise((resolve, reject) => {
        let queryinicial = { /*folio: 10093,*/ fecha: { $gte: '2020-12-13T19:34:38.215+00:00', $lte: '2020-12-22T19:34:38.215+00:00' } };
        // Obtener la fecha actual
        const fechaActual = new Date();
        const fecha2 = new Date();

        // Restar 3 meses a la fecha actual
        fecha2.setMonth(fechaActual.getMonth() - m);

        // Convertir la fecha a formato ISO
        const fechaInicio = fechaActual.toISOString();
        const fechaFinal = fecha2.toISOString();

        // Crear la consulta para los últimos 3 meses
        let query = { fecha: { $gte: fechaFinal, $lte: fechaInicio } };
        let pruebaq = { status: "Enviado" };
        try {
            Carrito.countDocuments(query)
                .then((numero_total) => {
                    Carrito.find(query)
                        .sort({ folio: -1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}
//funcion para buscar los carritos en el rango de m meses y por el id del agente
function consultar_carritos_por_agente(m, id) {
    return new Promise((resolve, reject) => {
        let queryinicial = { /*folio: 10093,*/ fecha: { $gte: '2020-12-13T19:34:38.215+00:00', $lte: '2020-12-22T19:34:38.215+00:00' } };
        // Obtener la fecha actual
        const fechaActual = new Date();
        const fecha2 = new Date();

        // Restar 3 meses a la fecha actual
        fecha2.setMonth(fechaActual.getMonth() - m);

        // Convertir la fecha a formato ISO
        const fechaInicio = fechaActual.toISOString();
        const fechaFinal = fecha2.toISOString();

        // Crear la consulta para los últimos 3 meses
        let query = { "agente.id": id, fecha: { $gte: fechaFinal, $lte: fechaInicio } };
        let pruebaq = { status: "Enviado" };
        try {
            Carrito.countDocuments(query)
                .then((numero_total) => {
                    Carrito.find(query)
                        .sort({ folio: -1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
                        })
                })
        } catch (err) {
            console.log(err);
            reject({ ok: false, mensaje: "error al buscar resultados." })
        }
    })
}


function filtrarArreglos(arr1, arr2) {
    // Filtrar arr1: eliminar registros con cantidad menor a 10
    const arr1Filtrado = arr1.filter((item) => item.cantidad >= 10);

    // Filtrar arr2: eliminar registros con el mismo id que en arr1Filtrado
    const arr2Final = arr2.filter(
        (item2) => !arr1Filtrado.some((item1) => item1._id === item2._id)
    );

    return arr2Final;
}

function combinarArreglosConCantidad(arreglo1, arreglo2) {
    const idsObj = {};

    // Función auxiliar para procesar un arreglo y actualizar el objeto idsObj
    function procesarArreglo(arreglo) {
        for (let i = 0; i < arreglo.length; i++) {
            // Verifica que el elemento actual sea un arreglo
            if (Array.isArray(arreglo[i].lista)) {
                // Bucle interno para recorrer los subarreglos
                for (let j = 0; j < arreglo[i].lista.length; j++) {
                    // Verifica que el elemento interno sea un objeto y tiene la propiedad '_id' y 'cantidad'
                    if (
                        typeof arreglo[i].lista[j] === "object" &&
                        arreglo[i].lista[j].hasOwnProperty("_id") &&
                        arreglo[i].lista[j].hasOwnProperty("cantidad")
                    ) {
                        const id = arreglo[i].lista[j].producto._id;
                        const cantidad = arreglo[i].lista[j].cantidad;

                        // Verifica si el id ya está en el objeto
                        if (idsObj.hasOwnProperty(id)) {
                            // Si existe, suma la cantidad
                            idsObj[id] += cantidad;
                        } else {
                            // Si no existe, agrega el id con su cantidad
                            idsObj[id] = cantidad;
                        }
                    }
                }
            }
        }
    }

    // Procesa cada arreglo
    procesarArreglo(arreglo1);
    procesarArreglo(arreglo2);

    // Convierte el objeto a un arreglo antes de devolverlo
    const resultado = Object.keys(idsObj).map((id) => ({
        _id: id,
        cantidad: idsObj[id],
    }));
    return resultado;
}