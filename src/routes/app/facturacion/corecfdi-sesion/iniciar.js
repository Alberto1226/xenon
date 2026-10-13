import * as accesos from "../../accesos";
import { iniciarSesionCoreCfdi, respuestaDeError } from "../../../../services/corecfdi";

// Inicia la sesión del usuario en CoreCFDI con la empresa (tenant), el email y la contraseña.
// La contraseña solo se usa para esta llamada: no se guarda ni se escribe en logs.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "Sesión expirada" });
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        return res.send({ ok: false, mensaje: "Acceso no autorizado" });
    }

    try {
        const { tenant, email, password } = req.body;
        const sesion = await iniciarSesionCoreCfdi(req, { tenant, email, password });
        return res.send({ ok: true, mensaje: "Sesión iniciada en CoreCFDI.", activa: true, ...sesion });
    } catch (err) {
        // Solo el mensaje: el error nunca debe arrastrar el cuerpo de la petición al log.
        console.error("Error al iniciar sesión en CoreCFDI:", err.message);
        return res.send(respuestaDeError(err));
    }
}
