import { Producto } from "../../../models/producto";
import { parseM3Content } from "../../../services/pedimentoParserService";
import * as accesos from "../accesos";

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false && accesos.tiene_permisos_gerenciales(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    try {
        const { file_content, file_base64 } = req.body;

        let content = file_content;
        if (!content && file_base64) {
            content = Buffer.from(file_base64, 'base64').toString('utf-8');
        }

        if (!content) {
            res.send({ ok: false, mensaje: "No se recibió el contenido del archivo M3" });
            return;
        }

        // Cargar el catálogo de productos de Xenon para vinculación automática
        const allProducts = await Producto.find({}, '_id nombre codigo').lean().exec();

        // Parsear el archivo M3
        const parsedData = parseM3Content(content, allProducts);

        res.send({
            ok: true,
            mensaje: "Archivo M3 parseado exitosamente. Datos vinculados con el catálogo de productos.",
            data: parsedData
        });

    } catch (err) {
        console.error("Error al procesar archivo M3:", err);
        res.send({
            ok: false,
            mensaje: "Error al procesar el archivo M3: " + err.message
        });
    }
}
