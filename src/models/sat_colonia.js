var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Catálogo SAT importado desde la tabla SQL `sat_colonia`.
var schema = new Schema({
    id_colonia: { type: Number, index: true },
    clave: { type: String, index: true },
    cp: { type: String, index: true },
    colonia: { type: String }
}, { collection: 'sat_colonias' });

export var SatColonia = mongoose.model('SatColonia', schema);
