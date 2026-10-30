import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

function escaparRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Genera condiciones $or para buscar un término en los campos de producto.
 * Permite buscar con término literal (incluyendo comillas si existen)
 * y/o con el término limpio (por si el usuario puso comillas que en BD no están).
 */
function generarCondicionOrCampos(termino) {
    const variantes = new Set();
    const terminoTrim = termino.trim();
    if (terminoTrim) variantes.add(terminoTrim);

    // Variante sin comillas externas o interiores
    const terminoSinComillas = terminoTrim.replace(/["'“”]/g, '').trim();
    if (terminoSinComillas) variantes.add(terminoSinComillas);

    const orClauses = [];
    for (const val of variantes) {
        const regex = new RegExp(escaparRegex(val), "i");
        orClauses.push(
            { codigo: regex },
            { codigo_de_barras: regex },
            { nombre: regex },
            { marca: regex },
            { "subcategoria.nombre": regex },
            { "category.nombre": regex }
        );
    }

    return { $or: orClauses };
}

/**
 * Construye la query compuesta inteligente.
 * 1. Si el usuario ingresó comillas explícitas para una medida o frase (ej: 2.5" o "carbon frame"),
 *    prioriza respetar esa coincidencia exacta.
 * 2. Si hay múltiples palabras separadas por espacios, genera un $and para que cada palabra
 *    pueda coincidir en cualquiera de los campos (ej: nombre + marca).
 * 3. Si además se busca la frase completa, se incluye en la consulta.
 */
function construirQueryBusqueda(textoBuscando) {
    if (!textoBuscando || typeof textoBuscando !== 'string' || textoBuscando.trim() === '') {
        return {};
    }

    const texto = textoBuscando.trim();

    // 1. Caso especial: Frase o palabra con comilla literal (ej: 2.5" o "filtro")
    // Si el usuario puso comillas al final de un número (medida en pulgadas)
    const tieneComillaMedida = /\d+(\.\d+)?["'“”]/.test(texto);

    // Separar palabras respetando espacios
    const palabras = texto.split(/\s+/).filter(Boolean);

    if (palabras.length === 1) {
        // Una sola palabra o medida (ej: 2.5" o TWEETER)
        const palabra = palabras[0];

        if (tieneComillaMedida) {
            // Si el usuario buscó explícitamente con comillas de medida (ej: 2.5")
            // Priorizamos coincidencia exacta que incluya la comilla para no traer llantas (ej: 22.5)
            const regexExacto = new RegExp(escaparRegex(palabra), "i");
            return {
                $or: [
                    { nombre: regexExacto },
                    { codigo: regexExacto },
                    { marca: regexExacto }
                ]
            };
        }

        return generarCondicionOrCampos(palabra);
    }

    // Múltiples palabras (ej: '9" G carbon frame' o 'BMW Carbon Frame')
    // Cada palabra debe cumplirse en algún campo (nombre, marca, código, etc.)
    const condicionesAnd = palabras.map(palabra => generarCondicionOrCampos(palabra));

    // También verificamos si la frase completa coincide en algún campo
    const textoSinComillas = texto.replace(/["'“”]/g, '').trim();
    const regexFraseCompleta = new RegExp(escaparRegex(textoSinComillas), "i");
    const condicionFrase = {
        $or: [
            { nombre: regexFraseCompleta },
            { marca: regexFraseCompleta },
            { codigo: regexFraseCompleta }
        ]
    };

    // Unimos: que cumpla la combinación de palabras O la frase completa
    return {
        $or: [
            { $and: condicionesAnd },
            condicionFrase
        ]
    };
}

export async function post(req, res, next) {
    try {
        if (accesos.esta_logueado(req) === false) {
            return res.send({ ok: false, mensaje: "sesion expirada" });
        }

        let buscando = req.body.buscando || "";
        if (typeof buscando === 'string' && buscando.length > 80) {
            return res.send({ ok: false, mensaje: 'error#876TLV' });
        }

        const pagina_actual = Math.max(0, (req.body.pagina_actual || 1) - 1);
        const limite = 10;
        const query = construirQueryBusqueda(buscando);

        // Ejecutar conteo total y búsqueda paginada en paralelo usando Promise.all y lean()
        const [cuentaTotal, lista] = await Promise.all([
            Producto.countDocuments(query),
            Producto.find(query)
                .sort({ codigo: 1, nombre: 1 })
                .skip(pagina_actual * limite)
                .limit(limite)
                .lean()
        ]);

        const paginas = Math.ceil(cuentaTotal / limite) || 0;

        return res.send({
            ok: true,
            lista,
            numero_total: cuentaTotal,
            paginas,
            coincidencias: cuentaTotal
        });
    } catch (err) {
        console.log("Error en lista_de_activos_e_inactivos:", err);
        return res.send({ ok: false, mensaje: "Error al buscar resultados." });
    }
}
