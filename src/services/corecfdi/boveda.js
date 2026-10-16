import { CoreCfdiError, errorDeValidacion } from "./errores.js";
import { MAX_COMENTARIO, MAX_TIPO_DOCUMENTO, MAX_ARCHIVO_BYTES, cicloDeVida, semaforoFiscal } from "./bovedaVista.js";

export { TIPOS_DOCUMENTO, MAX_COMENTARIO, MAX_TIPO_DOCUMENTO, MAX_ARCHIVO_BYTES } from "./bovedaVista.js";

const CACHE_MS = 60 * 1000;
const TIMEOUT_CORTO_MS = 30 * 1000;
const TIMEOUT_ARCHIVO_MS = 120 * 1000;
// Tras un timeout al subir, un adjunto con el mismo nombre y tipo creado en esta ventana se
// considera el mismo envío (el servidor sí lo guardó).
const VENTANA_SUBIDA_MS = 10 * 60 * 1000;

function texto(valor) {
    if (valor === null || valor === undefined) return null;
    const limpio = String(valor).trim();
    return limpio === "" ? null : limpio;
}

function numero(valor) {
    return Number(valor) || 0;
}

/**
 * "2026-09-02 17:20:00" (UTC sin zona, como lo manda la API) → "2026-09-02T17:20:00Z".
 * Los `created_at` / `updated_at` de la Bóveda siempre son UTC.
 */
export function marcaUtc(valor) {
    if (!valor) return null;
    const partes = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(String(valor));
    return partes ? `${partes[1]}T${partes[2]}Z` : String(valor);
}

/** El id de factura o de adjunto como entero positivo. Un valor no numérico provoca un 500 en el servidor. */
export function validarId(valor, campo = "id") {
    const limpio = typeof valor === "number" ? String(valor) : String(valor === null || valor === undefined ? "" : valor).trim();
    if (typeof valor === "boolean" || !/^\d+$/.test(limpio) || Number(limpio) < 1 || !Number.isSafeInteger(Number(limpio))) {
        throw errorDeValidacion({ [campo]: ["El identificador debe ser un número entero positivo."] });
    }
    return Number(limpio);
}

export function validarComentario(comentario) {
    const limpio = String(comentario === null || comentario === undefined ? "" : comentario).trim();
    if (!limpio) throw errorDeValidacion({ comentario: ["Escriba el comentario."] });
    if (limpio.length > MAX_COMENTARIO) {
        throw errorDeValidacion({ comentario: [`El comentario no puede pasar de ${MAX_COMENTARIO} caracteres.`] });
    }
    return limpio;
}

/** archivo: { buffer, nombre, tipo } (tipo = MIME). */
export function validarAdjunto(archivo, tipoDocumento) {
    const errors = {};
    const tipo = texto(tipoDocumento);
    if (!tipo) errors.tipo_documento = ["Seleccione el tipo de documento."];
    else if (tipo.length > MAX_TIPO_DOCUMENTO) errors.tipo_documento = [`El tipo de documento no puede pasar de ${MAX_TIPO_DOCUMENTO} caracteres.`];

    const tamano = archivo && archivo.buffer ? archivo.buffer.length : 0;
    if (!archivo || !archivo.buffer || tamano === 0) errors.archivo = ["Seleccione un archivo."];
    else if (tamano > MAX_ARCHIVO_BYTES) errors.archivo = ["El archivo no puede pasar de 10 MB."];
    else if (!texto(archivo.nombre)) errors.archivo = ["El archivo no tiene nombre."];

    if (Object.keys(errors).length > 0) throw errorDeValidacion(errors);
    return tipo;
}

function normalizarFactura(cruda) {
    return {
        id: cruda.id,
        uuid: texto(cruda.uuid),
        folio: texto(cruda.folio),
        // Hora de México: se muestran tal cual, sin convertir zona.
        fecha: texto(cruda.fecha),
        hora: texto(cruda.hora),
        emisor: { rfc: texto(cruda.emisor_rfc), nombre: texto(cruda.emisor_nombre) },
        receptor: { rfc: texto(cruda.receptor_rfc), nombre: texto(cruda.receptor_nombre) },
        // Solo la base gravada: no sirve para recalcular el total.
        subtotal: numero(cruda.subtotal),
        descuento: numero(cruda.descuento),
        total: numero(cruda.total),
        estado: texto(cruda.status),
        moneda: texto(cruda.moneda) || "MXN",
        tipoComprobante: texto(cruda.tipo_comprobante) || "I",
        // PUE o PPD (pese al nombre, no es la forma de pago).
        metodoPago: texto(cruda.metodo_pago),
        creadoEn: marcaUtc(cruda.created_at),
        actualizadoEn: marcaUtc(cruda.updated_at)
    };
}

function normalizarPago(crudo) {
    const estado = texto(crudo.status);
    return {
        uuid: texto(crudo.uuid),
        folio: texto(crudo.folio),
        fecha: texto(crudo.fecha),
        fechaCancelacion: texto(crudo.fecha_cancelacion),
        monto: numero(crudo.monto),
        estado,
        cancelado: estado === "cancelado" || !!texto(crudo.fecha_cancelacion)
    };
}

function normalizarComentario(crudo) {
    return {
        id: crudo.id,
        comentario: crudo.comentario === null || crudo.comentario === undefined ? "" : String(crudo.comentario),
        usuario: texto(crudo.usuario_nombre),
        creadoEn: marcaUtc(crudo.created_at)
    };
}

/** Los hitos iniciales (generados al vuelo, sin id) quedan con `id: null` e `inicial: true`. */
function normalizarEvento(crudo) {
    const id = crudo.id === undefined ? null : crudo.id;
    return {
        id,
        inicial: id === null,
        evento: texto(crudo.evento) || "",
        descripcion: texto(crudo.descripcion) || "",
        usuario: texto(crudo.usuario_nombre),
        creadoEn: marcaUtc(crudo.created_at)
    };
}

// `ruta_archivo` es interna de CoreCFDI: no se conserva.
function normalizarAdjunto(crudo) {
    return {
        id: crudo.id,
        idFactura: crudo.id_factura === undefined ? null : crudo.id_factura,
        tipoDocumento: texto(crudo.tipo_documento) || "",
        nombreArchivo: texto(crudo.nombre_archivo) || "",
        usuario: texto(crudo.usuario_nombre),
        creadoEn: marcaUtc(crudo.created_at)
    };
}

const lista = (valor, normalizar) => (Array.isArray(valor) ? valor.map(normalizar) : []);

export function normalizarExpediente(data) {
    const exp = (data && data.expediente) || {};
    return {
        factura: normalizarFactura((data && data.factura) || {}),
        pagos: lista(exp.pagos, normalizarPago),
        // Calculados por el servidor (solo pagos vigentes); referencia del expediente, no saldo de cartera.
        totalPagado: numero(exp.total_pagado),
        saldoPendiente: numero(exp.saldo_pendiente),
        comentarios: lista(exp.comentarios, normalizarComentario),
        eventos: lista(exp.eventos, normalizarEvento),
        adjuntos: lista(exp.adjuntos, normalizarAdjunto),
        esEfo: !!exp.es_efo,
        efoSituacion: texto(exp.efo_situacion),
        tieneXml: !!exp.has_xml,
        tienePdf: !!exp.has_pdf
    };
}

/** Nombre del archivo de un Content-Disposition (filename* en UTF-8 o filename). */
export function nombreDeContentDisposition(valor) {
    if (!valor) return null;
    const extendido = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(valor);
    if (extendido) {
        try {
            return decodeURIComponent(extendido[2].trim().replace(/^"|"$/g, ""));
        } catch (err) {
            // Codificación inválida: se intenta con filename.
        }
    }
    const simple = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(valor);
    if (!simple) return null;
    return texto(simple[2] !== undefined ? simple[2] : simple[1]);
}

/**
 * Bóveda Fiscal (expediente 360 de un CFDI). La Bóveda no registra pagos ni cambia el CFDI:
 * comentarios y adjuntos son documentación interna y los pagos son los REP ya descargados.
 *
 * Las escrituras no son idempotentes: no se reintentan en 5xx ni en timeout.
 *
 * dependencias:
 *  - cliente: cliente HTTP compartido (crearCoreCfdiCliente)
 *  - ambito:  tenant de la sesión; forma parte de la llave del cache
 */
export function crearCoreCfdiBoveda({ cliente, ambito = "", ahora = () => Date.now() }) {
    const cache = new Map();
    // id de adjunto → { idFactura, nombreArchivo }, de los expedientes ya consultados. Sirve para
    // invalidar el cache al eliminar y para nombrar la descarga si falta Content-Disposition.
    const adjuntosConocidos = new Map();

    const llave = (idFactura) => `${ambito}|${idFactura}`;

    function recordarAdjuntos(adjuntos, idFactura) {
        adjuntos.forEach((a) => adjuntosConocidos.set(a.id, { idFactura: a.idFactura || idFactura, nombreArchivo: a.nombreArchivo }));
    }

    function invalidar(idFactura) {
        if (idFactura) cache.delete(llave(idFactura));
    }

    /** opciones: { actualizar: true } ignora el cache. */
    async function expediente(idFactura, opciones = {}) {
        const id = validarId(idFactura);

        const guardado = cache.get(llave(id));
        if (guardado && !opciones.actualizar && ahora() - guardado.consultadoEn < CACHE_MS) {
            return { ...guardado, desdeCache: true };
        }

        const respuesta = await cliente.peticion({
            method: "GET",
            ruta: `/facturas/${id}/boveda`,
            timeoutMs: TIMEOUT_CORTO_MS,
            reintentos: 2
        });

        const resultado = { ...normalizarExpediente(respuesta.data), consultadoEn: ahora() };
        recordarAdjuntos(resultado.adjuntos, id);
        cache.forEach((valor, clave) => {
            if (ahora() - valor.consultadoEn >= CACHE_MS) cache.delete(clave);
        });
        cache.set(llave(id), resultado);
        return { ...resultado, desdeCache: false };
    }

    /** Devuelve { comentarios, eventos }: las listas completas para reemplazar las de pantalla. */
    async function agregarComentario(idFactura, comentario) {
        const id = validarId(idFactura);
        const limpio = validarComentario(comentario);

        try {
            const respuesta = await cliente.peticion({
                method: "POST",
                ruta: `/facturas/${id}/boveda/comentario`,
                json: { comentario: limpio },
                timeoutMs: TIMEOUT_CORTO_MS
            });
            const data = respuesta.data || {};
            return { comentarios: lista(data.comentarios, normalizarComentario), eventos: lista(data.eventos, normalizarEvento) };
        } finally {
            // Aun con error (timeout) el comentario pudo quedar guardado.
            invalidar(id);
        }
    }

    // Tras un timeout la subida pudo haber quedado: se busca en el expediente actualizado.
    async function buscarSubidaPerdida(id, nombre, tipo, inicio) {
        try {
            const exp = await expediente(id, { actualizar: true });
            const adjunto = exp.adjuntos.find((a) => {
                const creado = Date.parse(a.creadoEn || "");
                return a.nombreArchivo === nombre && a.tipoDocumento === tipo && !isNaN(creado) && creado >= inicio - VENTANA_SUBIDA_MS;
            });
            return adjunto ? { adjunto, adjuntos: exp.adjuntos, eventos: exp.eventos } : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * archivo: { buffer, nombre, tipo } (tipo = MIME). Devuelve { adjunto, adjuntos, eventos }.
     * Si se agota el tiempo pero el archivo sí quedó, devuelve lo mismo con `recuperado: true`.
     */
    async function subirAdjunto(idFactura, archivo, tipoDocumento) {
        const id = validarId(idFactura);
        const tipo = validarAdjunto(archivo, tipoDocumento);
        const nombre = String(archivo.nombre).trim();
        const inicio = ahora();

        try {
            const respuesta = await cliente.peticion({
                method: "POST",
                ruta: `/facturas/${id}/boveda/adjuntos`,
                // Se arma en cada intento: tras renovar el token el archivo se vuelve a adjuntar.
                multipart: () => {
                    const form = new FormData();
                    form.append("archivo", new Blob([archivo.buffer], { type: archivo.tipo || "application/octet-stream" }), nombre);
                    form.append("tipo_documento", tipo);
                    return form;
                },
                timeoutMs: TIMEOUT_ARCHIVO_MS
            });
            invalidar(id);
            const data = respuesta.data || {};
            const adjuntos = lista(data.adjuntos, normalizarAdjunto);
            recordarAdjuntos(adjuntos, id);
            return {
                adjunto: data.adjunto ? normalizarAdjunto(data.adjunto) : null,
                adjuntos,
                eventos: lista(data.eventos, normalizarEvento),
                recuperado: false
            };
        } catch (err) {
            invalidar(id);
            if (err instanceof CoreCfdiError && err.tipo === "timeout") {
                const encontrado = await buscarSubidaPerdida(id, nombre, tipo, inicio);
                if (encontrado) return { ...encontrado, recuperado: true };
                throw new CoreCfdiError("timeout", "CoreCFDI no respondió a tiempo y el archivo no aparece en el expediente. Puede intentar subirlo de nuevo.", { datos: { puedeReintentar: true } });
            }
            throw err;
        }
    }

    /**
     * Borra el adjunto de forma definitiva. Devuelve { adjuntos, eventos, idFactura, yaNoExistia }.
     * Un 404 significa que ya no existe: se trata como éxito, con `adjuntos` y `eventos` en null
     * (hay que volver a pedir el expediente).
     * opciones.idFactura: factura dueña, si se conoce, para invalidar su cache.
     */
    async function eliminarAdjunto(idAdjunto, opciones = {}) {
        const id = validarId(idAdjunto, "id_adjunto");
        const conocido = adjuntosConocidos.get(id);
        let idFactura = opciones.idFactura ? validarId(opciones.idFactura) : conocido ? conocido.idFactura : null;

        try {
            const respuesta = await cliente.peticion({
                method: "DELETE",
                ruta: `/facturas/boveda/adjuntos/${id}`,
                timeoutMs: TIMEOUT_CORTO_MS
            });
            const data = respuesta.data || {};
            // La factura dueña también viene en los eventos reales (siempre hay al menos "Documento Eliminado").
            const conFactura = (data.eventos || []).find((e) => e.id_factura);
            if (!idFactura && conFactura) idFactura = conFactura.id_factura;
            return { adjuntos: lista(data.adjuntos, normalizarAdjunto), eventos: lista(data.eventos, normalizarEvento), idFactura, yaNoExistia: false };
        } catch (err) {
            if (err instanceof CoreCfdiError && err.tipo === "no_encontrado") {
                return { adjuntos: null, eventos: null, idFactura, yaNoExistia: true };
            }
            throw err;
        } finally {
            adjuntosConocidos.delete(id);
            invalidar(idFactura);
        }
    }

    /** Devuelve { buffer, contentType, nombreArchivo, inline }. */
    async function descargarAdjunto(idAdjunto, { inline = false } = {}) {
        const id = validarId(idAdjunto, "id_adjunto");
        const archivo = await cliente.peticion({
            method: "GET",
            ruta: `/facturas/boveda/adjuntos/${id}/descargar`,
            query: inline ? { inline: 1 } : null,
            timeoutMs: TIMEOUT_ARCHIVO_MS,
            reintentos: 2,
            binario: true
        });
        const conocido = adjuntosConocidos.get(id);
        return {
            buffer: archivo.buffer,
            contentType: archivo.contentType || "application/octet-stream",
            nombreArchivo: nombreDeContentDisposition(archivo.contentDisposition) || (conocido && conocido.nombreArchivo) || `adjunto-${id}`,
            inline: !!inline
        };
    }

    /**
     * XML o PDF del CFDI. has_xml / has_pdf son solo indicativos (el endpoint también prueba el UUID
     * en mayúsculas y minúsculas), así que los botones siempre se ofrecen. Si falta, responde 404:
     * el API no genera el PDF.
     */
    async function descargarCfdi(uuid, tipo) {
        const limpio = String(uuid || "").trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpio) || !["xml", "pdf"].includes(tipo)) {
            throw errorDeValidacion({ uuid: ["La solicitud de descarga no es válida."] });
        }
        const archivo = await cliente.peticion({
            method: "GET",
            ruta: `/facturas/${limpio}/${tipo}`,
            timeoutMs: TIMEOUT_ARCHIVO_MS,
            reintentos: 2,
            binario: true
        });
        return {
            buffer: archivo.buffer,
            contentType: archivo.contentType || (tipo === "pdf" ? "application/pdf" : "application/xml"),
            nombreArchivo: nombreDeContentDisposition(archivo.contentDisposition) || `${limpio}.${tipo}`
        };
    }

    // cicloDeVida y semaforoFiscal son locales (sin API): se calculan con el expediente ya normalizado.
    return { expediente, agregarComentario, subirAdjunto, eliminarAdjunto, descargarAdjunto, descargarCfdi, cicloDeVida, semaforoFiscal };
}
