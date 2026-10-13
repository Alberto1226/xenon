import { CoreCfdiError } from "./errores.js";
import { enviar, dormir } from "./transporte.js";

const MARGEN_DE_RENOVACION_MS = 60 * 1000;
const TTL_LOCK_REFRESH_MS = 60 * 1000;

/**
 * Autenticación contra CoreCFDI (tokens Sanctum).
 *
 * dependencias:
 *  - config:  objeto de leerConfigCoreCfdi(), o función que lo devuelve
 *  - almacen: { leer(tenant), guardar(tenant, tokens), borrar(tenant) }  (cifrado en reposo)
 *  - lock:    { conLock(clave, ttlMs, fn) }  compartido entre procesos
 *  - idSesion: identifica la sesión dueña de los tokens (para el candado de refresh);
 *              por defecto el tenant
 */
export function crearCoreCfdiAuth({ config, almacen, lock, idSesion = null, fetch: fetchImpl, logger = console, sleep = dormir, ahora = () => Date.now() }) {
    const leerConfig = typeof config === "function" ? config : () => config;
    let renovacionEnCurso = null;

    function expiraEn(minutos) {
        return ahora() + Number(minutos) * 60 * 1000;
    }

    function porCaducar(tokens) {
        return tokens.expires_at - ahora() < MARGEN_DE_RENOVACION_MS;
    }

    /**
     * `credenciales` = { email, password } que escribe el usuario al iniciar sesión.
     * Si no llegan se usan las de `config` (modo desatendido). Sin contraseña disponible no se
     * puede volver a entrar solo: se borra la sesión y se pide iniciar sesión de nuevo.
     */
    async function login(credenciales = {}) {
        const cfg = leerConfig();
        const email = credenciales.email || cfg.email;
        const password = credenciales.password || cfg.password;
        if (!email || !password) {
            await almacen.borrar(cfg.tenant);
            throw new CoreCfdiError("sesion", "La sesión de CoreCFDI no está iniciada o expiró. Inicie sesión de nuevo.", { status: 401 });
        }

        const { status, data } = await enviar({
            fetch: fetchImpl,
            url: `${cfg.baseUrl}/auth/login`,
            method: "POST",
            endpoint: "/auth/login",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Tenant": cfg.tenant
            },
            body: JSON.stringify({ email, password, device_name: cfg.deviceName }),
            reintentos: 2,
            reintentarEnTimeout: true,
            logger,
            sleep
        });

        if (status === 200 && data && data.data && data.data.access_token) {
            const tokens = {
                access_token: data.data.access_token,
                refresh_token: data.data.refresh_token,
                tenant_id: data.data.tenant_id || null,
                user: data.data.user || null,
                email,
                expires_at: expiraEn(data.data.expires_in_minutes)
            };
            await almacen.guardar(cfg.tenant, tokens);
            return tokens;
        }

        const mensaje = (data && data.message) || "";
        if (status === 401) {
            throw new CoreCfdiError("credenciales", mensaje || "Credenciales de acceso incorrectas", { status });
        }
        if (status === 422) {
            throw new CoreCfdiError("validacion", mensaje || "Datos de acceso inválidos", { status, errors: (data && data.errors) || null });
        }
        if (status === 403) {
            throw new CoreCfdiError("prohibido", mensaje || "CoreCFDI rechazó el acceso de esta empresa.", { status });
        }
        throw new CoreCfdiError("servidor", mensaje || `CoreCFDI respondió ${status} al iniciar sesión.`, { status });
    }

    async function renovar(tokens) {
        const cfg = leerConfig();
        if (!tokens || !tokens.refresh_token) return login();

        const { status, data } = await enviar({
            fetch: fetchImpl,
            url: `${cfg.baseUrl}/auth/refresh`,
            method: "POST",
            endpoint: "/auth/refresh",
            headers: {
                "Accept": "application/json",
                "X-Tenant": cfg.tenant,
                "Authorization": `Bearer ${tokens.refresh_token}`
            },
            reintentos: 2,
            reintentarEnTimeout: true,
            logger,
            sleep
        });

        if (status === 200 && data && data.data && data.data.access_token) {
            // El refresh token usado ya quedó revocado: se reemplazan los dos de inmediato.
            const nuevos = {
                access_token: data.data.access_token,
                refresh_token: data.data.refresh_token,
                tenant_id: tokens.tenant_id || null,
                user: tokens.user || null,
                email: tokens.email || null,
                expires_at: expiraEn(data.data.expires_in_minutes)
            };
            await almacen.guardar(cfg.tenant, nuevos);
            return nuevos;
        }

        const mensaje = (data && data.message) || "";
        if (status === 403 && /suspendida|inactiva/i.test(mensaje)) {
            logger.error("[CoreCFDI] ALERTA: la empresa está suspendida o inactiva en CoreCFDI.");
            throw new CoreCfdiError("prohibido", mensaje, { status });
        }
        if (status === 401 || status === 403) {
            await almacen.borrar(cfg.tenant);
            return login();
        }
        throw new CoreCfdiError("servidor", mensaje || `CoreCFDI respondió ${status} al renovar el token.`, { status });
    }

    // Una sola renovación (o login) a la vez por tenant: en este proceso y entre procesos.
    function exclusivo(fn) {
        if (renovacionEnCurso) return renovacionEnCurso;
        renovacionEnCurso = Promise.resolve()
            .then(() => lock.conLock(`corecfdi:refresh:${idSesion || leerConfig().tenant}`, TTL_LOCK_REFRESH_MS, fn))
            .finally(() => {
                renovacionEnCurso = null;
            });
        return renovacionEnCurso;
    }

    /**
     * Deja tokens vigentes en el almacén.
     * `tokenFallido` es el access token que la API acaba de rechazar con 401 (si aplica).
     */
    function asegurarTokens({ tokenFallido = null, forzar = false } = {}) {
        return exclusivo(async () => {
            // Otra petición u otro proceso pudo renovar mientras se esperaba el candado.
            const actuales = await almacen.leer(leerConfig().tenant);
            if (!actuales) return login();
            const yaRenovado = tokenFallido ? actuales.access_token !== tokenFallido : !forzar;
            if (yaRenovado && !porCaducar(actuales)) return actuales;
            return renovar(actuales);
        });
    }

    async function getAccessToken() {
        const tokens = await almacen.leer(leerConfig().tenant);
        if (tokens && !porCaducar(tokens)) return tokens.access_token;
        const vigentes = await asegurarTokens();
        return vigentes.access_token;
    }

    return {
        login: async (credenciales) => exclusivo(() => login(credenciales)),
        refresh: async (opciones = {}) => asegurarTokens({ tokenFallido: opciones.tokenFallido || null, forzar: !opciones.tokenFallido }),
        getAccessToken
    };
}
