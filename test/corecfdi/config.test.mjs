import { test } from "node:test";
import assert from "node:assert/strict";
import { leerConfigCoreCfdi } from "../../src/services/corecfdi/config.js";

test("lee la URL base (sin diagonal final) y el nombre del dispositivo", () => {
    assert.deepEqual(leerConfigCoreCfdi({ CORECFDI_BASE_URL: "https://corecfdi.prueba/api/v1/", CORECFDI_DEVICE_NAME: "xenon-sj" }), {
        baseUrl: "https://corecfdi.prueba/api/v1",
        deviceName: "xenon-sj"
    });
});

test("la empresa, el email y la contraseña no se leen del entorno", () => {
    const config = leerConfigCoreCfdi({
        CORECFDI_BASE_URL: "https://corecfdi.prueba/api/v1",
        CORECFDI_TENANT: "empresa",
        CORECFDI_EMAIL: "a@b.c",
        CORECFDI_PASSWORD: "secreto"
    });
    assert.deepEqual(Object.keys(config).sort(), ["baseUrl", "deviceName"]);
    assert.equal(config.deviceName, "xenon");
});

test("sin CORECFDI_BASE_URL o con el valor de ejemplo: error de configuración", () => {
    assert.throws(() => leerConfigCoreCfdi({}), (err) => err.tipo === "configuracion" && /CORECFDI_BASE_URL/.test(err.message));
    assert.throws(() => leerConfigCoreCfdi({ CORECFDI_BASE_URL: "https://mi-dominio.com/api/v1" }), (err) => err.tipo === "configuracion");
});

test("la URL base debe ser HTTPS (salvo localhost o un dominio .test)", () => {
    assert.equal(leerConfigCoreCfdi({ CORECFDI_BASE_URL: "http://corecfdi.test/api/v1/" }).baseUrl, "http://corecfdi.test/api/v1");
    assert.throws(() => leerConfigCoreCfdi({ CORECFDI_BASE_URL: "http://corecfdi.test.com/api/v1" }), (err) => err.tipo === "configuracion");
    assert.throws(() => leerConfigCoreCfdi({ CORECFDI_BASE_URL: "http://corecfdi.prueba/api/v1" }), (err) => err.tipo === "configuracion" && /HTTPS/.test(err.message));
    assert.equal(leerConfigCoreCfdi({ CORECFDI_BASE_URL: "http://localhost:8000/api/v1" }).baseUrl, "http://localhost:8000/api/v1");
});
