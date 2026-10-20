var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Libro de saldo a favor: depósitos anticipados y aplicaciones a facturas.
var schema = new Schema({
    cliente_id: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    tipo: { type: String, enum: ['deposito', 'abono_excedente', 'aplicacion', 'reversa'], required: true },
    importe: { type: Number, required: true },
    pago_id: { type: Schema.Types.ObjectId, ref: 'Pago', default: null },
    forma_pago: { type: String, default: '03' },
    referencia: { type: String, default: '' },
    cuenta_destino_id: { type: Schema.Types.ObjectId, ref: 'CuentaBancaria', default: null },
    saldo_anterior: { type: Number, default: 0 },
    saldo_nuevo: { type: Number, default: 0 },
    nota: { type: String, default: '' },
    fecha: { type: Date, default: Date.now },
    usuario: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
        nombre: { type: String, default: '' }
    }
});

export var MovimientoSaldoCliente = mongoose.model('MovimientoSaldoCliente', schema);
