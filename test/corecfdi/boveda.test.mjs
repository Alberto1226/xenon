import { test } from "node:test";
import assert from "node:assert/strict";
import { crearCoreCfdiBoveda, MAX_ARCHIVO_BYTES, nombreDeContentDisposition } from "../../src/services/corecfdi/boveda.js";
import { montoMoneda, fechaFactura, fechaHoraLocal, resumenPagos, estadoComentario, errorDeArchivo, mensajeDeError, mensajeDeDescarga, cicloDeVida, semaforoFiscal } from "../../src/services/corecfdi/bovedaVista.js";
import { normalizarExpediente } from "../../src/services/corecfdi/boveda.js";
import { CoreCfdiError, respuestaDeError } from "../../src/services/corecfdi/errores.js";
import { AHORA, crearEntorno, conTokenExpirado, json, binario, errorDeTimeout } from "./ayudas.mjs";

// ------------------------------------------------------------------ respuestas de la API (las del prompt)

const COMENTARIO = { id: 3, id_factura: 40, comentario: "Validada por contabilidad", usuario_nombre: "Integración ERP", created_at: "2026-09-02 17:20:00", updated_at: "2026-09-02 17:20:00" };
const EVENTO_ADJUNTO = { id: 9, id_factura: 40, evento: "Documento Adjuntado", descripcion: "Se subió el documento 'OC-5541.pdf' clasificado como 'Orden de Compra'.", usuario_nombre: "Integración ERP", created_at: "2026-09-02 17:25:12" };
const EVENTO_COMENTARIO = { id: 8, id_factura: 40, evento: "Comentario Agregado", descripcion: "Se agregó una nota a la bitácora de la Bóveda Fiscal.", usuario_nombre: "Integración ERP", created_at: "2026-09-02 17:20:00" };
const ADJUNTO = { id: 12, id_factura: 40, tipo_documento: "Orden de Compra", nombre_archivo: "OC-5541.pdf", ruta_archivo: "facturas/adjuntos/40/1756833912_OC-5541.pdf", usuario_nombre: "Integración ERP", created_at: "2026-09-02 17:25:12", updated_at: "2026-09-02 17:25:12" };

function factura(extra = {}) {
    return {
        id: 40,
        uuid: "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
        folio: "A-1021",
        fecha: "2026-08-15",
        hora: "13:45:10",
        emisor_rfc: "PEJ010203AB1",
        emisor_nombre: "PROVEEDOR EJEMPLO SA DE CV",
        receptor_rfc: "QUHJ711021UR1",
        receptor_nombre: "MI EMPRESA SA DE CV",
        subtotal: 10000.0,
        descuento: 0.0,
        total: 11600.0,
        status: "vigente",
        moneda: "MXN",
        tipo_comprobante: "I",
        metodo_pago: "PPD",
        created_at: "2026-08-16 02:10:33",
        updated_at: "2026-08-16 02:10:33",
        ...extra
    };
}

function expediente({ factura: extraFactura = {}, ...extra } = {}) {
    return json(200, {
        success: true,
        message: "Expediente Bóveda Fiscal 360 devuelto con éxito",
        data: {
            factura: factura(extraFactura),
            expediente: {
                has_xml: true,
                has_pdf: true,
                pagos: [{ uuid: "0A1B2C3D-4E5F-6789-ABCD-EF0123456789", folio: "P-88", fecha: "2026-09-01", fecha_cancelacion: null, monto: 5000.0, status: "vigente" }],
                total_pagado: 5000.0,
                saldo_pendiente: 6600.0,
                comentarios: [COMENTARIO],
                eventos: [EVENTO_ADJUNTO, EVENTO_COMENTARIO],
                es_efo: false,
                efo_situacion: null,
                adjuntos: [ADJUNTO],
                ...extra
            }
        }
    });
}

// Sin pagos, comentarios ni adjuntos: solo los hitos iniciales generados al vuelo.
function expedienteVacio() {
    return expediente({
        pagos: [],
        total_pagado: 0,
        saldo_pendiente: 11600.0,
        comentarios: [],
        adjuntos: [],
        eventos: [
            { evento: "Factura Importada", descripcion: "Se importó el CFDI.", usuario_nombre: "Sistema", created_at: "2026-08-16 02:10:33" },
            { evento: "Conversión a PDF", descripcion: "Se generó el PDF.", usuario_nombre: "Sistema", created_at: "2026-08-16 02:10:40" }
        ]
    });
}

const respuestaComentario = json(201, {
    success: true,
    message: "Comentario guardado correctamente en el expediente",
    data: { comentarios: [COMENTARIO], eventos: [EVENTO_COMENTARIO] }
});

const respuestaAdjunto = json(201, {
    success: true,
    message: "Archivo adjunto guardado con éxito",
    data: { adjunto: ADJUNTO, adjuntos: [ADJUNTO], eventos: [EVENTO_ADJUNTO, EVENTO_COMENTARIO] }
});

const PDF = Buffer.from("%PDF-1.4 contenido de prueba");
const archivoPdf = (extra = {}) => ({ buffer: PDF, nombre: "OC-5541.pdf", tipo: "application/pdf", ...extra });

async function crearBoveda(manejador, opciones) {
    const e = await crearEntorno(manejador, opciones);
    const reloj = { ahora: AHORA };
    e.reloj = reloj;
    e.boveda = crearCoreCfdiBoveda({ cliente: e.cliente, ambito: "empresa-demo", ahora: () => reloj.ahora });
    return e;
}

async function rechaza(promesa, tipo) {
    await assert.rejects(promesa, (err) => err instanceof CoreCfdiError && err.tipo === tipo);
}

// ------------------------------------------------------------------ expediente

test("expediente completo: encabezado, pagos, saldo, comentarios, eventos y adjuntos normalizados", async () => {
    const e = await crearBoveda(() => expediente());

    const r = await e.boveda.expediente(40);

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/facturas/40/boveda");
    assert.equal(llamada.method, "GET");
    assert.equal(llamada.headers.Accept, "application/json");
    assert.equal(llamada.headers["X-Tenant"], "empresa-demo");
    assert.match(llamada.headers.Authorization, /^Bearer /);

    assert.equal(r.factura.uuid, "EF34CE53-6076-4190-B8FD-EFD3274BA5F6");
    assert.equal(r.factura.emisor.nombre, "PROVEEDOR EJEMPLO SA DE CV");
    assert.equal(r.factura.receptor.rfc, "QUHJ711021UR1");
    assert.equal(r.factura.metodoPago, "PPD");
    // fecha y hora de México tal cual; created_at como UTC.
    assert.equal(fechaFactura(r.factura.fecha, r.factura.hora), "15/08/2026 13:45:10");
    assert.equal(r.factura.creadoEn, "2026-08-16T02:10:33Z");

    assert.equal(r.totalPagado, 5000);
    assert.equal(r.saldoPendiente, 6600);
    assert.equal(r.pagos.length, 1);
    assert.equal(r.comentarios[0].comentario, "Validada por contabilidad");
    assert.equal(r.comentarios[0].usuario, "Integración ERP");
    assert.deepEqual(r.eventos.map((ev) => ev.evento), ["Documento Adjuntado", "Comentario Agregado"]);
    assert.equal(r.adjuntos[0].nombreArchivo, "OC-5541.pdf");
    assert.equal(r.tieneXml, true);
    assert.equal(r.tienePdf, true);
    assert.equal(r.esEfo, false);
    assert.equal(r.desdeCache, false);
});

test("ruta_archivo es interna: no llega al modelo ni a la pantalla", async () => {
    const e = await crearBoveda(() => expediente());

    const r = await e.boveda.expediente(40);

    assert.equal(JSON.stringify(r).includes("ruta_archivo"), false);
    assert.equal(JSON.stringify(r).includes("facturas/adjuntos/40"), false);
});

test("expediente sin pagos, comentarios ni adjuntos y con eventos iniciales sin id: se normaliza sin errores", async () => {
    const e = await crearBoveda(() => expedienteVacio());

    const r = await e.boveda.expediente(40);

    assert.deepEqual(r.pagos, []);
    assert.deepEqual(r.comentarios, []);
    assert.deepEqual(r.adjuntos, []);
    assert.equal(r.eventos.length, 2);
    assert.equal(r.eventos[0].id, null);
    assert.equal(r.eventos[0].inicial, true);
    assert.equal(r.eventos[0].usuario, "Sistema");
    assert.deepEqual(resumenPagos(r.pagos), { pagos: [], sumaVigentes: 0, cancelados: 0 });
});

test("pago cancelado: se marca y no suma", async () => {
    const e = await crearBoveda(() =>
        expediente({
            pagos: [
                { uuid: "A", folio: "P-88", fecha: "2026-09-01", fecha_cancelacion: null, monto: 5000.0, status: "vigente" },
                { uuid: "B", folio: "P-90", fecha: "2026-09-05", fecha_cancelacion: "2026-09-07", monto: 3000.0, status: "cancelado" }
            ]
        })
    );

    const r = await e.boveda.expediente(40);
    const resumen = resumenPagos(r.pagos);

    assert.equal(r.pagos[1].cancelado, true);
    assert.equal(r.pagos[1].fechaCancelacion, "2026-09-07");
    assert.equal(resumen.sumaVigentes, 5000);
    assert.equal(resumen.cancelados, 1);
});

test("es_efo = true: llega la alerta con efo_situacion", async () => {
    const e = await crearBoveda(() => expediente({ es_efo: true, efo_situacion: "Definitivo" }));

    const r = await e.boveda.expediente(40);

    assert.equal(r.esEfo, true);
    assert.equal(r.efoSituacion, "Definitivo");
});

test("has_pdf = false: hito PDF en gris; el PDF se sigue pidiendo y un 404 es 'Archivo no disponible'", async () => {
    const e = await crearBoveda((llamada) =>
        llamada.ruta.endsWith("/pdf") ? json(404, { success: false, message: "Archivo no encontrado" }) : expediente({ has_xml: false, has_pdf: false })
    );

    const r = await e.boveda.expediente(40);
    const pdf = cicloDeVida(r, "recibida").find((h) => h.clave === "pdf");
    const err = await e.boveda.descargarCfdi(r.factura.uuid, "pdf").catch((x) => x);

    assert.equal(r.tienePdf, false);
    assert.equal(pdf.completado, false);
    assert.equal(pdf.tono, "neutro");
    assert.equal(pdf.descripcion, "Sin PDF en CoreCFDI");
    assert.equal(e.api.deRuta(`/facturas/${r.factura.uuid}/pdf`).length, 1);
    assert.equal(mensajeDeDescarga(respuestaDeError(err), { esCfdi: true }), "Archivo no disponible.");
    assert.equal(mensajeDeDescarga(respuestaDeError(err)), "Archivo no encontrado.");
});

test("folio, emisor_rfc o metodo_pago en null: quedan vacíos sin romper; moneda y tipo por defecto", async () => {
    const e = await crearBoveda(() => expediente({ factura: { folio: null, emisor_rfc: null, metodo_pago: null, moneda: null, tipo_comprobante: null } }));

    const r = await e.boveda.expediente(40);

    assert.equal(r.factura.folio, null);
    assert.equal(r.factura.emisor.rfc, null);
    assert.equal(r.factura.metodoPago, null);
    assert.equal(r.factura.moneda, "MXN");
    assert.equal(r.factura.tipoComprobante, "I");
});

test("created_at '2026-09-02 17:20:00' se interpreta como UTC: 11:20 en CDMX", async () => {
    const e = await crearBoveda(() => expediente());

    const r = await e.boveda.expediente(40);

    assert.equal(r.comentarios[0].creadoEn, "2026-09-02T17:20:00Z");
    assert.match(fechaHoraLocal(r.comentarios[0].creadoEn, { timeZone: "America/Mexico_City" }), /02\/09\/2026.*11:20/);
});

test("evento desconocido: se conserva tal cual", async () => {
    const e = await crearBoveda(() => expediente({ eventos: [{ id: 20, id_factura: 40, evento: "Revisión Fiscal", descripcion: "Algo nuevo", usuario_nombre: "X", created_at: "2026-09-03 10:00:00" }] }));

    const r = await e.boveda.expediente(40);

    assert.equal(r.eventos[0].evento, "Revisión Fiscal");
    assert.equal(r.eventos[0].inicial, false);
});

test("id no numérico: no se llama a la API", async () => {
    const e = await crearBoveda(() => expediente());

    for (const id of ["abc", "40a", "", null, undefined, -1, 0, 1.5, "4 0", true]) {
        await rechaza(e.boveda.expediente(id), "validacion");
    }
    await rechaza(e.boveda.agregarComentario("x", "hola"), "validacion");
    await rechaza(e.boveda.subirAdjunto("x", archivoPdf(), "Contrato"), "validacion");
    await rechaza(e.boveda.eliminarAdjunto("12;DROP"), "validacion");
    await rechaza(e.boveda.descargarAdjunto("../12"), "validacion");
    assert.equal(e.api.llamadas.length, 0);

    // Un id numérico en texto sí es válido.
    await e.boveda.expediente("40");
    assert.equal(e.api.llamadas[0].ruta, "/facturas/40/boveda");
});

test("cache de 1 minuto por id, con Actualizar y por tenant", async () => {
    const e = await crearBoveda(() => expediente());

    await e.boveda.expediente(40);
    const segunda = await e.boveda.expediente(40);
    assert.equal(segunda.desdeCache, true);
    assert.equal(e.api.llamadas.length, 1);

    await e.boveda.expediente(40, { actualizar: true });
    assert.equal(e.api.llamadas.length, 2);

    e.reloj.ahora += 61 * 1000;
    const vencida = await e.boveda.expediente(40);
    assert.equal(vencida.desdeCache, false);
    assert.equal(e.api.llamadas.length, 3);
});

test("expediente con 5xx: se reintenta máximo 2 veces", async () => {
    const e = await crearBoveda(() => json(500, { message: "Server Error" }));

    await rechaza(e.boveda.expediente(40), "servidor");

    assert.equal(e.api.llamadas.length, 3);
});

test("404 del expediente: mensaje del servidor", async () => {
    const e = await crearBoveda(() => json(404, { success: false, message: "No se encontró la factura con ID #40." }));

    await assert.rejects(e.boveda.expediente(40), (err) => err.tipo === "no_encontrado" && err.message === "No se encontró la factura con ID #40.");
});

// ------------------------------------------------------------------ comentarios

test("comentario vacío o de 1001 caracteres: no se envía", async () => {
    const e = await crearBoveda(() => respuestaComentario);

    await rechaza(e.boveda.agregarComentario(40, "   "), "validacion");
    await rechaza(e.boveda.agregarComentario(40, "x".repeat(1001)), "validacion");

    assert.equal(e.api.llamadas.length, 0);
    assert.equal(estadoComentario("   ").valido, false);
    assert.equal(estadoComentario("x".repeat(1001)).valido, false);
    assert.equal(estadoComentario("x".repeat(1000)).valido, true);
    assert.equal(estadoComentario("x".repeat(1000)).restantes, 0);
});

test("comentario válido: 201 y se devuelven bitácora e historial completos; invalida el cache", async () => {
    const e = await crearBoveda((llamada) => (llamada.method === "POST" ? respuestaComentario : expediente()));
    await e.boveda.expediente(40);

    const r = await e.boveda.agregarComentario(40, "  Validada por contabilidad  ");

    const post = e.api.deRuta("/facturas/40/boveda/comentario")[0];
    assert.equal(post.method, "POST");
    assert.equal(post.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(post.body), { comentario: "Validada por contabilidad" });
    assert.equal(r.comentarios.length, 1);
    assert.equal(r.eventos[0].evento, "Comentario Agregado");

    const despues = await e.boveda.expediente(40);
    assert.equal(despues.desdeCache, false);
});

test("comentario con 5xx: error y sin reintento automático", async () => {
    const e = await crearBoveda(() => json(500, { message: "Server Error" }));

    await rechaza(e.boveda.agregarComentario(40, "Hola"), "servidor");

    assert.equal(e.api.llamadas.length, 1);
});

test("comentario con timeout: error y sin reintento automático", async () => {
    const e = await crearBoveda(() => {
        throw errorDeTimeout();
    });

    await rechaza(e.boveda.agregarComentario(40, "Hola"), "timeout");

    assert.equal(e.api.llamadas.length, 1);
});

test("403 al comentar: se muestra el message y no se reintenta", async () => {
    const e = await crearBoveda(() => json(403, { success: false, message: "No tienes permiso para crear facturacion." }));

    const err = await e.boveda.agregarComentario(40, "Hola").catch((x) => x);

    assert.equal(err.tipo, "prohibido");
    assert.equal(respuestaDeError(err).mensaje, "No tienes permiso para crear facturacion.");
    assert.equal(e.api.llamadas.length, 1);
});

// ------------------------------------------------------------------ adjuntos

test("archivo de 11 MB: no se envía (ni en el servicio ni en la pantalla)", async () => {
    const e = await crearBoveda(() => respuestaAdjunto);

    await rechaza(e.boveda.subirAdjunto(40, archivoPdf({ buffer: Buffer.alloc(11 * 1024 * 1024) }), "Contrato"), "validacion");
    await rechaza(e.boveda.subirAdjunto(40, archivoPdf(), ""), "validacion");

    assert.equal(e.api.llamadas.length, 0);
    assert.equal(errorDeArchivo({ name: "grande.pdf", size: 11 * 1024 * 1024 }), "El archivo no puede pasar de 10 MB.");
    assert.equal(errorDeArchivo({ name: "justo.pdf", size: MAX_ARCHIVO_BYTES }), "");
    assert.match(errorDeArchivo({ name: "script.exe", size: 10 }), /no permitido/);
});

test("archivo válido: multipart con archivo y tipo_documento, 201 y lista de adjuntos actualizada", async () => {
    const e = await crearBoveda(() => respuestaAdjunto);

    const r = await e.boveda.subirAdjunto(40, archivoPdf({ nombre: "Orden de compra ñ.pdf" }), "Orden de Compra");

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/facturas/40/boveda/adjuntos");
    assert.equal(llamada.method, "POST");
    assert.equal(llamada.headers["Content-Type"], undefined);
    assert.ok(llamada.body instanceof FormData);
    assert.equal(llamada.body.get("tipo_documento"), "Orden de Compra");
    assert.equal(llamada.body.get("archivo").name, "Orden de compra ñ.pdf");
    assert.equal(llamada.body.get("archivo").size, PDF.length);
    assert.equal(r.adjunto.id, 12);
    assert.equal(r.adjuntos.length, 1);
    assert.equal(r.eventos[0].evento, "Documento Adjuntado");
    assert.equal(r.recuperado, false);
});

test("422 al subir: errores por campo visibles", async () => {
    const e = await crearBoveda(() => json(422, { message: "The archivo field must not be greater than 10240 kilobytes.", errors: { archivo: ["El archivo no debe pesar más de 10 MB."] } }));

    const err = await e.boveda.subirAdjunto(40, archivoPdf(), "Contrato").catch((x) => x);

    assert.equal(err.tipo, "validacion");
    assert.deepEqual(err.errors, { archivo: ["El archivo no debe pesar más de 10 MB."] });
    assert.equal(mensajeDeError(respuestaDeError(err)), "El archivo no debe pesar más de 10 MB.");
});

test("token expirado al subir: se renueva y el archivo se vuelve a adjuntar", async () => {
    const e = await crearBoveda(conTokenExpirado(() => respuestaAdjunto));

    const r = await e.boveda.subirAdjunto(40, archivoPdf(), "Contrato");

    const subidas = e.api.deRuta("/facturas/40/boveda/adjuntos");
    assert.equal(subidas.length, 2);
    assert.equal(e.api.deRuta("/auth/refresh").length, 1);
    assert.notEqual(subidas[0].body, subidas[1].body);
    assert.equal(subidas[1].body.get("archivo").size, PDF.length);
    assert.equal(subidas[1].headers.Authorization, "Bearer 14|access-nuevo");
    assert.equal(r.adjunto.id, 12);
});

test("subida con 5xx: sin reintento automático", async () => {
    const e = await crearBoveda(() => json(500, { message: "Server Error" }));

    await rechaza(e.boveda.subirAdjunto(40, archivoPdf(), "Contrato"), "servidor");

    assert.equal(e.api.deRuta("/facturas/40/boveda/adjuntos").length, 1);
});

test("subida con timeout: se revisa el expediente y, si el archivo quedó, se toma como éxito", async () => {
    const reciente = { ...ADJUNTO, id: 30, nombre_archivo: "OC-5541.pdf", tipo_documento: "Contrato", created_at: "2026-03-10 18:00:05" };
    const e = await crearBoveda((llamada) => {
        if (llamada.method === "POST") throw errorDeTimeout();
        return expediente({ adjuntos: [reciente, ADJUNTO] });
    });

    const r = await e.boveda.subirAdjunto(40, archivoPdf(), "Contrato");

    assert.equal(e.api.deRuta("/facturas/40/boveda/adjuntos").length, 1);
    assert.equal(r.recuperado, true);
    assert.equal(r.adjunto.id, 30);
});

test("subida con timeout y el archivo no aparece: error con opción de reintentar, sin reintento automático", async () => {
    const e = await crearBoveda((llamada) => {
        if (llamada.method === "POST") throw errorDeTimeout();
        return expediente();
    });

    const err = await e.boveda.subirAdjunto(40, archivoPdf(), "Contrato").catch((x) => x);

    assert.equal(err.tipo, "timeout");
    assert.equal(err.datos.puedeReintentar, true);
    assert.equal(e.api.deRuta("/facturas/40/boveda/adjuntos").length, 1);
});

test("eliminar: 200 devuelve listas actualizadas e invalida el cache de la factura", async () => {
    const e = await crearBoveda((llamada) =>
        llamada.method === "DELETE"
            ? json(200, { success: true, message: "Adjunto eliminado", data: { adjuntos: [], eventos: [{ id: 10, id_factura: 40, evento: "Documento Eliminado", descripcion: "Se eliminó 'OC-5541.pdf'.", usuario_nombre: "Integración ERP", created_at: "2026-09-03 10:00:00" }] } })
            : expediente()
    );
    await e.boveda.expediente(40);

    const r = await e.boveda.eliminarAdjunto(12);

    const [borrado] = e.api.deRuta("/facturas/boveda/adjuntos/12");
    assert.equal(borrado.method, "DELETE");
    assert.deepEqual(r.adjuntos, []);
    assert.equal(r.eventos[0].evento, "Documento Eliminado");
    assert.equal(r.idFactura, 40);
    assert.equal(r.yaNoExistia, false);
    assert.equal((await e.boveda.expediente(40)).desdeCache, false);
});

test("eliminar con 404: se trata como ya eliminado", async () => {
    const e = await crearBoveda((llamada) => (llamada.method === "DELETE" ? json(404, { success: false, message: "Adjunto no encontrado" }) : expediente()));
    await e.boveda.expediente(40);

    const r = await e.boveda.eliminarAdjunto(12);

    assert.equal(r.yaNoExistia, true);
    assert.equal(r.adjuntos, null);
    assert.equal((await e.boveda.expediente(40)).desdeCache, false);
});

test("eliminar con 5xx: sin reintento automático", async () => {
    const e = await crearBoveda(() => json(500, { message: "Server Error" }));

    await rechaza(e.boveda.eliminarAdjunto(12), "servidor");

    assert.equal(e.api.llamadas.length, 1);
});

// ------------------------------------------------------------------ descargas

test("descargar: binario con el nombre de nombre_archivo cuando falta Content-Disposition", async () => {
    const e = await crearBoveda((llamada) => (llamada.ruta.endsWith("/descargar") ? binario(200, PDF, { "content-type": "application/pdf" }) : expediente()));
    await e.boveda.expediente(40);

    const r = await e.boveda.descargarAdjunto(12);

    const [llamada] = e.api.deRuta("/facturas/boveda/adjuntos/12/descargar");
    assert.deepEqual(llamada.query, {});
    assert.match(llamada.headers.Authorization, /^Bearer /);
    assert.ok(Buffer.isBuffer(r.buffer));
    assert.equal(r.buffer.toString(), PDF.toString());
    assert.equal(r.contentType, "application/pdf");
    assert.equal(r.nombreArchivo, "OC-5541.pdf");
});

test("descargar con inline=1: vista previa, nombre de Content-Disposition (con acentos)", async () => {
    const e = await crearBoveda(() => binario(200, PDF, { "content-type": "application/pdf", "content-disposition": "inline; filename=\"Cotizacion.pdf\"; filename*=UTF-8''Cotizaci%C3%B3n%20mayo.pdf" }));

    const r = await e.boveda.descargarAdjunto(12, { inline: true });

    assert.deepEqual(e.api.llamadas[0].query, { inline: "1" });
    assert.equal(r.inline, true);
    assert.equal(r.nombreArchivo, "Cotización mayo.pdf");
    assert.equal(nombreDeContentDisposition('attachment; filename="OC-5541.pdf"'), "OC-5541.pdf");
});

test("descargar con 404: archivo no encontrado", async () => {
    const e = await crearBoveda(() => json(404, { success: false, message: "Archivo no encontrado" }));

    const err = await e.boveda.descargarAdjunto(12).catch((x) => x);

    assert.equal(err.tipo, "no_encontrado");
    assert.equal(mensajeDeError(respuestaDeError(err)), "Archivo no encontrado.");
});

test("descargar con 5xx: se reintenta máximo 2 veces", async () => {
    const e = await crearBoveda(() => json(503, { message: "Unavailable" }));

    await rechaza(e.boveda.descargarAdjunto(12), "servidor");

    assert.equal(e.api.llamadas.length, 3);
});

test("XML / PDF del CFDI: se piden por uuid como binario", async () => {
    const e = await crearBoveda(() => binario(200, "<cfdi:Comprobante/>", { "content-type": "application/xml" }));

    const r = await e.boveda.descargarCfdi("EF34CE53-6076-4190-B8FD-EFD3274BA5F6", "xml");

    assert.equal(e.api.llamadas[0].ruta, "/facturas/EF34CE53-6076-4190-B8FD-EFD3274BA5F6/xml");
    assert.equal(r.nombreArchivo, "EF34CE53-6076-4190-B8FD-EFD3274BA5F6.xml");
    await rechaza(e.boveda.descargarCfdi("../otra", "pdf"), "validacion");
    await rechaza(e.boveda.descargarCfdi("EF34CE53-6076-4190-B8FD-EFD3274BA5F6", "zip"), "validacion");
    assert.equal(e.api.llamadas.length, 1);
});

// ------------------------------------------------------------------ pantalla y log

test("montos con la moneda del CFDI", () => {
    assert.equal(montoMoneda(11600, "MXN"), "$11,600.00");
    assert.match(montoMoneda(1000, "USD"), /USD\s1,000\.00/);
    assert.equal(montoMoneda(5, "XYZ1"), "XYZ1 5.00");
});

test("log por petición: endpoint, status y duración; nunca tokens ni texto del comentario ni contenido", async () => {
    const e = await crearBoveda((llamada) => {
        if (llamada.ruta.endsWith("/comentario")) return respuestaComentario;
        if (llamada.ruta.endsWith("/adjuntos")) return respuestaAdjunto;
        return expediente();
    });

    await e.boveda.expediente(40);
    await e.boveda.agregarComentario(40, "Nota secreta de contabilidad");
    await e.boveda.subirAdjunto(40, archivoPdf(), "Contrato");

    const log = e.logger.texto();
    assert.match(log, /GET \/facturas\/40\/boveda -> 200 \(\d+ ms\)/);
    assert.match(log, /POST \/facturas\/40\/boveda\/comentario -> 201/);
    assert.match(log, /POST \/facturas\/40\/boveda\/adjuntos -> 201/);
    assert.equal(log.includes("access-vigente"), false);
    assert.equal(log.includes("Nota secreta"), false);
    assert.equal(log.includes("%PDF"), false);
});

// ------------------------------------------------------------------ ciclo de vida (función pura, sin API)

const CDMX = { timeZone: "America/Mexico_City" };
const REP = { uuid: "0A1B2C3D-4E5F-6789-ABCD-EF0123456789", folio: "P-88", fecha: "2026-09-01", fecha_cancelacion: null, monto: 5000.0, status: "vigente" };

// Expediente normalizado a partir de la respuesta del API, con cambios en factura y expediente.
function exp({ factura: extraFactura = {}, ...extra } = {}) {
    return normalizarExpediente(expediente({ factura: extraFactura, ...extra }).body.data);
}

const claves = (hitos) => hitos.map((h) => h.clave);
const hito = (hitos, clave) => hitos.find((h) => h.clave === clave);

test("ciclo: ingreso PUE vigente con PDF → 1, 2, 3, 4 y Pagada (PUE), todos completados", () => {
    const hitos = cicloDeVida(exp({ factura: { metodo_pago: "PUE" }, pagos: [], total_pagado: 0, saldo_pendiente: 0 }), "recibida", CDMX);

    assert.deepEqual(claves(hitos), ["emitida", "importada", "validacion_sat", "pdf", "pagada_pue"]);
    assert.ok(hitos.every((h) => h.completado && h.tono === "ok"));
    assert.equal(hito(hitos, "emitida").descripcion, "Expedida el 15/08/2026 a las 13:45");
    assert.equal(hito(hitos, "pagada_pue").descripcion, "Pago de contado al emitirse el 15/08/2026");
    assert.equal(hito(hitos, "validacion_sat").descripcion, "Estatus en el SAT: VIGENTE (última actualización: 15/08/2026 20:10)");
});

test("ciclo: ingreso PPD sin pagos → 'Pago parcial / pendiente' no completado, tono neutro", () => {
    const h = hito(cicloDeVida(exp({ pagos: [], total_pagado: 0, saldo_pendiente: 11600 }), "recibida", CDMX), "pago_ppd");

    assert.equal(h.titulo, "Pago parcial / pendiente");
    assert.equal(h.completado, false);
    assert.equal(h.tono, "neutro");
});

test("ciclo: ingreso PPD con un abono → completado, tono pendiente, abonado y pendiente en la moneda", () => {
    const h = hito(cicloDeVida(exp(), "recibida", CDMX), "pago_ppd");

    assert.equal(h.completado, true);
    assert.equal(h.tono, "pendiente");
    assert.equal(h.descripcion, "Abonado: $5,000.00 | Pendiente: $6,600.00");
    assert.equal(h.pagos.length, 1);
});

test("ciclo: ingreso PPD con saldo 0 → 'Liquidada (PPD)', tono ok, con el número de recibos", () => {
    const h = hito(cicloDeVida(exp({ pagos: [REP, { ...REP, uuid: "B", folio: null, monto: 6600 }], total_pagado: 11600, saldo_pendiente: 0 }), "recibida", CDMX), "pago_ppd");

    assert.equal(h.titulo, "Liquidada (PPD)");
    assert.equal(h.tono, "ok");
    assert.equal(h.descripcion, "Liquidada al 100% con 2 recibo(s) de pago");
});

test("ciclo: metodo_pago null, tipo I, con saldo → se trata como crédito (hito 5b)", () => {
    const hitos = cicloDeVida(exp({ factura: { metodo_pago: null }, pagos: [], total_pagado: 0 }), "recibida", CDMX);

    assert.ok(hito(hitos, "pago_ppd"));
    assert.equal(hito(hitos, "pagada_pue"), undefined);
});

test("ciclo: pago cancelado → aparece marcado y no cambia total_pagado", () => {
    const e = exp({ pagos: [REP, { ...REP, uuid: "C", folio: "P-90", monto: 3000, status: "cancelado", fecha_cancelacion: "2026-09-07" }] });
    const h = hito(cicloDeVida(e, "recibida", CDMX), "pago_ppd");

    assert.equal(h.pagos[1].cancelado, true);
    assert.equal(e.totalPagado, 5000);
    assert.equal(h.descripcion, "Abonado: $5,000.00 | Pendiente: $6,600.00");
});

test("ciclo: tipo P o E → sin hito de pago", () => {
    for (const tipo of ["P", "E"]) {
        const hitos = cicloDeVida(exp({ factura: { tipo_comprobante: tipo } }), "recibida", CDMX);
        assert.deepEqual(claves(hitos), ["emitida", "importada", "validacion_sat", "pdf"]);
    }
});

test("ciclo: status cancelado → hito 3 en alerta y 'Cancelada en el SAT' al final ('detectado el')", () => {
    const hitos = cicloDeVida(exp({ factura: { status: "cancelado", updated_at: "2026-09-10 18:30:00" } }), "recibida", CDMX);

    assert.equal(hito(hitos, "validacion_sat").tono, "alerta");
    assert.match(hito(hitos, "validacion_sat").descripcion, /^Estatus en el SAT: CANCELADO/);
    const ultimo = hitos[hitos.length - 1];
    assert.equal(ultimo.clave, "cancelada");
    assert.equal(ultimo.titulo, "Cancelada en el SAT");
    assert.equal(ultimo.tono, "alerta");
    assert.equal(ultimo.descripcion, "Comprobante cancelado; detectado el 10/09/2026 12:30");
});

test("ciclo: created_at '2026-08-16 02:10:33' se muestra 15/08/2026 20:10 en CDMX; sin created_at, 'Registrada'", () => {
    assert.equal(hito(cicloDeVida(exp(), "recibida", CDMX), "importada").descripcion, "Guardada en CoreCFDI el 15/08/2026 20:10");
    assert.equal(hito(cicloDeVida(exp({ factura: { created_at: null } }), "recibida", CDMX), "importada").descripcion, "Registrada en CoreCFDI");
});

test("ciclo: origen emitida → títulos sin la palabra 'proveedor'", () => {
    const hitos = cicloDeVida(exp(), "emitida", CDMX);

    assert.equal(hito(hitos, "emitida").titulo, "Factura emitida");
    assert.equal(hito(hitos, "pdf").titulo, "PDF de la factura");
    assert.ok(hitos.every((h) => !/proveedor/i.test(h.titulo)));
});

test("el servicio expone cicloDeVida y semaforoFiscal sin llamar a la API", async () => {
    const e = await crearBoveda(() => expediente());

    assert.equal(e.boveda.cicloDeVida(exp(), "recibida").length, 5);
    assert.equal(e.boveda.semaforoFiscal(exp({ adjuntos: [] }), "recibida").estado, "incompleto");
    assert.equal(e.api.llamadas.length, 0);
});

// ------------------------------------------------------------------ semáforo fiscal (función pura, sin API)

test("semáforo: cancelada → riesgo con 1 detalle", () => {
    const s = semaforoFiscal(exp({ factura: { status: "Cancelado" } }), "recibida");

    assert.equal(s.estado, "riesgo");
    assert.equal(s.titulo, "Expediente con riesgo");
    assert.deepEqual(s.detalles, ["El comprobante del proveedor está cancelado ante el SAT."]);
});

test("semáforo: cancelada y EFOS → riesgo con 2 detalles, incluida efo_situacion", () => {
    const s = semaforoFiscal(exp({ factura: { status: "cancelado" }, es_efo: true, efo_situacion: "Definitivo" }), "recibida");

    assert.equal(s.estado, "riesgo");
    assert.equal(s.detalles.length, 2);
    assert.equal(s.detalles[1], "El proveedor está en la lista de EFOS del SAT (Definitivo).");
});

test("semáforo: EFOS con efo_situacion null → 'Presunto/Definitivo'", () => {
    const s = semaforoFiscal(exp({ es_efo: true, efo_situacion: null }), "emitida");

    assert.deepEqual(s.detalles, ["El emisor está en la lista de EFOS del SAT (Presunto/Definitivo)."]);
});

test("semáforo: cancelada, PPD con saldo y sin adjuntos → riesgo, sin detalles de amarillo", () => {
    const s = semaforoFiscal(exp({ factura: { status: "cancelado" }, adjuntos: [] }), "recibida");

    assert.equal(s.estado, "riesgo");
    assert.equal(s.detalles.length, 1);
});

test("semáforo: PPD con saldo y sin adjuntos → incompleto con 2 detalles, saldo con la moneda", () => {
    const s = semaforoFiscal(exp({ factura: { moneda: "USD" }, adjuntos: [] }), "recibida");

    assert.equal(s.estado, "incompleto");
    assert.equal(s.titulo, "Expediente incompleto");
    assert.equal(s.detalles.length, 2);
    assert.match(s.detalles[0], /^Falta el complemento de pago del proveedor \(saldo insoluto: USD\s6,600\.00\)\.$/);
    assert.equal(s.detalles[1], "No hay documentos soporte adjuntos (orden de compra, cotización, etc.).");
    assert.equal(semaforoFiscal(exp({ adjuntos: [] }), "emitida").detalles[0], "Falta el complemento de pago (saldo insoluto: $6,600.00).");
});

test("semáforo: PUE vigente sin adjuntos → incompleto solo por falta de soporte", () => {
    const s = semaforoFiscal(exp({ factura: { metodo_pago: "PUE" }, pagos: [], total_pagado: 0, saldo_pendiente: 0, adjuntos: [] }), "recibida");

    assert.equal(s.estado, "incompleto");
    assert.deepEqual(s.detalles, ["No hay documentos soporte adjuntos (orden de compra, cotización, etc.)."]);
});

test("semáforo: metodo_pago null con saldo y con adjuntos → completo, sin línea de pago", () => {
    const s = semaforoFiscal(exp({ factura: { metodo_pago: null } }), "recibida");

    assert.equal(s.estado, "completo");
    assert.equal(s.titulo, "Expediente completo");
    assert.ok(s.detalles.every((d) => !/pago/i.test(d)));
});

test("semáforo: PPD liquidada, con adjuntos, XML y PDF → completo con la línea de XML y PDF", () => {
    const s = semaforoFiscal(exp({ total_pagado: 11600, saldo_pendiente: 0 }), "recibida");

    assert.deepEqual(s.detalles, [
        "Estatus vigente ante el SAT.",
        "Emisor libre de la lista de EFOS.",
        "Complementos de pago cubiertos al 100%.",
        "Documentación soporte adjunta (1 documento(s)).",
        "XML y PDF disponibles en CoreCFDI."
    ]);
});

test("semáforo: completo con has_pdf = false → sigue verde, sin la línea de XML y PDF", () => {
    const s = semaforoFiscal(exp({ total_pagado: 11600, saldo_pendiente: 0, has_pdf: false }), "recibida");

    assert.equal(s.estado, "completo");
    assert.equal(s.detalles.includes("XML y PDF disponibles en CoreCFDI."), false);
});

test("semáforo: subir el primer adjunto a un PUE vigente → pasa de amarillo a verde sin pedir el expediente", async () => {
    const e = await crearBoveda((llamada) =>
        llamada.method === "POST" ? respuestaAdjunto : expediente({ factura: { metodo_pago: "PUE" }, pagos: [], total_pagado: 0, saldo_pendiente: 0, adjuntos: [] })
    );
    let pantalla = await e.boveda.expediente(40);
    assert.equal(semaforoFiscal(pantalla, "recibida").estado, "incompleto");

    const r = await e.boveda.subirAdjunto(40, archivoPdf(), "Orden de Compra");
    // Lo mismo que hace el panel: reemplaza las listas con las de la respuesta.
    pantalla = { ...pantalla, adjuntos: r.adjuntos, eventos: r.eventos };

    const s = semaforoFiscal(pantalla, "recibida");
    assert.equal(s.estado, "completo");
    assert.ok(s.detalles.includes("Pago de contado (PUE) al emitirse."));
    assert.equal(e.api.deRuta("/facturas/40/boveda").length, 1);
});
