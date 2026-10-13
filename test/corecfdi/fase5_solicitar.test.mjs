import { test } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno, conTokenExpirado, json, solicitud, paginador, TOKENS_VIGENTES } from "./ayudas.mjs";

const HISTORIAL = "/sat/descarga-masiva/solicitudes";
const SOLICITAR = "/sat/descarga-masiva/solicitar";
const ENERO = { fecha_inicio: "2026-01-01", fecha_fin: "2026-01-31", tipo_descarga: "emitidas" };

function aceptada(extra = {}) {
    return json(200, {
        success: true,
        message: "Solicitud de descarga masiva SAT procesada",
        data: {
            id: 12,
            request_id: "a1b2c3d4-0000",
            fecha_inicio: "2026-01-01 00:00:00",
            fecha_fin: "2026-01-31 23:59:59",
            tipo: "emitido",
            status: "pendiente",
            created_at: "2026-02-01T17:20:00.000000Z",
            updated_at: "2026-02-01T17:20:00.000000Z",
            ...extra
        }
    });
}

// API simulada: historial con `previas` y cada solicitud aceptada se agrega al historial.
function apiSat(previas = [], alSolicitar = null) {
    const historial = [...previas];
    let siguienteId = 12;
    return (llamada, n) => {
        if (llamada.ruta === HISTORIAL) return json(200, paginador(historial));
        if (alSolicitar) {
            const respuesta = alSolicitar(llamada, n);
            if (respuesta) return respuesta;
        }
        const cuerpo = JSON.parse(llamada.body);
        const tipo = cuerpo.tipo_descarga === "emitidas" ? "emitido" : "recibido";
        const id = siguienteId++;
        historial.push(solicitud({ id, tipo }));
        return aceptada({ id, tipo, request_id: "req-" + id });
    };
}

test("solicitud válida de emitidas: 200 y se guardan id y request_id", async () => {
    const e = await crearEntorno(apiSat());

    const creada = await e.sat.solicitarDescarga(ENERO);

    assert.equal(creada.id, 12);
    assert.equal(creada.request_id, "req-12");
    assert.equal(creada.status, "pendiente");
    assert.equal(creada.tipo, "emitido");
    assert.equal(creada.fecha_fin, "2026-01-31 23:59:59");

    const [llamada] = e.api.deRuta(SOLICITAR);
    assert.equal(llamada.method, "POST");
    assert.equal(llamada.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(llamada.body), { fecha_inicio: "2026-01-01", fecha_fin: "2026-01-31", tipo_descarga: "emitidas", tipo_comprobante: null });

    const local = await e.almacenSolicitudes.obtener(12);
    assert.equal(local.request_id, "req-12");
    assert.equal(local.status, "pendiente");
    assert.equal(local.tipo, "emitido");
});

test("validación previa: bloquea antes de enviar", async () => {
    const e = await crearEntorno(apiSat());
    const invalida = (datos, campo) => assert.rejects(e.sat.solicitarDescarga({ ...ENERO, ...datos }), (err) => err.tipo === "validacion" && !!err.errors[campo]);

    await invalida({ fecha_fin: "2025-12-31" }, "fecha_fin"); // anterior a fecha_inicio
    await invalida({ fecha_inicio: "01/01/2026" }, "fecha_inicio");
    await invalida({ fecha_fin: "2026-02-30" }, "fecha_fin"); // no existe
    await invalida({ fecha_inicio: "2026-03-01", fecha_fin: "2026-03-11" }, "fecha_fin"); // futura: hoy es 2026-03-10
    await invalida({ tipo_descarga: "todas" }, "tipo_descarga");
    await invalida({ tipo_comprobante: "X" }, "tipo_comprobante");

    assert.equal(e.api.llamadas.length, 0);
});

test("fecha_fin = hoy (hora de México) sí se permite", async () => {
    // 2026-03-11 03:00 UTC todavía es 10 de marzo en México.
    const ahora = Date.parse("2026-03-11T03:00:00Z");
    const e = await crearEntorno(apiSat(), { ahora: () => ahora, tokens: { ...TOKENS_VIGENTES, expires_at: ahora + 10 * 60 * 1000 } });

    await e.sat.solicitarDescarga({ fecha_inicio: "2026-03-01", fecha_fin: "2026-03-10", tipo_descarga: "recibidas", tipo_comprobante: "I" });
    await assert.rejects(e.sat.solicitarDescarga({ fecha_inicio: "2026-03-01", fecha_fin: "2026-03-11", tipo_descarga: "recibidas" }), (err) => !!err.errors.fecha_fin);

    assert.equal(JSON.parse(e.api.deRuta(SOLICITAR)[0].body).tipo_comprobante, "I");
});

test("el servidor responde 422 por tipo_descarga: error en ese campo", async () => {
    const e = await crearEntorno(apiSat([], () => json(422, { message: "El tipo de descarga no es válido.", errors: { tipo_descarga: ["El tipo de descarga no es válido."] } })));

    await assert.rejects(e.sat.solicitarDescarga(ENERO), (err) => err.tipo === "validacion" && !!err.errors.tipo_descarga);
    assert.equal(e.api.deRuta(SOLICITAR).length, 1);
});

test("periodo ya solicitado: no se envía una solicitud duplicada", async () => {
    for (const status of ["pendiente", "terminada", "descargada"]) {
        const e = await crearEntorno(apiSat([solicitud({ id: 7, status })]));

        await assert.rejects(e.sat.solicitarDescarga(ENERO), (err) => err.tipo === "duplicada" && err.datos.solicitud.id === 7);
        assert.equal(e.api.deRuta(SOLICITAR).length, 0);
    }

    // Una rechazada o vencida del mismo periodo sí permite volver a solicitar.
    const e = await crearEntorno(apiSat([solicitud({ id: 7, status: "vencida" })]));
    await e.sat.solicitarDescarga(ENERO);
    assert.equal(e.api.deRuta(SOLICITAR).length, 1);
});

test("emitidas + recibidas del mismo periodo: dos solicitudes con pausa entre ellas", async () => {
    const e = await crearEntorno(apiSat());

    const resultados = await e.sat.solicitarAmbas({ fecha_inicio: "2026-01-01", fecha_fin: "2026-01-31" });

    assert.deepEqual(resultados.map((r) => [r.tipo_descarga, r.ok]), [["emitidas", true], ["recibidas", true]]);
    assert.deepEqual(e.api.deRuta(SOLICITAR).map((l) => JSON.parse(l.body).tipo_descarga), ["emitidas", "recibidas"]);
    assert.ok(e.sleep.esperas.some((ms) => ms >= 2000), "debe haber una pausa de al menos 2 s");
    assert.notEqual(resultados[0].solicitud.id, resultados[1].solicitud.id);
});

test("solicitarAmbas: si un tipo ya existe, se pide solo el otro", async () => {
    const e = await crearEntorno(apiSat([solicitud({ id: 7, tipo: "emitido", status: "descargada" })]));

    const resultados = await e.sat.solicitarAmbas({ fecha_inicio: "2026-01-01", fecha_fin: "2026-01-31" });

    assert.equal(resultados[0].ok, false);
    assert.equal(resultados[0].error.tipo, "duplicada");
    assert.equal(resultados[1].ok, true);
    assert.deepEqual(e.api.deRuta(SOLICITAR).map((l) => JSON.parse(l.body).tipo_descarga), ["recibidas"]);
});

test("error 500 del SAT: máximo 2 reintentos con 5-10 s de espera y se muestra el mensaje", async () => {
    const mensaje = "Error al comunicar con el WS del SAT: timeout";
    const e = await crearEntorno(apiSat([], () => json(500, { success: false, message: mensaje, errors: null })));

    await assert.rejects(e.sat.solicitarDescarga(ENERO), (err) => err.tipo === "servidor" && err.message === mensaje);
    assert.equal(e.api.deRuta(SOLICITAR).length, 3);
    assert.deepEqual(e.sleep.esperas, [5000, 5000]);
});

test("error 500 porque ya existe la solicitud o se agotaron: no se reintenta", async () => {
    for (const mensaje of ["Error al comunicar con el WS del SAT: Ya existe una solicitud con los mismos parámetros", "Error al comunicar con el WS del SAT: Se han agotado las solicitudes de por vida"]) {
        const e = await crearEntorno(apiSat([], () => json(500, { success: false, message: mensaje, errors: null })));

        await assert.rejects(e.sat.solicitarDescarga(ENERO), (err) => err.message === mensaje);
        assert.equal(e.api.deRuta(SOLICITAR).length, 1);
    }
});

test("timeout al solicitar: no se reenvía (el SAT pudo haber aceptado la solicitud)", async () => {
    const e = await crearEntorno(apiSat([], () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
    }));

    await assert.rejects(e.sat.solicitarDescarga(ENERO), (err) => err.tipo === "timeout");
    assert.equal(e.api.deRuta(SOLICITAR).length, 1);
});

test("token expirado: se renueva y la solicitud funciona", async () => {
    const e = await crearEntorno(conTokenExpirado(apiSat()));

    const creada = await e.sat.solicitarDescarga(ENERO);

    assert.equal(creada.id, 12);
    assert.equal(e.api.deRuta("/auth/refresh").length, 1);
    assert.equal(e.api.deRuta(SOLICITAR).length, 1);
});

test("el log lleva periodo, tipo y request_id, sin tokens", async () => {
    const e = await crearEntorno(conTokenExpirado(apiSat()));
    await e.sat.solicitarDescarga(ENERO);

    const log = e.logger.texto();
    assert.match(log, /POST \/sat\/descarga-masiva\/solicitar -> 200/);
    assert.match(log, /2026-01-01\.\.2026-01-31/);
    assert.match(log, /emitidas/);
    assert.match(log, /req-12/);
    for (const secreto of ["access-vigente", "refresh-vigente", "access-nuevo", "refresh-nuevo", "Bearer"]) {
        assert.ok(!log.includes(secreto), `el log contiene "${secreto}"`);
    }
});
