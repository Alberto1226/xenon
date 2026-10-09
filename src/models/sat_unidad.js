var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Catálogo SAT importado desde la tabla SQL `sat_unidad`.
var schema = new Schema({
    id_sat_unidad: { type: Number, index: true },
    clave: { type: String, index: true },
    nombre: { type: String },
    descripcion: { type: String },
    simbolo: { type: String }
}, { collection: 'sat_unidades' });

export var SatUnidad = mongoose.model('SatUnidad', schema);
