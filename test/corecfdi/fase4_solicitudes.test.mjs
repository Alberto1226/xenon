import { test } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno, conTokenExpirado, json, solicitud, paginador } from "./ayudas.mjs";

test("página 1 con resultados: solicitudes y datos de paginación", async () => {
    const e = await crearEntorno(() => json(200, paginador([solicitud(), solicitud({ id: 11, tipo: "recibido", status: "descargada" })], { lastPage: 3, total: 45 })));

    const resultado = await e.sat.listarSolicitudes(1);

    assert.equal(resultado.items.length, 2);
    assert.equal(resultado.page, 1);
    assert.equal(resultado.lastPage, 3);
    assert.equal(resultado.total, 45);
    assert.equal(resultado.items[0].id, 12);
    assert.equal(resultado.items[1].tipo, "recibido");

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/sat/descarga-masiva/solicitudes");
    assert.deepEqual(llamada.query, { page: "1" });
    assert.equal(llamada.method, "GET");
});

test("historial vacío: lista vacía sin errores", async () => {
    const e = await crearEntorno(() => json(200, paginador([], { total: 0 })));

    const resultado = await e.sat.listarSolicitudes();

    assert.deepEqual(resultado, { items: [], page: 1, lastPage: 1, total: 0 });
    assert.deepEqual(await e.sat.pendientes(), []);
});

test("listarTodas recorre todas las páginas y se detiene en next_page_url = null", async () => {
    const e = await crearEntorno((llamada) => {
        const page = Number(llamada.query.page);
        return json(200, paginador([solicitud({ id: 100 - page })], { page, lastPage: 3, total: 3 }));
    });

    const todas = await e.sat.listarTodas();

    assert.deepEqual(todas.map((s) => s.id), [99, 98, 97]);
    assert.deepEqual(e.api.llamadas.map((l) => l.query.page), ["1", "2", "3"]);
});

test("listarTodas tiene un límite de 50 páginas para no quedar en bucle", async () => {
    const e = await crearEntorno((llamada) => json(200, paginador([solicitud()], { page: Number(llamada.query.page), lastPage: 9999 })));

    await e.sat.listarTodas();

    assert.equal(e.api.llamadas.length, 50);
});

test("existeSolicitud detecta un periodo ya solicitado mapeando emitidas <-> emitido", async () => {
    const historial = [
        solicitud({ id: 1, status: "rechazada" }),
        solicitud({ id: 2, status: "descargada" }),
        solicitud({ id: 3, tipo: "recibido", fecha_inicio: "2026-02-01T00:00:00.000000Z", fecha_fin: "2026-02-28T23:59:59.000000Z", status: "vencida" })
    ];
    const e = await crearEntorno(() => json(200, paginador(historial)));

    assert.equal((await e.sat.existeSolicitud("2026-01-01", "2026-01-31", "emitidas")).id, 2);
    assert.equal((await e.sat.existeSolicitud("2026-01-01 00:00:00", "2026-01-31 23:59:59", "emitido")).id, 2);
    // Mismo periodo, otro tipo.
    assert.equal(await e.sat.existeSolicitud("2026-01-01", "2026-01-31", "recibidas"), null);
    // Rechazada y vencida no cuentan como ya solicitado.
    assert.equal(await e.sat.existeSolicitud("2026-02-01", "2026-02-28", "recibidas"), null);
    // Otro periodo.
    assert.equal(await e.sat.existeSolicitud("2026-01-01", "2026-01-15", "emitidas"), null);
});

test("pendientes devuelve solo las solicitudes en estado pendiente", async () => {
    const e = await crearEntorno(() => json(200, paginador([solicitud({ id: 1 }), solicitud({ id: 2, status: "descargada" }), solicitud({ id: 3 })])));

    assert.deepEqual((await e.sat.pendientes()).map((s) => s.id), [1, 3]);
});

test("las fechas del periodo se toman tal cual, sin conversión de zona horaria", async () => {
    const e = await crearEntorno(() => json(200, paginador([solicitud()])));

    const { items } = await e.sat.listarSolicitudes();

    // 2026-01-31T23:59:59.000000Z es 31/01/2026 23:59:59 hora de México, no 17:59:59.
    assert.equal(items[0].fecha_inicio, "2026-01-01 00:00:00");
    assert.equal(items[0].fecha_fin, "2026-01-31 23:59:59");
    // created_at sí es UTC y se conserva con su zona.
    assert.equal(items[0].created_at, "2026-02-01T17:20:00.000000Z");
});

test("estado desconocido: se devuelve tal cual sin romper", async () => {
    const e = await crearEntorno(() => json(200, paginador([solicitud({ status: "en_revision_sat" })])));

    const { items } = await e.sat.listarSolicitudes();

    assert.equal(items[0].status, "en_revision_sat");
    assert.equal(await e.sat.existeSolicitud("2026-01-01", "2026-01-31", "emitidas"), null);
});

test("el historial actualiza el almacén local de solicitudes", async () => {
    const e = await crearEntorno(() => json(200, paginador([solicitud({ status: "descargada" })])));

    await e.sat.listarSolicitudes();

    const local = await e.almacenSolicitudes.obtener(12);
    assert.equal(local.status, "descargada");
    assert.equal(local.request_id, "a1b2c3d4-0000");
});

test("token expirado: se renueva y la consulta funciona", async () => {
    const e = await crearEntorno(conTokenExpirado(() => json(200, paginador([solicitud()]))));

    const { items } = await e.sat.listarSolicitudes();

    assert.equal(items.length, 1);
    assert.equal(e.api.deRuta("/auth/refresh").length, 1);
});

test("5xx: reintenta máximo 2 veces; 403 no reintenta", async () => {
    const caido = await crearEntorno((llamada, n) => (n < 3 ? json(502, {}) : json(200, paginador([solicitud()]))));
    assert.equal((await caido.sat.listarSolicitudes()).items.length, 1);
    assert.equal(caido.api.llamadas.length, 3);

    const suspendida = await crearEntorno(() => json(403, { success: false, message: "La empresa 'Demo' se encuentra suspendida o inactiva." }));
    await assert.rejects(suspendida.sat.listarSolicitudes(), (err) => err.tipo === "prohibido" && /suspendida/.test(err.message));
    assert.equal(suspendida.api.llamadas.length, 1);
});
