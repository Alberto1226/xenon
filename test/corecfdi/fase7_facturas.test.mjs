import { test } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno, conTokenExpirado, json } from "./ayudas.mjs";

function factura(extra = {}) {
    return {
        id_factura: 25,
        fecha: "2026-08-31",
        hora: "23:59:58",
        foliofactura: "0208107174",
        uuid: "EF34CE53-6076-4190-B8FD-EFD3274BA5F6",
        subtotal_gravado: 1000.0,
        subtotal_cero: 0,
        subtotal_exento: 0,
        descuento: 0,
        importe: 1160.0,
        saldo: 0,
        fechalimite: null,
        status: "vigente",
        id_persona: 9,
        id_cliente: 1,
        id_tipo_cfdi: 2,
        efos_emisor: null,
        efos_receptor: null,
        sat_url: "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=EF34CE53&re=BMN930209927&rr=QUHJ711021UR1&tt=0000001160.000000&fe=pEwi2g==",
        has_pdf: false,
        moneda_factura: { id_moneda: 2, codigo: "MXN", descripcion: "Peso Mexicano", decimales: 2 },
        persona_emisor: {
            id_persona: 9,
            nombre: "BANCO MERCANTIL DEL NORTE SA",
            correo: "correo@temp.com",
            persona_cliente: { rfc: "BMN930209927", tipo: "proveedor" },
            configuracion_persona: null
        },
        persona_cliente: {
            id_persona: 1,
            nombre: "MI EMPRESA SA DE CV",
            persona_cliente: null,
            configuracion_persona: { id_persona: 1, rfc: "QUHJ711021UR1", nombre_comercial: "MI EMPRESA" }
        },
        tipo_cfdi: { id_tipo_cfdi: 2, tipo_cfdi: "I", documento: "Ingreso" },
        metodo_pago: { clave: "03", descripcion: "Forma de pago 03" },
        forma_pago: { clave: "PUE", descripcion: "Método de pago PUE" },
        facturas_referencia_destino: [],
        ...extra
    };
}

function recibidas(items, extra = {}) {
    const { page = 1, lastPage = 1, total = items.length, categoria = "gastos" } = extra;
    return json(200, {
        success: true,
        message: "Facturas recibidas devueltas con éxito",
        data: {
            current_page: page,
            data: items,
            last_page: lastPage,
            next_page_url: page < lastPage ? `https://corecfdi.prueba/api/v1/facturas/recibidas?page=${page + 1}` : null,
            per_page: 15,
            total,
            categoria,
            totales: extra.totales || {
                total_registros: total,
                suma_subtotal: 150844.12,
                suma_total: 173430.45,
                suma_iva: 22586.330000000016,
                vigentes_count: total,
                canceladas_count: 0
            },
            conteo_categorias: extra.conteo || { gastos: total, nomina: 0, todos: total }
        }
    });
}

test("sin filtros: categoría gastos, paginación y totales", async () => {
    const e = await crearEntorno(() => recibidas([factura()], { lastPage: 2, total: 25 }));

    const resultado = await e.facturas.listarRecibidas();

    assert.equal(resultado.categoria, "gastos");
    assert.equal(resultado.page, 1);
    assert.equal(resultado.lastPage, 2);
    assert.equal(resultado.total, 25);
    assert.equal(resultado.totales.suma_total, 173430.45);
    assert.equal(resultado.totales.total_registros, 25);
    assert.deepEqual(resultado.conteoCategorias, { gastos: 25, nomina: 0, todos: 25 });
    assert.equal(resultado.items.length, 1);

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, "/facturas/recibidas");
    assert.equal(llamada.method, "GET");
    // No se envían parámetros vacíos: solo la página.
    assert.deepEqual(llamada.query, { page: "1" });
});

test("factura normalizada al modelo propio", async () => {
    const e = await crearEntorno(() => recibidas([factura()]));

    const [f] = (await e.facturas.listarRecibidas()).items;

    assert.equal(f.uuid, "EF34CE53-6076-4190-B8FD-EFD3274BA5F6");
    assert.equal(f.folio, "0208107174");
    assert.deepEqual(f.proveedor, { nombre: "BANCO MERCANTIL DEL NORTE SA", rfc: "BMN930209927" });
    assert.equal(f.tipo, "I");
    assert.equal(f.moneda, "MXN");
    assert.equal(f.subtotal, 1000);
    assert.equal(f.total, 1160);
    assert.equal(f.saldo, 0);
    assert.equal(f.estado, "vigente");
    assert.equal(f.esEfo, false);
    assert.deepEqual(f.pagos, []);
});

test("categoria=nomina y categoria=todos se envían y los contadores salen de conteo_categorias", async () => {
    const conteo = { gastos: 25, nomina: 4, todos: 29 };
    const e = await crearEntorno((llamada) => recibidas([factura()], { categoria: llamada.query.categoria, total: conteo[llamada.query.categoria], conteo }));

    const nomina = await e.facturas.listarRecibidas({ categoria: "nomina" });
    const todos = await e.facturas.listarRecibidas({ categoria: "todos" });

    assert.deepEqual(e.api.llamadas.map((l) => l.query.categoria), ["nomina", "todos"]);
    assert.equal(nomina.categoria, "nomina");
    assert.equal(nomina.total, nomina.conteoCategorias.nomina);
    assert.equal(todos.total, todos.conteoCategorias.todos);
});

test("búsqueda por RFC o nombre del proveedor y filtros: se envían solo los que tienen valor", async () => {
    const e = await crearEntorno(() => recibidas([factura()]));

    await e.facturas.listarRecibidas({ buscar: "  BMN930209927 ", status: "", fecha_inicio: "", fecha_fin: null, categoria: "gastos", per_page: 50 }, 2);
    await e.facturas.listarRecibidas({ buscar: "banco mercantil", status: "cancelado" });

    assert.deepEqual(e.api.llamadas[0].query, { categoria: "gastos", buscar: "BMN930209927", per_page: "50", page: "2" });
    assert.deepEqual(e.api.llamadas[1].query, { buscar: "banco mercantil", status: "cancelado", page: "1" });
});

test("rango de un solo día (fecha_inicio = fecha_fin) es válido", async () => {
    const e = await crearEntorno(() => recibidas([factura({ fecha: "2026-01-15" })]));

    const resultado = await e.facturas.listarRecibidas({ fecha_inicio: "2026-01-15", fecha_fin: "2026-01-15" });

    assert.equal(resultado.items[0].fecha, "2026-01-15");
    assert.equal(e.api.llamadas[0].query.fecha_inicio, "2026-01-15");
    assert.equal(e.api.llamadas[0].query.fecha_fin, "2026-01-15");
});

test("fecha_fin anterior a fecha_inicio y per_page=500 se bloquean en el cliente", async () => {
    const e = await crearEntorno(() => recibidas([]));

    await assert.rejects(e.facturas.listarRecibidas({ fecha_inicio: "2026-01-31", fecha_fin: "2026-01-01" }), (err) => err.tipo === "validacion" && !!err.errors.fecha_fin);
    await assert.rejects(e.facturas.listarRecibidas({ per_page: 500 }), (err) => err.tipo === "validacion" && !!err.errors.per_page);
    await assert.rejects(e.facturas.listarRecibidas({ fecha_inicio: "31/01/2026" }), (err) => !!err.errors.fecha_inicio);
    assert.equal(e.api.llamadas.length, 0);
});

test("422 del servidor: error manejado con el mensaje", async () => {
    const e = await crearEntorno(() => json(422, { message: "El campo per page no debe ser mayor que 100.", errors: { per_page: ["El campo per page no debe ser mayor que 100."] } }));

    await assert.rejects(e.facturas.listarRecibidas({ per_page: 100 }), (err) => err.tipo === "validacion" && /per page/.test(err.message));
    assert.equal(e.api.llamadas.length, 1);
});

test("sin resultados: lista vacía sin errores y totales en 0", async () => {
    const totales = { total_registros: 0, suma_subtotal: 0, suma_total: 0, suma_iva: 0, vigentes_count: 0, canceladas_count: 0 };
    const e = await crearEntorno(() => recibidas([], { total: 0, totales }));

    const resultado = await e.facturas.listarRecibidas({ buscar: "no-existe" });

    assert.deepEqual(resultado.items, []);
    assert.equal(resultado.total, 0);
    assert.deepEqual(resultado.totales, totales);
});

test("forma de pago y método de pago quedan en su lugar (vienen invertidos en la API)", async () => {
    const e = await crearEntorno(() => recibidas([factura()]));

    const [f] = (await e.facturas.listarRecibidas()).items;

    // API: metodo_pago = "03" (forma de pago SAT) y forma_pago = "PUE" (método de pago).
    assert.equal(f.formaPago.clave, "03");
    assert.equal(f.metodoPago.clave, "PUE");
});

test("RFC del proveedor: persona_cliente.rfc y, si es null, configuracion_persona.rfc", async () => {
    const emisor = { id_persona: 9, nombre: "PROVEEDOR SA", persona_cliente: null, configuracion_persona: { rfc: "PRO010101AAA" } };
    const e = await crearEntorno(() => recibidas([factura({ persona_emisor: emisor }), factura({ persona_emisor: { nombre: "SIN RFC", persona_cliente: null, configuracion_persona: null } })]));

    const { items } = await e.facturas.listarRecibidas();

    assert.equal(items[0].proveedor.rfc, "PRO010101AAA");
    assert.equal(items[1].proveedor.rfc, null);
});

test("proveedor con efos_emisor: esEfo = true", async () => {
    const e = await crearEntorno(() => recibidas([factura({ efos_emisor: { rfc: "BMN930209927", situacion: "Definitivo" } }), factura()]));

    const { items } = await e.facturas.listarRecibidas();

    assert.equal(items[0].esEfo, true);
    assert.equal(items[1].esEfo, false);
});

test("sat_url = null: satUrl queda en null para ocultar el botón de verificación", async () => {
    const e = await crearEntorno(() => recibidas([factura({ sat_url: null }), factura()]));

    const { items } = await e.facturas.listarRecibidas();

    assert.equal(items[0].satUrl, null);
    assert.match(items[1].satUrl, /^https:\/\/verificacfdi\.facturaelectronica\.sat\.gob\.mx\//);
});

test("factura con pagos en facturas_referencia_destino: se incluyen en el detalle", async () => {
    const pago = {
        monto: 580,
        parcialidad: 1,
        saldo_ant: 1160,
        nuevo_saldo: 580,
        fecha: "2026-09-15",
        factura_origen: { uuid: "AAAA1111-0000", fecha: "2026-09-15", importe: 580, status: "vigente", sat_url: "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=AAAA1111", has_pdf: true }
    };
    const e = await crearEntorno(() => recibidas([factura({ saldo: 580, facturas_referencia_destino: [pago] })]));

    const [f] = (await e.facturas.listarRecibidas()).items;

    assert.equal(f.saldo, 580);
    assert.deepEqual(f.pagos, [
        {
            monto: 580,
            parcialidad: 1,
            saldoAnterior: 1160,
            nuevoSaldo: 580,
            fecha: "2026-09-15",
            uuid: "AAAA1111-0000",
            fechaCfdi: "2026-09-15",
            importe: 580,
            estado: "vigente",
            satUrl: "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=AAAA1111",
            tienePdf: true
        }
    ]);
});

test("status desconocido: se devuelve tal cual sin romper", async () => {
    const e = await crearEntorno(() => recibidas([factura({ status: "en_proceso_de_cancelacion", tipo_cfdi: null, moneda_factura: null, metodo_pago: null, forma_pago: null, persona_emisor: null })]));

    const [f] = (await e.facturas.listarRecibidas()).items;

    assert.equal(f.estado, "en_proceso_de_cancelacion");
    assert.equal(f.tipo, "");
    assert.equal(f.proveedor.nombre, "");
});

test("fecha y hora se devuelven tal cual, sin conversión de zona horaria", async () => {
    const e = await crearEntorno(() => recibidas([factura()]));

    const [f] = (await e.facturas.listarRecibidas()).items;

    assert.equal(f.fecha, "2026-08-31");
    assert.equal(f.hora, "23:59:58");
});

test("listarTodas recorre las páginas con per_page=100 hasta next_page_url = null", async () => {
    const e = await crearEntorno((llamada) => recibidas([factura({ id_factura: Number(llamada.query.page) })], { page: Number(llamada.query.page), lastPage: 3, total: 3 }));

    const todas = await e.facturas.listarTodas({ categoria: "todos" });

    assert.deepEqual(todas.map((f) => f.id), [1, 2, 3]);
    assert.ok(e.api.llamadas.every((l) => l.query.per_page === "100" && l.query.categoria === "todos"));
});

test("token expirado: se renueva y la consulta funciona", async () => {
    const e = await crearEntorno(conTokenExpirado(() => recibidas([factura()])));

    const resultado = await e.facturas.listarRecibidas();

    assert.equal(resultado.items.length, 1);
    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), ["/facturas/recibidas", "/auth/refresh", "/facturas/recibidas"]);
});

test("404 tenant no encontrado y 403 empresa suspendida: sin reintento", async () => {
    const sinTenant = await crearEntorno(() => json(404, { success: false, message: "Tenant no encontrado." }));
    await assert.rejects(sinTenant.facturas.listarRecibidas(), (err) => err.tipo === "no_encontrado");
    assert.equal(sinTenant.api.llamadas.length, 1);

    const suspendida = await crearEntorno(() => json(403, { success: false, message: "La empresa 'Demo' se encuentra suspendida o inactiva." }));
    await assert.rejects(suspendida.facturas.listarRecibidas(), (err) => err.tipo === "prohibido");
    assert.equal(suspendida.api.llamadas.length, 1);
});
