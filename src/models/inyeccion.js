
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var schema = new Schema({

    procesado: {
        estado_actual: { type: String, default: 'pendiente' },
        iniciado: { type: Boolean, default: false },
        terminado: { type: Boolean, default: false },
    },
    producto: {
        nombre: { type: String, default: '' },
        imagen: { type: String, default: '' },
        id: { type: String, default: '' }
    },
    usuario: {
        nombre: { type: String, default: '' },
        id: { type: String, default: '' }
    },
    lista: [
        { lista: [String] }
    ]
}, { timestamps: true });




export var Inyeccion = mongoose.model('Inyeccion', schema);
