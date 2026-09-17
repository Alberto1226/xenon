import { Cliente } from "../../../../models/cliente";
import { Carrito } from "../../../../models/carrito";
import * as accesos from "../../accesos";
import { evaluar_datos_completos, LIMITE_COTIZACIONES_CON_DATOS_INCOMPLETOS } from "../../clientes/_datos_completos";
import { crear_pedido } from "../_servicios/pedido_pipeline_service";

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

    // Checar si tiene carrito pendiente en borrador (solo Pedido y Ficha pago bloquean)
    const tiene_carrito_ = await tiene_carrito(cliente_id);
    if (tiene_carrito_) {
        res.send({
            ok: false,
            mensaje: "El cliente ya tiene un pedido en borrador o pendiente de pago.",
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

async function tiene_carrito(id) {
    return new Promise((resolve, reject) => {
        // Solo los estados en borrador/previos a pago ('Pedido' y 'Ficha pago') bloquean crear otro pedido simultáneo.
        Carrito.findOne().or([
            { 'cliente.id': id, status: 'Pedido' },
            { 'cliente.id': id, status: 'Ficha pago' }
        ])
            .then((resDB) => {
                resolve(resDB != null);
            })
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}