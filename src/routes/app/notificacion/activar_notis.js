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

var m, us, d = "";

export async function post(req, res, next) {
    /*if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }*/
    m = req.body.m;
    us = req.body.us;
    d = req.body.donde;
    if (m) {
        console.log(us);
        try {

            if (us.rol === "vendedor" && d === "layout") {
                const resultadoClientes = await consultar_clientes(us._id);
                const resultadoPedidos = await consultar_pedidos_por_agente(m, us._id);
                const resultadoCarritos = await consultar_carritos_por_agente(m, us._id);

                const idscli = obtenerIdsClientes(resultadoPedidos.lista, resultadoCarritos.lista);

                const fcli = filtrarDatosClientes(idscli, resultadoClientes.lista);

                if (fcli.length) {
                    res.send({
                        ok: true,
                        mensaje: 'con clientes sin compras',
                        rol: us.rol,
                        ruta: "clientes",
                        notis: true
                    });
                } else {
                    res.send({
                        ok: true,
                        mensaje: 'sin clientes sin compras',
                        notis: false
                    });
                }
            }
            if (us.rol === "vendedor" && d === "clientes") {
                const resultadoClientes = await consultar_clientes(us._id);
                const resultadoPedidos = await consultar_pedidos_por_agente(m, us._id);
                const resultadoCarritos = await consultar_carritos_por_agente(m, us._id);

                const idscli = obtenerIdsClientes(resultadoPedidos.lista, resultadoCarritos.lista);

                const fcli = filtrarDatosClientes(idscli, resultadoClientes.lista);

                if (fcli.length) {
                    res.send({
                        ok: true,
                        mensaje: 'con clientes sin compras',
                        rol: us.rol,
                        clientes: fcli
                    });
                }
            }

            if (us.rol == "administrador" && d === "layout") {
                const resultadoPedidos = await consultar_pedidos(m);
                const resultadoCarritos = await consultar_carritos(m);
                const resultadoProductos = await consultar_productos();
                const resultadoClientesAdmin = await consultar_clientes_admin();
                //-------calculos para productos--------------------------------------
                const idsUnicos = obtenerIdsYCantidad(
                    resultadoCarritos.lista,
                    resultadoPedidos.lista
                );

                const product = eliminarDatosCoincidentes(
                    idsUnicos,
                    resultadoProductos.lista
                );
                //--------------------------------------------------------------------
                //----------calculos para clientes------------------------------------
                const idscli = obtenerIdsClientesAdmin(resultadoCarritos.lista, resultadoPedidos.lista);

                const fcli = filtrarDatosClientes(idscli, resultadoClientesAdmin.lista);
                //--------------------------------------------------------------------
                if (product.length) {
                    res.send({
                        ok: true,
                        mensaje: 'Activar Notis Productos',
                        notis: true,
                        ruta: "productos",
                        rol: us.rol
                    });
                }
                if (fcli.length) {
                    res.send({
                        ok: true,
                        mensaje: 'Activar Notis Clientes',
                        notis: true,
                        ruta: "clientes_admin",
                        rol: us.rol
                    });
                }
                else {
                    res.send({
                        ok: true,
                        mensaje: 'Desactivar Notis',
                        notis: false
                    });
                }
            }
            if (us.rol === "administrador" && d === "productos") {
                //-----------calculos de productos-------------------------------
                const resultadoPedidos = await consultar_pedidos(m);
                const resultadoCarritos = await consultar_carritos(m);
                const resultadoProductos = await consultar_productos();
                const resultadoClientesAdmin = await consultar_clientes_admin();

                const idsUnicos = obtenerIdsYCantidad(
                    resultadoCarritos.lista,
                    resultadoPedidos.lista
                );

                const product = eliminarDatosCoincidentes(
                    idsUnicos,
                    resultadoProductos.lista
                );
                //-----------------------------------------------------------------
                //calculos para activar boton de clientes--------------------------
                const idscli = obtenerIdsClientesAdmin(resultadoCarritos.lista, resultadoPedidos.lista);

                const fcli = filtrarDatosClientes(idscli, resultadoClientesAdmin.lista);
                //-----------------------------------------------------------------
                if (product.length && !fcli.length) {
                    res.send({
                        ok: true,
                        mensaje: 'Activar Notis',
                        productos: product,
                        rol: us.rol,
                        btn: false
                    });
                } if (product.length && fcli.length) {
                    res.send({
                        ok: true,
                        mensaje: 'Activar Notis',
                        productos: product,
                        rol: us.rol,
                        btn: true
                    });
                }
            }
            if (us.rol == "administrador" && d === "clientesAdmin") {
                const resultadoPedidos = await consultar_pedidos(m);
                const resultadoCarritos = await consultar_carritos(m);
                const resultadoClientesAdmin = await consultar_clientes_admin();
                //calculos para activar boton de clientes--------------------------
                const idscli = obtenerIdsClientesAdmin(resultadoCarritos.lista, resultadoPedidos.lista);

                const fcli = filtrarDatosClientes(idscli, resultadoClientesAdmin.lista);
                //-----------------------------------------------------------------
                if (fcli.length) {
                    res.send({
                        ok: true,
                        mensaje: 'clientes sin compra admin',
                        clientes: fcli,
                        rol: us.rol,
                        btn: true
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

function consultar_clientes_admin() {
    return new Promise((resolve, reject) => {
        let query = { activo: true };
        let projection = {
            _id: 1,
            "perfil.perfil": 1,
            alias: 1,
            correo: 1,
            nombre: 1,
            "agente.nombre": 1,
            telefono: 1,
            direcciones_asociadas: 1
        };
        try {
            Cliente.countDocuments(query)
                .then((numero_total) => {
                    Cliente.find(query)
                        .select(projection)
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
        let projection = {
            medidas: 0,
            "subcategoria.imagen": 0,
            categoria: 0,
            categoria_img: 0,
            codigo_de_barras: 0,
            para_venta_publico: 0,
            aplicar_descuento_distribuidor: 0,
            descripcion: 0,
            "promo.id_promocion": 0,
            "promo.tipo_condicion": 0,
            "existencia.minimo": 0,
            "existencia.maximo": 0,
            // "existencia.folios": 0,
            unidad: 0, uid_previo: 0,
            __v: 0,
            caracteristicas_tecnicas: 0,
            category: 0,
            categoria_tags: 0,
            recomendar_como_paqueteria: 0
        };
        try {
            Producto.countDocuments(query)
                .then((numero_total) => {
                    Producto.find(query)
                        .select(projection)
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
        let projection = {
            _id: 1,
            agente: 1,
            cliente: 1,
            folio: 1,
            fecha: 1,
            "lista.cantidad": 1,
            "lista.producto._id": 1
        };
        let pruebaq = { status: "Enviado" };
        try {
            Pedido.countDocuments(query)
                .then((numero_total) => {
                    Pedido.find(query)
                        .select(projection)
                        .sort({ folio: -1 })
                        .exec()
                        .then(async (resDB) => {
                            console.log(resDB)
                            //let lista_filtrada= await filtrar_lista(buscando,resDB);
                            resolve({ ok: true, lista: resDB, /*query,*/ numero_total, paginas: Math.floor((numero_total + 10 - 1) / (10)) });
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

    // Crea un arreglo de objetos con la clave 'id'
    const clientesUnicosConKey = idsClientesUnicos.map(id => ({ id }));

    return clientesUnicosConKey;
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
        let projection = {
            _id: 1,
            agente: 1,
            cliente: 1,
            folio: 1,
            fecha: 1,
            "lista.cantidad": 1,
            "lista.producto._id": 1
        };
        let pruebaq = { status: "Enviado" };
        try {
            Carrito.countDocuments(query)
                .then((numero_total) => {
                    Carrito.find(query)
                        .select(projection)
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
        let projection = {
            _id: 1,
            agente: 1,
            cliente: 1,
            folio: 1,
            fecha: 1,
            "lista.cantidad": 1,
            "lista.producto._id": 1
        };
        let pruebaq = { status: "Enviado" };
        try {
            Carrito.countDocuments(query)
                .then((numero_total) => {
                    Carrito.find(query)
                        .select(projection)
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


function eliminarDatosCoincidentes(arrResultado, arrDatos) {
    // Obtener los _id del arrResultado
    const idsResultado = arrResultado.map(item => item.id);


    // Filtrar el arrDatos para eliminar los elementos con _id coincidentes
    const arrDatosFiltrado = arrDatos.filter(item => !idsResultado.includes(item.id));
    return arrDatosFiltrado;
}

function obtenerIdsYCantidad(array1, array2) {
    // Crear un objeto para almacenar los ids y sumar las cantidades
    const resultado = {};

    // Función auxiliar para agregar ids y cantidades al objeto resultado
    function agregarAlResultado(lista) {
        lista.forEach(item => {
            const id = item.producto._id;
            const cantidad = item.cantidad;
            if (resultado[id]) {
                // Si el id ya está en el resultado, sumar la cantidad
                resultado[id] += cantidad;
            } else {
                // Si el id no está en el resultado, agregarlo con la cantidad
                resultado[id] = cantidad;
            }
        });
    }

    // Agregar ids y cantidades de ambos arrays al resultado
    array1.forEach(item => agregarAlResultado(item.lista));
    array2.forEach(item => agregarAlResultado(item.lista));

    // Crear un nuevo arreglo con objetos que contienen id y cantidad
    const resultadoFinal = Object.keys(resultado)
        .map(id => ({
            id,
            cantidad: resultado[id],
        }))
        .filter(item => item.cantidad > 10);

    return resultadoFinal;
}

function obtenerIdsClientesAdmin(arr1, arr2) {
    // Utilizar un Set para almacenar ids sin repeticiones
    const idsSet = new Set();

    // Iterar sobre ambos arreglos y agregar los ids al Set
    arr1.forEach(item => {
        if (item.cliente && item.cliente.id) {
            idsSet.add(item.cliente.id);
        }
    });

    arr2.forEach(item => {
        if (item.cliente && item.cliente.id) {
            idsSet.add(item.cliente.id);
        }
    });

    // Convertir el Set a un arreglo de objetos con la propiedad "id"
    const idsClientes = Array.from(idsSet).map(id => ({ id }));

    return idsClientes;
}

function filtrarDatosClientes(idsClientes, datosClientes) {
    // Obtener solo los ids del arreglo de objetos idsAgentes
    const idsSolo = idsClientes.map(item => item.id);
    console.log("IDs Solo:", idsSolo);

    // Filtrar los datos del segundo arreglo
    const datosFiltrados = datosClientes.filter(cliente => !idsSolo.includes(cliente.id));
    console.log("Datos Filtrados:", datosFiltrados);

    return datosFiltrados;
}