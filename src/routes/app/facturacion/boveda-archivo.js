import * as accesos from "../accesos";
import { serviciosCoreCfdi, respuestaDeError } from "../../../services/corecfdi";
import { MAX_ARCHIVO_BYTES, errorDeArchivo } from "../../../services/corecfdi/bovedaVista.js";

// Archivos de la Bóveda Fiscal. CoreCFDI exige el Bearer token, así que el navegador nunca llama a
// CoreCFDI directo: este backend descarga o sube el archivo con la sesión del usuario.
//   GET  ?adjunto=12[&inline=1]       adjunto del expediente
//   GET  ?uuid=...&tipo=xml|pdf       XML o PDF del CFDI
//   POST ?id=40&tipo_documento=...&nombre=...   cuerpo = contenido del archivo (application/octet-stream)

// Solo estos tipos se muestran dentro del navegador; cualquier otro se fuerza a descarga.
const TIPOS_EN_LINEA = /^(application\/pdf|image\/(png|jpe?g|gif|webp))\b/i;

function estadoHttp(err) {
    if (err.tipo === "sesion" || err.tipo === "autenticacion") return 401;
    if (err.tipo === "prohibido") return 403;
    if (err.tipo === "no_encontrado") return 404;
    if (err.tipo === "validacion") return 422;
    if (err.tipo === "limite") return 429;
    if (err.tipo === "timeout") return 504;
    return 502;
}

function permitido(req, res) {
    if (accesos.esta_logueado(req) === false) {
        res.status(401).send({ ok: false, mensaje: "Sesión expirada" });
        return false;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.status(403).send({ ok: false, mensaje: "Acceso no autorizado" });
        return false;
    }
    return true;
}

function contentDisposition(nombre, enLinea) {
    const ascii = String(nombre).replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return `${enLinea ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

export async function get(req, res, next) {
    if (!permitido(req, res)) return;

    try {
        const { CoreCfdiBoveda } = await serviciosCoreCfdi(req);
        const pidioEnLinea = req.query.inline === "1";
        const archivo = req.query.adjunto !== undefined
            ? await CoreCfdiBoveda.descargarAdjunto(req.query.adjunto, { inline: pidioEnLinea })
            : await CoreCfdiBoveda.descargarCfdi(req.query.uuid, req.query.tipo);

        const enLinea = pidioEnLinea && TIPOS_EN_LINEA.test(archivo.contentType);
        res.setHeader("Content-Type", archivo.contentType);
        res.setHeader("Content-Disposition", contentDisposition(archivo.nombreArchivo, enLinea));
        res.setHeader("Cache-Control", "private, no-store");
        // El contenido lo subió un tercero: solo PDF e imágenes se abren en línea (nada que ejecute
        // código en el dominio de este sistema) y el navegador no adivina el tipo.
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.status(200).send(archivo.buffer);
    } catch (err) {
        console.error("Error al descargar un archivo de la Bóveda Fiscal:", err.message);
        return res.status(err.tipo ? estadoHttp(err) : 500).send(respuestaDeError(err));
    }
}

// Lee el cuerpo crudo; deja de leer en cuanto pasa del límite.
function leerCuerpo(req, limite) {
    return new Promise((resolve, reject) => {
        const partes = [];
        let tamano = 0;
        let excedido = false;
        req.on("data", (parte) => {
            if (excedido) return;
            tamano += parte.length;
            if (tamano > limite) {
                excedido = true;
                partes.length = 0;
                return;
            }
            partes.push(parte);
        });
        req.on("end", () => resolve(excedido ? null : Buffer.concat(partes)));
        req.on("error", reject);
    });
}

export async function post(req, res, next) {
    if (!permitido(req, res)) return;

    const nombre = String(req.query.nombre || "").trim();
    const buffer = await leerCuerpo(req, MAX_ARCHIVO_BYTES);
    const problema = buffer === null
        ? "El archivo no puede pasar de 10 MB."
        : errorDeArchivo({ name: nombre, size: buffer.length });
    if (problema) {
        return res.send({ ok: false, mensaje: problema, tipo: "validacion", status: 422, errors: { archivo: [problema] } });
    }

    try {
        const { CoreCfdiBoveda } = await serviciosCoreCfdi(req);
        const resultado = await CoreCfdiBoveda.subirAdjunto(
            req.query.id,
            { buffer, nombre, tipo: String(req.headers["x-tipo-archivo"] || "application/octet-stream") },
            req.query.tipo_documento
        );
        return res.send({ ok: true, ...resultado });
    } catch (err) {
        console.error("Error al subir un adjunto a la Bóveda Fiscal:", err.message);
        return res.send(respuestaDeError(err));
    }
}
