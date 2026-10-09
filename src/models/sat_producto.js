var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Catálogo SAT de productos y servicios (ClaveProdServ), importado desde la tabla SQL `sat_producto`.
var schema = new Schema({
    id_sat_producto: { type: Number, index: true },
    clave: { type: String, index: true },
    descripcion: { type: String }
}, { collection: 'sat_productos' });

export var SatProducto = mongoose.model('SatProducto', schema);
