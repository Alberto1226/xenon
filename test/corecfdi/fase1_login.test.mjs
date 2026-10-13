import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, AHORA, RESPUESTA_LOGIN, crearEntorno, json } from "./ayudas.mjs";

test("login correcto guarda los tokens y expires_at con el valor que llega", async () => {
    const respuesta = { ...RESPUESTA_LOGIN, data: { ...RESPUESTA_LOGIN.data, expires_in_minutes: 20 } };
    const e = await crearEntorno(() => json(200, respuesta), { tokens: null });

    await e.auth.login();

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.url, "https://corecfdi.prueba/api/v1/auth/login");
    assert.equal(llamada.method, "POST");
    assert.equal(llamada.headers["Accept"], "application/json");
    assert.equal(llamada.headers["Content-Type"], "application/json");
    assert.equal(llamada.headers["X-Tenant"], CONFIG.tenant);
    assert.deepEqual(JSON.parse(llamada.body), { email: CONFIG.email, password: CONFIG.password, device_name: CONFIG.deviceName });

    const guardados = await e.almacenTokens.leer(CONFIG.tenant);
    assert.equal(guardados.access_token, "12|access-login");
    assert.equal(guardados.refresh_token, "13|refresh-login");
    assert.equal(guardados.tenant_id, "t-1");
    assert.equal(guardados.user.email, "api@empresa.com");
    assert.equal(guardados.expires_at, AHORA + 20 * 60 * 1000);
});

test("contraseña incorrecta: error 401 sin reintento", async () => {
    const e = await crearEntorno(() => json(401, { success: false, message: "Credenciales de acceso incorrectas", errors: null }), { tokens: null });

    await assert.rejects(e.auth.login(), (err) => err.tipo === "credenciales" && err.status === 401 && /incorrectas/.test(err.message));
    assert.equal(e.api.llamadas.length, 1);
    assert.equal(await e.almacenTokens.leer(CONFIG.tenant), null);
});

test("email vacío o inválido: error 422 con detalle por campo", async () => {
    const errors = { email: ["El campo email debe ser un correo válido."], password: ["El campo password es obligatorio."] };
    const e = await crearEntorno(() => json(422, { message: "Datos inválidos", errors }), { tokens: null });

    await assert.rejects(e.auth.login(), (err) => {
        assert.equal(err.tipo, "validacion");
        assert.deepEqual(err.errors, errors);
        return true;
    });
    assert.equal(e.api.llamadas.length, 1);
});

test("429: espera Retry-After y reintenta como máximo una vez", async () => {
    const e = await crearEntorno((llamada, n) => (n === 1 ? json(429, { message: "Too Many Attempts." }, { "Retry-After": "7" }) : json(200, RESPUESTA_LOGIN)), { tokens: null });
    await e.auth.login();
    assert.equal(e.api.llamadas.length, 2);
    assert.deepEqual(e.sleep.esperas, [7000]);

    const siempre = await crearEntorno(() => json(429, { message: "Too Many Attempts." }, { "Retry-After": "1" }), { tokens: null });
    await assert.rejects(siempre.auth.login(), (err) => err.tipo === "limite");
    assert.equal(siempre.api.llamadas.length, 2);
});

test("5xx y error de red: máximo 2 reintentos con backoff y error claro", async () => {
    const caido = await crearEntorno(() => json(503, { message: "Service Unavailable" }), { tokens: null });
    await assert.rejects(caido.auth.login(), (err) => err.tipo === "servidor" && err.status === 503);
    assert.equal(caido.api.llamadas.length, 3);
    assert.deepEqual(caido.sleep.esperas, [500, 1000]);

    const sinRed = await crearEntorno(() => {
        throw new TypeError("fetch failed");
    }, { tokens: null });
    await assert.rejects(sinRed.auth.login(), (err) => err.tipo === "red");
    assert.equal(sinRed.api.llamadas.length, 3);
});

test("ningún log contiene la contraseña ni los tokens", async () => {
    const e = await crearEntorno(() => json(200, RESPUESTA_LOGIN), { tokens: null });
    await e.auth.login();

    const log = e.logger.texto();
    assert.match(log, /POST \/auth\/login -> 200 \(\d+ ms\)/);
    assert.ok(!log.includes(CONFIG.password));
    assert.ok(!log.includes("12|access-login"));
    assert.ok(!log.includes("13|refresh-login"));
});
