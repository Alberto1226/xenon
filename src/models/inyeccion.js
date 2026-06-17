
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var schema = new Schema({

    procesado: {
        estado_actual: { type: String, default: 'pendiente' },
        iniciado: { type: Boolean, default: false },
        terminado: { type: Boolean, default: false },
        carrito_folio: { type: Number, default: 0 }
    },
    producto: {
        nombre: { type: String, default: '' },
        imagen: { type: String, default: '' },
        id: { type: Schema.Types.ObjectId, ref: 'Producto', default: null }
    },
    usuario: {
        nombre: { type: String, default: '' },
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null }
    },
    // lista: [
    //     { lista: [String] }
    // ]
    lista: [String]
}, { timestamps: true });




export var Inyeccion = mongoose.model('Inyeccion', schema);
