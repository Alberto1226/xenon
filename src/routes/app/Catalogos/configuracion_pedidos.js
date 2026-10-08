import * as accesos from "../accesos";
import { ConfiguracionPedidos } from "../../../models/configuracion_pedidos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesión expirada" });
        return;
    }

    const { tipo, dato } = req.body;

    if (tipo === "obtener") {
        try {
            let config = await ConfiguracionPedidos.findOne().exec();
            if (!config) {
                // Crear configuración por defecto si no existe
                config = await ConfiguracionPedidos.create({
                    limite_pedidos_abiertos: 3,
                    status_minimo_requerido: 'Pagado',
                    aplicar_regla_status_minimo: true,
                    restringir_pedidos_datos_incompletos: true
                });
            }
            res.send({ ok: true, config });
        } catch (error) {
            console.log("Error al consultar configuracion_pedidos:", error);
            res.send({ ok: false, mensaje: "Error al consultar la configuración de pedidos", error });
        }
        return;
    }

    if (tipo === "guardar") {
        // El switch de permisos de edición solo puede modificarlo un administrador.
        if (accesos.tiene_permisos_administrativos(req) === false) {
            return res.send({ ok: false, mensaje: "Solo el administrador puede cambiar la configuración de edición de clientes." });
        }
        try {
            if (!dato) {
                res.send({ ok: false, mensaje: "Los datos de configuración no pueden estar vacíos" });
                return;
            }

            let config = await ConfiguracionPedidos.findOne().exec();
            if (!config) {
                config = new ConfiguracionPedidos();
            }

            if (dato.limite_pedidos_abiertos !== undefined) {
                config.limite_pedidos_abiertos = Math.max(1, parseInt(dato.limite_pedidos_abiertos) || 3);
            }
            if (dato.status_minimo_requerido !== undefined) {
                config.status_minimo_requerido = dato.status_minimo_requerido;
            }
            if (dato.aplicar_regla_status_minimo !== undefined) {
                config.aplicar_regla_status_minimo = Boolean(dato.aplicar_regla_status_minimo);
            }
            if (dato.restringir_pedidos_datos_incompletos !== undefined) {
                config.restringir_pedidos_datos_incompletos = dato.restringir_pedidos_datos_incompletos === true;
            }
            if (dato.permitir_edicion_clientes_agentes !== undefined) {
                config.permitir_edicion_clientes_agentes = dato.permitir_edicion_clientes_agentes === true;
            }

            config.fecha_modificacion = new Date();
            if (req.user && req.user.nombre) {
                config.usuario_modifico = req.user.nombre;
            }

            await config.save();
            res.send({ ok: true, mensaje: "Configuración guardada exitosamente", config });
        } catch (error) {
            console.log("Error al guardar configuracion_pedidos:", error);
            res.send({ ok: false, mensaje: "Error al guardar la configuración de pedidos", error });
        }
        return;
    }

    res.send({ ok: false, mensaje: "Tipo de acción no soportado" });
}
