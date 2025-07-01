var mongoose =require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

/**
 * Esquema de ruta.
 * @typedef {Object} Ruta
 * @property {string} nombre_ruta - Nombre de la ruta (requerido).
 * @property {string} descripcion - Descripción de la ruta (requerido).
 * @property {string[]} ids_clientes - Arreglo que guarda los IDs (ObjectId de MongoDB) de los clientes asociados a la ruta (requerido).
 */
var schema = new Schema({
    nombre_ruta: { type: String, required: true },
    descripcion: { type: String, required: true },
    ids_clientes: { type: [String], required: true }, // Array de IDs de clientes
});

export var Rutas = mongoose.model('Rutas', schema);