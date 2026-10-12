import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { SatUnidad } from "../../../../models/sat_unidad";
import { sanitizarTextoSat } from "../../../../services/catalogosFiscales";

const httpFetch = globalThis.fetch || fetch;

export async function get(req, res, next) {
    const termino = String(req.params.termino || "").trim();
    if (!termino) {
        return res.send([]);
    }

    try {
        let cuccBase = "https://cucc.com.mx/v2/api-cucc/public";
        try {
            const configFiscal = await ConfiguracionFiscal.findOne().select("cucc_api_base").lean().exec();
            if (configFiscal && configFiscal.cucc_api_base) {
                cuccBase = configFiscal.cucc_api_base;
            }
        } catch (e) { }

        const cleanBase = cuccBase.replace(/\/+$/, "");
        const url = `${cleanBase}/api/satUnits/searchUnit/${encodeURIComponent(termino.replace(/\//g, " "))}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        // 1. Consultar MongoDB local en paralelo (para asegurar claves exactas como PR, H87, etc.)
        const rx = termino.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const queryLocal = SatUnidad.find({
            $or: [
                { clave: termino.toUpperCase() },
                { clave: { $regex: "^" + rx, $options: "i" } },
                { nombre: { $regex: "^" + rx, $options: "i" } },
                { nombre: { $regex: rx, $options: "i" } }
            ]
        }).limit(30).lean().exec().catch(() => []);

        // 2. Consultar API remota de CUCC
        let apiUnits = [];
        try {
            const apiRes = await httpFetch(url, {
                headers: { "Accept": "application/json" },
                signal: controller.signal
            });
            clearTimeout(timer);
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (Array.isArray(data)) apiUnits = data;
                else if (data && Array.isArray(data.satUnits)) apiUnits = data.satUnits;
                else if (data && Array.isArray(data.data)) apiUnits = data.data;
            }
        } catch (apiErr) {
            clearTimeout(timer);
        }

        const localUnits = await queryLocal;

        // 3. Fusionar ambos resultados en un Map deduplicado por clave (API remota prioritaria, DB local de respaldo)
        const mapa = new Map();

        // Primero agregar los de la API remota (fuente primaria prioritaria)
        for (const it of apiUnits) {
            const claveRaw = String(it.c_unidad || it.clave || "").trim();
            const claveUpper = claveRaw.toUpperCase();
            if (!claveUpper) continue;

            const textoCrudo = it.nombre || it.name || it.descripcion || "";
            const nombreSanitizado = sanitizarTextoSat(textoCrudo);

            mapa.set(claveUpper, {
                id_unidad_sat: it.id_unidad_sat || it.id_sat_unidad || 0,
                c_unidad: claveRaw,
                nombre: nombreSanitizado
            });
        }

        // Luego complementar con MongoDB local como respaldo para claves no entregadas por la API (ej. PR, H87, etc.)
        for (const doc of localUnits) {
            const clave = String(doc.clave || "").toUpperCase().trim();
            if (clave && !mapa.has(clave)) {
                mapa.set(clave, {
                    id_unidad_sat: doc.id_sat_unidad || 0,
                    c_unidad: doc.clave,
                    nombre: sanitizarTextoSat(doc.nombre || "")
                });
            } else if (clave && mapa.has(clave)) {
                // Si la API no trajo id_unidad_sat pero la DB local sí, complementar
                const itemExistente = mapa.get(clave);
                if (!itemExistente.id_unidad_sat && doc.id_sat_unidad) {
                    itemExistente.id_unidad_sat = doc.id_sat_unidad;
                }
            }
        }

        const resultado = Array.from(mapa.values());

        // 4. Enriquecer los nombres que vinieron con caracteres dañados (?) desde la API con los nombres limpios de MongoDB
        const claves = resultado.map(r => r.c_unidad).filter(Boolean);
        if (claves.length > 0) {
            try {
                const docsDb = await SatUnidad.find({ clave: { $in: claves } })
                    .select("clave nombre")
                    .lean()
                    .exec();

                const mapaDb = new Map();
                for (const d of docsDb) {
                    if (d.nombre) mapaDb.set(String(d.clave).toUpperCase().trim(), d.nombre.trim());
                }

                for (const item of resultado) {
                    const cu = String(item.c_unidad).toUpperCase().trim();
                    if (mapaDb.has(cu)) {
                        item.nombre = mapaDb.get(cu);
                    }
                }
            } catch (enrichErr) { }
        }

        // 5. Ordenar por relevancia respecto al término buscado
        const qm = termino.toLowerCase();
        resultado.sort((a, b) => {
            const ca = String(a.c_unidad || "").toLowerCase();
            const cb = String(b.c_unidad || "").toLowerCase();
            const na = String(a.nombre || "").toLowerCase();
            const nb = String(b.nombre || "").toLowerCase();

            const puntaje = (c, n) => {
                if (c === qm) return 0; // Coincidencia exacta de clave
                if (c.startsWith(qm)) return 1; // Clave empieza con el término
                if (n === qm) return 2; // Nombre exacto
                if (n.startsWith(qm)) return 3; // Nombre empieza con el término
                if (n.includes(" " + qm)) return 4; // Alguna palabra en nombre empieza con el término
                return 5;
            };

            return puntaje(ca, na) - puntaje(cb, nb);
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(resultado));
    } catch (err) {
        console.error("Error en /api/satUnits/searchUnit:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
    }
}
