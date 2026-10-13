import { test } from "node:test";
import assert from "node:assert/strict";
import { crearEntorno, conTokenExpirado, errorDeTimeout, json, solicitud, paginador } from "./ayudas.mjs";

const VERIFICAR = "/sat/descarga-masiva/verificar/12";

function verificada(estadoSolicitud, resultado) {
    return json(200, {
        success: true,
        message: "Estatus de solicitud verificado correctamente",
        data: { solicitud: solicitud(estadoSolicitud), resultado }
    });
}

const enProceso = () =>
    verificada(
        { status: "pendiente", error_msg: "Solicitud Aceptada" },
        { descargada: false, status: "pendiente", importadas: 0, actualizadas: 0, errores: 0, mensaje: "Solicitud Aceptada" }
    );

const terminada = () =>
    verificada(
        { status: "descargada", error_msg: null },
        { descargada: true, importadas: 148, actualizadas: 3, errores: 0, mensaje: "Descarga completada. 148 facturas importadas, 3 actualizadas." }
    );

test("solicitud en proceso: descargada = false, estado pendiente y se puede volver a verificar", async () => {
    const e = await crearEntorno(() => enProceso());

    const resultado = await e.sat.verificarSolicitud(12);

    assert.equal(resultado.descargada, false);
    assert.equal(resultado.status, "pendiente");
    assert.equal(resultado.mensaje, "Solicitud Aceptada");
    assert.equal((await e.almacenSolicitudes.obtener(12)).status, "pendiente");

    const [llamada] = e.api.llamadas;
    assert.equal(llamada.ruta, VERIFICAR);
    assert.equal(llamada.method, "POST");
    assert.equal(llamada.body, undefined);

    // Sigue pendiente: una verificación posterior sí llama a la API.
    await e.sat.verificarSolicitud(12);
    assert.equal(e.api.llamadas.length, 2);
});

test("solicitud terminada: descargada = true con conteos y el estado local pasa a descargada", async () => {
    const e = await crearEntorno(() => terminada());

    const resultado = await e.sat.verificarSolicitud(12);

    assert.equal(resultado.descargada, true);
    assert.equal(resultado.importadas, 148);
    assert.equal(resultado.actualizadas, 3);
    assert.equal(resultado.errores, 0);
    assert.equal(resultado.status, "descargada");
    assert.equal((await e.almacenSolicitudes.obtener(12)).status, "descargada");
});

test("solicitud rechazada o vencida: se devuelve el mensaje y se deja de verificar", async () => {
    for (const status of ["rechazada", "vencida"]) {
        const mensaje = status === "rechazada" ? "Solicitud rechazada por el SAT" : "Los paquetes expiraron";
        const e = await crearEntorno(() => verificada({ status, error_msg: mensaje }, { descargada: false, status, importadas: 0, actualizadas: 0, errores: 0, mensaje }));

        const resultado = await e.sat.verificarSolicitud(12);
        assert.equal(resultado.status, status);
        assert.equal(resultado.mensaje, mensaje);

        const segunda = await e.sat.verificarSolicitud(12);
        assert.equal(segunda.omitida, true);
        assert.equal(segunda.status, status);
        assert.equal(segunda.mensaje, mensaje);
        assert.equal(e.api.llamadas.length, 1, "no debe volver a llamar a la API");
    }
});

test("no se llama si la solicitud ya está descargada", async () => {
    const e = await crearEntorno(() => terminada());
    await e.almacenSolicitudes.guardar({ id: 12, status: "descargada" });

    const resultado = await e.sat.verificarSolicitud(12);

    assert.equal(resultado.omitida, true);
    assert.equal(resultado.descargada, true);
    assert.equal(e.api.llamadas.length, 0);
});

test("id inexistente: 404 con mensaje claro", async () => {
    const e = await crearEntorno(() => json(404, { success: false, message: "No se encontró la solicitud #99.", errors: null }));

    await assert.rejects(e.sat.verificarSolicitud(99), (err) => err.tipo === "no_encontrado" && err.message === "No se encontró la solicitud #99.");
    assert.equal(e.api.llamadas[0].ruta, "/sat/descarga-masiva/verificar/99");
});

test("empresa sin FIEL: 422 y se pide cargarla", async () => {
    const e = await crearEntorno(() => json(422, { message: "La empresa no tiene una FIEL configurada.", errors: null }));

    await assert.rejects(e.sat.verificarSolicitud(12), (err) => err.tipo === "validacion" && err.datos.requiereFiel === true && /FIEL/.test(err.message));
});

test("error 500 del SAT: no se reintenta", async () => {
    const e = await crearEntorno(() => json(500, { success: false, message: "Error al consultar el SAT", errors: null }));

    await assert.rejects(e.sat.verificarSolicitud(12), (err) => err.tipo === "servidor" && err.message === "Error al consultar el SAT");
    assert.equal(e.api.llamadas.length, 1);
});

test("timeout: no se reintenta de inmediato; el estado se consulta después en el historial", async () => {
    const e = await crearEntorno((llamada) => {
        if (llamada.ruta === "/sat/descarga-masiva/solicitudes") return json(200, paginador([solicitud({ status: "descargada" })]));
        throw errorDeTimeout();
    });

    await assert.rejects(e.sat.verificarSolicitud(12), (err) => err.tipo === "timeout" && err.datos.consultarHistorialDespues === true);
    assert.equal(e.api.deRuta(VERIFICAR).length, 1);
    assert.deepEqual(e.sleep.esperas, []);

    // Minutos después, el historial trae el estado real (el servidor sí terminó).
    const { items } = await e.sat.listarSolicitudes();
    assert.equal(items[0].status, "descargada");
    assert.equal((await e.almacenSolicitudes.obtener(12)).status, "descargada");
});

test("dos verificaciones simultáneas de la misma solicitud: solo se envía una", async () => {
    const e = await crearEntorno(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return terminada();
    });

    const [a, b] = await Promise.all([e.sat.verificarSolicitud(12), e.sat.verificarSolicitud("12")]);

    assert.equal(e.api.llamadas.length, 1);
    assert.equal(a.importadas, 148);
    assert.equal(b.importadas, 148);
});

test("si otro proceso ya está verificando la solicitud: no se envía y se avisa", async () => {
    const e = await crearEntorno(() => terminada());
    let soltar;
    const ocupado = e.lock.intentar("corecfdi:verificar:12", 1000, () => new Promise((resolve) => (soltar = resolve)));

    await assert.rejects(e.sat.verificarSolicitud(12), (err) => err.tipo === "en_curso");
    assert.equal(e.api.llamadas.length, 0);

    soltar();
    await ocupado;
    await e.sat.verificarSolicitud(12);
    assert.equal(e.api.llamadas.length, 1);
});

test("token expirado: se renueva y la verificación funciona", async () => {
    const e = await crearEntorno(conTokenExpirado(() => terminada()));

    const resultado = await e.sat.verificarSolicitud(12);

    assert.equal(resultado.descargada, true);
    assert.deepEqual(e.api.llamadas.map((l) => l.ruta), [VERIFICAR, "/auth/refresh", VERIFICAR]);
});

test("el log lleva endpoint, id, status HTTP y estado de la solicitud, sin tokens", async () => {
    const e = await crearEntorno(() => terminada());
    await e.sat.verificarSolicitud(12);

    const log = e.logger.texto();
    assert.match(log, /POST \/sat\/descarga-masiva\/verificar\/12 -> 200 \(\d+ ms\) \{"id":12\}/);
    assert.match(log, /Solicitud #12 verificada: estado descargada/);
    assert.ok(!log.includes("access-vigente"));
    assert.ok(!log.includes("Bearer"));
});
