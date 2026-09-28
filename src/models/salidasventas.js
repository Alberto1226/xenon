var mongoose = require('mongoose');
var Schema = mongoose.Schema;
import {Rutas} from './rutas';
import {Carritos} from './carrito';
import {Usuario} from './usuario';

var schema = new Schema({
    id_ruta: { type: Schema.Types.ObjectId, ref: 'Rutas' }, // Referencia al _id de la colección Rutas
    id_carritos: { type: Schema.Types.ObjectId, ref: 'Carritos' }, // Referencia al _id de la colección Carritos
    id_usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' }, // Referencia al _id de la colección Usuario
    Productos: { type: Array, default: [] }, // Arreglo de productos que se incluyen en la salida
    fecha_salina: { type: Date, default: Date.now }, // Fecha en la que se realizó la salida
    folio_salida: { type: String },
    status: { type: String, default: 'Activa' }, // Estado de la salida (Activa, Proceso, Terminada)
});

export var SalidasVentas = mongoose.model('SalidasVentas', schema);
