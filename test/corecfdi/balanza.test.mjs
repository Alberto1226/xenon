import { test } from "node:test";
import assert from "node:assert/strict";
import { crearCoreCfdiReportes, validarYear } from "../../src/services/corecfdi/reportes.js";
import { monto, porcentaje, sinMovimiento, opcionesDeYear, mensajeDeError, geometriaGrafica } from "../../src/services/corecfdi/balanzaVista.js";
import { respuestaDeError } from "../../src/services/corecfdi/errores.js";
import { AHORA, crearEntorno, conTokenExpirado, json } from "./ayudas.mjs";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Los 12 meses como los manda la API; `conDatos` trae los meses con importe, por número.
function mensualidades(conDatos = {}) {
    return MESES.map((nombre, i) => {
        const { ingresos = 0, egresos = 0 } = conDatos[i + 1] || {};
        return { numero: i + 1, nombre, ingresos, egresos, balanza: ingresos - egresos };
    });
}

function balanza(year = 2026, extra = {}) {
    return json(200, {
        success: true,
        message: `Balanza de ingresos y egresos ${year} obtenida con éxito`,
        data: {
            mensualidades: mensualidades({ 1: { ingresos: 120000.0, egresos: 80000.0 }, 2: { ingresos: 95000.5, egresos: 110000.0 } }),
            acumulados: { ingresos: 215000.5, egresos: 190000.0, balance_neto: 25000.5, margen: 11.628112 },
            topClientes: [{ nombre: "CLIENTE EJEMPLO SA DE CV", rfc: "CEJ010203AB1", total: 98000.0 }],
            topProveedores: [{ nombre: "PROVEEDOR EJEMPLO SA DE CV", rfc: "PEJ040506CD2", total: 64000.0 }],
            years: [2026, 2025],
            yearSeleccionado: year,
            ...extra
        }
    });
}

function balanzaVacia(year) {
    return balanza(year, {
        mensualidades: mensualidades(),
        acumulados: { ingresos: 0, egresos: 0, balance_neto: 0, margen: 0 },
        topClientes: [],
        topProveedores: []
    });
}

async function crearReportes(manejador, opciones) {
    const e = await crearEntorno(manejador, opciones);
    const reloj = { ahora: AHORA };
    e.reloj = reloj;
    e.reportes = crearCoreCfdiReportes({ cliente: e.cliente, ambito: "empresa-demo", ahora: () => reloj.ahora });
    return e;
}

// Responde con el año que se pidió (o 2026 si no se indicó).
const segunYear = (llamada) => balanza(Number(llamada.query.year) || 2026);

// ------------------------------------------------------------------ servicio

test("consulta sin year: no se envía el parámetro y se selecciona yearSeleccionado", async () => {
    const e = await crearReportes(segunYear);

    const r = await e.reportes.balanza();

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/reportes/balanza");
    assert.equal(llamada.method, "GET");
    assert.deepEqual(llamada.query, {});
    assert.equal(llamada.headers.Accept, "application/json");
    assert.equal(llamada.headers["X-Tenant"], "empresa-demo");
    assert.equal(r.yearSeleccionado, 2026);
    assert.deepEqual(r.years, [2026, 2025]);
    assert.deepEqual(opcionesDeYear(r.years, r.yearSeleccionado), [2026, 2025]);
});

test("consulta con year: se envía y llegan los 12 meses, acumulados y tops", async () => {
    const e = await crearReportes(segunYear);

    const r = await e.reportes.balanza(2025);

    assert.deepEqual(e.api.llamadas[0].query, { year: "2025" });
    assert.equal(r.yearSeleccionado, 2025);
    assert.equal(r.mensualidades.length, 12);
    assert.deepEqual(r.mensualidades.map((m) => m.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.deepEqual(r.mensualidades[0], { numero: 1, nombre: "Enero", ingresos: 120000, egresos: 80000, balanza: 40000 });
    assert.deepEqual(r.acumulados, { ingresos: 215000.5, egresos: 190000, balanceNeto: 25000.5, margen: 11.628112 });
    assert.deepEqual(r.topClientes, [{ nombre: "CLIENTE EJEMPLO SA DE CV", rfc: "CEJ010203AB1", total: 98000 }]);
    assert.deepEqual(r.topProveedores, [{ nombre: "PROVEEDOR EJEMPLO SA DE CV", rfc: "PEJ040506CD2", total: 64000 }]);
});

test("cambio de año en el selector: nueva consulta con ese year", async () => {
    const e = await crearReportes(segunYear);

    const primera = await e.reportes.balanza();
    const otra = await e.reportes.balanza(2025);

    assert.equal(primera.yearSeleccionado, 2026);
    assert.equal(otra.yearSeleccionado, 2025);
    assert.deepEqual(e.api.llamadas.map((l) => l.query), [{}, { year: "2025" }]);
});

test("mes con balanza negativa y año con balance_neto y margen negativos: sin romper", async () => {
    const e = await crearReportes(() => balanza(2026, {
        mensualidades: mensualidades({ 2: { ingresos: 95000.5, egresos: 110000.0 } }),
        acumulados: { ingresos: 95000.5, egresos: 110000.0, balance_neto: -14999.5, margen: -15.788864 }
    }));

    const r = await e.reportes.balanza(2026);

    assert.equal(r.mensualidades[1].balanza, -14999.5);
    assert.equal(r.acumulados.balanceNeto, -14999.5);
    assert.equal(r.acumulados.margen, -15.788864);
    assert.equal(monto(r.acumulados.balanceNeto), "-14,999.50");
    assert.equal(porcentaje(r.acumulados.margen), "-15.79%");

    // El eje de la gráfica baja de 0 y la balanza de febrero queda debajo de la línea de 0.
    const g = geometriaGrafica(r.mensualidades);
    assert.ok(g.marcas[0].valor < 0);
    assert.ok(g.columnas[1].balanza.y > g.cero);
    assert.ok(g.cero < g.base);
});

test("margen con muchos decimales: se muestra redondeado; montos con miles y 2 decimales", () => {
    assert.equal(porcentaje(11.628112), "11.63%");
    assert.equal(porcentaje(11.628112, 1), "11.6%");
    assert.equal(porcentaje(0), "0.00%");
    assert.equal(monto(215000.5), "215,000.50");
    // La suma del servidor puede traer más de dos decimales.
    assert.equal(monto(1234.5678), "1,234.57");
    assert.equal(monto(0), "0.00");
    assert.equal(monto(undefined), "0.00");
});

test("año con todo en 0 y tops vacíos: estado vacío, sin errores ni divisiones entre 0", async () => {
    // Año sin CFDI: yearSeleccionado es el pedido aunque no venga en `years`.
    const e = await crearReportes(() => balanzaVacia(2019));

    const r = await e.reportes.balanza(2019);

    assert.equal(sinMovimiento(r.acumulados), true);
    assert.equal(r.acumulados.margen, 0);
    assert.deepEqual(r.topClientes, []);
    assert.deepEqual(r.topProveedores, []);
    assert.equal(r.yearSeleccionado, 2019);
    assert.deepEqual(opcionesDeYear(r.years, r.yearSeleccionado), [2026, 2025, 2019]);

    const g = geometriaGrafica(r.mensualidades);
    assert.equal(g.columnas.length, 12);
    assert.ok(g.columnas.every((c) => c.ingresos.alto === 0 && c.egresos.alto === 0 && Number.isFinite(c.balanza.y)));
    assert.ok(g.marcas.every((m) => Number.isFinite(m.y)));
    assert.ok(!g.linea.includes("NaN"));
    assert.equal(sinMovimiento({ ingresos: 0, egresos: 10 }), false);
});

test("topClientes con menos de 5 elementos: se devuelven los que haya, en el mismo orden", async () => {
    const tres = [{ nombre: "A", rfc: "AAA010101AAA", total: 300 }, { nombre: "B", rfc: "BBB010101BBB", total: 200 }, { nombre: "C", rfc: "CCC010101CCC", total: 100 }];
    const e = await crearReportes(() => balanza(2026, { topClientes: tres }));

    const r = await e.reportes.balanza(2026);

    assert.deepEqual(r.topClientes.map((c) => c.nombre), ["A", "B", "C"]);
});

test('nombre "Cliente Indefinido" / "Proveedor Indefinido" y rfc "N/A" quedan vacíos sin romper', async () => {
    const e = await crearReportes(() => balanza(2026, {
        topClientes: [{ nombre: "Cliente Indefinido", rfc: "N/A", total: 500 }],
        topProveedores: [{ nombre: "Proveedor Indefinido", rfc: "N/A", total: 250.5 }]
    }));

    const r = await e.reportes.balanza(2026);

    assert.deepEqual(r.topClientes, [{ nombre: null, rfc: null, total: 500 }]);
    assert.deepEqual(r.topProveedores, [{ nombre: null, rfc: null, total: 250.5 }]);
});

test("year fuera de rango o no numérico: se rechaza en el cliente y no se llama al servidor", async () => {
    const e = await crearReportes(segunYear);

    for (const invalido of [1999, 2101, "abc", 2026.5, "2026.0", -2026, "20 26", true, NaN]) {
        await assert.rejects(e.reportes.balanza(invalido), (err) => err.tipo === "validacion" && Array.isArray(err.errors.year), String(invalido));
    }
    assert.equal(e.api.llamadas.length, 0);

    assert.equal(validarYear(2000), 2000);
    assert.equal(validarYear("2100"), 2100);
    assert.equal(validarYear(undefined), null);
    assert.equal(validarYear(null), null);
    assert.equal(validarYear(""), null);
});

test("422 del servidor: se muestra el mensaje de errors.year y no se reintenta", async () => {
    const cuerpo = { message: "El campo year es inválido.", errors: { year: ["El año debe estar entre 2000 y 2100."] } };
    const e = await crearReportes(() => json(422, cuerpo));

    const err = await e.reportes.balanza(2026).catch((error) => error);

    assert.equal(err.tipo, "validacion");
    assert.equal(mensajeDeError(respuestaDeError(err)), "El año debe estar entre 2000 y 2100.");
    assert.equal(e.api.llamadas.length, 1);
});

test("403 por falta de permiso: se muestra el message del servidor y no se reintenta", async () => {
    const mensaje = "No tiene el permiso 'ver reportes'.";
    const e = await crearReportes(() => json(403, { success: false, message: mensaje, errors: null }));

    const err = await e.reportes.balanza().catch((error) => error);

    assert.equal(err.tipo, "prohibido");
    assert.equal(mensajeDeError(respuestaDeError(err)), mensaje);
    assert.equal(e.api.llamadas.length, 1);
});

test("5xx: reintenta máximo 2 veces; 404 no reintenta", async () => {
    const caido = await crearReportes((llamada, n) => (n < 3 ? json(500, {}) : balanza()));
    assert.equal((await caido.reportes.balanza()).mensualidades.length, 12);
    assert.equal(caido.api.llamadas.length, 3);

    const sinRemedio = await crearReportes(() => json(503, {}));
    await assert.rejects(sinRemedio.reportes.balanza(), (err) => err.tipo === "servidor");
    assert.equal(sinRemedio.api.llamadas.length, 3);

    const sinTenant = await crearReportes(() => json(404, { success: false, message: "Tenant no encontrado." }));
    await assert.rejects(sinTenant.reportes.balanza(), (err) => err.tipo === "no_encontrado");
    assert.equal(sinTenant.api.llamadas.length, 1);
});

test("429: respeta Retry-After y reintenta", async () => {
    const e = await crearReportes((llamada, n) => (n === 1 ? json(429, { message: "Too Many Attempts." }, { "Retry-After": "7" }) : balanza()));

    assert.equal((await e.reportes.balanza()).yearSeleccionado, 2026);
    assert.deepEqual(e.sleep.esperas, [7000]);
});

test("token expirado: se renueva y la consulta funciona; el log no lleva tokens", async () => {
    const e = await crearReportes(conTokenExpirado(segunYear));

    const r = await e.reportes.balanza(2026);

    assert.equal(r.mensualidades.length, 12);
    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/reportes/balanza", "/auth/refresh", "/reportes/balanza"]);
    assert.ok(e.logger.texto().includes("GET /reportes/balanza -> 200"));
    assert.ok(!e.logger.texto().includes("access-"));
});

test("segunda consulta del mismo año dentro de 5 minutos sale de cache; Actualizar vuelve a llamar al servidor", async () => {
    const e = await crearReportes(segunYear, {
        // La sesión no caduca durante la prueba.
        tokens: { access_token: "a", refresh_token: "r", expires_at: AHORA + 60 * 60 * 1000 }
    });

    const primera = await e.reportes.balanza(2026);
    e.reloj.ahora = AHORA + 4 * 60 * 1000;
    const segunda = await e.reportes.balanza("2026");
    assert.equal(primera.desdeCache, false);
    assert.equal(segunda.desdeCache, true);
    assert.deepEqual(segunda.mensualidades, primera.mensualidades);
    assert.equal(e.api.llamadas.length, 1);

    // El cache es por año.
    assert.equal((await e.reportes.balanza(2025)).desdeCache, false);
    assert.equal(e.api.llamadas.length, 2);

    // "Actualizar" invalida el cache.
    const forzada = await e.reportes.balanza(2026, { actualizar: true });
    assert.equal(forzada.desdeCache, false);
    assert.equal(e.api.llamadas.length, 3);

    // Pasados 5 minutos se vuelve a consultar.
    e.reloj.ahora += 5 * 60 * 1000;
    assert.equal((await e.reportes.balanza(2026)).desdeCache, false);
    assert.equal(e.api.llamadas.length, 4);
});

test("la primera carga (sin year) deja en cache el año que eligió el servidor", async () => {
    const e = await crearReportes(segunYear);

    await e.reportes.balanza();
    const delSelector = await e.reportes.balanza(2026);

    assert.equal(delSelector.desdeCache, true);
    assert.equal(e.api.llamadas.length, 1);
});

test("el cache es por tenant; un error no se guarda en cache", async () => {
    const e = await crearReportes((llamada, n) => (n === 1 ? json(403, { message: "Sin permiso" }) : balanza()));

    await assert.rejects(e.reportes.balanza(2026));
    assert.equal((await e.reportes.balanza(2026)).desdeCache, false);

    const otroTenant = crearCoreCfdiReportes({ cliente: e.cliente, ambito: "otra-empresa", ahora: () => AHORA });
    assert.equal((await otroTenant.balanza(2026)).desdeCache, false);
    assert.equal(e.api.llamadas.length, 3);
});

test("no se envían month, mes, fecha_inicio ni fecha_fin al servidor", async () => {
    const e = await crearReportes(segunYear);

    await e.reportes.balanza(2026, { month: 3, mes: 3, fecha_inicio: "2026-01-01", fecha_fin: "2026-01-31" });

    assert.deepEqual(Object.keys(e.api.llamadas[0].query), ["year"]);
});

// ------------------------------------------------------------------- pantalla

test("gráfica: 12 columnas dentro del lienzo, con barras que nacen en la línea de 0", () => {
    const g = geometriaGrafica(mensualidades({ 1: { ingresos: 120000, egresos: 80000 }, 2: { ingresos: 95000.5, egresos: 110000 } }));

    assert.equal(g.columnas.length, 12);
    const enero = g.columnas[0];
    assert.equal(enero.ingresos.y + enero.ingresos.alto, g.cero);
    assert.ok(enero.ingresos.alto > enero.egresos.alto);
    assert.ok(enero.ingresos.x + enero.ingresos.ancho < enero.egresos.x);
    assert.ok(g.columnas.every((c) => c.ingresos.y >= g.arriba && c.balanza.y >= g.arriba && c.balanza.y <= g.base));
    assert.ok(g.columnas[11].egresos.x + g.columnas[11].egresos.ancho <= g.derecha);
    // Una sola escala: la marca más alta cubre el valor máximo.
    assert.ok(g.marcas[g.marcas.length - 1].valor >= 120000);
});

test("mensajeDeError: usa `mensaje` cuando no hay errors.year", () => {
    assert.equal(mensajeDeError({ ok: false, mensaje: "CoreCFDI respondió 500.", errors: null }), "CoreCFDI respondió 500.");
    assert.equal(mensajeDeError({ ok: false }), "No se pudo consultar la balanza.");
});
