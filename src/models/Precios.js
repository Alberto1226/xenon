var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = mongoose.ObjectId;
import { Producto } from './producto';

var schema = new Schema({
    producto: {
        id: {
            type: ObjectId,
            required: true
        }
    },
    precios: {
        anterior: {
            type: Number,
            default: 0,
            required: true
        },
        actual: {
            type: Number,
            default: 0,
            required: true
        }
    },
    accion: {
        type: String,
        default: '',
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    control: {
        usuario: {
            id: {
                type: ObjectId,
                required: true
            },
            nombre: {
                type: String,
                default: 'anonimo',
                required: true
            }
        },
        //se pueden agregar mas datos, depende de las funciones solicitadas a futuro
    }
});

export var Precios = mongoose.model('Precios', schema);