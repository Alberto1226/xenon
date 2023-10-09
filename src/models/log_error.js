
import fs from 'fs';
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema({
    fecha: { type: Date,  default: Date.now  },
    error: { type: String, default: '' },
    ruta: { type: String, default: '' }, 
});


export var Log_error = mongoose.model('Log_error', schema);
