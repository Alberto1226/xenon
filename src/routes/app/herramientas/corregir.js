import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
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

const MODELOS = {
    'Carrito': Carrito,
    'Pedido': Pedido,
    'Cliente': Cliente,
    'Producto': Producto,
    'Promocion': Promocion,
    'Inyeccion': Inyeccion,
    'Producto_snaplog': Producto_snaplog,
    'Carrito_publico': Carrito_publico,
    'Carrito_publico_historico': Carrito_publico_historico,
    'Ficha_de_descuento': Ficha_de_descuento
};

const RELACIONES_MAPPING = {
    'Carrito': [
        { path: 'usuario_que_registro.id', ref: 'Usuario' },
        { path: 'agente.id', ref: 'Usuario' },
        { path: 'cliente.id', ref: 'Cliente' }
    ],
    'Pedido': [
        { path: 'usuario_que_registro.id', ref: 'Usuario' },
        { path: 'agente.id', ref: 'Usuario' },
        { path: 'cliente.id', ref: 'Cliente' }
    ],
    'Cliente': [
        { path: 'agente.id', ref: 'Usuario' }
    ],
    'Producto': [
        { path: 'promo.id_promocion', ref: 'Promocion' }
    ],
    'Promocion': [
        { path: 'producto.id', ref: 'Producto' },
        { path: 'creacion.usuario.id', ref: 'Usuario' },
        { path: 'borrada_detalle.usuario.id', ref: 'Usuario' }
    ],
    'Inyeccion': [
        { path: 'producto.id', ref: 'Producto' },
        { path: 'usuario.id', ref: 'Usuario' }
    ],
    'Producto_snaplog': [
        { path: 'producto.id', ref: 'Producto' },
        { path: 'usuario.id', ref: 'Usuario' },
        { path: 'pedido.id', ref: 'Pedido' },
        { path: 'pedido.cliente.id', ref: 'Cliente' }
    ],
    'Carrito_publico': [
        { path: 'cliente.id', ref: 'Cliente' }
    ],
    'Carrito_publico_historico': [
        { path: 'cliente.id', ref: 'Cliente' }
    ],
    'Ficha_de_descuento': [
        { path: 'autorizo.id', ref: 'Usuario' },
        { path: 'cliente.id', ref: 'Cliente' }
    ]
};

const IDENTIFICADORES = {
    'Carrito': (doc) => doc.folio ? `Folio Carrito: ${doc.folio}` : `ID: ${doc._id}`,
    'Pedido': (doc) => doc.folio ? `Folio Pedido: ${doc.folio}` : `ID: ${doc._id}`,
    'Cliente': (doc) => doc.nombre ? `Cliente: ${doc.nombre}` : `ID: ${doc._id}`,
    'Producto': (doc) => doc.nombre ? `Producto: ${doc.nombre}` : `ID: ${doc._id}`,
    'Promocion': (doc) => doc.producto && doc.producto.nombre ? `Promo Prod: ${doc.producto.nombre}` : `ID: ${doc._id}`,
    'Inyeccion': (doc) => doc.producto && doc.producto.nombre ? `Inyección: ${doc.producto.nombre}` : `ID: ${doc._id}`,
    'Producto_snaplog': (doc) => doc.producto && doc.producto.nombre ? `Snaplog: ${doc.producto.nombre}` : `ID: ${doc._id}`,
    'Carrito_publico': (doc) => doc.cliente && doc.cliente.nombre ? `Público: ${doc.cliente.nombre}` : `ID: ${doc._id}`,
    'Carrito_publico_historico': (doc) => doc.cliente && doc.cliente.nombre ? `Histórico: ${doc.cliente.nombre}` : `ID: ${doc._id}`,
    'Ficha_de_descuento': (doc) => doc.cliente && doc.cliente.nombre ? `Ficha: ${doc.cliente.nombre}` : `ID: ${doc._id}`,
};

function getNestedValue(obj, path) {
    if (!obj) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
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

    const { coleccion, ids, corregirTodo } = req.body;

    if (!coleccion || !MODELOS[coleccion]) {
        res.send({ ok: false, mensaje: "Colección inválida o no soportada" });
        return;
    }

    const Model = MODELOS[coleccion];
    const relaciones = RELACIONES_MAPPING[coleccion];
    const getIdentificador = IDENTIFICADORES[coleccion] || ((doc) => `ID: ${doc._id}`);

    try {
        if (corregirTodo) {
            // Lógica para corregir la colección completa por bloques de 100 y escribir logs
            const logFilePath = path.join(process.cwd(), 'logs_correccion', `${coleccion}_correcciones.json`);
            const logDir = path.dirname(logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            let historialCambios = [];
            if (fs.existsSync(logFilePath)) {
                try {
                    historialCambios = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
                } catch (e) {
                    console.error("Error al leer archivo de log existente, iniciando nuevo:", e);
                }
            }

            const cursor = Model.find({}).cursor();
            let bulkOps = [];
            let loteCambiosLog = [];
            let totalModificados = 0;
            let totalEscaneados = 0;

            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                totalEscaneados++;
                const updateFields = {};
                let docNeedsUpdate = false;
                const cambiosDoc = [];

                for (const rel of relaciones) {
                    const val = getNestedValue(doc, rel.path);
                    if (val && typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
                        updateFields[rel.path] = new mongoose.Types.ObjectId(val);
                        docNeedsUpdate = true;
                        cambiosDoc.push({
                            campo: rel.path,
                            valor_anterior: val,
                            valor_nuevo: val.toString()
                        });
                    }
                }

                if (docNeedsUpdate) {
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: doc._id },
                            update: { $set: updateFields }
                        }
                    });

                    loteCambiosLog.push({
                        fecha: new Date().toISOString(),
                        documento_id: doc._id.toString(),
                        identificador: getIdentificador(doc),
                        cambios: cambiosDoc
                    });
                }

                // Ejecutar por bloques de 100
                if (bulkOps.length >= 100) {
                    const resultado = await Model.bulkWrite(bulkOps);
                    totalModificados += resultado.modifiedCount;
                    bulkOps = [];

                    historialCambios.push(...loteCambiosLog);
                    loteCambiosLog = [];
                    fs.writeFileSync(logFilePath, JSON.stringify(historialCambios, null, 2), 'utf-8');
                }
            }

            // Ejecutar remanentes
            if (bulkOps.length > 0) {
                const resultado = await Model.bulkWrite(bulkOps);
                totalModificados += resultado.modifiedCount;
                historialCambios.push(...loteCambiosLog);
                fs.writeFileSync(logFilePath, JSON.stringify(historialCambios, null, 2), 'utf-8');
            }

            res.send({
                ok: true,
                mensaje: `Se escanearon ${totalEscaneados} registros y se corrigieron ${totalModificados} relaciones. Log guardado en local.`,
                modificados: totalModificados,
                escaneados: totalEscaneados
            });
            return;
        }

        // Lógica normal de IDs seleccionados
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.send({ ok: false, mensaje: "No se proporcionaron IDs para corregir" });
            return;
        }

        const bulkOps = [];
        const loteCambiosLog = [];

        for (const docId of ids) {
            if (!mongoose.Types.ObjectId.isValid(docId)) continue;
            
            const doc = await Model.findById(docId).lean().exec();
            if (!doc) continue;

            const updateFields = {};
            let needsUpdate = false;
            const cambiosDoc = [];

            for (const rel of relaciones) {
                const val = getNestedValue(doc, rel.path);
                
                if (val && typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
                    updateFields[rel.path] = new mongoose.Types.ObjectId(val);
                    needsUpdate = true;
                    cambiosDoc.push({
                        campo: rel.path,
                        valor_anterior: val,
                        valor_nuevo: val.toString()
                    });
                }
            }

            if (needsUpdate) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: new mongoose.Types.ObjectId(docId) },
                        update: { $set: updateFields }
                    }
                });

                loteCambiosLog.push({
                    fecha: new Date().toISOString(),
                    documento_id: docId,
                    identificador: getIdentificador(doc),
                    cambios: cambiosDoc
                });
            }
        }

        if (bulkOps.length > 0) {
            const resultado = await Model.bulkWrite(bulkOps);

            // Escribir cambios del lote al archivo local
            const logFilePath = path.join(process.cwd(), 'logs_correccion', `${coleccion}_correcciones.json`);
            const logDir = path.dirname(logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            let historialCambios = [];
            if (fs.existsSync(logFilePath)) {
                try {
                    historialCambios = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
                } catch (e) {
                    console.error("Error al leer archivo de log existente:", e);
                }
            }
            historialCambios.push(...loteCambiosLog);
            fs.writeFileSync(logFilePath, JSON.stringify(historialCambios, null, 2), 'utf-8');

            res.send({ 
                ok: true, 
                mensaje: `Se corrigieron ${resultado.modifiedCount} registros exitosamente. Log actualizado.`,
                modificados: resultado.modifiedCount
            });
        } else {
            res.send({ 
                ok: true, 
                mensaje: "No se encontraron registros que requieran conversión.",
                modificados: 0
            });
        }

    } catch (err) {
        console.error("Error en endpoint de corrección:", err);
        res.send({ ok: false, mensaje: "Error al aplicar la corrección: " + err.message });
    }
}
