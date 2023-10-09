
import { isString } from "underscore"
import { Carrito } from "../../../models/carrito"


export async function checar_folios_en_pedido(pedido_id) {
    if (!pedido_id)
        throw new Error({ name: "type", message: "'pedido_id' debe de ser String. No vacio" })

    if (isString(pedido_id) == false) {
        throw new Error({ name: "type", message: "'pedido_id' debe de ser String. No vacio" })
    }

    var reporte = {
        carrito_a_revisar: {
            id: pedido_id,
            encontrado: null,
            folio: null,
            esta_bloqueado_para_ser_descontado: null,
            todos_los_productos_existen_y_estan_activos: null,
            todos_los_productos_son_suficientes: null,
            todos_los_folios_solicitados_aun_existen
        }

    }

    var carrito_a_revisar = await carrito_con_su_id(pedido_id);
    console.log(carrito_a_revisar);
    carrito_a_revisar.log();
    return { ok: true, reporte }

}



const checador_de_folios = function (pedido_id, generar_reporte = false) {


}

async function carrito_con_su_id(pedido_id = como_string) {
    try {
        if (pedido_id == "como_string")
            return { ok: false }
        return Carrito.findById(pedido_id)
            .then((resultadoDB) => {
                return {
                    existe: resultadoDB != undefined && resultadoDB != null,
                    resultado: resultadoDB,
                    log: () => console.log({ origen: "fn() carrito_con_su_id ->_fn_checar_que_todos_los_folios_esten_disponibles.js ", resultadoDB })
                }
            })
    } catch (err) {
        console.log(err);
        return { ok: false, resultadoDB: null }
    }
}



async function checar_folios_de_producto(producto_id = "", folios_solicitados_en_pedido = []) {
    try {
        if (pedido_id == "como_string")
            return { ok: false }
        return Carrito.findById(pedido_id)
            .then((resultadoDB) => {
                return { ok: resultadoDB != null && resultadoDB != undefined, resultadoDB }
            })
    } catch (err) {
        console.log(err);
        return { ok: false, resultadoDB: null }
    }
}
