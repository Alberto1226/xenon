
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    activa: { type: Boolean, default: true },
    borrada: { type: Boolean, default: false },
    precio: { type: Number, default: 0 },//    precio del prodcuto con promocion
    tipo_condicion :{ type: Number, default: 0 },//    1: Sin condicion, 2: minimo de el mismo producto, 3: Minimo de combo
    condiciones :[],
    //      PRODUCTO con promocion
    producto:{
            id:{type:String , default:""},
            nombre:{type:String , default:""},
            codigo:{type:String , default:""},
    },
    //      DAtos de Creacion
    creacion:{
        fecha:{type:Date, default :Date.now},
        usuario:{
            id:{type:String, default :""},
            nombre:{type:String, default :""}
        }
    },
    //      DAtos cuando se "Borre" virtualmente, seguira en la misma coleccion
    borrada_detalle:{
        fecha:{type:Date, default :Date.now},
        usuario:{
            id:{type:String, default :""},
            nombre:{type:String, default :""}
        }
    }
});




export var Promocion = mongoose.model('Promocion', schema);
