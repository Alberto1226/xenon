
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var schema = new Schema({
    Marcas: [String],
    Categorias: [String],
    Subcategorias: [String],
    Medidas: [String],
    Unidades: [String],
    Cuentas: {
        type: [{
            banco: { type: String },
            cuenta: { type: String },
            clabe: { type: String },
        }],
        validate: [arrayLimit, '{PATH} exceeds the limit of 3']
    }
});

function arrayLimit(val) {
    return val.length <= 3;
}

export var Catalogo = mongoose.model('Catalogo', schema);