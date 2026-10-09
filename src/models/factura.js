var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    uuid: { type: String, required: true, unique: true },
    serie: { type: String, default: "F" },
    folio: { type: String, default: "" },
    pedido_id: { type: Schema.Types.ObjectId, default: null },
    carrito_id: { type: Schema.Types.ObjectId, default: null },
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
