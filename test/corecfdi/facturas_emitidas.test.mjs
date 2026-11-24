import { test } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno, conTokenExpirado, json } from "./ayudas.mjs";

function factura(extra = {}) {
    return {
        id_factura: 41,
        fecha: "2026-09-15",
        hora: "10:24:11",
        foliofactura: "A-1024",
        uuid: "3B1F2C9A-5D7E-4A10-9C2B-8E6F0D4A7B21",
        subtotal_gravado: 25000.0,
        subtotal_cero: 0,
        subtotal_exento: 0,
        descuento: 0,
        importe: 29000.0,
        saldo: 14500.0,
        fechalimite: "2026-10-15",
        status: "vigente",
        efos_emisor: null,
        efos_receptor: null,
        sat_url: "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=3B1F2C9A&re=QUHJ711021UR1&rr=CAC090514LX1&tt=0000029000.000000&fe=Xk9a1Q==",
        has_pdf: true,
        moneda_factura: { id_moneda: 2, codigo: "MXN" },
        persona_emisor: {
            id_persona: 1,
            nombre: "MI EMPRESA SA DE CV",
            persona_cliente: null,
            configuracion_persona: { id_persona: 1, rfc: "QUHJ711021UR1" }
        },
        persona_cliente: {
            id_persona: 12,
            nombre: "COMERCIALIZADORA ACME SA DE CV",
            persona_cliente: { rfc: "CAC090514LX1", tipo: "cliente" },
            configuracion_persona: null
        },
        tipo_cfdi: { id_tipo_cfdi: 2, tipo_cfdi: "I", documento: "Ingreso" },
        metodo_pago: { clave: "03", descripcion: "Forma de pago 03" },
        forma_pago: { clave: "PPD", descripcion: "Método de pago PPD" },
        facturas_referencia_destino: [
            {
                monto: 14500.0,
                parcialidad: 1,
                saldo_ant: 29000.0,
                nuevo_saldo: 14500.0,
                fecha: "2026-09-30",
                factura_origen: { uuid: "9D0E4B12", fecha: "2026-09-30", importe: 0, status: "vigente", sat_url: "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=9D0E4B12", has_pdf: false }
            }
        ],
        ...extra
    };
}

const TOTALES = {
    total_registros: 38,
    suma_subtotal: 412500.0,
    suma_total: 478500.0,
    suma_iva: 66000.0,
    suma_cobrado: 401200.0,
    suma_por_cobrar: 77300.0,
    vigentes_count: 36,
    canceladas_count: 2
};

function emitidas(items, { page = 1, lastPage = 1, total = items.length, totales = TOTALES } = {}) {
    return json(200, {
        success: true,
        message: "Listado de facturas obtenido con éxito",
        data: {
            current_page: page,
            data: items,
            last_page: lastPage,
            next_page_url: page < lastPage ? `https://corecfdi.prueba/api/v1/facturas?page=${page + 1}` : null,
            per_page: 15,
            total,
            totales
        }
    });
}

test("sin filtros: GET /facturas, paginación y totales con cobrado y por cobrar", async () => {
    const { facturas, api } = await crearEntorno(() => emitidas([factura()], { lastPage: 3, total: 38 }));
    const r = await facturas.listarEmitidas();

    const [llamada] = api.llamadas;
    assert.equal(llamada.ruta, "/facturas");
    assert.deepEqual(llamada.query, { page: "1" });
    assert.equal(llamada.headers["Accept"], "application/json");
    assert.equal(r.page, 1);
    assert.equal(r.lastPage, 3);
    assert.equal(r.total, 38);
    assert.equal(r.totales.suma_cobrado, 401200);
    assert.equal(r.totales.suma_por_cobrar, 77300);
    assert.equal(r.items.length, 1);
    assert.equal("hayMas" in r, false);
});

test("el nombre y RFC son del cliente (persona_cliente), no de la empresa", async () => {
    const { facturas } = await crearEntorno(() => emitidas([factura()]));
    const [f] = (await facturas.listarEmitidas()).items;
    assert.deepEqual(f.cliente, { nombre: "COMERCIALIZADORA ACME SA DE CV", rfc: "CAC090514LX1" });
    assert.deepEqual(f.contraparte, f.cliente);
    assert.equal(f.proveedor, undefined);
});

test("RFC del cliente: persona_cliente.rfc y, si es null, configuracion_persona.rfc", async () => {
    const persona = { id_persona: 12, nombre: "CLIENTE SA", persona_cliente: null, configuracion_persona: { rfc: "CLI010101AAA" } };
    const { facturas } = await crearEntorno(() => emitidas([factura({ persona_cliente: persona })]));
    assert.equal((await facturas.listarEmitidas()).items[0].cliente.rfc, "CLI010101AAA");
});

test("forma y método de pago con el mapeo invertido, saldo, fecha límite y pagos", async () => {
    const { facturas } = await crearEntorno(() => emitidas([factura()]));
    const [f] = (await facturas.listarEmitidas()).items;
    assert.equal(f.formaPago.clave, "03");
    assert.equal(f.metodoPago.clave, "PPD");
    assert.equal(f.saldo, 14500);
    assert.equal(f.total, 29000);
    assert.equal(f.fechaLimite, "2026-10-15");
    assert.equal(f.pagos.length, 1);
    assert.equal(f.pagos[0].nuevoSaldo, 14500);
    assert.equal(f.pagos[0].uuid, "9D0E4B12");
});

test("fecha y hora sin conversión; status desconocido tal cual; sat_url null", async () => {
    const { facturas } = await crearEntorno(() => emitidas([factura({ status: "en_proceso", sat_url: null })]));
    const [f] = (await facturas.listarEmitidas()).items;
    assert.equal(f.fecha, "2026-09-15");
    assert.equal(f.hora, "10:24:11");
    assert.equal(f.estado, "en_proceso");
    assert.equal(f.satUrl, null);
});

test("esEfo sale de efos_receptor (el cliente), no de efos_emisor", async () => {
    const { facturas } = await crearEntorno(() =>
        emitidas([factura({ id_factura: 1, efos_receptor: { rfc: "CAC090514LX1" } }), factura({ id_factura: 2, efos_emisor: { rfc: "QUHJ711021UR1" } })])
    );
    const items = (await facturas.listarEmitidas()).items;
    assert.equal(items[0].esEfo, true);
    assert.equal(items[1].esEfo, false);
});

test("filtros: se envían solo los que tienen valor y nunca categoria", async () => {
    const { facturas, api } = await crearEntorno(() => emitidas([]));
    await facturas.listarEmitidas({ buscar: "  CAC090514LX1 ", fecha_inicio: "2026-09-15", fecha_fin: "2026-09-15", status: "", categoria: "nomina" }, 2);
    assert.deepEqual(api.llamadas[0].query, { buscar: "CAC090514LX1", fecha_inicio: "2026-09-15", fecha_fin: "2026-09-15", page: "2" });
});

test("fecha_fin anterior a fecha_inicio y per_page=500: bloqueados sin llamar a la API", async () => {
    const { facturas, api } = await crearEntorno(() => emitidas([]));
    await assert.rejects(facturas.listarEmitidas({ fecha_inicio: "2026-02-01", fecha_fin: "2026-01-01" }), (e) => e.tipo === "validacion" && !!e.errors.fecha_fin);
    await assert.rejects(facturas.listarEmitidas({ per_page: 500 }), (e) => e.tipo === "validacion" && !!e.errors.per_page);
    assert.equal(api.llamadas.length, 0);
});

test("422 de la API: error de validación con errores por campo", async () => {
    const { facturas } = await crearEntorno(() => json(422, { message: "Datos inválidos", errors: { per_page: ["Máximo 100"] } }));
    await assert.rejects(facturas.listarEmitidas(), (e) => e.tipo === "validacion" && e.errors.per_page[0] === "Máximo 100");
});

test("sin resultados: lista vacía sin errores", async () => {
    const ceros = { ...TOTALES, total_registros: 0, suma_subtotal: 0, suma_total: 0, suma_iva: 0, suma_cobrado: 0, suma_por_cobrar: 0, vigentes_count: 0, canceladas_count: 0 };
    const { facturas } = await crearEntorno(() => emitidas([], { total: 0, totales: ceros }));
    const r = await facturas.listarEmitidas();
    assert.deepEqual(r.items, []);
    assert.equal(r.total, 0);
    assert.equal(r.totales.suma_total, 0);
});

test("listarTodasEmitidas recorre páginas con per_page=100 hasta next_page_url null", async () => {
    const { facturas, api } = await crearEntorno((llamada) => {
        const page = Number(llamada.query.page);
        return emitidas([factura({ id_factura: page })], { page, lastPage: 3, total: 3 });
    });
    const todas = await facturas.listarTodasEmitidas({ status: "vigente" });
    assert.deepEqual(todas.map((f) => f.id), [1, 2, 3]);
    assert.equal(api.llamadas.length, 3);
    assert.ok(api.llamadas.every((l) => l.query.per_page === "100" && l.query.status === "vigente"));
});

test("token expirado: se renueva y la consulta funciona", async () => {
    const { facturas, api } = await crearEntorno(conTokenExpirado(() => emitidas([factura()])));
    const r = await facturas.listarEmitidas();
    assert.equal(r.items.length, 1);
    assert.equal(api.deRuta("/auth/refresh").length, 1);
});

test("5xx: reintenta hasta 2 veces", async () => {
    const { facturas, api } = await crearEntorno((l, n) => (n < 3 ? json(500, {}) : emitidas([factura()])));
    assert.equal((await facturas.listarEmitidas()).items.length, 1);
    assert.equal(api.llamadas.length, 3);
});
