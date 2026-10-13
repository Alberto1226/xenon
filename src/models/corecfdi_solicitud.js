var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Espejo local de las solicitudes de descarga masiva SAT hechas en CoreCFDI.
// CoreCFDI es la fuente de verdad: se actualiza al solicitar, al verificar y al leer el historial.
var schema = new Schema({
    tenant: { type: String, required: true },
    id_corecfdi: { type: Number, required: true }, // ID interno de CoreCFDI (el que usa verificar/{id})
    request_id: { type: String, default: "" }, // ID de la solicitud en el SAT
    fecha_inicio: { type: String, default: "" }, // "YYYY-MM-DD HH:mm:ss" en hora de México, sin convertir
    fecha_fin: { type: String, default: "" },
    tipo: { type: String, default: "" }, // emitido | recibido
    status: { type: String, default: "" },
    error_msg: { type: String, default: null },
    created_at: { type: Date, default: null }, // UTC
    updated_at: { type: Date, default: null }, // UTC
    fecha_sincronizacion: { type: Date, default: Date.now }
});

schema.index({ tenant: 1, id_corecfdi: 1 }, { unique: true });

export var CoreCfdiSolicitud = mongoose.model('CoreCfdiSolicitud', schema);
