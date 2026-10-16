var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    banco: { type: String, required: true },
    rfc_banco: { type: String, default: '' },
    numero_cuenta: { type: String, required: true },
    alias: { type: String, default: '' },
    activa: { type: Boolean, default: true }
});

export var CuentaBancaria = mongoose.model('CuentaBancaria', schema);
