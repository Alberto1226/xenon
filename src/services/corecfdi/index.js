/**
 * Integración con la API de CoreCFDI (descarga de CFDI del SAT). No emite ni timbra comprobantes.
 *
 * Cada usuario de este sistema inicia su propia sesión en CoreCFDI (empresa, email y contraseña)
 * desde la pantalla. De la sesión solo se guardan la empresa, el email y los tokens cifrados;
 * la contraseña se usa una vez para iniciar sesión y no se guarda. Cuando la sesión ya no se
 * puede renovar, las funciones lanzan un CoreCfdiError de tipo "sesion" y la pantalla vuelve a
 * pedir los datos.
 *
 * Punto de entrada para las rutas: iniciarSesionCoreCfdi, cerrarSesionCoreCfdi,
 * estadoSesionCoreCfdi y serviciosCoreCfdi (CoreCfdiAuth, CoreCfdiSat y CoreCfdiFacturas de
 * la sesión del usuario).
 */
import { leerConfigCoreCfdi } from "./config.js";
import { CoreCfdiError, errorDeValidacion } from "./errores.js";
import { crearCoreCfdiAuth } from "./auth.js";
import { crearCoreCfdiCliente } from "./cliente.js";
import { crearCoreCfdiSat } from "./sat.js";
import { crearCoreCfdiFacturas } from "./facturas.js";
import { crearCoreCfdiTesoreria } from "./tesoreria.js";
import { crearCoreCfdiReportes } from "./reportes.js";
import { crearCoreCfdiBoveda } from "./boveda.js";
import { crearAlmacenTokensMongo, crearAlmacenSolicitudesMongo, crearLockMongo, leerSesionGuardada } from "./almacenMongo";

const httpFetch = (url, opciones) => globalThis.fetch(url, opciones);
const lock = crearLockMongo();

// Servicios ya armados por usuario: conservan la renovación de token y las verificaciones en curso.
const serviciosPorUsuario = new Map();

function idDeUsuario(req) {
    return String(req.user._id);
}

function armarServicios(usuario, tenant) {
    const config = () => ({ ...leerConfigCoreCfdi(process.env), tenant });
    const CoreCfdiAuth = crearCoreCfdiAuth({
        config,
        almacen: crearAlmacenTokensMongo(usuario),
        lock,
        idSesion: usuario,
        fetch: httpFetch
    });
    const cliente = crearCoreCfdiCliente({ config, auth: CoreCfdiAuth, fetch: httpFetch });
    const CoreCfdiSat = crearCoreCfdiSat({ cliente, almacen: crearAlmacenSolicitudesMongo(() => tenant), lock, ambito: tenant });
    const CoreCfdiFacturas = crearCoreCfdiFacturas({ cliente });
    const CoreCfdiTesoreria = crearCoreCfdiTesoreria({ cliente, ambito: tenant });
    const CoreCfdiReportes = crearCoreCfdiReportes({ cliente, ambito: tenant });
    const CoreCfdiBoveda = crearCoreCfdiBoveda({ cliente, ambito: tenant });
    return { tenant, CoreCfdiAuth, CoreCfdiSat, CoreCfdiFacturas, CoreCfdiTesoreria, CoreCfdiReportes, CoreCfdiBoveda };
}

/**
 * Inicia la sesión de CoreCFDI del usuario con la empresa, el email y la contraseña que escribió.
 * Devuelve { tenant, email }.
 */
export async function iniciarSesionCoreCfdi(req, { tenant, email, password }) {
    const empresa = String(tenant || "").trim();
    const correo = String(email || "").trim();
    const errors = {};
    if (!empresa) errors.tenant = ["La empresa (tenant) es obligatoria."];
    if (!correo) errors.email = ["El email es obligatorio."];
    if (!password) errors.password = ["La contraseña es obligatoria."];
    if (Object.keys(errors).length > 0) throw errorDeValidacion(errors);

    const usuario = idDeUsuario(req);
    const servicios = armarServicios(usuario, empresa);
    await servicios.CoreCfdiAuth.login({ email: correo, password });
    serviciosPorUsuario.set(usuario, servicios);
    return { tenant: empresa, email: correo };
}

/** Borra la sesión de CoreCFDI guardada del usuario. */
export async function cerrarSesionCoreCfdi(req) {
    const usuario = idDeUsuario(req);
    serviciosPorUsuario.delete(usuario);
    await crearAlmacenTokensMongo(usuario).borrar();
}

/** { activa, tenant, email } de la sesión de CoreCFDI del usuario. */
export async function estadoSesionCoreCfdi(req) {
    const sesion = await leerSesionGuardada(idDeUsuario(req));
    return sesion ? { activa: true, tenant: sesion.tenant, email: sesion.email } : { activa: false, tenant: "", email: "" };
}

/**
 * Servicios de CoreCFDI de la sesión del usuario: { CoreCfdiAuth, CoreCfdiSat, CoreCfdiFacturas }.
 * Lanza un error de tipo "sesion" si el usuario no ha iniciado sesión en CoreCFDI.
 */
export async function serviciosCoreCfdi(req) {
    const usuario = idDeUsuario(req);
    const sesion = await leerSesionGuardada(usuario);
    if (!sesion) {
        serviciosPorUsuario.delete(usuario);
        throw new CoreCfdiError("sesion", "Inicie sesión en CoreCFDI para continuar.", { status: 401 });
    }

    let servicios = serviciosPorUsuario.get(usuario);
    if (!servicios || servicios.tenant !== sesion.tenant) {
        servicios = armarServicios(usuario, sesion.tenant);
        serviciosPorUsuario.set(usuario, servicios);
    }
    return servicios;
}

export { CoreCfdiError, respuestaDeError } from "./errores.js";
export { leerConfigCoreCfdi } from "./config.js";
