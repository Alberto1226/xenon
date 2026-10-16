/**
 * Bóveda Fiscal: formatos, validaciones, ciclo de vida y semáforo fiscal. Funciones puras: las usa
 * el panel (navegador), la ruta de subida y el servicio, y se prueban sin API.
 */

export const MAX_COMENTARIO = 1000;
export const MAX_TIPO_DOCUMENTO = 100;
export const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;

// Los mismos valores que usa CoreCFDI en su pantalla, para que los expedientes se vean igual.
export const TIPOS_DOCUMENTO = [
    "Evidencia de Pago",
    "Orden de Compra",
    "Cotización",
    "Contrato",
    "Evidencia de Entrega",
    "Estado de Cuenta",
    "Carta Porte",
    "Pedimento",
    "Correo de Cliente",
    "Fotografía",
    "Otro Documento"
];

// PDF, imágenes, XML y documentos de Office. El servidor de CoreCFDI no restringe el tipo; este sistema sí.
export const EXTENSIONES_PERMITIDAS = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "xml", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"];
const EXTENSIONES_CON_VISTA_PREVIA = ["pdf", "png", "jpg", "jpeg", "gif", "webp"];

export function extension(nombre) {
    const partes = /\.([a-z0-9]+)$/i.exec(String(nombre || ""));
    return partes ? partes[1].toLowerCase() : "";
}

/** PDF e imágenes se pueden ver en el navegador (inline=1). */
export function tieneVistaPrevia(nombre) {
    return EXTENSIONES_CON_VISTA_PREVIA.includes(extension(nombre));
}

/** Monto con el código de moneda del CFDI ("$11,600.00" en MXN, "USD 1,000.00"...). */
export function montoMoneda(valor, moneda = "MXN") {
    const cantidad = Number(valor) || 0;
    const codigo = String(moneda || "MXN").toUpperCase();
    try {
        return new Intl.NumberFormat("es-MX", { style: "currency", currency: codigo, currencyDisplay: codigo === "MXN" ? "narrowSymbol" : "code" }).format(cantidad);
    } catch (err) {
        // Código que Intl no reconoce: se muestra tal cual.
        const numero = cantidad.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${codigo} ${numero}`;
    }
}

/** fecha (YYYY-MM-DD) y hora de la factura: hora de México, se muestran tal cual sin convertir. */
export function fechaFactura(fecha, hora) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || "");
    if (!partes) return fecha || "";
    const dia = `${partes[3]}/${partes[2]}/${partes[1]}`;
    return hora ? `${dia} ${hora}` : dia;
}

/**
 * Marca UTC ("2026-09-02T17:20:00Z") en hora local para mostrar: "02/09/2026 11:20".
 * `timeZone` sin indicar usa la del navegador.
 */
export function fechaHoraLocal(marca, { timeZone } = {}) {
    if (!marca) return "";
    const fecha = new Date(marca);
    if (isNaN(fecha.getTime())) return String(marca);
    const partes = {};
    new Intl.DateTimeFormat("es-MX", {
        timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    })
        .formatToParts(fecha)
        .forEach((p) => (partes[p.type] = p.value));
    return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}`;
}

/**
 * Pagos del expediente con lo que muestra la pantalla: los cancelados se marcan y no suman.
 * `sumaVigentes` es solo informativa: el pagado y el saldo de la tarjeta son los del servidor.
 */
export function resumenPagos(pagos) {
    const lista = (pagos || []).map((p) => ({ ...p, cancelado: !!p.cancelado || p.estado === "cancelado" || !!p.fechaCancelacion }));
    const sumaVigentes = lista.filter((p) => !p.cancelado).reduce((suma, p) => suma + (Number(p.monto) || 0), 0);
    return { pagos: lista, sumaVigentes: Math.round(sumaVigentes * 100) / 100, cancelados: lista.filter((p) => p.cancelado).length };
}

/** Estado de la caja de comentario: contador y si se puede enviar. */
export function estadoComentario(texto, limite = MAX_COMENTARIO) {
    const limpio = String(texto || "").trim();
    const longitud = limpio.length;
    let error = "";
    if (longitud > limite) error = `El comentario no puede pasar de ${limite} caracteres.`;
    return { longitud, restantes: limite - longitud, valido: longitud > 0 && longitud <= limite, error };
}

/** Error del archivo elegido ({ name, size }) o "" si se puede subir. */
export function errorDeArchivo(archivo) {
    if (!archivo) return "Seleccione un archivo.";
    if (!archivo.size) return "El archivo está vacío.";
    if (archivo.size > MAX_ARCHIVO_BYTES) return "El archivo no puede pasar de 10 MB.";
    if (!EXTENSIONES_PERMITIDAS.includes(extension(archivo.name))) {
        return "Tipo de archivo no permitido. Use PDF, imágenes, XML o documentos de Office.";
    }
    return "";
}

export function tamanoLegible(bytes) {
    const valor = Number(bytes) || 0;
    if (valor >= 1024 * 1024) return (valor / (1024 * 1024)).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " MB";
    if (valor >= 1024) return Math.round(valor / 1024) + " KB";
    return valor + " B";
}

/** Mensaje de una respuesta con error de las rutas de la Bóveda (422 con errores por campo). */
export function mensajeDeError(res, porDefecto = "No se pudo completar la operación en la Bóveda Fiscal.") {
    if (res && res.status === 404 && /archivo/i.test(res.mensaje || "")) return "Archivo no encontrado.";
    const errors = res && res.errors;
    if (errors) {
        const primero = Object.keys(errors).find((k) => Array.isArray(errors[k]) && errors[k].length > 0);
        if (primero) return errors[primero][0];
    }
    return (res && res.mensaje) || porDefecto;
}

/**
 * Mensaje de una descarga fallida. Un 404 del XML/PDF del CFDI es "Archivo no disponible" (el API
 * no genera el PDF si falta); el de un adjunto, "Archivo no encontrado".
 */
export function mensajeDeDescarga(res, { esCfdi = false } = {}) {
    if (res && res.status === 404) return esCfdi ? "Archivo no disponible." : "Archivo no encontrado.";
    return mensajeDeError(res, "No se pudo descargar el archivo.");
}

// ------------------------------------------------------------------ ciclo de vida y semáforo
// CoreCFDI no tiene endpoint para ellos: se calculan con el expediente normalizado (boveda.js).
// `origen` es "recibida" o "emitida" según el listado desde el que se abrió; solo cambia textos.

const mayusculas = (valor) => String(valor || "").trim().toUpperCase();
const estaCancelado = (exp) => mayusculas(exp.factura.estado) === "CANCELADO";

/**
 * Hitos del CFDI en orden: [{ clave, titulo, descripcion, completado, tono, pagos? }], con tono
 * ok | pendiente | alerta | neutro. `fecha`/`hora` van tal cual (hora de México); `created_at` y
 * `updated_at` son UTC y se pasan a la hora local (CoreCFDI los muestra sin convertir).
 * opciones.timeZone: zona para mostrar (por defecto la del navegador).
 */
export function cicloDeVida(exp, origen = "recibida", { timeZone } = {}) {
    const f = exp.factura;
    const recibida = origen !== "emitida";
    const local = (marca) => fechaHoraLocal(marca, { timeZone });
    const metodo = mayusculas(f.metodoPago);
    const esIngreso = mayusculas(f.tipoComprobante || "I") === "I";
    const hitos = [];

    const hora = f.hora ? ` a las ${String(f.hora).substring(0, 5)}` : "";
    hitos.push({
        clave: "emitida",
        titulo: recibida ? "Factura emitida por el proveedor" : "Factura emitida",
        descripcion: `Expedida el ${fechaFactura(f.fecha)}${hora}`,
        completado: true,
        tono: "ok"
    });

    hitos.push({
        clave: "importada",
        titulo: "Descargada e importada",
        descripcion: f.creadoEn ? `Guardada en CoreCFDI el ${local(f.creadoEn)}` : "Registrada en CoreCFDI",
        completado: true,
        tono: "ok"
    });

    const vigente = mayusculas(f.estado) === "VIGENTE";
    hitos.push({
        clave: "validacion_sat",
        titulo: "Validación fiscal SAT",
        descripcion: `Estatus en el SAT: ${mayusculas(f.estado) || "DESCONOCIDO"}` + (f.actualizadoEn ? ` (última actualización: ${local(f.actualizadoEn)})` : ""),
        completado: true,
        tono: vigente ? "ok" : "alerta"
    });

    hitos.push({
        clave: "pdf",
        titulo: recibida ? "PDF del proveedor" : "PDF de la factura",
        descripcion: exp.tienePdf ? "Representación impresa lista para descarga" : "Sin PDF en CoreCFDI",
        completado: !!exp.tienePdf,
        tono: exp.tienePdf ? "ok" : "neutro"
    });

    // Los CFDI de egreso, pago, nómina o traslado no llevan hito de pago.
    if (esIngreso) {
        const resumen = resumenPagos(exp.pagos);
        const aCredito = metodo === "PPD" || (metodo !== "PUE" && (resumen.pagos.length > 0 || exp.saldoPendiente > 0));
        if (metodo === "PUE") {
            hitos.push({
                clave: "pagada_pue",
                titulo: "Pagada (PUE)",
                descripcion: `Pago de contado al emitirse el ${fechaFactura(f.fecha)}`,
                completado: true,
                tono: "ok"
            });
        } else if (aCredito) {
            const liquidada = exp.saldoPendiente <= 0;
            const recibos = resumen.pagos.length - resumen.cancelados;
            hitos.push({
                clave: "pago_ppd",
                titulo: liquidada ? "Liquidada (PPD)" : "Pago parcial / pendiente",
                descripcion: liquidada
                    ? `Liquidada al 100% con ${recibos} recibo(s) de pago`
                    : `Abonado: ${montoMoneda(exp.totalPagado, f.moneda)} | Pendiente: ${montoMoneda(exp.saldoPendiente, f.moneda)}`,
                completado: exp.totalPagado > 0,
                tono: liquidada ? "ok" : exp.totalPagado > 0 ? "pendiente" : "neutro",
                // Los cancelados van marcados; ya vienen excluidos de total_pagado y no se restan otra vez.
                pagos: resumen.pagos
            });
        }
    }

    if (estaCancelado(exp)) {
        hitos.push({
            clave: "cancelada",
            titulo: "Cancelada en el SAT",
            // updated_at es la última actualización en CoreCFDI, no la fecha oficial de cancelación.
            descripcion: f.actualizadoEn ? `Comprobante cancelado; detectado el ${local(f.actualizadoEn)}` : "Comprobante cancelado",
            completado: true,
            tono: "alerta"
        });
    }

    return hitos;
}

/**
 * Semáforo fiscal del expediente: { estado, titulo, detalles[] } con estado riesgo | incompleto |
 * completo. Se detiene en el primer nivel que aplique. Es una guía interna, no un dictamen fiscal.
 */
export function semaforoFiscal(exp, origen = "recibida") {
    const f = exp.factura;
    const recibida = origen !== "emitida";
    const metodo = mayusculas(f.metodoPago);

    const riesgo = [];
    if (estaCancelado(exp)) {
        riesgo.push(recibida ? "El comprobante del proveedor está cancelado ante el SAT." : "El comprobante está cancelado ante el SAT.");
    }
    if (exp.esEfo) {
        const situacion = exp.efoSituacion || "Presunto/Definitivo";
        riesgo.push(recibida ? `El proveedor está en la lista de EFOS del SAT (${situacion}).` : `El emisor está en la lista de EFOS del SAT (${situacion}).`);
    }
    if (riesgo.length > 0) return { estado: "riesgo", titulo: "Expediente con riesgo", detalles: riesgo };

    // La regla del REP usa solo PPD (más estricta que "a crédito" del ciclo de vida) y no revisa el tipo.
    const incompleto = [];
    if (metodo === "PPD" && exp.saldoPendiente > 0) {
        const saldo = montoMoneda(exp.saldoPendiente, f.moneda);
        incompleto.push(recibida ? `Falta el complemento de pago del proveedor (saldo insoluto: ${saldo}).` : `Falta el complemento de pago (saldo insoluto: ${saldo}).`);
    }
    // Sin adjuntos siempre es amarillo, aunque ya esté pagada: mide la materialidad del expediente.
    if (exp.adjuntos.length === 0) incompleto.push("No hay documentos soporte adjuntos (orden de compra, cotización, etc.).");
    if (incompleto.length > 0) return { estado: "incompleto", titulo: "Expediente incompleto", detalles: incompleto };

    const completo = ["Estatus vigente ante el SAT.", "Emisor libre de la lista de EFOS."];
    if (metodo === "PPD") completo.push("Complementos de pago cubiertos al 100%.");
    else if (metodo === "PUE") completo.push("Pago de contado (PUE) al emitirse.");
    completo.push(`Documentación soporte adjunta (${exp.adjuntos.length} documento(s)).`);
    // has_xml / has_pdf pueden fallar: solo se afirma si ambos son true y su falta no baja a amarillo.
    if (exp.tieneXml && exp.tienePdf) completo.push("XML y PDF disponibles en CoreCFDI.");
    return { estado: "completo", titulo: "Expediente completo", detalles: completo };
}
