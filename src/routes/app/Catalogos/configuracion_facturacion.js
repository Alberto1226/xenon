import * as accesos from "../accesos";
import { ConfiguracionFacturacion } from "../../../models/configuracion_facturacion";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "sesión expirada" });
    }

    const { tipo, dato } = req.body;

    try {
        if (tipo === "obtener") {
            let config = await ConfiguracionFacturacion.findOne().exec();
            if (!config) config = await ConfiguracionFacturacion.create({});
            return res.send({ ok: true, config });
        }

        if (tipo === "guardar") {
            if (accesos.tiene_permisos_administrativos(req) === false) {
                return res.send({ ok: false, mensaje: "Solo el administrador puede cambiar la configuración de facturación." });
            }
            if (!dato) {
                return res.send({ ok: false, mensaje: "Los datos de configuración no pueden estar vacíos" });
            }
            let config = await ConfiguracionFacturacion.findOne().exec();
            if (!config) config = new ConfiguracionFacturacion();
            if (dato.requerir_pedimentos !== undefined) {
                config.requerir_pedimentos = dato.requerir_pedimentos === true;
            }
            config.fecha_modificacion = new Date();
            if (req.user && req.user.nombre) config.usuario_modifico = req.user.nombre;
            await config.save();
            return res.send({ ok: true, mensaje: "Configuración guardada exitosamente", config });
        }
    } catch (error) {
        console.log("Error en configuracion_facturacion:", error);
        return res.send({ ok: false, mensaje: "Error en la configuración de facturación" });
    }
    res.send({ ok: false, mensaje: "Tipo de acción no soportado" });
}
