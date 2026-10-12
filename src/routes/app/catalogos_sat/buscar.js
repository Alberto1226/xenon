import { ConfiguracionFiscal } from "../../../models/configuracion_fiscal";
import { SatProducto } from "../../../models/sat_producto";
import { SatUnidad } from "../../../models/sat_unidad";
import { sanitizarTextoSat } from "../../../services/catalogosFiscales";
import * as accesos from "../accesos";

const httpFetch = globalThis.fetch || fetch;

const CATALOGOS = {
    producto: {
        modelo: SatProducto,
        campo_texto: "descripcion",
        apiRuta: "api/satItems/searchItem"
    },
    unidad: {
        modelo: SatUnidad,
        campo_texto: "nombre",
        apiRuta: "api/satUnits/searchUnit"
    }
};

function escapar_regex(texto) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ordenar_por_relevancia(filas, q) {
    const qm = String(q || "").toLowerCase().trim();
    const puntaje = f => {
        const c = String(f.clave || "").toLowerCase().trim();
        if (c === qm) return 0;
        if (c.indexOf(qm) === 0) return 1;
        const t = String(f.descripcion || "").toLowerCase().trim();
        if (t.indexOf(qm) === 0) return 2;
        if (t.indexOf(" " + qm) >= 0) return 3;
        return 4;
    };
    return filas.sort((a, b) => puntaje(a) - puntaje(b));
}

async function consultar_api_sat(catalogoKey, q, baseUrl) {
    if (!q || !q.trim()) return [];
    const configCat = CATALOGOS[catalogoKey];
    if (!configCat) return [];

    const cleanBase = String(baseUrl || "https://cucc.com.mx/v2/api-cucc/public").replace(/\/+$/, "");
    const terminoLimpio = encodeURIComponent(q.trim().replace(/\//g, " "));
    const endpoint = `${cleanBase}/${configCat.apiRuta}/${terminoLimpio}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    try {
        const response = await httpFetch(endpoint, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            signal: controller.signal
        });
        clearTimeout(timer);

        if (!response.ok) {
            console.warn(`[CATALOGOS_SAT] API respondió status ${response.status} en ${endpoint}`);
            return [];
        }

        const data = await response.json();
        let lista = [];

        if (Array.isArray(data)) {
            lista = data;
        } else if (data && Array.isArray(data.satItems)) {
            lista = data.satItems;
        } else if (data && Array.isArray(data.satUnits)) {
            lista = data.satUnits;
        } else if (data && Array.isArray(data.data)) {
            lista = data.data;
        } else if (data && Array.isArray(data.items)) {
            lista = data.items;
        } else if (data && Array.isArray(data.unidades)) {
            lista = data.unidades;
        }

        const mapeados = lista.map(item => {
            const clave = String(
                item.clave ||
                item.c_producto ||
                item.c_unidad ||
                item.codigo ||
                ""
            ).trim();

            // Para unidades, priorizar nombre (ej. 'Bar', 'Pieza') sobre la descripción técnica
            const textoCrudo = catalogoKey === "unidad"
                ? (item.nombre || item.name || item.descripcion || "")
                : (item.descripcion || item.nombre || item.name || "");

            const descripcion = sanitizarTextoSat(textoCrudo);

            return { clave, descripcion };
        }).filter(item => item.clave);

        // Enriquecer con los nombres limpios y con acentos correctos de la DB local
        const claves = mapeados.map(m => m.clave).filter(Boolean);
        if (claves.length > 0) {
            try {
                const docsDb = await configCat.modelo.find({ clave: { $in: claves } })
                    .select("clave " + configCat.campo_texto)
                    .lean()
                    .exec();

                const mapaDb = new Map();
                for (const doc of docsDb) {
                    const texto = String(doc[configCat.campo_texto] || "").trim();
                    if (texto) mapaDb.set(String(doc.clave).toUpperCase().trim(), texto);
                }

                for (const item of mapeados) {
                    const claveUpper = String(item.clave).toUpperCase().trim();
                    if (mapaDb.has(claveUpper)) {
                        item.descripcion = mapaDb.get(claveUpper);
                    }
                }
            } catch (enrichErr) {
                // Silencioso, ya tiene sanitizar_texto_sat aplicado
            }
        }

        return mapeados;
    } catch (err) {
        clearTimeout(timer);
        console.error(`[CATALOGOS_SAT] Error consultando API SAT (${endpoint}):`, err.message);
        return [];
    }
}

async function consultar_db_sat(catalogoKey, q) {
    const configCat = CATALOGOS[catalogoKey];
    if (!configCat) return [];

    try {
        const rx = escapar_regex(q.trim().slice(0, 60));
        const filtro = {
            $or: [
                { clave: q.toUpperCase() },
                { clave: { $regex: "^" + rx, $options: "i" } },
                { [configCat.campo_texto]: { $regex: "^" + rx, $options: "i" } },
                { [configCat.campo_texto]: { $regex: rx, $options: "i" } }
            ]
        };

        const filas = await configCat.modelo.find(filtro)
            .select("clave " + configCat.campo_texto)
            .sort({ clave: 1 })
            .limit(50)
            .lean()
            .exec();

        return filas.map(f => ({
            clave: String(f.clave || "").trim(),
            descripcion: sanitizarTextoSat(String(f[configCat.campo_texto] || "").trim())
        })).filter(f => f.clave);
    } catch (err) {
        console.error("[CATALOGOS_SAT] Error en fallback DB:", err.message);
        return [];
    }
}

// Busca claves SAT fusionando API remota y DB local para máxima precisión y caracteres limpios
export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: "sesión expirada" });
    }

    const catalogo = req.body.catalogo;
    if (!CATALOGOS[catalogo]) {
        return res.send({ ok: false, mensaje: "Catálogo no soportado" });
    }

    const q = String(req.body.q || "").trim().slice(0, 80);
    if (!q) {
        return res.send({ ok: true, resultados: [] });
    }

    try {
        // Obtener la URL base configurada para CUCC / API SAT
        let cuccBase = "https://cucc.com.mx/v2/api-cucc/public";
        try {
            const configFiscal = await ConfiguracionFiscal.findOne().select("cucc_api_base").lean().exec();
            if (configFiscal && configFiscal.cucc_api_base) {
                cuccBase = configFiscal.cucc_api_base;
            }
        } catch (dbErr) {
            console.warn("[CATALOGOS_SAT] No se pudo leer cucc_api_base de ConfiguracionFiscal:", dbErr.message);
        }

        // Consultar API SAT y DB local en paralelo para evitar pérdidas de claves por límite de CUCC
        const [resultadosApi, resultadosDb] = await Promise.all([
            consultar_api_sat(catalogo, q, cuccBase).catch(() => []),
            consultar_db_sat(catalogo, q).catch(() => [])
        ]);

        const mapa = new Map();
        // Agregar primero los de la API (fuente primaria prioritaria)
        for (const item of (resultadosApi || [])) {
            const k = String(item.clave || "").toUpperCase().trim();
            if (k) mapa.set(k, item);
        }
        // Complementar con los de la DB local como respaldo para claves no devueltas por la API
        for (const item of (resultadosDb || [])) {
            const k = String(item.clave || "").toUpperCase().trim();
            if (k && !mapa.has(k)) {
                mapa.set(k, item);
            }
        }

        const resultados = Array.from(mapa.values());

        // Ordenar por relevancia respecto al término buscado (exactitud en clave primero)
        ordenar_por_relevancia(resultados, q);

        res.send({
            ok: true,
            origen: "fusion",
            resultados: resultados.slice(0, 30)
        });
    } catch (error) {
        console.error("Error buscando catálogo SAT:", error);
        res.send({ ok: false, mensaje: "No se pudo consultar el catálogo SAT" });
    }
}
