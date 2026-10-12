import { ConfiguracionFiscal } from "../../../../models/configuracion_fiscal";
import { SatProducto } from "../../../../models/sat_producto";
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
        } catch (e) {}

        const cleanBase = cuccBase.replace(/\/+$/, "");
        const url = `${cleanBase}/api/satItems/searchItem/${encodeURIComponent(termino.replace(/\//g, " "))}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        // 1. Consultar MongoDB local en paralelo
        const rx = termino.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const queryLocal = SatProducto.find({
            $or: [
                { clave: termino },
                { clave: { $regex: "^" + rx, $options: "i" } },
                { descripcion: { $regex: rx, $options: "i" } }
            ]
        }).limit(30).lean().exec().catch(() => []);

        // 2. Consultar API remota de CUCC
        let apiItems = [];
        try {
            const apiRes = await httpFetch(url, {
                headers: { "Accept": "application/json" },
                signal: controller.signal
            });
            clearTimeout(timer);
            if (apiRes.ok) {
                const data = await apiRes.json();
                if (Array.isArray(data)) apiItems = data;
                else if (data && Array.isArray(data.satItems)) apiItems = data.satItems;
                else if (data && Array.isArray(data.data)) apiItems = data.data;
            }
        } catch (apiErr) {
            clearTimeout(timer);
        }

        const localItems = await queryLocal;

        // 3. Fusionar ambos resultados en un Map deduplicado por clave (API remota prioritaria, DB local de respaldo)
        const mapa = new Map();

        // Primero agregar los de la API remota (fuente primaria prioritaria)
        for (const it of apiItems) {
            const claveRaw = String(it.c_producto || it.clave || "").trim();
            if (!claveRaw) continue;

            const textoCrudo = it.descripcion || it.nombre || it.name || "";
            const descSanitizada = sanitizarTextoSat(textoCrudo);

            mapa.set(claveRaw, {
                id_producto_sat: it.id_producto_sat || it.id_sat_producto || 0,
                c_producto: claveRaw,
                descripcion: descSanitizada
            });
        }

        // Luego complementar con los de MongoDB local como respaldo para claves no devueltas por la API
        for (const doc of localItems) {
            const clave = String(doc.clave || "").trim();
            if (clave && !mapa.has(clave)) {
                mapa.set(clave, {
                    id_producto_sat: doc.id_sat_producto || 0,
                    c_producto: doc.clave,
                    descripcion: sanitizarTextoSat(doc.descripcion || "")
                });
            } else if (clave && mapa.has(clave)) {
                const itemExistente = mapa.get(clave);
                if (!itemExistente.id_producto_sat && doc.id_sat_producto) {
                    itemExistente.id_producto_sat = doc.id_sat_producto;
                }
            }
        }

        const resultado = Array.from(mapa.values());

        // 4. Enriquecer las descripciones que vinieron con caracteres dañados (?) desde la API con las de MongoDB
        const claves = resultado.map(r => r.c_producto).filter(Boolean);
        if (claves.length > 0) {
            try {
                const docsDb = await SatProducto.find({ clave: { $in: claves } })
                    .select("clave descripcion")
                    .lean()
                    .exec();

                const mapaDb = new Map();
                for (const d of docsDb) {
                    if (d.descripcion) mapaDb.set(String(d.clave).trim(), d.descripcion.trim());
                }

                for (const item of resultado) {
                    const cp = String(item.c_producto).trim();
                    if (mapaDb.has(cp)) {
                        item.descripcion = mapaDb.get(cp);
                    }
                }
            } catch (enrichErr) {}
        }

        // 5. Ordenar por relevancia respecto al término buscado
        const qm = termino.toLowerCase();
        resultado.sort((a, b) => {
            const ca = String(a.c_producto || "").toLowerCase();
            const cb = String(b.c_producto || "").toLowerCase();
            const da = String(a.descripcion || "").toLowerCase();
            const db = String(b.descripcion || "").toLowerCase();

            const puntaje = (c, d) => {
                if (c === qm) return 0;
                if (c.startsWith(qm)) return 1;
                if (d === qm) return 2;
                if (d.startsWith(qm)) return 3;
                if (d.includes(" " + qm)) return 4;
                return 5;
            };

            return puntaje(ca, da) - puntaje(cb, db);
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(resultado));
    } catch (err) {
        console.error("Error en /api/satItems/searchItem:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
    }
}
