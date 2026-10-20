var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    uuid: { type: String, required: true, unique: true },
    serie: { type: String, default: "F" },
    folio: { type: String, default: "" },
    pedido_id: { type: Schema.Types.ObjectId, default: null },
    carrito_id: { type: Schema.Types.ObjectId, default: null },
    folio_pedido: { type: Number, default: 0, index: true },
    pedidos_ids: [{ type: Schema.Types.ObjectId, ref: 'Pedido' }],
    folios_pedidos: [{ type: Number }],
    es_publico_general: { type: Boolean, default: false },
    informacion_global: { periodicidad: String, meses: String, anio: String },
    cliente_id: { type: Schema.Types.ObjectId, default: null, index: true },
    receptor: {
        rfc: { type: String, default: "" },
        nombre: { type: String, default: "" },
        domicilio_fiscal: { type: String, default: "" },
        regimen_fiscal: { type: String, default: "" },
        uso_cfdi: { type: String, default: "G03" }
    },
    subtotal: { type: Number, default: 0 },
    descuento: { type: Number, default: 0 },
    impuestos: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    moneda: { type: String, default: "MXN" },
    tipo_cfdi: { type: String, default: "I" },
    metodo_pago: { type: String, default: "PUE" },
    forma_pago: { type: String, default: "01" },
    status: { type: String, default: "Vigente" }, // Vigente | Cancelada
    // Desglose de traslados del CFDI, base para los impuestos proporcionales del REP.
    traslados: [{
        impuesto: { type: String, default: "" },
        factor: { type: String, default: "" },
        tasa: { type: Number, default: null },
        base: { type: Number, default: 0 },
        importe: { type: Number, default: 0 }
    }],
    // Solo las facturas PPD llevan saldo; las PUE nacen en cero y no aparecen en cobranza.
    condiciones_pago: { type: String, default: "" },
    dias_credito: { type: Number, default: 0 },
    fecha_limite: { type: Date, default: null },
    saldo_pendiente: { type: Number, default: 0 },
    total_pagado: { type: Number, default: 0 },
    status_pago: { type: String, enum: ["", "pendiente", "parcial", "pagada"], default: "" },
    parcialidades: [{
        pago_id: { type: Schema.Types.ObjectId, ref: 'Pago' },
        num_parcialidad: { type: Number, default: 1 },
        importe: { type: Number, default: 0 },
        saldo_anterior: { type: Number, default: 0 },
        saldo_insoluto: { type: Number, default: 0 },
        uuid_rep: { type: String, default: "" },
        fecha: { type: Date, default: Date.now }
    }],
    fecha_emision: { type: Date, default: Date.now },
    fecha_cancelacion: { type: Date, default: null },
    motivo_cancelacion: { type: String, default: "" },
    uuid_sustitucion: { type: String, default: "" },
    usuario: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
        nombre: { type: String, default: "" }
    }
});

export var Factura = mongoose.model('Factura', schema);
