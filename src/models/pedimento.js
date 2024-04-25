
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
var ObjectId = Schema.ObjectId;


var schema = new Schema({

    importacion: {
        Impuesto_Aduanal: { type: Number, default: '' },
        Flete: { type: Number, default: '' },
        Agente_Aduanal: { type: Number, default: '' },
        Seguridad: { type: Number, default: '' },
        otros: [],
        id_documento
    },
    Productos: {
        id: { type: ObjectId },
        Tipo_Cambio: { type: Number, default: '' },
        Fraccion_Arancelaria: { type: Number, default: '' },
        Precio_Compra: { type: Number, default: '' },
        Nacional: { type: Boolean, default: true },
        um,cantidad,lote
    },

});





export var Pedimento = mongoose.model('Pedimento', schema);