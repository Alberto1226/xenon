import { SatProducto } from "../../../models/sat_producto";
import { SatUnidad } from "../../../models/sat_unidad";
import * as accesos from "../accesos";

const CATALOGOS = {
    producto: { modelo: SatProducto, campo_texto: "descripcion" },
    unidad: { modelo: SatUnidad, campo_texto: "nombre" }
};

function escapar_regex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Busca claves SAT por clave (prefijo) o por texto de la descripción para los selects de producto.
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "sesión expirada" });
    }
    const catalogo = CATALOGOS[req.body.catalogo];
    if (!catalogo) return res.send({ ok: false, mensaje: "Catálogo no soportado" });

    try {
        const q = String(req.body.q || "").trim().slice(0, 60);
        let filtro = {};
        if (q) {
            const rx = escapar_regex(q);
            filtro = { $or: [
                { clave: { $regex: "^" + rx, $options: "i" } },
                { [catalogo.campo_texto]: { $regex: rx, $options: "i" } }
            ] };
        }
        const filas = await catalogo.modelo.find(filtro)
            .select("clave " + catalogo.campo_texto)
            .sort({ clave: 1 }).limit(300).lean().exec();
        // Relevancia: clave exacta, clave por prefijo, texto por palabra y al final el resto.
        const qm = q.toLowerCase();
        const puntaje = f => {
            const c = String(f.clave).toLowerCase();
            if (c === qm) return 0;
            if (c.indexOf(qm) === 0) return 1;
            const t = String(f[catalogo.campo_texto] || "").toLowerCase();
            if (t.indexOf(qm) === 0) return 2;
            if (t.indexOf(" " + qm) >= 0) return 3;
            return 4;
        };
        filas.sort((a, b) => puntaje(a) - puntaje(b));
        res.send({
            ok: true,
            resultados: filas.slice(0, 30).map(f => ({ clave: f.clave, descripcion: f[catalogo.campo_texto] }))
        });
    } catch (error) {
        console.error("Error buscando catálogo SAT:", error);
        res.send({ ok: false, mensaje: "No se pudo consultar el catálogo SAT" });
    }
}
