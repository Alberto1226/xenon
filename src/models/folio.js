var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    folio: { type: Number, required: true, unique: true },
    serie: { type: String, default: "A" },
    tipo: { type: String, enum: ['carrito', 'pedido', 'cancelado'], default: 'carrito' },
    carrito_id: { type: Schema.Types.ObjectId, ref: 'Carrito' },
    pedido_id: { type: Schema.Types.ObjectId, ref: 'Pedido' },
    carrito_cancelado_id: { type: Schema.Types.ObjectId, ref: 'Carrito_cancelado' },
    fecha: { type: Date, default: Date.now }
});

export var Folio = mongoose.model('Folio', schema);
