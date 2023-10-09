import { Carrito } from "../../../models/carrito";
import { Producto } from "../../../models/producto";

export async function post(req, res) {

    const { pedido_id } = req.body;

    console.log({ boo: req.body });
    console.log(pedido_id)

    let carrito_proc = await encontrar_carrito(pedido_id);
    if (carrito_proc.ok == false) {
        return res.send({ ok: false, mensaje: "El pedido no se pudo encontrar." })
    }
    let carrito = carrito_proc.carrito;
    console.log("*****Checar folios de salida que aun existan en sus productos respectivos");
    var { todos_los_folios_ok, reporte_de_folios_para_frontend } = await los_folios_de_todos_los_productos_estan_disponibles(carrito.lista);
    console.log({ todos_los_folios_ok });

    if (todos_los_folios_ok != true) {
        console.log("------no bien--------");
        return res.send({ ok: false, mensaje: 'Algunos de los folios seleccionados no existen ya', reporte_de_folios_para_frontend });
    }

}




function encontrar_carrito(id_carrito) {
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



async function los_folios_de_todos_los_productos_estan_disponibles(lista) {
    var contador_de_exitos = 0;
    var reportes_de_productos = [];
    //      Ciclo Registro por Registro
    for (let i = 0; i < lista.length; i++) {
        const registro_en_pedido = lista[i];
        console.log(i)
        let { resultado, reporte_producto } = await los_folios_de_este_producto_estan_disponibles(registro_en_pedido);
        reportes_de_productos.push(reporte_producto);
        if (resultado == true) contador_de_exitos++;
        if (i + 1 == lista.length) {
            console.log("***********------");
            let reporte_de_folios_para_frontend = []
            //console.log({ contador_de_exitos });
            //console.log({ total: lista.length });
            if (contador_de_exitos < lista.length) {
                reporte_de_folios_para_frontend = await generar_reporte_para_cliente(reportes_de_productos);
            }
            return {
                contador_de_exitos: contador_de_exitos == lista.length,
                reporte_de_folios_para_frontend
            };
        }
    }
}



async function los_folios_de_este_producto_estan_disponibles(registro) {
    if (registro.folios.length == 0) return true;
    //  Los que no ocupan folios no pasan de aqui
    var contador_de_exitos = 0;
    console.log("checando el producto " + registro.producto.nombre);
    let producto_tmp = await encontrar_producto(registro.producto._id);
    for (let i = 0; i < registro.folios.length; i++) {
        const element = registro.folios[i];
        console.log("Folio a checar =" + element);
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
            console.log("Se termino de checar el producto");
            console.log(reporte_producto);
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




async function generar_reporte_para_cliente(reportes) {
    console.log("Generar reporte para cliente ----------------------------------------------------------");
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
    console.log(JSON.stringify(errores_solamente))
    //console.log("Generar reporte para cliente FIN -------------------------------------------------------");
    return errores_solamente;
}
