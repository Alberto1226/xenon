// Utilidades de las pruebas de CoreCFDI: API simulada, log capturado y servicios en memoria.
// Ninguna prueba llama a CoreCFDI ni al SAT, ni necesita una FIEL real.
import { crearCoreCfdiAuth } from "../../src/services/corecfdi/auth.js";
import { crearCoreCfdiCliente } from "../../src/services/corecfdi/cliente.js";
import { crearCoreCfdiSat } from "../../src/services/corecfdi/sat.js";
import { crearCoreCfdiFacturas } from "../../src/services/corecfdi/facturas.js";
import {
    crearAlmacenTokensMemoria,
    crearAlmacenSolicitudesMemoria,
    crearLockMemoria
} from "../../src/services/corecfdi/almacenMemoria.js";

export const CONFIG = {
    baseUrl: "https://corecfdi.prueba/api/v1",
    tenant: "empresa-demo",
    email: "api@empresa.com",
    password: "S3cret0-de-prueba",
    deviceName: "xenon-pruebas"
};

export const AHORA = Date.parse("2026-03-10T18:00:00Z");

export function json(status, body, headers = {}) {
    return { status, body, headers };
}

/**
 * fetch simulado. `manejador(llamada, numero)` devuelve json(status, body) o lanza un error.
 * Guarda cada llamada en `api.llamadas` con { url, ruta, method, headers, body }.
 */
export function crearApiFalsa(manejador) {
    const llamadas = [];
    async function fetchFalso(url, opciones = {}) {
        const direccion = new URL(url);
        const llamada = {
            url,
            ruta: direccion.pathname.replace("/api/v1", ""),
            query: Object.fromEntries(direccion.searchParams.entries()),
            method: opciones.method || "GET",
            headers: opciones.headers || {},
            body: opciones.body
        };
        llamadas.push(llamada);
        const respuesta = await manejador(llamada, llamadas.length);
        return new Response(respuesta.body === undefined ? "" : JSON.stringify(respuesta.body), {
            status: respuesta.status,
            headers: respuesta.headers
        });
    }
    return { fetch: fetchFalso, llamadas, deRuta: (ruta) => llamadas.filter((l) => l.ruta === ruta) };
}

export function crearLogger() {
    const lineas = [];
    const anotar = (...partes) => lineas.push(partes.map(String).join(" "));
    return { lineas, log: anotar, error: anotar, texto: () => lineas.join("\n") };
}

export function crearSleep() {
    const esperas = [];
    const sleep = async (ms) => {
        esperas.push(ms);
    };
    sleep.esperas = esperas;
    return sleep;
}

export function errorDeTimeout() {
    const err = new Error("This operation was aborted");
    err.name = "AbortError";
    return err;
}

export const TOKENS_VIGENTES = {
    access_token: "20|access-vigente",
    refresh_token: "21|refresh-vigente",
    tenant_id: "t-1",
    user: { id: 1 },
    expires_at: AHORA + 10 * 60 * 1000
};

export const RESPUESTA_LOGIN = {
    success: true,
    message: "Autenticación exitosa",
    data: {
        access_token: "12|access-login",
        refresh_token: "13|refresh-login",
        token_type: "Bearer",
        tenant_id: "t-1",
        expires_in_minutes: 15,
        user: { id: 1, name: "API", email: "api@empresa.com", rol_id: 1 }
    }
};

export const RESPUESTA_REFRESH = {
    success: true,
    message: "Token renovado correctamente",
    data: { access_token: "14|access-nuevo", refresh_token: "15|refresh-nuevo", token_type: "Bearer", expires_in_minutes: 15 }
};

/**
 * Arma todos los servicios sobre una API simulada. `tokens` son los que ya están guardados
 * (por defecto unos vigentes; null = sin sesión).
 */
export async function crearEntorno(manejador, { tokens = TOKENS_VIGENTES, ahora = () => AHORA } = {}) {
    const api = crearApiFalsa(manejador);
    const logger = crearLogger();
    const sleep = crearSleep();
    const almacenTokens = crearAlmacenTokensMemoria();
    const almacenSolicitudes = crearAlmacenSolicitudesMemoria();
    const lock = crearLockMemoria();
    if (tokens) await almacenTokens.guardar(CONFIG.tenant, tokens);

    const auth = crearCoreCfdiAuth({ config: CONFIG, almacen: almacenTokens, lock, fetch: api.fetch, logger, sleep, ahora });
    const cliente = crearCoreCfdiCliente({ config: CONFIG, auth, fetch: api.fetch, logger, sleep });
    const sat = crearCoreCfdiSat({ cliente, almacen: almacenSolicitudes, lock, logger, sleep, ahora });
    const facturas = crearCoreCfdiFacturas({ cliente });

    return { api, logger, sleep, almacenTokens, almacenSolicitudes, lock, auth, cliente, sat, facturas };
}

/** Manejador que atiende /auth/* y delega el resto. Simula un access token expirado una vez. */
export function conTokenExpirado(manejador) {
    let yaFallo = false;
    return async (llamada, numero) => {
        if (llamada.ruta === "/auth/refresh") return json(200, RESPUESTA_REFRESH);
        if (llamada.ruta === "/auth/login") return json(200, RESPUESTA_LOGIN);
        if (!yaFallo) {
            yaFallo = true;
            return json(401, { message: "Unauthenticated." });
        }
        return manejador(llamada, numero);
    };
}

// Solicitud y paginador del historial de descarga masiva, como los devuelve la API.
export function solicitud(extra = {}) {
    return {
        id: 12,
        request_id: "a1b2c3d4-0000",
        fecha_inicio: "2026-01-01T00:00:00.000000Z",
        fecha_fin: "2026-01-31T23:59:59.000000Z",
        tipo: "emitido",
        status: "pendiente",
        error_msg: null,
        created_at: "2026-02-01T17:20:00.000000Z",
        updated_at: "2026-02-01T17:20:00.000000Z",
        ...extra
    };
}

export function paginador(items, { page = 1, lastPage = 1, total = items.length } = {}) {
    return {
        success: true,
        message: "Historial de solicitudes de descarga masiva SAT obtenido con éxito",
        data: {
            current_page: page,
            data: items,
            last_page: lastPage,
            next_page_url: page < lastPage ? `https://corecfdi.prueba/api/v1/sat/descarga-masiva/solicitudes?page=${page + 1}` : null,
            per_page: 20,
            prev_page_url: null,
            total
        }
    };
}
