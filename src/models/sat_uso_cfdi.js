var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Catálogo SAT de uso de CFDI, importado desde la tabla SQL `sat_uso_cfdi`.
var schema = new Schema({
    id_uso_cfdi: { type: Number, index: true },
    clave: { type: String, index: true },
    descripcion: { type: String },
    fisica: { type: Number },
    moral: { type: Number }
}, { collection: 'sat_uso_cfdi' });

export var SatUsoCfdi = mongoose.model('SatUsoCfdi', schema);
