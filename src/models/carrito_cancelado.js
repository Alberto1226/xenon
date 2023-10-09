
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
import { Producto_Schema } from './producto_schema';


var schema = new Schema({
    folio: { type: Number, default: 0 },
    tenia_ficha: { type: Boolean, default: false },
    moneda: { type: String, default: '' },
    tipo_de_cambio: { type: Number, default: 1 },
    descuento: { type: Number, default: 0 },
    lista: [
        {
            cantidad: { type: Number, default: 0 },
            promo: {
                con_promo: { type: Boolean, default: false },
            },
            fecha: { type: Date, default: new Date(2000, 0, 1) },//       fecha en la cual fue agregado, o modificado el producto al pedido
            producto: Producto_Schema,
            folios: []
        }
    ],
    fecha: { type: Date },
    fecha_creado: { type: Date, default: Date.now },
    usuario_que_registro: {
        id: { type: String, default: "" },
        nombre: { type: String, default: "" },
        correo: { type: String, default: "" },
        usuario: { type: String, default: "" },
    },
    agente: {
        id: { type: String, default: "" },
        nombre: { type: String, default: "" },
        comision: { type: Number, default: 0 },
        correo: { type: String, default: "" },
    },
    cliente: {
        id: { type: String, default: "" },
        nombre: { type: String, default: "" },
        direccion: { type: String, default: '' },
        correo: { type: String, default: "" },
        perfil: { type: mongoose.Mixed },
    },
    total_pedido: { type: Number, default: 0 },
    notas: { type: String, default: "" },
    status: { type: String, default: 'Cancelado' },
    razon: { type: String, default: '' },
    fecha_de_cancelacion: { type: Date, default: new Date() },
});


export var Carrito_cancelado = mongoose.model('Carrito_cancelado', schema);
