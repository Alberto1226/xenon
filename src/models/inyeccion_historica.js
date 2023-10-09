
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var schema = new Schema({

    procesado: {
        estado_actual: { type: String, default: 'pendiente' },
        iniciado: { type: Boolean, default: false },
        terminado: { type: Boolean, default: false },
        fecha: { type: Date, default: new Date() }
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




export var Inyeccion_historica = mongoose.model('Inyeccion_historica', schema);
