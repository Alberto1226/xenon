import { Cliente } from "../../../../models/cliente";
import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos";
import { evaluar_datos_completos, LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS } from "../../clientes/_datos_completos";
import { crear_pedido } from "../_servicios/pedido_pipeline_service";
import { evaluar_restricciones_pedido_cliente } from "./ya_tiene_carrito";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    const data = req.body;
    const uid = req.user._id;
    if (!uid) {
        res.send({ ok: false, mensaje: "Usuario no identificado" });
        return;
    }

    const cliente_id = data.pedido_nuevo.cliente._id;

    // Checar dinámicamente si el cliente cumple las reglas de limite_pedidos_abiertos y status_minimo_requerido
    const evaluacion = await evaluar_restricciones_pedido_cliente(cliente_id);
    if (!evaluacion.permitido) {
        res.send({
            ok: false,
            mensaje: evaluacion.mensaje || "El cliente no cumple con las condiciones para aperturar un nuevo pedido.",
        });
        return;
    }

    // Revalidar en backend el límite de cotizaciones con datos incompletos
    const cliente_db_validacion = await Cliente.findById(cliente_id);
    let resultado_datos_completos = { completos: true, campos_faltantes: [] };
    if (cliente_db_validacion) {
        resultado_datos_completos = evaluar_datos_completos(cliente_db_validacion);
        const cotizaciones_previas = cliente_db_validacion.cotizaciones_con_datos_incompletos || 0;
        if (!resultado_datos_completos.completos && cotizaciones_previas >= LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS) {
            res.send({
                ok: false,
                mensaje: "El cliente alcanzó el límite de cotizaciones con información incompleta. Completa: " + resultado_datos_completos.campos_faltantes.join(", "),
            });
            return;
        }
    }

    // Delegar creación al Pipeline Service
    const resultado_pipeline = await crear_pedido(data, req.user, req);

    if (resultado_pipeline.ok) {
        if (cliente_db_validacion && !resultado_datos_completos.completos) {
            Cliente.findByIdAndUpdate(cliente_db_validacion._id, { $inc: { cotizaciones_con_datos_incompletos: 1 } }).catch((err) => console.log(err));
        }

        res.send({
            ok: true,
            carrito_creado: resultado_pipeline.carrito_creado,
            detalle: "Se ha creado el pedido"
        });
    } else {
        res.send({
            ok: false,
            mensaje: resultado_pipeline.mensaje || "Error al crear el pedido"
        });
    }
}