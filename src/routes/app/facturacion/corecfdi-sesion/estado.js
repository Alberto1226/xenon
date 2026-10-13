import * as accesos from "../../accesos";
import { leerConfigCoreCfdi, estadoSesionCoreCfdi } from "../../../../services/corecfdi";

// Dice si el usuario ya inició sesión en CoreCFDI (y con qué empresa y email).
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        let configurado = true;
        let mensaje_configuracion = "";
        try {
            leerConfigCoreCfdi(process.env);
        } catch (err) {
            configurado = false;
            mensaje_configuracion = err.message;
        }

        const sesion = await estadoSesionCoreCfdi(req);
        return res.send({ ok: true, configurado, mensaje_configuracion, ...sesion });
    } catch (err) {
        console.error("Error al consultar la sesión de CoreCFDI:", err.message);
        return res.send({ ok: false, mensaje: "No se pudo consultar la sesión de CoreCFDI." });
    }
}
