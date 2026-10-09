var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Catálogo SAT importado desde la tabla SQL `sat_municipio`.
var schema = new Schema({
    id_municipio: { type: Number, index: true },
    clave: { type: String, index: true },
    clave_estado: { type: String, index: true },
    descripcion: { type: String }
}, { collection: 'sat_municipios' });

export var SatMunicipio = mongoose.model('SatMunicipio', schema);
