
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var schema = new Schema({
    nombre: {type: String, required: true},
    codigo: {type: String, required: true},
    estados: [{
        nombreEstado: {type: String, required: true},
        codigoEstado: {type: String, required: true},
    }]
});

export var Pais = mongoose.model('Paises', schema);