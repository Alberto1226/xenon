import { CoreCfdiError } from "./errores.js";

export const TIMEOUT_POR_DEFECTO_MS = 20000;
const ESPERA_MAXIMA_RETRY_AFTER_MS = 60000;

export function dormir(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function leerRetryAfterMs(response) {
    const valor = response.headers && response.headers.get ? response.headers.get("retry-after") : null;
    if (!valor) return 1000;
    const segundos = Number(valor);
    if (!isNaN(segundos)) return Math.min(Math.max(segundos, 0) * 1000, ESPERA_MAXIMA_RETRY_AFTER_MS);
    const fecha = Date.parse(valor);
    if (isNaN(fecha)) return 1000;
    return Math.min(Math.max(fecha - Date.now(), 0), ESPERA_MAXIMA_RETRY_AFTER_MS);
}

async function leerJson(response) {
    try {
        const texto = await response.text();
        return texto ? JSON.parse(texto) : null;
    } catch (err) {
        return null;
    }
}

/**
 * Envía una petición a CoreCFDI con las reglas de transporte compartidas:
 * timeout, 429 (espera Retry-After y reintenta una vez), reintentos en 5xx / red y log por petición.
 *
 * No interpreta 401/403/422: devuelve { status, data } y el que llama decide.
 * `body` puede ser una función para reconstruir el cuerpo en cada intento (multipart).
 * Con `binario`, una respuesta 2xx no se lee como JSON: llega en `archivo` como
 * { buffer, contentType, contentDisposition }. Los errores sí se leen como JSON.
 * El log solo lleva endpoint, status y duración (más `logExtra`); nunca headers ni cuerpo.
 */
export async function enviar(opciones) {
    const {
        fetch: fetchImpl,
        url,
        method = "GET",
        headers = {},
        body,
        endpoint,
        timeoutMs = TIMEOUT_POR_DEFECTO_MS,
        reintentos = 0,
        esperaReintentoMs = null,
        reintentarEnTimeout = method === "GET",
        noReintentarSi = null,
        logger = console,
        sleep = dormir,
        logExtra = null,
        binario = false
    } = opciones;

    let intentosDeFallo = 0;
    let yaEsperoPorLimite = false;

    while (true) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const inicio = Date.now();
        let response = null;
        let errorDeRed = null;
        let data = null;
        let archivo = null;

        try {
            response = await fetchImpl(url, {
                method,
                headers,
                body: typeof body === "function" ? body() : body,
                signal: controller.signal
            });
            if (binario && response.status >= 200 && response.status < 300) {
                archivo = {
                    buffer: Buffer.from(await response.arrayBuffer()),
                    contentType: response.headers.get("content-type") || null,
                    contentDisposition: response.headers.get("content-disposition") || null
                };
            } else {
                data = await leerJson(response);
            }
        } catch (err) {
            errorDeRed = err;
        } finally {
            clearTimeout(timer);
        }

        const duracion = Date.now() - inicio;
        const extra = logExtra ? " " + JSON.stringify(logExtra) : "";

        if (errorDeRed) {
            const esTimeout = errorDeRed.name === "AbortError" || errorDeRed.name === "TimeoutError";
            logger.log(`[CoreCFDI] ${method} ${endpoint} -> ${esTimeout ? "timeout" : "error de red"} (${duracion} ms)${extra}`);

            const puedeReintentar = intentosDeFallo < reintentos && (!esTimeout || reintentarEnTimeout);
            if (puedeReintentar) {
                intentosDeFallo++;
                await sleep(esperaReintentoMs !== null ? esperaReintentoMs : 500 * Math.pow(2, intentosDeFallo - 1));
                continue;
            }
            if (esTimeout) {
                throw new CoreCfdiError("timeout", `CoreCFDI no respondió en ${Math.round(timeoutMs / 1000)} s (${endpoint}).`);
            }
            throw new CoreCfdiError("red", `No se pudo conectar con CoreCFDI (${endpoint}).`);
        }

        logger.log(`[CoreCFDI] ${method} ${endpoint} -> ${response.status} (${duracion} ms)${extra}`);

        if (response.status === 429) {
            if (!yaEsperoPorLimite) {
                yaEsperoPorLimite = true;
                await sleep(leerRetryAfterMs(response));
                continue;
            }
            throw new CoreCfdiError("limite", "CoreCFDI rechazó la petición por exceso de llamadas (60 por minuto). Intente de nuevo en un momento.", { status: 429 });
        }

        if (response.status >= 500) {
            const mensaje = data && data.message ? String(data.message) : "";
            const bloqueado = noReintentarSi && noReintentarSi(mensaje);
            if (intentosDeFallo < reintentos && !bloqueado) {
                intentosDeFallo++;
                await sleep(esperaReintentoMs !== null ? esperaReintentoMs : 500 * Math.pow(2, intentosDeFallo - 1));
                continue;
            }
        }

        return { status: response.status, data, archivo };
    }
}
