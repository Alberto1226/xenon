var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    folio: { type: Number, default: 0 },
    origen: { type: String, enum: ['cobro', 'saldo_a_favor'], default: 'cobro' },
    // Para origen "saldo_a_favor": el cobro original cuyo excedente se está aplicando.
    pago_origen_id: { type: Schema.Types.ObjectId, ref: 'Pago', default: null },
    clave_idempotencia: { type: String, default: undefined },
    cliente: {
        id: { type: Schema.Types.ObjectId, ref: 'Cliente', index: true },
        nombre: { type: String, default: '' },
        rfc: { type: String, default: '' }
    },
    fecha_pago: { type: Date, required: true },
    forma_pago: { type: String, required: true },
    moneda: { type: String, default: 'MXN' },
    tipo_cambio: { type: Number, default: 1 },
    monto_total: { type: Number, default: 0 },
    monto_aplicado: { type: Number, default: 0 },
    // Excedente generado por este cobro y la parte que aún no se ha consumido.
    saldo_a_favor_generado: { type: Number, default: 0 },
    excedente_disponible: { type: Number, default: 0 },
    referencia: { type: String, default: '' },
    notas: { type: String, default: '' },
    cuenta_destino_id: { type: Schema.Types.ObjectId, ref: 'CuentaBancaria', default: null },
    cuenta_ordenante: {
        banco: { type: String, default: '' },
        rfc_banco: { type: String, default: '' },
        numero_cuenta: { type: String, default: '' }
    },
    aplicaciones: [{
        factura_id: { type: Schema.Types.ObjectId, ref: 'Factura' },
        uuid_factura: { type: String, default: '' },
        serie: { type: String, default: '' },
        folio_factura: { type: String, default: '' },
        folio_pedido: { type: Number, default: 0 },
        num_parcialidad: { type: Number, default: 1 },
        saldo_anterior: { type: Number, default: 0 },
        importe_pagado: { type: Number, default: 0 },
        saldo_insoluto: { type: Number, default: 0 }
    }],
    rep: {
        estado: { type: String, enum: ['sin_timbrar', 'emitiendo', 'timbrado', 'fallido', 'requiere_revision'], default: 'sin_timbrar' },
        uuid: { type: String, default: '' },
        serie: { type: String, default: '' },
        folio: { type: String, default: '' },
        error: { type: String, default: '' },
        fecha_timbrado: { type: Date, default: null }
    },
    status: { type: String, enum: ['Registrado', 'Cancelado'], default: 'Registrado' },
    motivo_cancelacion: { type: String, default: '' },
    fecha_cancelacion: { type: Date, default: null },
    usuario: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
        nombre: { type: String, default: '' }
    },
    created_at: { type: Date, default: Date.now }
});

// Evita registrar dos veces el mismo cobro por doble clic o reintento.
schema.index({ clave_idempotencia: 1 }, { unique: true, partialFilterExpression: { clave_idempotencia: { $type: 'string' } } });

export var Pago = mongoose.model('Pago', schema);
