
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var schema = new Schema({
    Marcas: [String],
    Categorias: [String],
    Subcategorias: [String],
    Medidas: [String],
    Unidades: [String],
    Cuentas: [String]
});

export var Catalogo = mongoose.model('Catalogo', schema);