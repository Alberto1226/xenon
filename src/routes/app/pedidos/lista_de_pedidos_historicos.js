import { Pedido } from "../../../models/pedido";
import * as accesos from "../accesos";
import mongoose from 'mongoose';

function escaparRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function construirQueryPedido(buscando, usuario) {
    let condiciones = [];

    if (buscando && typeof buscando === 'string' && buscando.trim() !== '') {
        const textoLimpio = buscando.trim();
        const palabras = textoLimpio.split(/\s+/).filter(Boolean);

        const condicionesTexto = palabras.map(palabra => {
            const regex = new RegExp(escaparRegex(palabra), "i");
            const orCondiciones = [
                { 'cliente.alias': regex },
                { 'cliente.nombre': regex },
                { 'cliente.direccion': regex },
                { 'usuario_que_registro.usuario': regex },
                { 'agente.nombre': regex }
            ];

            if (!isNaN(palabra)) {
                orCondiciones.push({ folio: parseInt(palabra) });
            }

            return { $or: orCondiciones };
        });

        if (condicionesTexto.length > 0) {
            condiciones.push(...condicionesTexto);
        }
    }

    if (usuario.rol === 'vendedor' || usuario.rol === 'marketing' || usuario.rol === 'ComercioExterior') {
        condiciones.push({
            $or: [
                { "usuario_que_registro.id": String(usuario._id) },
                { "agente.id": String(usuario._id) }
            ]
        });
    }

    return condiciones.length > 0 ? { $and: condiciones } : {};
}

export async function post(req, res, next) {
    try {
        if (accesos.esta_logueado(req) === false) {
            return res.send({ ok: false, mensaje: "sesion expirada" });
        }

        let usuario = req.user;
        let buscando = req.body.buscando || "";
        if (typeof buscando === 'string' && buscando.length > 60) {
            return res.send({ ok: false, mensaje: 'error#876TLV' });
        }

        const pagina_actual = Math.max(0, (req.body.pagina_actual || 1) - 1);
        const limite = 10;
        const query = construirQueryPedido(buscando, usuario);

        const collectionVista = mongoose.connection.collection('vistaPedidosDatos');

        const [cuentaTotal, lista] = await Promise.all([
            collectionVista.countDocuments(query),
            collectionVista.find(query)
                .sort({ folio: -1 })
                .skip(pagina_actual * limite)
                .limit(limite)
                .toArray()
        ]);

        lista.forEach(doc => {
            if (!doc.fecha_creado) {
                doc.fecha_creado = doc.fecha;
            }
        });

        const paginas = Math.ceil(cuentaTotal / limite) || 0;

        return res.send({
            ok: true,
            lista,
            numero_total: cuentaTotal,
            paginas,
            coincidencias: cuentaTotal
        });
    } catch (err) {
        console.log("Error en lista_de_pedidos_historicos:", err);
        return res.send({ ok: false, mensaje: "Error al buscar resultados." });
    }
}
