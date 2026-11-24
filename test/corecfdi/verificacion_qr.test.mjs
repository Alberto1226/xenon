import { test } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno, conTokenExpirado, json } from "./ayudas.mjs";

const URL_SAT = "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=EF34CE53-6076-4190-B8FD-EFD3274BA5F6&re=BMN930209927&rr=QUHJ711021UR1&tt=0000001160.000000&fe=p+w/2g==";

function verificacion(extra = {}) {
    return json(200, {
        success: true,
        message: "Verificación QR del CFDI generada con éxito",
        data: {
            id: 25,
            uuid: "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
            emisor_rfc: "BMN930209927",
            receptor_rfc: "QUHJ711021UR1",
            total: 1160.0,
            total_formateado: "0000001160.000000",
            sello_ultimos_8: "p+w/2g==",
            sello_completo: true,
            url: URL_SAT,
            qr_svg: "data:image/svg+xml;base64,PD94bWw=",
            ...extra
        }
    });
}

test("factura con XML: modelo propio y la liga llega sin tocar", async () => {
    const { facturas, api, logger } = await crearEntorno(() => verificacion());
    const r = await facturas.verificacionQr(25);

    assert.deepEqual(r, {
        id: 25,
        uuid: "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
        emisorRfc: "BMN930209927",
        receptorRfc: "QUHJ711021UR1",
        total: 1160,
        url: URL_SAT,
        qrSvg: "data:image/svg+xml;base64,PD94bWw=",
        selloCompleto: true
    });
    const [llamada] = api.llamadas;
    assert.equal(llamada.ruta, "/facturas/25/verificacion-qr");
    assert.equal(llamada.method, "GET");
    assert.equal(llamada.headers["Accept"], "application/json");
    assert.equal(llamada.headers["X-Tenant"], "empresa-demo");
    assert.match(llamada.headers["Authorization"], /^Bearer /);
    // El log no lleva el token ni la liga.
    assert.doesNotMatch(logger.texto(), /access-vigente|verificacfdi|BMN930209927/);
});

test("factura sin XML: selloCompleto false", async () => {
    const { facturas } = await crearEntorno(() => verificacion({ sello_ultimos_8: null, sello_completo: false, url: URL_SAT.replace("p+w/2g==", "") }));
    const r = await facturas.verificacionQr(25);
    assert.equal(r.selloCompleto, false);
    assert.match(r.url, /&fe=$/);
});

test("qr_svg null o que no es imagen SVG → qrSvg null", async () => {
    const { facturas } = await crearEntorno(() => verificacion({ qr_svg: null }));
    assert.equal((await facturas.verificacionQr(25)).qrSvg, null);
    const otro = await crearEntorno(() => verificacion({ qr_svg: "<svg onload=alert(1)>" }));
    assert.equal((await otro.facturas.verificacionQr(25)).qrSvg, null);
});

test("id no numérico o ≤ 0: no se envía la petición", async () => {
    const { facturas, api } = await crearEntorno(() => verificacion());
    for (const id of ["abc", 0, -3, 2.5, "", null, undefined]) {
        await assert.rejects(facturas.verificacionQr(id), (err) => err.tipo === "validacion");
    }
    assert.equal(api.llamadas.length, 0);
});

test("404 → mensaje 'La factura ya no existe en CoreCFDI', sin reintentos", async () => {
    const { facturas, api } = await crearEntorno(() => json(404, { success: false, message: "No se encontró la factura con ID #999" }));
    await assert.rejects(facturas.verificacionQr(999), (err) => err.tipo === "no_encontrado" && err.message === "La factura ya no existe en CoreCFDI.");
    assert.equal(api.llamadas.length, 1);
});

test("404 que no es de factura (ruta o tenant) → conserva el mensaje de CoreCFDI", async () => {
    const { facturas } = await crearEntorno(() => json(404, { message: "The route api/v1/facturas/25/verificacion-qr could not be found." }));
    await assert.rejects(facturas.verificacionQr(25), (err) => err.tipo === "no_encontrado" && /could not be found/.test(err.message));
});

test("422 → error de validación con el message, sin reintentos", async () => {
    const { facturas, api } = await crearEntorno(() => json(422, { message: "La factura no tiene RFC del receptor." }));
    await assert.rejects(facturas.verificacionQr(25), (err) => err.tipo === "validacion" && err.status === 422 && /RFC/.test(err.message));
    assert.equal(api.llamadas.length, 1);
});

test("403 → prohibido, sin reintentos", async () => {
    const { facturas, api } = await crearEntorno(() => json(403, { success: false, message: "Empresa suspendida" }));
    await assert.rejects(facturas.verificacionQr(25), (err) => err.tipo === "prohibido" && err.message === "Empresa suspendida");
    assert.equal(api.llamadas.length, 1);
});

test("5xx → hasta 2 reintentos", async () => {
    const { facturas, api } = await crearEntorno((llamada, n) => (n < 3 ? json(503, {}) : verificacion()));
    const r = await facturas.verificacionQr(25);
    assert.equal(r.id, 25);
    assert.equal(api.llamadas.length, 3);
});

test("token expirado → se renueva y la consulta funciona", async () => {
    const { facturas, api } = await crearEntorno(conTokenExpirado(() => verificacion()));
    const r = await facturas.verificacionQr("25");
    assert.equal(r.uuid, "EF34CE53-6076-4190-B8FD-EFD3274BA5F6");
    assert.equal(api.deRuta("/auth/refresh").length, 1);
});
