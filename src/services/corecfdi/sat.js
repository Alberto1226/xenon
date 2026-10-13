import { CoreCfdiError, errorDeValidacion } from "./errores.js";
import { dormir } from "./transporte.js";
import {
    TIPOS_DESCARGA,
    TIPOS_COMPROBANTE,
    ESTADOS_ACTIVOS,
    ESTADOS_SIN_VERIFICACION,
    normalizarTipo,
    normalizarSolicitud,
    soloFecha,
    esFechaValida,
    hoyEnMexico
} from "./formato.js";

const LIMITE_DE_PAGINAS = 50;
const PAUSA_ENTRE_SOLICITUDES_MS = 2000;
const ESPERA_REINTENTO_SOLICITAR_MS = 5000;
const DIAS_ALERTA_VENCIMIENTO_FIEL = 30;
const TIMEOUT_VERIFICAR_MS = 300 * 1000;

// Mensajes del SAT ante los que no tiene caso reintentar la solicitud.
const SAT_NO_REINTENTAR = /ya existe|ya se tiene|duplicad|agotad|de por vida|m[aá]ximo de solicitudes/i;

function extension(nombre) {
    const partes = /\.([^.]+)$/.exec(String(nombre || ""));
    return partes ? partes[1].toLowerCase() : "";
}

/**
 * Descarga masiva del SAT a través de CoreCFDI: FIEL, historial, solicitar y verificar.
 *
 * dependencias:
 *  - cliente:   cliente HTTP compartido (crearCoreCfdiCliente)
 *  - almacen:   almacén local de solicitudes { guardar(solicitud), obtener(id) }
 *  - lock:      { intentar(clave, ttlMs, fn) }  compartido entre procesos; devuelve
 *               { adquirido, valor }
 */
export function crearCoreCfdiSat({ cliente, almacen, lock, ambito = "", logger = console, sleep = dormir, ahora = () => Date.now() }) {
    // `ambito` (el tenant) separa los candados de verificación de empresas distintas.
    const prefijoLock = ambito ? `corecfdi:verificar:${ambito}:` : "corecfdi:verificar:";
    const verificacionesEnCurso = new Map();

    async function guardarLocal(solicitud) {
        try {
            await almacen.guardar(solicitud);
        } catch (err) {
            // El almacén local es un espejo: CoreCFDI es la fuente de verdad.
            logger.error("[CoreCFDI] No se pudo guardar la solicitud " + solicitud.id + " en el almacén local: " + err.message);
        }
    }

    // ------------------------------------------------------------------ FIEL

    /**
     * Carga la FIEL de la empresa. `cer` y `key` son { nombre, buffer }.
     * Los archivos y la contraseña solo viven en memoria durante la llamada: no se guardan.
     */
    async function configurarFiel({ cer, key, password, rfcEsperado = null }) {
        const errors = {};
        if (!cer || !cer.buffer) errors.cer_file = ["El certificado (.cer) es obligatorio."];
        else if (extension(cer.nombre) !== "cer") errors.cer_file = ["El certificado debe tener extensión .cer."];
        else if (cer.buffer.length === 0) errors.cer_file = ["El certificado (.cer) está vacío."];

        if (!key || !key.buffer) errors.key_file = ["La llave privada (.key) es obligatoria."];
        else if (extension(key.nombre) !== "key") errors.key_file = ["La llave privada debe tener extensión .key."];
        else if (key.buffer.length === 0) errors.key_file = ["La llave privada (.key) está vacía."];

        if (!password) errors.password = ["La contraseña de la llave privada es obligatoria."];

        if (Object.keys(errors).length > 0) throw errorDeValidacion(errors);

        // Se arma un FormData nuevo en cada intento para volver a adjuntar los archivos.
        const armarFormulario = () => {
            const form = new globalThis.FormData();
            form.append("cer_file", new globalThis.Blob([cer.buffer], { type: "application/octet-stream" }), cer.nombre);
            form.append("key_file", new globalThis.Blob([key.buffer], { type: "application/octet-stream" }), key.nombre);
            form.append("password", password);
            return form;
        };

        const respuesta = await cliente.peticion({
            method: "POST",
            ruta: "/sat/fiel",
            multipart: armarFormulario,
            timeoutMs: 60 * 1000,
            reintentos: 1
        });

        const data = respuesta.data || {};
        logger.log(`[CoreCFDI] FIEL cargada para el RFC ${data.rfc}`);

        const advertencias = [];
        const esperado = rfcEsperado ? String(rfcEsperado).trim().toUpperCase() : null;
        const rfcCoincide = !esperado || String(data.rfc || "").toUpperCase() === esperado;
        if (!rfcCoincide) {
            advertencias.push(`El RFC de la FIEL (${data.rfc}) no coincide con el RFC del emisor configurado (${esperado}).`);
        }

        let diasParaVencer = null;
        if (data.valido_hasta && esFechaValida(String(data.valido_hasta).substring(0, 10))) {
            const vence = Date.parse(String(data.valido_hasta).substring(0, 10) + "T00:00:00Z");
            const hoy = Date.parse(hoyEnMexico(ahora()) + "T00:00:00Z");
            diasParaVencer = Math.round((vence - hoy) / (24 * 60 * 60 * 1000));
            if (diasParaVencer < 0) {
                advertencias.push(`La FIEL venció el ${data.valido_hasta}.`);
            } else if (diasParaVencer < DIAS_ALERTA_VENCIMIENTO_FIEL) {
                advertencias.push(`La FIEL vence en ${diasParaVencer} día(s) (${data.valido_hasta}). Renuévela a tiempo.`);
            }
        }

        return {
            status: data.status || null,
            rfc: data.rfc || null,
            valido_hasta: data.valido_hasta || null,
            rfcCoincide,
            diasParaVencer,
            advertencias,
            mensaje: respuesta.message || ""
        };
    }

    // ------------------------------------------------------------- Historial

    async function listarPagina(page) {
        const respuesta = await cliente.peticion({
            method: "GET",
            ruta: "/sat/descarga-masiva/solicitudes",
            query: { page },
            timeoutMs: 30 * 1000,
            reintentos: 2
        });

        const paginador = respuesta.data || {};
        const items = (paginador.data || []).map(normalizarSolicitud);
        for (const solicitud of items) await guardarLocal(solicitud);

        return {
            items,
            page: paginador.current_page || page,
            lastPage: paginador.last_page || 1,
            total: paginador.total || 0,
            hayMas: !!paginador.next_page_url
        };
    }

    async function listarSolicitudes(page = 1) {
        const { items, page: actual, lastPage, total } = await listarPagina(page);
        return { items, page: actual, lastPage, total };
    }

    async function listarTodas() {
        const todas = [];
        let page = 1;
        while (page <= LIMITE_DE_PAGINAS) {
            const pagina = await listarPagina(page);
            todas.push(...pagina.items);
            if (!pagina.hayMas) break;
            page++;
        }
        return todas;
    }

    /**
     * Busca una solicitud activa (pendiente, terminada o descargada) del mismo periodo y tipo.
     * Acepta el tipo como emitidas/recibidas o emitido/recibido. Devuelve la solicitud o null.
     * Compara solo la fecha: si el periodo incluye hoy, el servidor recorta la hora final.
     */
    async function existeSolicitud(fechaInicio, fechaFin, tipo) {
        const inicio = soloFecha(fechaInicio);
        const fin = soloFecha(fechaFin);
        const tipoNormalizado = normalizarTipo(tipo);
        const todas = await listarTodas();
        return (
            todas.find(
                (s) =>
                    s.tipo === tipoNormalizado &&
                    ESTADOS_ACTIVOS.includes(s.status) &&
                    soloFecha(s.fecha_inicio) === inicio &&
                    soloFecha(s.fecha_fin) === fin
            ) || null
        );
    }

    async function pendientes() {
        const todas = await listarTodas();
        return todas.filter((s) => s.status === "pendiente");
    }

    // -------------------------------------------------------------- Solicitar

    function validarSolicitud({ fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante }) {
        const errors = {};
        if (!esFechaValida(fecha_inicio)) errors.fecha_inicio = ["La fecha de inicio debe tener formato YYYY-MM-DD."];
        if (!esFechaValida(fecha_fin)) errors.fecha_fin = ["La fecha de fin debe tener formato YYYY-MM-DD."];
        if (!errors.fecha_inicio && !errors.fecha_fin) {
            if (fecha_fin < fecha_inicio) errors.fecha_fin = ["La fecha de fin no puede ser anterior a la fecha de inicio."];
            else if (fecha_fin > hoyEnMexico(ahora())) errors.fecha_fin = ["La fecha de fin no puede ser futura."];
        }
        if (!TIPOS_DESCARGA.includes(tipo_descarga)) errors.tipo_descarga = ["El tipo de descarga debe ser emitidas o recibidas."];
        if (tipo_comprobante && !TIPOS_COMPROBANTE.includes(tipo_comprobante)) {
            errors.tipo_comprobante = ["El tipo de comprobante debe ser I, E, P, N o vacío (todos)."];
        }
        if (Object.keys(errors).length > 0) throw errorDeValidacion(errors);
    }

    /**
     * Pide al SAT un periodo. Devuelve la solicitud creada (su `id` se usa en verificarSolicitud).
     * No envía nada si el periodo y tipo ya tiene una solicitud activa (error de tipo "duplicada").
     */
    async function solicitarDescarga({ fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante = null }) {
        validarSolicitud({ fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante });

        const existente = await existeSolicitud(fecha_inicio, fecha_fin, tipo_descarga);
        if (existente) {
            throw new CoreCfdiError(
                "duplicada",
                `Ya existe una solicitud de ${tipo_descarga} del ${fecha_inicio} al ${fecha_fin} en estado "${existente.status}" (#${existente.id}).`,
                { datos: { solicitud: existente } }
            );
        }

        const respuesta = await cliente.peticion({
            method: "POST",
            ruta: "/sat/descarga-masiva/solicitar",
            json: { fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante: tipo_comprobante || null },
            timeoutMs: 120 * 1000,
            reintentos: 2,
            esperaReintentoMs: ESPERA_REINTENTO_SOLICITAR_MS,
            noReintentarSi: (mensaje) => SAT_NO_REINTENTAR.test(mensaje),
            logExtra: { periodo: `${fecha_inicio}..${fecha_fin}`, tipo: tipo_descarga }
        });

        const solicitud = normalizarSolicitud(respuesta.data || {});
        logger.log(`[CoreCFDI] Solicitud #${solicitud.id} creada: ${fecha_inicio}..${fecha_fin} ${tipo_descarga}, request_id ${solicitud.request_id}`);
        await guardarLocal(solicitud);
        return solicitud;
    }

    /**
     * Emitidas y recibidas del mismo periodo: dos solicitudes, una por tipo, con pausa entre ellas
     * (el SAT rechaza solicitudes simultáneas). Devuelve un resultado por tipo; que una falle
     * no impide intentar la otra.
     */
    async function solicitarAmbas({ fecha_inicio, fecha_fin, tipo_comprobante = null }) {
        TIPOS_DESCARGA.forEach((tipo_descarga) => validarSolicitud({ fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante }));

        const resultados = [];
        for (let i = 0; i < TIPOS_DESCARGA.length; i++) {
            const tipo_descarga = TIPOS_DESCARGA[i];
            if (i > 0) await sleep(PAUSA_ENTRE_SOLICITUDES_MS);
            try {
                const solicitud = await solicitarDescarga({ fecha_inicio, fecha_fin, tipo_descarga, tipo_comprobante });
                resultados.push({ tipo_descarga, ok: true, solicitud });
            } catch (error) {
                resultados.push({ tipo_descarga, ok: false, error });
            }
        }
        return resultados;
    }

    // -------------------------------------------------------------- Verificar

    async function ejecutarVerificacion(id) {
        const local = await almacen.obtener(id);
        if (local && ESTADOS_SIN_VERIFICACION.includes(local.status)) {
            return { omitida: true, descargada: local.status === "descargada", status: local.status, mensaje: local.error_msg || "" };
        }

        let respuesta;
        try {
            respuesta = await cliente.peticion({
                method: "POST",
                ruta: `/sat/descarga-masiva/verificar/${encodeURIComponent(id)}`,
                timeoutMs: TIMEOUT_VERIFICAR_MS,
                reintentos: 0,
                logExtra: { id }
            });
        } catch (err) {
            if (err instanceof CoreCfdiError && err.tipo === "timeout") {
                // El servidor pudo haber terminado: no se reintenta, se consulta el historial después.
                throw new CoreCfdiError(
                    "timeout",
                    "La verificación tardó más de lo esperado. No se reintentó: consulte el historial en unos minutos, CoreCFDI pudo haber terminado la descarga.",
                    { datos: { consultarHistorialDespues: true } }
                );
            }
            if (err instanceof CoreCfdiError && err.tipo === "validacion") {
                throw new CoreCfdiError("validacion", err.message || "La empresa no tiene FIEL configurada.", {
                    status: 422,
                    errors: err.errors,
                    datos: { requiereFiel: true }
                });
            }
            throw err;
        }

        const data = respuesta.data || {};
        const resultado = data.resultado || {};
        if (data.solicitud) {
            const solicitud = normalizarSolicitud(data.solicitud);
            await guardarLocal(solicitud);
            logger.log(`[CoreCFDI] Solicitud #${solicitud.id} verificada: estado ${solicitud.status}`);
            if (!resultado.status) resultado.status = solicitud.status;
        }
        return resultado;
    }

    /**
     * Fuerza la verificación de una solicitud ("Verificar ahora"). `id` es el ID interno de
     * CoreCFDI, no el request_id del SAT. Devuelve `data.resultado`.
     * Solo corre una verificación a la vez por solicitud.
     */
    function verificarSolicitud(id) {
        const clave = String(id);
        if (verificacionesEnCurso.has(clave)) return verificacionesEnCurso.get(clave);

        const promesa = Promise.resolve()
            .then(() => lock.intentar(prefijoLock + clave,TIMEOUT_VERIFICAR_MS + 10000, () => ejecutarVerificacion(id)))
            .then((intento) => {
                if (!intento.adquirido) {
                    throw new CoreCfdiError("en_curso", `Ya hay una verificación en curso para la solicitud #${clave}. Espere a que termine.`);
                }
                return intento.valor;
            })
            .finally(() => {
                verificacionesEnCurso.delete(clave);
            });

        verificacionesEnCurso.set(clave, promesa);
        return promesa;
    }

    return {
        configurarFiel,
        listarSolicitudes,
        listarTodas,
        existeSolicitud,
        pendientes,
        solicitarDescarga,
        solicitarAmbas,
        verificarSolicitud
    };
}
