/**
 * Mapeos y formatos compartidos por los servicios de CoreCFDI.
 */

// Al solicitar se envía emitidas / recibidas; el historial y las respuestas devuelven emitido / recibido.
const TIPO_DESCARGA_A_TIPO = { emitidas: "emitido", recibidas: "recibido" };

export const TIPOS_DESCARGA = Object.keys(TIPO_DESCARGA_A_TIPO);
export const TIPOS_COMPROBANTE = ["I", "E", "P", "N"];

// Un periodo y tipo cuenta como ya solicitado si existe una solicitud en alguno de estos estados.
export const ESTADOS_ACTIVOS = ["pendiente", "terminada", "descargada"];
// Estados en los que ya no tiene caso verificar.
export const ESTADOS_SIN_VERIFICACION = ["descargada", "rechazada", "vencida"];

/** Normaliza cualquier forma del tipo (emitidas, emitido, recibidas, recibido) a emitido / recibido. */
export function normalizarTipo(tipo) {
    const valor = String(tipo || "").trim().toLowerCase();
    return TIPO_DESCARGA_A_TIPO[valor] || valor;
}

/**
 * Normaliza una fecha de periodo a "YYYY-MM-DD HH:mm:ss" tomando fecha y hora tal cual.
 * La API las manda como "2026-01-01 00:00:00" o "2026-01-01T00:00:00.000000Z", pero en ambos casos
 * son hora de México: NO se convierte la zona horaria.
 */
export function normalizarFechaPeriodo(valor) {
    if (!valor) return null;
    const partes = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}:\d{2}))?/.exec(String(valor));
    if (!partes) return String(valor);
    return `${partes[1]} ${partes[2] || "00:00:00"}`;
}

export function soloFecha(valor) {
    const normalizada = normalizarFechaPeriodo(valor);
    return normalizada ? normalizada.substring(0, 10) : null;
}

export function esFechaValida(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(valor + "T00:00:00Z");
    return !isNaN(fecha.getTime()) && fecha.toISOString().substring(0, 10) === valor;
}

/** Fecha de hoy (YYYY-MM-DD) en hora del centro de México. */
export function hoyEnMexico(ahora = Date.now()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(ahora));
}

/** Solicitud de descarga masiva con el periodo normalizado. created_at / updated_at sí son UTC. */
export function normalizarSolicitud(cruda) {
    return {
        id: cruda.id,
        request_id: cruda.request_id || null,
        fecha_inicio: normalizarFechaPeriodo(cruda.fecha_inicio),
        fecha_fin: normalizarFechaPeriodo(cruda.fecha_fin),
        tipo: normalizarTipo(cruda.tipo),
        status: cruda.status,
        error_msg: cruda.error_msg === undefined ? null : cruda.error_msg,
        created_at: cruda.created_at || null,
        updated_at: cruda.updated_at || null
    };
}
