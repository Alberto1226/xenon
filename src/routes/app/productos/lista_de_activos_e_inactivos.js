import { Producto } from "../../../models/producto";
import * as accesos from "../accesos";

function escaparRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function construirQueryBusqueda(textoBuscando) {
    if (!textoBuscando || typeof textoBuscando !== 'string' || textoBuscando.trim() === '') {
        return {};
    }

    const palabras = textoBuscando.trim().split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return {};

    const condiciones = palabras.map(palabra => {
        const regex = new RegExp(escaparRegex(palabra), "i");
        return {
            $or: [
                { codigo: regex },
                { codigo_de_barras: regex },
                { nombre: regex },
                { marca: regex },
                { "subcategoria.nombre": regex },
                { "category.nombre": regex }
            ]
        };
    });

    return condiciones.length > 1 ? { $and: condiciones } : condiciones[0];
}

export async function post(req, res, next) {
    try {
        if (accesos.esta_logueado(req) === false) {
            return res.send({ ok: false, mensaje: "sesion expirada" });
        }

        let buscando = req.body.buscando || "";
        if (typeof buscando === 'string' && buscando.length > 60) {
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
