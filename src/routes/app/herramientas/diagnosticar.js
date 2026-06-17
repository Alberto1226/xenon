import mongoose from 'mongoose';
import * as accesos from "../accesos";
import { Carrito } from "../../../models/carrito";
import { Pedido } from "../../../models/pedido";
import { Cliente } from "../../../models/cliente";
import { Producto } from "../../../models/producto";
import { Promocion } from "../../../models/promocion";
import { Inyeccion } from "../../../models/inyeccion";
import { Producto_snaplog } from "../../../models/producto_snaplog";
import { Carrito_publico } from "../../../models/carrito_publico";
import { Carrito_publico_historico } from "../../../models/carrito_publico_historico";
import { Ficha_de_descuento } from "../../../models/ficha_de_descuento";
import { Usuario } from "../../../models/usuario"; // Asegura que el modelo Usuario esté cargado

const CONFIG_COLECCIONES = {
    'Carrito': {
        modelo: Carrito,
        identificador: (doc) => doc.folio ? `Folio Carrito: ${doc.folio}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'usuario_que_registro.id', ref: 'Usuario', label: 'Usuario que Registró' },
            { path: 'agente.id', ref: 'Usuario', label: 'Agente' },
            { path: 'cliente.id', ref: 'Cliente', label: 'Cliente' }
        ]
    },
    'Pedido': {
        modelo: Pedido,
        identificador: (doc) => doc.folio ? `Folio Pedido: ${doc.folio}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'usuario_que_registro.id', ref: 'Usuario', label: 'Usuario que Registró' },
            { path: 'agente.id', ref: 'Usuario', label: 'Agente' },
            { path: 'cliente.id', ref: 'Cliente', label: 'Cliente' }
        ]
    },
    'Cliente': {
        modelo: Cliente,
        identificador: (doc) => doc.nombre ? `Cliente: ${doc.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'agente.id', ref: 'Usuario', label: 'Agente' }
        ]
    },
    'Producto': {
        modelo: Producto,
        identificador: (doc) => doc.nombre ? `Producto: ${doc.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'promo.id_promocion', ref: 'Promocion', label: 'Promoción' }
        ]
    },
    'Promocion': {
        modelo: Promocion,
        identificador: (doc) => doc.producto && doc.producto.nombre ? `Promo Prod: ${doc.producto.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'producto.id', ref: 'Producto', label: 'Producto' },
            { path: 'creacion.usuario.id', ref: 'Usuario', label: 'Usuario Creó' },
            { path: 'borrada_detalle.usuario.id', ref: 'Usuario', label: 'Usuario Borró' }
        ]
    },
    'Inyeccion': {
        modelo: Inyeccion,
        identificador: (doc) => doc.producto && doc.producto.nombre ? `Inyección: ${doc.producto.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'producto.id', ref: 'Producto', label: 'Producto' },
            { path: 'usuario.id', ref: 'Usuario', label: 'Usuario' }
        ]
    },
    'Producto_snaplog': {
        modelo: Producto_snaplog,
        identificador: (doc) => doc.producto && doc.producto.nombre ? `Snaplog: ${doc.producto.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'producto.id', ref: 'Producto', label: 'Producto' },
            { path: 'usuario.id', ref: 'Usuario', label: 'Usuario' },
            { path: 'pedido.id', ref: 'Pedido', label: 'Pedido' },
            { path: 'pedido.cliente.id', ref: 'Cliente', label: 'Cliente del Pedido' }
        ]
    },
    'Carrito_publico': {
        modelo: Carrito_publico,
        identificador: (doc) => doc.cliente && doc.cliente.nombre ? `Público: ${doc.cliente.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'cliente.id', ref: 'Cliente', label: 'Cliente' }
        ]
    },
    'Carrito_publico_historico': {
        modelo: Carrito_publico_historico,
        identificador: (doc) => doc.cliente && doc.cliente.nombre ? `Histórico: ${doc.cliente.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'cliente.id', ref: 'Cliente', label: 'Cliente' }
        ]
    },
    'Ficha_de_descuento': {
        modelo: Ficha_de_descuento,
        identificador: (doc) => doc.cliente && doc.cliente.nombre ? `Ficha: ${doc.cliente.nombre}` : `ID: ${doc._id}`,
        relaciones: [
            { path: 'autorizo.id', ref: 'Usuario', label: 'Autorizó' },
            { path: 'cliente.id', ref: 'Cliente', label: 'Cliente' }
        ]
    }
};

function getNestedValue(obj, path) {
    if (!obj) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function obtenerDetallesTipo(val) {
    if (val === null || val === undefined || val === '') {
        return { tipo: 'Nulo', esObjectId: false, esStringValido: false };
    }
    if (typeof val === 'string') {
        const esValido = mongoose.Types.ObjectId.isValid(val);
        return { tipo: 'String', esObjectId: false, esStringValido: esValido };
    }
    if (mongoose.Types.ObjectId.isValid(val)) {
        return { tipo: 'ObjectId', esObjectId: true, esStringValido: false };
    }
    return { tipo: typeof val, esObjectId: false, esStringValido: false };
}

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "Sesión expirada" });
        return;
    }
    if (accesos.tiene_permisos_administrativos(req) === false) {
        res.send({ ok: false, mensaje: "Acceso no autorizado" });
        return;
    }

    const { coleccion, pagina_actual = 1, limite = 10 } = req.body;
    
    if (!coleccion || !CONFIG_COLECCIONES[coleccion]) {
        res.send({ ok: false, mensaje: "Colección no soportada o inválida" });
        return;
    }

    const config = CONFIG_COLECCIONES[coleccion];
    const Model = config.modelo;

    try {
        const skip = (parseInt(pagina_actual) - 1) * parseInt(limite);
        const limit = parseInt(limite);

        const totalDocumentos = await Model.countDocuments({});
        const documentos = await Model.find({})
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec();

        const listaResultados = [];

        for (const doc of documentos) {
            const relacionesDiagnostico = {};

            for (const rel of config.relaciones) {
                const val = getNestedValue(doc, rel.path);
                const infoTipo = obtenerDetallesTipo(val);
                
                let existe = false;
                let estado = 'nulo';

                if (infoTipo.tipo !== 'Nulo') {
                    const refModel = mongoose.model(rel.ref);
                    if (mongoose.Types.ObjectId.isValid(val)) {
                        existe = await refModel.exists({ _id: val });
                    }
                    
                    if (infoTipo.tipo === 'String') {
                        estado = existe ? 'requiere_conversion' : 'huerfano';
                    } else if (infoTipo.tipo === 'ObjectId') {
                        estado = existe ? 'correcto' : 'huerfano';
                    } else {
                        estado = 'invalido';
                    }
                }

                relacionesDiagnostico[rel.path] = {
                    valor: val ? val.toString() : null,
                    tipo: infoTipo.tipo,
                    existe,
                    estado,
                    label: rel.label
                };
            }

            listaResultados.push({
                _id: doc._id.toString(),
                identificador: config.identificador(doc),
                relaciones: relacionesDiagnostico
            });
        }

        res.send({
            ok: true,
            totalDocumentos,
            lista: listaResultados
        });

    } catch (err) {
        console.error("Error en diagnóstico:", err);
        res.send({ ok: false, mensaje: "Error al realizar el diagnóstico: " + err.message });
    }
}
