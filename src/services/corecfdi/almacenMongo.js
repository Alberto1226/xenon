import crypto from "crypto";
import { CoreCfdiToken } from "../../models/corecfdi_token";
import { CoreCfdiSolicitud } from "../../models/corecfdi_solicitud";
import { CoreCfdiLock } from "../../models/corecfdi_lock";
import { encryptText, decryptText } from "../cryptoService";
import { CoreCfdiError } from "./errores.js";
import { dormir } from "./transporte.js";

const ESPERA_ENTRE_INTENTOS_MS = 250;

/** Sesión de CoreCFDI guardada de un usuario de este sistema (sin tokens), o null. */
export async function leerSesionGuardada(usuario) {
    const doc = await CoreCfdiToken.findOne({ usuario }).select("tenant email user fecha_actualizacion").lean().exec();
    if (!doc) return null;
    return { tenant: doc.tenant, email: doc.email || "", user: doc.user || null, fecha_actualizacion: doc.fecha_actualizacion };
}

/** Almacén de tokens de la sesión de CoreCFDI de un usuario de este sistema. */
export function crearAlmacenTokensMongo(usuario) {
    return {
        async leer(tenant) {
            const doc = await CoreCfdiToken.findOne({ usuario, tenant }).lean().exec();
            if (!doc || !doc.access_token_encrypted) return null;
            const access_token = decryptText(doc.access_token_encrypted);
            if (!access_token) return null;
            return {
                access_token,
                refresh_token: decryptText(doc.refresh_token_encrypted),
                tenant_id: doc.tenant_id || null,
                user: doc.user || null,
                email: doc.email || null,
                expires_at: doc.expires_at ? new Date(doc.expires_at).getTime() : 0
            };
        },
        async guardar(tenant, tokens) {
            await CoreCfdiToken.findOneAndUpdate(
                { usuario },
                {
                    tenant,
                    email: tokens.email || "",
                    access_token_encrypted: encryptText(tokens.access_token),
                    refresh_token_encrypted: encryptText(tokens.refresh_token),
                    tenant_id: tokens.tenant_id || "",
                    user: tokens.user || null,
                    expires_at: new Date(tokens.expires_at),
                    fecha_actualizacion: new Date()
                },
                { upsert: true, new: true }
            ).exec();
        },
        async borrar(tenant) {
            await CoreCfdiToken.deleteOne({ usuario }).exec();
        }
    };
}

function fechaONull(valor) {
    if (!valor) return null;
    const fecha = new Date(valor);
    return isNaN(fecha.getTime()) ? null : fecha;
}

/** Almacén local de solicitudes. `tenant` es una función para leer la configuración hasta que se usa. */
export function crearAlmacenSolicitudesMongo(tenant) {
    return {
        async guardar(solicitud) {
            if (solicitud.id === undefined || solicitud.id === null) return;
            const cambios = {
                request_id: solicitud.request_id || "",
                fecha_inicio: solicitud.fecha_inicio || "",
                fecha_fin: solicitud.fecha_fin || "",
                tipo: solicitud.tipo || "",
                status: solicitud.status || "",
                error_msg: solicitud.error_msg === undefined ? null : solicitud.error_msg,
                fecha_sincronizacion: new Date()
            };
            const creada = fechaONull(solicitud.created_at);
            const actualizada = fechaONull(solicitud.updated_at);
            if (creada) cambios.created_at = creada;
            if (actualizada) cambios.updated_at = actualizada;

            await CoreCfdiSolicitud.findOneAndUpdate(
                { tenant: tenant(), id_corecfdi: Number(solicitud.id) },
                cambios,
                { upsert: true, new: true }
            ).exec();
        },
        async obtener(id) {
            const numero = Number(id);
            if (isNaN(numero)) return null;
            const doc = await CoreCfdiSolicitud.findOne({ tenant: tenant(), id_corecfdi: numero }).lean().exec();
            if (!doc) return null;
            return {
                id: doc.id_corecfdi,
                request_id: doc.request_id,
                fecha_inicio: doc.fecha_inicio,
                fecha_fin: doc.fecha_fin,
                tipo: doc.tipo,
                status: doc.status,
                error_msg: doc.error_msg
            };
        }
    };
}

/**
 * Candado compartido entre procesos sobre Mongo: un documento por clave con fecha de expiración.
 * Lo toma quien logra insertar el documento o reemplazar uno ya vencido.
 */
export function crearLockMongo() {
    async function tomar(clave, ttlMs) {
        const dueno = crypto.randomBytes(12).toString("hex");
        const ahora = new Date();
        try {
            await CoreCfdiLock.findOneAndUpdate(
                { clave, expira: { $lte: ahora } },
                { dueno, expira: new Date(ahora.getTime() + ttlMs) },
                { upsert: true, new: true }
            ).exec();
            return dueno;
        } catch (err) {
            // Clave duplicada: otro proceso tiene el candado vigente.
            if (err && err.code === 11000) return null;
            throw err;
        }
    }

    async function soltar(clave, dueno) {
        try {
            await CoreCfdiLock.deleteOne({ clave, dueno }).exec();
        } catch (err) {
            console.error("[CoreCFDI] No se pudo liberar el candado " + clave + ": " + err.message);
        }
    }

    return {
        // Espera a que el candado quede libre (como máximo su ttl) y ejecuta fn.
        async conLock(clave, ttlMs, fn) {
            const limite = Date.now() + ttlMs + 5000;
            let dueno = await tomar(clave, ttlMs);
            while (!dueno) {
                if (Date.now() > limite) {
                    throw new CoreCfdiError("servidor", "No se pudo obtener el candado de CoreCFDI (" + clave + ").");
                }
                await dormir(ESPERA_ENTRE_INTENTOS_MS);
                dueno = await tomar(clave, ttlMs);
            }
            try {
                return await fn();
            } finally {
                await soltar(clave, dueno);
            }
        },
        // No espera: si otro proceso lo tiene, devuelve { adquirido: false }.
        async intentar(clave, ttlMs, fn) {
            const dueno = await tomar(clave, ttlMs);
            if (!dueno) return { adquirido: false };
            try {
                return { adquirido: true, valor: await fn() };
            } finally {
                await soltar(clave, dueno);
            }
        }
    };
}
