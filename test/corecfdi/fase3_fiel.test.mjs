import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import { crearEntorno, conTokenExpirado, json } from "./ayudas.mjs";

const PASSWORD_FIEL = "clave-de-la-fiel-123";
const CONTENIDO_KEY = "CONTENIDO-SECRETO-DE-LA-LLAVE";
const fiel = () => ({
    cer: { nombre: "fiel.cer", buffer: Buffer.from("CONTENIDO-DEL-CERTIFICADO") },
    key: { nombre: "fiel.key", buffer: Buffer.from(CONTENIDO_KEY) },
    password: PASSWORD_FIEL
});

const fielGuardada = (valido_hasta = "2030-09-24", rfc = "EKU9003173C9") =>
    json(200, { success: true, message: "Certificados FIEL/e.firma cargados y verificados con éxito", data: { status: "activo", rfc, valido_hasta } });

test("FIEL válida: 200 y se devuelven rfc, status y valido_hasta", async () => {
    const e = await crearEntorno(() => fielGuardada());

    const resultado = await e.sat.configurarFiel({ ...fiel(), rfcEsperado: "eku9003173c9" });

    assert.equal(resultado.rfc, "EKU9003173C9");
    assert.equal(resultado.status, "activo");
    assert.equal(resultado.valido_hasta, "2030-09-24");
    assert.equal(resultado.rfcCoincide, true);
    assert.deepEqual(resultado.advertencias, []);

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/sat/fiel");
    assert.equal(llamada.method, "POST");
    assert.equal(llamada.headers["Authorization"], "Bearer 20|access-vigente");
    // El boundary lo genera fetch: no se fija Content-Type a mano.
    assert.equal(llamada.headers["Content-Type"], undefined);
    assert.ok(llamada.body instanceof FormData);
    assert.equal(llamada.body.get("cer_file").name, "fiel.cer");
    assert.equal(llamada.body.get("key_file").name, "fiel.key");
    // Los archivos viajan en binario tal cual.
    assert.equal(await llamada.body.get("key_file").text(), CONTENIDO_KEY);
    assert.equal(llamada.body.get("password"), PASSWORD_FIEL);
});

test("validación previa: falta un archivo, extensión incorrecta, archivo vacío o sin contraseña", async () => {
    const e = await crearEntorno(() => fielGuardada());

    await assert.rejects(e.sat.configurarFiel({ ...fiel(), key: null }), (err) => err.tipo === "validacion" && !!err.errors.key_file);
    await assert.rejects(e.sat.configurarFiel({ ...fiel(), cer: { nombre: "fiel.pdf", buffer: Buffer.from("x") } }), (err) => !!err.errors.cer_file);
    await assert.rejects(e.sat.configurarFiel({ ...fiel(), key: { nombre: "fiel.key", buffer: Buffer.alloc(0) } }), (err) => !!err.errors.key_file);
    await assert.rejects(e.sat.configurarFiel({ ...fiel(), password: "" }), (err) => !!err.errors.password);
    assert.equal(e.api.llamadas.length, 0);
});

test("el servidor responde 422 por key_file faltante: error en ese campo", async () => {
    const e = await crearEntorno(() => json(422, { message: "El campo key file es obligatorio.", errors: { key_file: ["El campo key file es obligatorio."] } }));

    await assert.rejects(e.sat.configurarFiel(fiel()), (err) => err.tipo === "validacion" && err.errors.key_file[0] === "El campo key file es obligatorio.");
});

test("contraseña incorrecta: 422 con mensaje de error", async () => {
    const e = await crearEntorno(() => json(422, { message: "La contraseña de la llave privada es incorrecta.", errors: { password: ["La contraseña de la llave privada es incorrecta."] } }));

    await assert.rejects(e.sat.configurarFiel(fiel()), (err) => err.tipo === "validacion" && /incorrecta/.test(err.message) && !!err.errors.password);
    assert.equal(e.api.llamadas.length, 1);
});

test("token expirado: se renueva, se reenvían los archivos y la carga funciona", async () => {
    const e = await crearEntorno(conTokenExpirado(() => fielGuardada()));

    const resultado = await e.sat.configurarFiel(fiel());

    assert.equal(resultado.rfc, "EKU9003173C9");
    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/sat/fiel", "/auth/refresh", "/sat/fiel"]);
    const [primera, , segunda] = e.api.llamadas;
    assert.notEqual(primera.body, segunda.body, "el reintento debe llevar un FormData nuevo");
    assert.equal(await segunda.body.get("cer_file").text(), "CONTENIDO-DEL-CERTIFICADO");
    assert.equal(await segunda.body.get("key_file").text(), CONTENIDO_KEY);
    assert.equal(segunda.body.get("password"), PASSWORD_FIEL);
    assert.equal(segunda.headers["Authorization"], "Bearer 14|access-nuevo");
});

test("RFC devuelto distinto al esperado: advertencia", async () => {
    const e = await crearEntorno(() => fielGuardada("2030-09-24", "XAXX010101000"));

    const resultado = await e.sat.configurarFiel({ ...fiel(), rfcEsperado: "EKU9003173C9" });

    assert.equal(resultado.rfcCoincide, false);
    assert.match(resultado.advertencias[0], /XAXX010101000.*no coincide.*EKU9003173C9/);
});

test("FIEL que vence en menos de 30 días: alerta de vencimiento", async () => {
    // "Hoy" en las pruebas es 2026-03-10.
    const porVencer = await crearEntorno(() => fielGuardada("2026-03-30"));
    const resultado = await porVencer.sat.configurarFiel(fiel());
    assert.equal(resultado.diasParaVencer, 20);
    assert.match(resultado.advertencias[0], /vence en 20 día/);

    const lejana = await crearEntorno(() => fielGuardada("2026-04-09"));
    assert.deepEqual((await lejana.sat.configurarFiel(fiel())).advertencias, []);
});

test("5xx: no se reintenta más de una vez", async () => {
    const e = await crearEntorno(() => json(500, { success: false, message: "Error interno" }));

    await assert.rejects(e.sat.configurarFiel(fiel()), (err) => err.tipo === "servidor");
    assert.equal(e.api.llamadas.length, 2);
});

test("ningún log contiene la contraseña ni el contenido de los archivos; solo el rfc", async () => {
    const e = await crearEntorno(conTokenExpirado(() => fielGuardada()));
    await e.sat.configurarFiel(fiel());

    const log = e.logger.texto();
    assert.match(log, /POST \/sat\/fiel -> 200/);
    assert.match(log, /EKU9003173C9/);
    assert.ok(!log.includes(PASSWORD_FIEL));
    assert.ok(!log.includes(CONTENIDO_KEY));
    assert.ok(!log.includes("CONTENIDO-DEL-CERTIFICADO"));
});

test("no quedan archivos temporales, ni en éxito ni en error", async () => {
    // La FIEL se maneja solo en memoria: la carga no debe escribir nada en el directorio temporal.
    const exito = await crearEntorno(() => fielGuardada());
    await exito.sat.configurarFiel(fiel());
    const fallo = await crearEntorno(() => json(500, { success: false, message: "Error interno" }));
    await assert.rejects(fallo.sat.configurarFiel(fiel()));

    const despues = fs.readdirSync(os.tmpdir()).filter((nombre) => /\.(cer|key)$/i.test(nombre));
    assert.deepEqual(despues, []);
});
