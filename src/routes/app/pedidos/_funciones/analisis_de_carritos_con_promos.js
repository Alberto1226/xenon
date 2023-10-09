//         FN de backend
//      funcion que checa que un carrito tenga las promos en orden
//      devuielve un resumen del proceso de chequeo , 
//      no puede ser llamada desde ffront end solo desde server
import { Carrito } from './../../../../models/carrito';
import { Promocion } from './../../../../models/promocion';

export async function analisis_de_carritos_con_promos(id_carrito) {
    const carritoDB = await devolver_carrito(id_carrito);
    if (carritoDB.ok == false || !carritoDB.carrito) {
        return { ok: false, mensaje: "El Carrito ya no existe" };
    }
    const resumen = await todas_las_promos_cumplen_sus_condiciones(carritoDB.carrito.lista);
    // console.log("-------><>>>><");
    return resumen
}

async function devolver_carrito(id_carrito) {
    return Carrito.findById(id_carrito)
        .then((carrito) => {
            return { ok: true, carrito }
        })
        .catch((err) => {
            //console.log(err);
            return { ok: false, carrito: null }
        })

}


async function todas_las_promos_cumplen_sus_condiciones(lista_de_registros) {
    var error_mayor = 0;//      Solamente util cuando la promo no se puede encontrar, lo cual nunca deberia de pasar
    var contador_correctos = 0;//       Contador de correctos debe de incluir los que no son promos
    var lista_de_feedbacks = [] //        feebacks producto por producto
    for (let i = 0; i < lista_de_registros.length; i++) {
        const registro = lista_de_registros[i];
        const producto = registro.producto;
        const con_promo = registro.promo != undefined ? registro.promo.con_promo : false;
        let feedback = {
            ok: true,
            nombre: registro.producto.nombre,
            galeria_imagenes: registro.producto.galeria_imagenes,
            con_promo
        }
        if (con_promo == true) {
            const promocion_proceso = await devolver_promocion(producto.promo.id_promocion);
            if (promocion_proceso.ok == false) {
                error_mayor++;
                feedback.ok = false;
            } else {
                const promocion = promocion_proceso.promocion;
                const condiciones = promocion.condiciones;
                const tipo_condicion = promocion.tipo_condicion;
                console.log(registro.cantidad)
                const cumple_condicion_resultado = await cumple_condicion(tipo_condicion, condiciones, lista_de_registros, registro);
                if (cumple_condicion_resultado.cumple == true) contador_correctos++;
                //feedback = cumple_condicion_resultado;
                feedback.con_promo = true;
                feedback.ok = true;
                feedback.feedback = cumple_condicion_resultado.feedback;
                feedback.nombre = cumple_condicion_resultado.feedback.nombre;
                //console.log(cumple_condicion_resultado);
            }
        } else {
            //      Auque no tenga promo se le califica como correcto
            contador_correctos++;
        }
        //          guardar feedback

        lista_de_feedbacks.push(feedback)
        //console.log({registro,producto,con_promo})
        if (lista_de_registros.length == i + 1) {
            //console.log({total_registros:lista_de_registros.length,                contador_correctos            })
            return {
                todo_bien: contador_correctos == lista_de_registros.length,
                error_mayor,
                lista_de_feedbacks
            };
        }
    }
}


async function cumple_condicion(tipo_condicion, condiciones, lista_de_registros, registro) {
    let feedback = {
        con_promo: true,
        nombre: registro.producto.nombre,
        tipo_condicion: 0,
        cumple: false
    }
    if (tipo_condicion == 1) {
        //      Sin condiciones
        //console.log("----sin condiciones tipo 1");
        feedback.tipo_condicion = 1;
        feedback.cumple = true;
        return { cumple: feedback.cumple, feedback };
    }
    if (tipo_condicion == 2) {
        //      Minimo del mismo producto
        const cantidad_minima = condiciones[0].minimo_unidades;
        const cantidad_en_registro = registro.cantidad;

        //console.log("----minimo simple tipo 2");
        feedback.tipo_condicion = 2;
        feedback.cumple = cantidad_minima <= cantidad_en_registro;
        return { cumple: feedback.cumple, feedback };
    }
    if (tipo_condicion == 3) {
        //      Minimo compuesto
        const minimos_compuestos_cumplen_proceso = await minimos_compuestos_cumplen(condiciones, lista_de_registros, registro);
        //console.log("----complejo tipo 3");
        feedback.tipo_condicion = 3;
        feedback.cumple = minimos_compuestos_cumplen_proceso.cumplen;
        //console.log(minimos_compuestos_cumplen_proceso);
        return { cumple: feedback.cumple, feedback };
    }
}

async function minimos_compuestos_cumplen(condiciones, lista_de_registros, registro) {
    //      ciclo condicion por condicion
    var contador_suficientes = 0;
    var explicaciones = [];
    for (let i = 0; i < condiciones.length; i++) {
        const condicion = condiciones[i];
        const registro_producto_en_pedido = lista_de_registros.find(elem => elem.producto._id == condicion.id);
        console.log(registro_producto_en_pedido)
        var suficientes = false;
        if (registro_producto_en_pedido) {
            suficientes = registro_producto_en_pedido ? registro_producto_en_pedido.cantidad : 0 >= condicion.minimo_unidades
        }
        if (suficientes == true) contador_suficientes++;
        //  Describir explicacion
        let explicacion = {
            nombre: condicion.nombre,
            suficientes,
            minimo_unidades: condicion.minimo_unidades,
            cantidad_en_pedido: registro_producto_en_pedido ? registro_producto_en_pedido.cantidad : 0
        }
        explicaciones.push(explicacion);
        if (i + 1 == condiciones.length) {
            return { nombre: registro.producto.nombre, cumplen: contador_suficientes == condiciones.length, explicaciones };
        }
    }
}


async function devolver_promocion(id) {
    return Promocion.findById(id)
        .then((resultadoDB) => {
            return { ok: true, promocion: resultadoDB }
        })
        .catch((err) => {
            console.log(err)
            return { ok: false, promocion: resultadoDB }
        })
}