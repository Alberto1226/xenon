/**
 * Almacenes y candado en memoria con la misma interfaz que los de Mongo (almacenMongo.js).
 * Se usan en las pruebas; no sirven en producción porque no se comparten entre procesos.
 */

export function crearAlmacenTokensMemoria() {
    const tokens = new Map();
    return {
        async leer(tenant) {
            return tokens.has(tenant) ? { ...tokens.get(tenant) } : null;
        },
        async guardar(tenant, valor) {
            tokens.set(tenant, { ...valor });
        },
        async borrar(tenant) {
            tokens.delete(tenant);
        }
    };
}

export function crearAlmacenSolicitudesMemoria() {
    const solicitudes = new Map();
    return {
        async guardar(solicitud) {
            const previa = solicitudes.get(String(solicitud.id)) || {};
            solicitudes.set(String(solicitud.id), { ...previa, ...solicitud });
        },
        async obtener(id) {
            const solicitud = solicitudes.get(String(id));
            return solicitud ? { ...solicitud } : null;
        }
    };
}

export function crearLockMemoria() {
    const colas = new Map();
    const tomados = new Set();
    return {
        // Espera su turno y ejecuta fn.
        conLock(clave, ttlMs, fn) {
            const anterior = colas.get(clave) || Promise.resolve();
            const actual = anterior.catch(() => {}).then(fn);
            colas.set(clave, actual.catch(() => {}));
            return actual;
        },
        // No espera: si ya está tomado devuelve { adquirido: false }.
        async intentar(clave, ttlMs, fn) {
            if (tomados.has(clave)) return { adquirido: false };
            tomados.add(clave);
            try {
                return { adquirido: true, valor: await fn() };
            } finally {
                tomados.delete(clave);
            }
        }
    };
}
