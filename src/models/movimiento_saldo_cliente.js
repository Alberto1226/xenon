var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Libro de saldo a favor: el saldo del cliente es la suma de los importes (con signo).
var schema = new Schema({
    cliente_id: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
    tipo: { type: String, enum: ['abono_excedente', 'aplicacion', 'reversa'], required: true },
    importe: { type: Number, required: true },
    pago_id: { type: Schema.Types.ObjectId, ref: 'Pago', default: null },
    nota: { type: String, default: '' },
    fecha: { type: Date, default: Date.now },
    usuario: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
        nombre: { type: String, default: '' }
    }
});

export var MovimientoSaldoCliente = mongoose.model('MovimientoSaldoCliente', schema);
