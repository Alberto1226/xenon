// Sesión iniciada por el usuario: la empresa, el email y la contraseña se piden en pantalla y
// la contraseña no se guarda, así que cuando la sesión ya no se puede renovar hay que volver a pedirla.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearCoreCfdiAuth } from "../../src/services/corecfdi/auth.js";
import { crearCoreCfdiCliente } from "../../src/services/corecfdi/cliente.js";
import { crearAlmacenTokensMemoria, crearLockMemoria } from "../../src/services/corecfdi/almacenMemoria.js";
import { AHORA, RESPUESTA_LOGIN, RESPUESTA_REFRESH, TOKENS_VIGENTES, crearApiFalsa, crearLogger, crearSleep, json } from "./ayudas.mjs";

const TENANT = "empresa-del-usuario";
const PASSWORD = "Contraseña-escrita-en-pantalla";

// Como en la aplicación: la configuración solo trae el servidor y la empresa de la sesión.
async function crearSesion(manejador, tokens = null) {
    const api = crearApiFalsa(manejador);
    const logger = crearLogger();
    const almacen = crearAlmacenTokensMemoria();
    if (tokens) await almacen.guardar(TENANT, tokens);
    const config = { baseUrl: "https://corecfdi.prueba/api/v1", deviceName: "xenon", tenant: TENANT };
    const auth = crearCoreCfdiAuth({ config, almacen, lock: crearLockMemoria(), idSesion: "usuario-1", fetch: api.fetch, logger, sleep: crearSleep(), ahora: () => AHORA });
    const cliente = crearCoreCfdiCliente({ config, auth, fetch: api.fetch, logger, sleep: crearSleep() });
    return { api, logger, almacen, auth, cliente };
}

test("iniciar sesión con la empresa, el email y la contraseña que escribe el usuario", async () => {
    const s = await crearSesion(() => json(200, RESPUESTA_LOGIN));

    await s.auth.login({ email: "usuario@empresa.com", password: PASSWORD });

    const [llamada] = s.api.llamadas;
    assert.equal(llamada.headers["X-Tenant"], TENANT);
    assert.deepEqual(JSON.parse(llamada.body), { email: "usuario@empresa.com", password: PASSWORD, device_name: "xenon" });

    const guardado = await s.almacen.leer(TENANT);
    assert.equal(guardado.access_token, "12|access-login");
    assert.equal(guardado.email, "usuario@empresa.com");
    assert.ok(!JSON.stringify(guardado).includes(PASSWORD), "la contraseña no se guarda con la sesión");
    assert.ok(!s.logger.texto().includes(PASSWORD));
});

test("credenciales incorrectas: error y no queda sesión", async () => {
    const s = await crearSesion(() => json(401, { success: false, message: "Credenciales de acceso incorrectas", errors: null }));

    await assert.rejects(s.auth.login({ email: "usuario@empresa.com", password: "mala" }), (err) => err.tipo === "credenciales");
    assert.equal(await s.almacen.leer(TENANT), null);
});

test("sin sesión iniciada: las funciones piden iniciar sesión y no llaman a la API", async () => {
    const s = await crearSesion(() => json(200, RESPUESTA_LOGIN));

    await assert.rejects(s.cliente.peticion({ ruta: "/facturas/recibidas" }), (err) => err.tipo === "sesion");
    await assert.rejects(s.auth.getAccessToken(), (err) => err.tipo === "sesion");
    assert.equal(s.api.llamadas.length, 0);
});

test("con sesión vigente el token se renueva solo, sin volver a pedir la contraseña", async () => {
    const s = await crearSesion((llamada) => (llamada.ruta === "/auth/refresh" ? json(200, RESPUESTA_REFRESH) : json(200, { success: true, data: {} })), {
        ...TOKENS_VIGENTES,
        email: "usuario@empresa.com",
        expires_at: AHORA + 10 * 1000
    });

    await s.cliente.peticion({ ruta: "/facturas/recibidas" });

    assert.deepEqual(s.api.llamadas.map((l) => l.ruta), ["/auth/refresh", "/facturas/recibidas"]);
    const guardado = await s.almacen.leer(TENANT);
    assert.equal(guardado.refresh_token, "15|refresh-nuevo");
    assert.equal(guardado.email, "usuario@empresa.com");
});

test("refresh token vencido o revocado: se borra la sesión y se pide iniciar sesión de nuevo", async () => {
    const s = await crearSesion((llamada) => (llamada.ruta === "/auth/refresh" ? json(401, { message: "Unauthenticated." }) : json(401, { message: "Unauthenticated." })), TOKENS_VIGENTES);

    await assert.rejects(s.cliente.peticion({ ruta: "/facturas/recibidas" }), (err) => err.tipo === "sesion" && /Inicie sesión de nuevo/.test(err.message));

    // No hay contraseña guardada: no se intenta un login automático.
    assert.equal(s.api.deRuta("/auth/login").length, 0);
    assert.equal(await s.almacen.leer(TENANT), null);
});
