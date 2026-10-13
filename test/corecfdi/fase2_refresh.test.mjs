import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG, AHORA, RESPUESTA_LOGIN, RESPUESTA_REFRESH, TOKENS_VIGENTES, crearEntorno, json } from "./ayudas.mjs";

const POR_CADUCAR = { ...TOKENS_VIGENTES, access_token: "20|access-viejo", expires_at: AHORA + 30 * 1000 };

test("refresh correcto reemplaza ambos tokens y actualiza expires_at", async () => {
    const respuesta = { ...RESPUESTA_REFRESH, data: { ...RESPUESTA_REFRESH.data, expires_in_minutes: 25 } };
    const e = await crearEntorno(() => json(200, respuesta));

    await e.auth.refresh();

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/auth/refresh");
    assert.equal(llamada.method, "POST");
    assert.equal(llamada.headers["Authorization"], "Bearer 21|refresh-vigente");
    assert.equal(llamada.headers["X-Tenant"], CONFIG.tenant);
    assert.equal(llamada.headers["Accept"], "application/json");
    assert.equal(llamada.body, undefined);

    const guardados = await e.almacenTokens.leer(CONFIG.tenant);
    assert.equal(guardados.access_token, "14|access-nuevo");
    assert.equal(guardados.refresh_token, "15|refresh-nuevo");
    assert.equal(guardados.expires_at, AHORA + 25 * 60 * 1000);
});

test("reusar un refresh token ya usado: 401 y se hace login automáticamente", async () => {
    const e = await crearEntorno((llamada) => (llamada.ruta === "/auth/refresh" ? json(401, { message: "Unauthenticated." }) : json(200, RESPUESTA_LOGIN)));

    const tokens = await e.auth.refresh();

    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/auth/refresh", "/auth/login"]);
    assert.equal(tokens.access_token, "12|access-login");
    assert.equal((await e.almacenTokens.leer(CONFIG.tenant)).refresh_token, "13|refresh-login");
});

test("enviar un token que no es refresh token: 403 y se hace login", async () => {
    const e = await crearEntorno((llamada) =>
        llamada.ruta === "/auth/refresh"
            ? json(403, { success: false, message: "El token proporcionado no es un Refresh Token válido.", errors: null })
            : json(200, RESPUESTA_LOGIN)
    );

    const tokens = await e.auth.refresh();

    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/auth/refresh", "/auth/login"]);
    assert.equal(tokens.access_token, "12|access-login");
});

test("403 por empresa suspendida: error sin reintento ni login", async () => {
    const mensaje = "La empresa 'Demo' se encuentra suspendida o inactiva.";
    const e = await crearEntorno(() => json(403, { success: false, message: mensaje, errors: null }));

    await assert.rejects(e.auth.refresh(), (err) => err.tipo === "prohibido" && err.message === mensaje);
    assert.equal(e.api.llamadas.length, 1);
    assert.match(e.logger.texto(), /ALERTA/);
});

test("getAccessToken: sin tokens hace login; vigente no llama a la API", async () => {
    const sinSesion = await crearEntorno(() => json(200, RESPUESTA_LOGIN), { tokens: null });
    assert.equal(await sinSesion.auth.getAccessToken(), "12|access-login");
    assert.deepEqual(sinSesion.api.llamadas.map((l) => l.ruta), ["/auth/login"]);

    const vigente = await crearEntorno(() => json(500, {}));
    assert.equal(await vigente.auth.getAccessToken(), "20|access-vigente");
    assert.equal(vigente.api.llamadas.length, 0);
});

test("access token por caducar (menos de 60 s): getAccessToken renueva antes de llamar", async () => {
    const e = await crearEntorno((llamada) => (llamada.ruta === "/auth/refresh" ? json(200, RESPUESTA_REFRESH) : json(200, { success: true, data: {} })), { tokens: POR_CADUCAR });

    await e.cliente.peticion({ ruta: "/facturas/recibidas" });

    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/auth/refresh", "/facturas/recibidas"]);
    assert.equal(e.api.llamadas[1].headers["Authorization"], "Bearer 14|access-nuevo");
});

test("llamada que responde 401: refresh y un solo reintento", async () => {
    const e = await crearEntorno((llamada) => {
        if (llamada.ruta === "/auth/refresh") return json(200, RESPUESTA_REFRESH);
        return llamada.headers["Authorization"] === "Bearer 14|access-nuevo" ? json(200, { success: true, data: { ok: 1 } }) : json(401, { message: "Unauthenticated." });
    });

    const respuesta = await e.cliente.peticion({ ruta: "/facturas/recibidas" });

    assert.deepEqual(respuesta.data, { ok: 1 });
    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/facturas/recibidas", "/auth/refresh", "/facturas/recibidas"]);
    assert.equal(e.api.llamadas[0].headers["X-Tenant"], CONFIG.tenant);
    assert.equal(e.api.llamadas[0].headers["Accept"], "application/json");
});

test("si la llamada vuelve a responder 401: error de autenticación sin bucle", async () => {
    const e = await crearEntorno((llamada) => (llamada.ruta === "/auth/refresh" ? json(200, RESPUESTA_REFRESH) : json(401, { message: "Unauthenticated." })));

    await assert.rejects(e.cliente.peticion({ ruta: "/facturas/recibidas" }), (err) => err.tipo === "autenticacion");
    assert.equal(e.api.deRuta("/facturas/recibidas").length, 2);
    assert.equal(e.api.deRuta("/auth/refresh").length, 1);
});

test("dos peticiones simultáneas con token expirado: solo se hace un refresh", async () => {
    const e = await crearEntorno(async (llamada) => {
        if (llamada.ruta === "/auth/refresh") {
            await new Promise((resolve) => setTimeout(resolve, 20));
            return json(200, RESPUESTA_REFRESH);
        }
        return json(200, { success: true, data: {} });
    }, { tokens: POR_CADUCAR });

    await Promise.all([e.cliente.peticion({ ruta: "/a" }), e.cliente.peticion({ ruta: "/b" }), e.auth.getAccessToken()]);

    assert.equal(e.api.deRuta("/auth/refresh").length, 1);
    assert.equal(e.api.deRuta("/a")[0].headers["Authorization"], "Bearer 14|access-nuevo");
    assert.equal(e.api.deRuta("/b")[0].headers["Authorization"], "Bearer 14|access-nuevo");
});

test("dos peticiones simultáneas que reciben 401: el segundo refresh usa el token ya renovado", async () => {
    let refreshes = 0;
    const e = await crearEntorno((llamada) => {
        if (llamada.ruta === "/auth/refresh") {
            refreshes++;
            // El refresh token usado queda revocado: un segundo refresh con el mismo daría 401.
            return refreshes === 1 ? json(200, RESPUESTA_REFRESH) : json(401, { message: "Unauthenticated." });
        }
        return llamada.headers["Authorization"] === "Bearer 14|access-nuevo" ? json(200, { success: true, data: {} }) : json(401, { message: "Unauthenticated." });
    });

    await e.cliente.peticion({ ruta: "/a" });
    // Otra petición que salió con el token viejo recibe 401 cuando el refresh ya terminó.
    await e.auth.refresh({ tokenFallido: "20|access-vigente" });

    assert.equal(refreshes, 1);
    assert.equal(e.api.deRuta("/auth/login").length, 0);
});

test("cliente compartido: 403 no reintenta y muestra el mensaje del servidor", async () => {
    const e = await crearEntorno(() => json(403, { success: false, message: "No tiene permiso de escritura.", errors: null }));

    await assert.rejects(e.cliente.peticion({ method: "POST", ruta: "/sat/fiel", reintentos: 2 }), (err) => err.tipo === "prohibido" && err.message === "No tiene permiso de escritura.");
    assert.equal(e.api.llamadas.length, 1);
});

test("cliente compartido: 429 espera Retry-After y reintenta una vez", async () => {
    const e = await crearEntorno((llamada, n) => (n === 1 ? json(429, {}, { "Retry-After": "3" }) : json(200, { success: true, data: {} })));

    await e.cliente.peticion({ ruta: "/facturas/recibidas" });

    assert.equal(e.api.llamadas.length, 2);
    assert.deepEqual(e.sleep.esperas, [3000]);
});

test("cliente compartido: 422 expone errors por campo aunque no traiga success", async () => {
    const e = await crearEntorno(() => json(422, { message: "The per page field must not be greater than 100.", errors: { per_page: ["..."] } }));

    await assert.rejects(e.cliente.peticion({ ruta: "/facturas/recibidas" }), (err) => err.tipo === "validacion" && err.errors.per_page.length === 1);
});

test("ningún log contiene tokens", async () => {
    const e = await crearEntorno((llamada) => {
        if (llamada.ruta === "/auth/refresh") return json(200, RESPUESTA_REFRESH);
        if (llamada.ruta === "/auth/login") return json(200, RESPUESTA_LOGIN);
        return llamada.headers["Authorization"] === "Bearer 14|access-nuevo" ? json(200, { success: true, data: {} }) : json(401, {});
    });

    await e.cliente.peticion({ ruta: "/facturas/recibidas", query: { buscar: "abc" } });
    await e.auth.login();

    const log = e.logger.texto();
    assert.match(log, /POST \/auth\/refresh -> 200/);
    for (const secreto of ["access-vigente", "refresh-vigente", "access-nuevo", "refresh-nuevo", "access-login", "refresh-login", "Bearer", CONFIG.password]) {
        assert.ok(!log.includes(secreto), `el log contiene "${secreto}"`);
    }
});
