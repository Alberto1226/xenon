import { test } from "node:test";
import assert from "node:assert/strict";
import { crearCoreCfdiTesoreria } from "../../src/services/corecfdi/tesoreria.js";
import { filtrarCuentas, resumirCuentas, ordenarCuentas, monedasDe, paginar, RANGOS_ANTIGUEDAD } from "../../src/services/corecfdi/tesoreriaVista.js";
import { AHORA, crearEntorno, conTokenExpirado, json } from "./ayudas.mjs";

function cuenta(extra = {}) {
    return {
        id_factura: 40,
        folio: "A-1021",
        uuid: "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
        fecha: "2026-08-15",
        fecha_vencimiento: "2026-09-14",
        dias_credito: 30,
        fechalimite: null,
        cliente: "CLIENTE EJEMPLO SA DE CV",
        rfc: "CEJ010203AB1",
        correo: "pagos@cliente.com",
        telefono: "",
        importe: 11600.0,
        abonos: 5000.0,
        saldo: 6600.0,
        pct_liquidado: 43.1,
        dias_vencidos: 28,
        dias_por_vencer: 0,
        estatus_cobro: "vencido",
        rango_antiguedad: "vencido_1_30",
        moneda: "MXN",
        pagos_detalle: [
            {
                id_referencia: 7,
                folio_pago: "P-88",
                uuid_pago: "0A1B2C3D-0000",
                tipo_documento: "Complemento de Pago (REP)",
                tipo_cfdi: "P",
                fecha_pago: "2026-09-01",
                monto: 5000.0,
                saldo_ant: 11600.0,
                nuevo_saldo: 6600.0,
                parcialidad: 1,
                status: "vigente"
            }
        ],
        total_pagos_count: 1,
        ...extra
    };
}

// Misma factura como la manda cuentas-por-pagar: proveedor / estatus_pago, sin correo ni teléfono.
function cuentaPorPagar(extra = {}) {
    const { cliente, estatus_cobro, correo, telefono, ...resto } = cuenta();
    return { ...resto, proveedor: "PROVEEDOR EJEMPLO SA", estatus_pago: "vencido", ...extra };
}

const ESTRATIFICACION = {
    al_corriente: { total: 30000.0, count: 3, pct: 42.9 },
    vencido_1_30: { total: 20000.0, count: 2, pct: 28.6 },
    vencido_31_60: { total: 10000.0, count: 1, pct: 14.3 },
    vencido_61_90: { total: 0.0, count: 0, pct: 0.0 },
    vencido_mas_90: { total: 10000.0, count: 1, pct: 14.3 }
};

function cobranza(facturas, extra = {}) {
    return json(200, {
        success: true,
        message: "Reporte de cuentas por cobrar obtenido con éxito",
        data: {
            empresa: extra.empresa || { rfc: "QUHJ711021UR1", nombre: "MI EMPRESA SA DE CV", id_empresa: 1 },
            facturas,
            acumulados: extra.acumulados || { total_facturado: 250000.0, total_recuperado: 180000.0, total_pendiente: 70000.0, pct_recuperacion: 72.0, conteo_vencidos: 4, estratificacion: ESTRATIFICACION },
            filtros: { buscar: "", estatus: "pendiente", antiguedad: "todos", year: null, fecha_inicio: "", fecha_fin: "" }
        }
    });
}

function porPagar(facturas) {
    return json(200, {
        success: true,
        message: "Reporte de cuentas por pagar a proveedores obtenido con éxito",
        data: {
            empresa: { rfc: "QUHJ711021UR1", nombre: "MI EMPRESA SA DE CV", id_empresa: 1 },
            facturas,
            acumulados: { total_compras: 173430.45, total_pagado: 120000.0, total_pendiente: 53430.45, pct_pagado: 69.2, conteo_vencidos: 2, estratificacion: ESTRATIFICACION, pue_count: 48, pue_total: 96500.1 }
        }
    });
}

async function crearTesoreria(manejador, opciones) {
    const e = await crearEntorno(manejador, opciones);
    const reloj = { ahora: AHORA };
    e.reloj = reloj;
    e.tesoreria = crearCoreCfdiTesoreria({ cliente: e.cliente, ambito: "empresa-demo", ahora: () => reloj.ahora });
    return e;
}

// Lista ya normalizada para probar los filtros locales.
function modelo(extra = {}) {
    return {
        id: 1, contraparte: "CLIENTE UNO", rfc: "UNO010101AAA", folio: "A-1", uuid: "UUID-1", fecha: "2026-08-15", fechaVencimiento: "2026-09-14",
        importe: 1000, abonos: 0, saldo: 1000, diasVencidos: 0, diasPorVencer: 5, estatus: "al_corriente", rangoAntiguedad: "al_corriente", moneda: "MXN", pagos: [],
        ...extra
    };
}

const LISTA = [
    modelo({ id: 1 }),
    modelo({ id: 2, contraparte: "CLIENTE DOS", rfc: "DOS020202BBB", folio: "B-2", saldo: 2000, estatus: "vencido", rangoAntiguedad: "vencido_1_30", diasVencidos: 12, diasPorVencer: 0, fecha: "2026-07-01", fechaVencimiento: "2026-07-31" }),
    modelo({ id: 3, contraparte: "CLIENTE TRES", saldo: 3000, estatus: "vencido", rangoAntiguedad: "vencido_31_60", diasVencidos: 45, diasPorVencer: 0, fecha: "2026-06-01", fechaVencimiento: "2026-07-01" }),
    modelo({ id: 4, contraparte: "CUSTOMER USD", saldo: 500, moneda: "USD", estatus: "vencido", rangoAntiguedad: "vencido_31_60", diasVencidos: 40, diasPorVencer: 0, fecha: "2026-06-01" })
];

// ------------------------------------------------------------------ servicio

test("cobranza sin filtros: lista, acumulados y antigüedad", async () => {
    const e = await crearTesoreria(() => cobranza([cuenta()]));

    const r = await e.tesoreria.cuentasPorCobrar();

    assert.equal(r.facturas.length, 1);
    assert.deepEqual(r.empresa, { rfc: "QUHJ711021UR1", nombre: "MI EMPRESA SA DE CV", rfcSinConfigurar: false });
    assert.equal(r.acumulados.totalFacturado, 250000);
    assert.equal(r.acumulados.totalLiquidado, 180000);
    assert.equal(r.acumulados.totalPendiente, 70000);
    assert.equal(r.acumulados.pctLiquidado, 72);
    assert.equal(r.acumulados.conteoVencidos, 4);
    assert.equal(r.acumulados.estratificacion.vencido_31_60.total, 10000);
    assert.equal(r.acumulados.pueCount, null);

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/tesoreria/cobranza");
    assert.equal(llamada.method, "GET");
    assert.deepEqual(llamada.query, {});
});

test("por pagar sin filtros: acumulados con sus nombres propios y compras de contado", async () => {
    const e = await crearTesoreria(() => porPagar([cuentaPorPagar()]));

    const r = await e.tesoreria.cuentasPorPagar();

    assert.equal(e.api.llamadas[0].ruta, "/tesoreria/cuentas-por-pagar");
    assert.equal(r.acumulados.totalFacturado, 173430.45);
    assert.equal(r.acumulados.totalLiquidado, 120000);
    assert.equal(r.acumulados.pctLiquidado, 69.2);
    assert.equal(r.acumulados.pueCount, 48);
    assert.equal(r.acumulados.pueTotal, 96500.1);
});

test("ambas respuestas se normalizan al mismo modelo", async () => {
    const cobrar = await crearTesoreria(() => cobranza([cuenta()]));
    const pagar = await crearTesoreria(() => porPagar([cuentaPorPagar()]));

    const [c] = (await cobrar.tesoreria.cuentasPorCobrar()).facturas;
    const [p] = (await pagar.tesoreria.cuentasPorPagar()).facturas;

    assert.deepEqual(Object.keys(c), Object.keys(p));
    assert.equal(c.contraparte, "CLIENTE EJEMPLO SA DE CV");
    assert.equal(p.contraparte, "PROVEEDOR EJEMPLO SA");
    assert.equal(c.estatus, "vencido");
    assert.equal(p.estatus, "vencido");
    assert.equal(c.correo, "pagos@cliente.com");
    assert.equal(c.telefono, null);
    assert.equal(p.correo, null);

    assert.equal(c.fecha, "2026-08-15");
    assert.equal(c.fechaVencimiento, "2026-09-14");
    assert.equal(c.importe, 11600);
    assert.equal(c.abonos, 5000);
    assert.equal(c.saldo, 6600);
    assert.equal(c.pctLiquidado, 43.1);
    assert.equal(c.diasVencidos, 28);
    assert.equal(c.rangoAntiguedad, "vencido_1_30");
    assert.equal(c.moneda, "MXN");
});

test("lista vacía con acumulados en 0: sin errores ni divisiones entre 0", async () => {
    const acumulados = { total_facturado: 0, total_recuperado: 0, total_pendiente: 0, pct_recuperacion: 0, conteo_vencidos: 0, estratificacion: {} };
    const e = await crearTesoreria(() => cobranza([], { acumulados }));

    const r = await e.tesoreria.cuentasPorCobrar();

    assert.deepEqual(r.facturas, []);
    assert.equal(r.acumulados.totalPendiente, 0);
    assert.deepEqual(resumirCuentas(r.facturas), []);
    assert.deepEqual(paginar(r.facturas, 1), { items: [], pagina: 1, totalPaginas: 1, total: 0 });
    // Un grupo con saldo 0 tampoco divide entre 0.
    assert.ok(resumirCuentas([modelo({ saldo: 0 })])[0].estratificacion.every((rango) => rango.pct === 0));
});

test("buscar vacío no se envía; con texto se envía", async () => {
    const e = await crearTesoreria(() => cobranza([cuenta()]));

    await e.tesoreria.cuentasPorCobrar({ buscar: "   " });
    await e.tesoreria.cuentasPorCobrar({ buscar: " CEJ010203AB1 " });

    assert.deepEqual(e.api.llamadas[0].query, {});
    assert.deepEqual(e.api.llamadas[1].query, { buscar: "CEJ010203AB1" });
});

test("no se envían estatus, estatus_pago, per_page, page ni fechas al servidor", async () => {
    const e = await crearTesoreria(() => porPagar([cuentaPorPagar()]));

    await e.tesoreria.cuentasPorPagar({ buscar: "x", estatus: "vencido", estatus_pago: "vencido", per_page: 10, page: 2, year: 2026, fecha_inicio: "2026-01-01", fecha_fin: "2026-01-31", antiguedad: "vencido_1_30" });

    assert.deepEqual(e.api.llamadas[0].query, { buscar: "x" });
});

test("factura con pagos_detalle: se incluyen los abonos; con arreglo vacío no hay detalle", async () => {
    const e = await crearTesoreria(() => cobranza([cuenta(), cuenta({ id_factura: 41, pagos_detalle: [], total_pagos_count: 0 })]));

    const [conPagos, sinPagos] = (await e.tesoreria.cuentasPorCobrar()).facturas;

    assert.deepEqual(conPagos.pagos, [
        { folio: "P-88", uuid: "0A1B2C3D-0000", tipoDocumento: "Complemento de Pago (REP)", tipoCfdi: "P", fecha: "2026-09-01", monto: 5000, saldoAnterior: 11600, nuevoSaldo: 6600, parcialidad: 1, estado: "vigente" }
    ]);
    assert.deepEqual(sinPagos.pagos, []);
});

test('folio "S/F", rfc "N/A" y fecha_pago "N/A" quedan vacíos sin romper', async () => {
    const pago = { ...cuenta().pagos_detalle[0], folio_pago: "S/F", uuid_pago: "N/A", fecha_pago: "N/A" };
    const e = await crearTesoreria(() => cobranza([cuenta({ folio: "S/F", rfc: "N/A", correo: "", pagos_detalle: [pago] })]));

    const [f] = (await e.tesoreria.cuentasPorCobrar()).facturas;

    assert.equal(f.folio, null);
    assert.equal(f.rfc, null);
    assert.equal(f.correo, null);
    assert.equal(f.pagos[0].folio, null);
    assert.equal(f.pagos[0].uuid, null);
    assert.equal(f.pagos[0].fecha, null);
    // Los filtros locales tampoco se rompen con datos vacíos.
    assert.equal(filtrarCuentas([f], { buscar: "cliente ejemplo" }).length, 1);
    assert.equal(filtrarCuentas([f], { buscar: "no-existe" }).length, 0);
});

test("dias_credito con decimales o negativo: entero no negativo", async () => {
    const e = await crearTesoreria(() => cobranza([cuenta({ dias_credito: 29.6 }), cuenta({ dias_credito: -12.4 }), cuenta({ dias_credito: null })]));

    const dias = (await e.tesoreria.cuentasPorCobrar()).facturas.map((f) => f.diasCredito);

    assert.deepEqual(dias, [30, 0, 0]);
});

test("empresa.rfc = XAXX010101000: aviso de RFC no configurado", async () => {
    const e = await crearTesoreria(() => cobranza([cuenta()], { empresa: { rfc: "XAXX010101000", nombre: "MI EMPRESA", id_empresa: 1 } }));

    assert.equal((await e.tesoreria.cuentasPorCobrar()).empresa.rfcSinConfigurar, true);
});

test("estatus o rango_antiguedad desconocido: se conserva tal cual sin romper", async () => {
    const e = await crearTesoreria(() => cobranza([cuenta({ estatus_cobro: "en_litigio", rango_antiguedad: "vencido_mas_365" })]));

    const { facturas } = await e.tesoreria.cuentasPorCobrar();

    assert.equal(facturas[0].estatus, "en_litigio");
    assert.equal(facturas[0].rangoAntiguedad, "vencido_mas_365");
    const [resumen] = resumirCuentas(facturas);
    assert.equal(resumen.vencido, 0);
    const extra = resumen.estratificacion[resumen.estratificacion.length - 1];
    assert.deepEqual(extra, { clave: "vencido_mas_365", titulo: "vencido_mas_365", total: 6600, count: 1, pct: 100 });
});

test("403 por módulo no contratado: mensaje del servidor y sin reintento", async () => {
    const mensaje = "El módulo 'Tesoreria' no está contratado para esta empresa.";
    const e = await crearTesoreria(() => json(403, { success: false, message: mensaje, errors: null }));

    await assert.rejects(e.tesoreria.cuentasPorCobrar(), (err) => err.tipo === "prohibido" && err.message === mensaje);
    assert.equal(e.api.llamadas.length, 1);
});

test("5xx: reintenta máximo 2 veces; 404 no reintenta", async () => {
    const caido = await crearTesoreria((llamada, n) => (n < 3 ? json(500, {}) : cobranza([cuenta()])));
    assert.equal((await caido.tesoreria.cuentasPorCobrar()).facturas.length, 1);
    assert.equal(caido.api.llamadas.length, 3);

    const sinTenant = await crearTesoreria(() => json(404, { success: false, message: "Tenant no encontrado." }));
    await assert.rejects(sinTenant.tesoreria.cuentasPorPagar(), (err) => err.tipo === "no_encontrado");
    assert.equal(sinTenant.api.llamadas.length, 1);
});

test("token expirado: se renueva y la consulta funciona", async () => {
    const e = await crearTesoreria(conTokenExpirado(() => cobranza([cuenta()])));

    const r = await e.tesoreria.cuentasPorCobrar();

    assert.equal(r.facturas.length, 1);
    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/tesoreria/cobranza", "/auth/refresh", "/tesoreria/cobranza"]);
    assert.ok(!e.logger.texto().includes("access-"));
});

test("segunda consulta dentro de 5 minutos sale de cache; Actualizar vuelve a llamar al servidor", async () => {
    const e = await crearTesoreria((llamada) => (llamada.ruta === "/tesoreria/cobranza" ? cobranza([cuenta()]) : porPagar([cuentaPorPagar()])), {
        // La sesión no caduca durante la prueba.
        tokens: { access_token: "a", refresh_token: "r", expires_at: AHORA + 60 * 60 * 1000 }
    });

    const primera = await e.tesoreria.cuentasPorCobrar();
    e.reloj.ahora = AHORA + 4 * 60 * 1000;
    const segunda = await e.tesoreria.cuentasPorCobrar();
    assert.equal(primera.desdeCache, false);
    assert.equal(segunda.desdeCache, true);
    assert.deepEqual(segunda.facturas, primera.facturas);
    assert.equal(e.api.llamadas.length, 1);

    // El cache es por tipo y por valor de buscar.
    await e.tesoreria.cuentasPorPagar();
    await e.tesoreria.cuentasPorCobrar({ buscar: "otro" });
    assert.equal(e.api.llamadas.length, 3);

    // "Actualizar" invalida el cache.
    const forzada = await e.tesoreria.cuentasPorCobrar({}, { actualizar: true });
    assert.equal(forzada.desdeCache, false);
    assert.equal(e.api.llamadas.length, 4);

    // Pasados 5 minutos se vuelve a consultar.
    e.reloj.ahora += 5 * 60 * 1000;
    assert.equal((await e.tesoreria.cuentasPorCobrar()).desdeCache, false);
    assert.equal(e.api.llamadas.length, 5);
});

test("un error no se guarda en cache", async () => {
    const e = await crearTesoreria((llamada, n) => (n === 1 ? json(403, { message: "Sin permiso" }) : cobranza([cuenta()])));

    await assert.rejects(e.tesoreria.cuentasPorCobrar());
    assert.equal((await e.tesoreria.cuentasPorCobrar()).facturas.length, 1);
});

// ------------------------------------------------------- filtros en el cliente

test("filtro local por estatus vencido y por rango vencido_31_60: cambian la tabla y los totales", () => {
    const vencidas = filtrarCuentas(LISTA, { estatus: "vencido", moneda: "MXN" });
    assert.deepEqual(vencidas.map((f) => f.id), [2, 3]);
    assert.equal(resumirCuentas(vencidas)[0].pendiente, 5000);

    const rango = filtrarCuentas(LISTA, { rango: "vencido_31_60", moneda: "MXN" });
    assert.deepEqual(rango.map((f) => f.id), [3]);
    const [resumen] = resumirCuentas(rango);
    assert.equal(resumen.pendiente, 3000);
    assert.equal(resumen.vencido, 3000);
    assert.equal(resumen.conteoVencidos, 1);

    assert.equal(resumirCuentas(filtrarCuentas(LISTA, { moneda: "MXN" }))[0].pendiente, 6000);
});

test("filtro local por rango de fechas de un solo día: incluye las facturas de ese día", () => {
    assert.deepEqual(filtrarCuentas(LISTA, { fechaInicio: "2026-07-01", fechaFin: "2026-07-01" }).map((f) => f.id), [2]);
    assert.deepEqual(filtrarCuentas(LISTA, { fechaInicio: "2026-06-01", fechaFin: "2026-07-01" }).map((f) => f.id), [2, 3, 4]);
    // Por fecha de vencimiento; las que no la traen quedan fuera.
    assert.deepEqual(filtrarCuentas(LISTA, { campoFecha: "fechaVencimiento", fechaInicio: "2026-07-31", fechaFin: "2026-07-31" }).map((f) => f.id), [2]);
    assert.deepEqual(filtrarCuentas([modelo({ fechaVencimiento: null })], { campoFecha: "fechaVencimiento", fechaInicio: "2026-01-01" }), []);
});

test("búsqueda local por folio, UUID, nombre o RFC, sin distinguir mayúsculas", () => {
    assert.deepEqual(filtrarCuentas(LISTA, { buscar: "cliente dos" }).map((f) => f.id), [2]);
    assert.deepEqual(filtrarCuentas(LISTA, { buscar: "dos020202" }).map((f) => f.id), [2]);
    assert.deepEqual(filtrarCuentas(LISTA, { buscar: "b-2" }).map((f) => f.id), [2]);
    assert.equal(filtrarCuentas(LISTA, { buscar: "uuid-1" }).length, 4);
    assert.equal(filtrarCuentas(LISTA, {}).length, 4);
});

test("facturas en MXN y USD: totales separados por moneda, sin sumarlas", () => {
    const resumen = resumirCuentas(LISTA);

    assert.deepEqual(monedasDe(LISTA), ["MXN", "USD"]);
    assert.deepEqual(resumen.map((r) => [r.moneda, r.pendiente, r.vencido, r.conteo, r.conteoVencidos]), [["MXN", 6000, 5000, 3, 2], ["USD", 500, 500, 1, 1]]);

    const mxn = resumen[0].estratificacion;
    assert.deepEqual(mxn.map((r) => r.clave), RANGOS_ANTIGUEDAD.map((r) => r.clave));
    assert.deepEqual(mxn.map((r) => [r.total, r.count, r.pct]), [[1000, 1, 16.7], [2000, 1, 33.3], [3000, 1, 50], [0, 0, 0], [0, 0, 0]]);
    assert.equal(resumen[1].estratificacion[2].pct, 100);
});

test("orden inicial: más días vencidos primero; paginación en el cliente", () => {
    assert.deepEqual(ordenarCuentas(LISTA).map((f) => f.id), [3, 4, 2, 1]);
    assert.deepEqual(LISTA.map((f) => f.id), [1, 2, 3, 4], "no modifica la lista original");

    const pagina2 = paginar(ordenarCuentas(LISTA), 2, 3);
    assert.deepEqual(pagina2.items.map((f) => f.id), [1]);
    assert.equal(pagina2.totalPaginas, 2);
    assert.equal(pagina2.total, 4);
    // Una página fuera de rango se ajusta a la última.
    assert.equal(paginar(LISTA, 9, 3).pagina, 2);
});
