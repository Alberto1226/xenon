import { Carrito } from "./../../../../models/carrito";
import { Cliente } from "./../../../../models/cliente";
import { ConfiguracionPedidos } from "./../../../../models/configuracion_pedidos";
import * as accesos from "./../../accesos";
import { evaluar_datos_completos, LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS } from "./../../clientes/_datos_completos";

const STATUS_JERARQUIA = {
    'Pedido': 1,
    'Ficha pago': 2,
    'Ficha Pago': 2,
    'Pagado': 3,
    'Empaque': 4,
    'Envío': 5,
    'Envio': 5,
    'Entregado': 6
};

export async function evaluar_restricciones_pedido_cliente(cliente_id) {
    let config = await ConfiguracionPedidos.findOne().exec();
    if (!config) {
        config = {
            limite_pedidos_abiertos: 3,
            status_minimo_requerido: 'Pagado',
            aplicar_regla_status_minimo: true
        };
    }

    // Pedidos abiertos (excluye Envío, Envio, Entregado y Cancelado)
    const carritosAbiertos = await Carrito.find({
        'cliente.id': cliente_id,
        status: { $nin: ['Envío', 'Envio', 'Entregado', 'Cancelado'] }
    }).select('folio status').exec();

    const pedidos_abiertos = carritosAbiertos.map(c => ({
        folio: c.folio,
        status: c.status
    }));
    const total_pedidos_abiertos = carritosAbiertos.length;

    // 1. Validar límite máximo de pedidos abiertos
    if (carritosAbiertos.length >= config.limite_pedidos_abiertos) {
        return {
            permitido: false,
            carrito: carritosAbiertos[0],
            pedidos_abiertos,
            total_pedidos_abiertos,
            mensaje: `El cliente ha alcanzado el límite máximo permitido de ${config.limite_pedidos_abiertos} pedido(s) abierto(s).`
        };
    }

    // 2. Validar estatus mínimo requerido
    if (config.aplicar_regla_status_minimo && config.status_minimo_requerido !== 'Ninguno') {
        const nivelMinimoRequerido = STATUS_JERARQUIA[config.status_minimo_requerido] || 3;
        const pedidoConStatusBajo = carritosAbiertos.find(c => {
            const nivelActual = STATUS_JERARQUIA[c.status] || 1;
            return nivelActual < nivelMinimoRequerido;
        });

        if (pedidoConStatusBajo) {
            return {
                permitido: false,
                carrito: pedidoConStatusBajo,
                pedidos_abiertos,
                total_pedidos_abiertos,
                mensaje: `El cliente tiene un pedido activo en estatus '${pedidoConStatusBajo.status}'. Para abrir un nuevo pedido, sus notas abiertas deben estar al menos en estatus '${config.status_minimo_requerido}'.`
            };
        }
    }

    return {
        permitido: true,
        carrito: null,
        pedidos_abiertos,
        total_pedidos_abiertos,
        mensaje: ""
    };
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    var doc = req.body;

    try {
        const evaluacion = await evaluar_restricciones_pedido_cliente(doc.id);
        const cliente = await Cliente.findById(doc.id);

        let datos_completos = true;
        let campos_faltantes = [];
        let cotizaciones_con_datos_incompletos = 0;
        let cotizaciones_disponibles = LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS;

        if (cliente) {
            const resultado = evaluar_datos_completos(cliente);
            datos_completos = resultado.completos;
            campos_faltantes = resultado.campos_faltantes;
            cotizaciones_con_datos_incompletos = cliente.cotizaciones_con_datos_incompletos || 0;
            cotizaciones_disponibles = Math.max(0, LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS - cotizaciones_con_datos_incompletos);
        }

        res.send({
            ok: true,
            carrito: evaluacion.carrito,
            pedidos_abiertos: evaluacion.pedidos_abiertos,
            total_pedidos_abiertos: evaluacion.total_pedidos_abiertos,
            cliente_tiene_carrito: !evaluacion.permitido,
            mensaje_bloqueo: evaluacion.mensaje,
            datos_completos,
            campos_faltantes,
            cotizaciones_con_datos_incompletos,
            cotizaciones_disponibles,
            bloqueado_por_datos_incompletos: datos_completos === false && cotizaciones_disponibles <= 0,
        });
    } catch (err) {
        console.log(err);
        res.send({ ok: false, mensaje: "error al buscar resultados." });
    }
}
