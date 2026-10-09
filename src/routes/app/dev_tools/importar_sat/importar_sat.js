import fs from 'fs';
import path from 'path';
import { SatProducto } from '../../../../models/sat_producto';
import { SatUsoCfdi } from '../../../../models/sat_uso_cfdi';
import { SatUnidad } from '../../../../models/sat_unidad';
import { SatMunicipio } from '../../../../models/sat_municipio';
import { SatColonia } from '../../../../models/sat_colonia';
import * as accesos from '../../accesos';

const CARPETA_DEFAULT = '/home/ghostpredator/Descargas/DB sql';

// Cada tabla SQL se mapea a su modelo y a los campos numéricos que deben convertirse.
const TABLAS = {
    sat_producto: { archivo: 'sat_producto.sql', modelo: SatProducto, numericos: ['id_sat_producto'] },
    sat_uso_cfdi: { archivo: 'sat_uso_cfdi.sql', modelo: SatUsoCfdi, numericos: ['id_uso_cfdi', 'fisica', 'moral'] },
    sat_unidad: { archivo: 'sat_unidad.sql', modelo: SatUnidad, numericos: ['id_sat_unidad'] },
    sat_municipio: { archivo: 'sat_municipio.sql', modelo: SatMunicipio, numericos: ['id_municipio'] },
    sat_colonia: { archivo: 'sat_colonia.sql', modelo: SatColonia, numericos: ['id_colonia'] }
};

function es_entorno_local(req) {
    const host = String((req.headers && req.headers.host) || '');
    return host.includes('localhost') || host.includes('127.0.0.1') || process.env.NODE_ENV === 'development';
}

// Extrae los valores de las tuplas de un volcado `INSERT INTO ... VALUES (...),(...);`
function parsear_inserts(sql) {
    const filas = [];
    let columnas = null;
    const re_insert = /INSERT INTO `[^`]+` \(([^)]+)\) VALUES/g;
    let m;
    while ((m = re_insert.exec(sql)) !== null) {
        columnas = m[1].split(',').map(c => c.trim().replace(/`/g, ''));
        let i = re_insert.lastIndex;
        const n = sql.length;
        while (i < n) {
            while (i < n && /[\s,]/.test(sql[i])) i++;
            if (sql[i] === ';') { i++; break; }
            if (sql[i] !== '(') break;
            i++;
            const valores = [];
            let actual = '';
            let en_texto = false;
            let es_texto = false;
            for (; i < n; i++) {
                const ch = sql[i];
                if (en_texto) {
                    if (ch === '\\') { actual += sql[++i]; }
                    else if (ch === "'" && sql[i + 1] === "'") { actual += "'"; i++; }
                    else if (ch === "'") { en_texto = false; }
                    else actual += ch;
                } else if (ch === "'") { en_texto = true; es_texto = true; actual = ''; }
                else if (ch === ',' || ch === ')') {
                    const v = es_texto ? actual : actual.trim();
                    valores.push(!es_texto && v === 'NULL' ? null : v);
                    actual = ''; es_texto = false;
                    if (ch === ')') { i++; break; }
                } else actual += ch;
            }
            const fila = {};
            columnas.forEach((c, idx) => { fila[c] = valores[idx]; });
            filas.push(fila);
        }
        re_insert.lastIndex = i;
    }
    return filas;
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        return res.send({ ok: false, mensaje: 'sesión expirada' });
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        return res.status(403).send({ ok: false, mensaje: 'Acceso no autorizado' });
    }
    if (!es_entorno_local(req)) {
        return res.status(403).send({ ok: false, mensaje: 'La importación del catálogo SAT solo está habilitada en entorno local.' });
    }

    const { accion } = req.body;
    const carpeta = String(req.body.carpeta || CARPETA_DEFAULT);

    try {
        if (accion === 'estado') {
            const tablas = {};
            for (const [nombre, def] of Object.entries(TABLAS)) {
                tablas[nombre] = {
                    archivo_existe: fs.existsSync(path.join(carpeta, def.archivo)),
                    registros_en_mongo: await def.modelo.countDocuments({})
                };
            }
            return res.send({ ok: true, carpeta_default: CARPETA_DEFAULT, tablas });
        }

        if (accion === 'importar') {
            const def = TABLAS[req.body.tabla];
            if (!def) return res.send({ ok: false, mensaje: 'Tabla no soportada' });
            const ruta = path.join(carpeta, def.archivo);
            if (!fs.existsSync(ruta)) {
                return res.send({ ok: false, mensaje: `No se encontró ${ruta}` });
            }
            const filas = parsear_inserts(fs.readFileSync(ruta, 'utf8'));
            if (filas.length === 0) {
                return res.send({ ok: false, mensaje: 'No se encontraron registros en el archivo SQL' });
            }
            const docs = filas.map(fila => {
                def.numericos.forEach(c => { if (fila[c] !== null && fila[c] !== undefined) fila[c] = Number(fila[c]); });
                return fila;
            });
            // Se reemplaza el contenido completo para que la importación sea repetible.
            await def.modelo.deleteMany({});
            for (let i = 0; i < docs.length; i += 5000) {
                await def.modelo.insertMany(docs.slice(i, i + 5000));
            }
            return res.send({ ok: true, mensaje: `Se importaron ${docs.length} registros`, total: docs.length });
        }

        res.send({ ok: false, mensaje: 'Acción no soportada' });
    } catch (error) {
        console.error('Error importando catálogo SAT:', error);
        res.send({ ok: false, mensaje: 'Error al importar el catálogo SAT' });
    }
}
