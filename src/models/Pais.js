
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var schema = new Schema({
    nombre: {type: String, required: true},
    codigo: {type: String, required: true},
    estados: [{
        nombreEstado: {type: String, required: true},
        codigoEstado: {type: String, required: true},
        municipios: [{
            nombreMunicipio: {type: String, required: true},
            codigoMunicipio: {type: String, required: true, default: '000'},
        }]
    }]
});

export var Pais = mongoose.model('Paises', schema);