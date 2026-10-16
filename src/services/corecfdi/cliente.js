import { CoreCfdiError } from "./errores.js";
import { enviar, dormir } from "./transporte.js";

function armarQuery(query) {
    if (!query) return "";
    const params = new URLSearchParams();
    Object.keys(query).forEach((clave) => {
        const valor = query[clave];
        if (valor === undefined || valor === null || valor === "") return;
        params.append(clave, String(valor));
    });
    const texto = params.toString();
    return texto ? "?" + texto : "";
}

/**
 * Cliente HTTP compartido por todos los servicios de CoreCFDI.
 *
 * Pone los headers comunes, renueva el token ante un 401 (un refresh y un solo reintento)
 * y convierte las respuestas de error en CoreCfdiError.
 */
export function crearCoreCfdiCliente({ config, auth, fetch: fetchImpl, logger = console, sleep = dormir }) {
    const leerConfig = typeof config === "function" ? config : () => config;

    /**
     * opciones: { method, ruta, query, json, multipart, timeoutMs, reintentos, esperaReintentoMs,
     *             noReintentarSi, logExtra, binario }
     * `multipart` es una función que devuelve un FormData nuevo: se llama en cada intento para
     * volver a adjuntar los archivos.
     * Con `binario`, un 2xx devuelve { buffer, contentType, contentDisposition } en lugar del JSON.
     */
    async function peticion(opciones) {
        const cfg = leerConfig();
        const method = opciones.method || "GET";
        const url = cfg.baseUrl + opciones.ruta + armarQuery(opciones.query);

        async function intento(accessToken) {
            const headers = {
                "Accept": "application/json",
                "X-Tenant": cfg.tenant,
                "Authorization": `Bearer ${accessToken}`
            };
            let body;
            if (opciones.multipart) {
                // Sin Content-Type: fetch genera el boundary del multipart.
                body = opciones.multipart;
            } else if (opciones.json !== undefined) {
                headers["Content-Type"] = "application/json";
                body = JSON.stringify(opciones.json);
            }

            return enviar({
                fetch: fetchImpl,
                url,
                method,
                headers,
                body,
                endpoint: opciones.ruta,
                timeoutMs: opciones.timeoutMs,
                reintentos: opciones.reintentos || 0,
                esperaReintentoMs: opciones.esperaReintentoMs !== undefined ? opciones.esperaReintentoMs : null,
                noReintentarSi: opciones.noReintentarSi || null,
                logExtra: opciones.logExtra || null,
                binario: !!opciones.binario,
                logger,
                sleep
            });
        }

        let token = await auth.getAccessToken();
        let respuesta = await intento(token);

        if (respuesta.status === 401) {
            const renovados = await auth.refresh({ tokenFallido: token });
            token = renovados.access_token;
            respuesta = await intento(token);
            if (respuesta.status === 401) {
                throw new CoreCfdiError("autenticacion", "CoreCFDI rechazó la sesión incluso después de renovar el token.", { status: 401 });
            }
        }

        const { status, data } = respuesta;
        const mensaje = (data && data.message) || "";

        if (status >= 200 && status < 300) {
            if (opciones.binario) return respuesta.archivo;
            if (data && data.success === false) {
                throw new CoreCfdiError("servidor", mensaje || "CoreCFDI no pudo procesar la petición.", { status });
            }
            return data;
        }
        if (status === 403) {
            throw new CoreCfdiError("prohibido", mensaje || "CoreCFDI no permite esta acción (empresa suspendida o usuario sin permiso).", { status });
        }
        if (status === 404) {
            throw new CoreCfdiError("no_encontrado", mensaje || "CoreCFDI no encontró el recurso solicitado.", { status });
        }
        if (status === 422) {
            // Estas respuestas no traen `success`: solo message y errors por campo.
            throw new CoreCfdiError("validacion", mensaje || "Datos inválidos.", { status, errors: (data && data.errors) || null });
        }
        throw new CoreCfdiError("servidor", mensaje || `CoreCFDI respondió ${status}.`, { status });
    }

    return { peticion };
}
