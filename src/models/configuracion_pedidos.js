var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    limite_pedidos_abiertos: { type: Number, default: 3, min: 1 },
    status_minimo_requerido: { 
        type: String, 
        enum: ['Ninguno', 'Pedido', 'Ficha Pago', 'Pagado', 'Empaque'], 
        default: 'Pagado' 
    },
    aplicar_regla_status_minimo: { type: Boolean, default: true },
    fecha_modificacion: { type: Date, default: Date.now },
    usuario_modifico: { type: String }
});

export var ConfiguracionPedidos = mongoose.model('ConfiguracionPedidos', schema);
