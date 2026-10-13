/**
 * Error único de la integración con CoreCFDI.
 *
 * tipo:
 *  - configuracion   falta CORECFDI_BASE_URL
 *  - sesion          el usuario no ha iniciado sesión en CoreCFDI o ya no se pudo renovar
 *  - credenciales    401 en login
 *  - autenticacion   401 que no se resolvió con refresh
 *  - prohibido       403 (empresa suspendida o usuario sin permiso)
 *  - validacion      422 o validación previa del lado del cliente (trae `errors` por campo)
 *  - no_encontrado   404
 *  - limite          429 después de esperar Retry-After
 *  - duplicada       el periodo y tipo ya tiene una solicitud activa
 *  - servidor        5xx
 *  - timeout         se agotó el tiempo de espera
 *  - red             error de red
 */
export class CoreCfdiError extends Error {
    constructor(tipo, message, extra = {}) {
        super(message);
        this.name = "CoreCfdiError";
        this.tipo = tipo;
        this.status = extra.status || null;
        this.errors = extra.errors || null;
        this.datos = extra.datos || null;
    }
}

export function errorDeValidacion(errors, message) {
    const primero = Object.keys(errors)[0];
    return new CoreCfdiError("validacion", message || errors[primero][0], { status: 422, errors });
}

/**
 * Convierte cualquier error en el formato que usan las rutas de este sistema: { ok, mensaje, ... }.
 */
export function respuestaDeError(err) {
    if (err instanceof CoreCfdiError) {
        return {
            ok: false,
            mensaje: err.message,
            tipo: err.tipo,
            status: err.status,
            errors: err.errors,
            datos: err.datos
        };
    }
    return { ok: false, mensaje: "Error inesperado en la integración con CoreCFDI: " + err.message, tipo: "desconocido" };
}
