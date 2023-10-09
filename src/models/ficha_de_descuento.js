
var mongoose =require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');


var schema = new Schema({
    autorizo :{
        usuario :{type: String ,default :''},
        id :{type: String ,default :''},
    },
    descuento :{type: Number ,default :1},
    fecha :{type: Date ,default:new Date()},
    cliente:{
        nombre :{type: String ,default :''},
        id :{type: String ,default :''},
    }
});


export var Ficha_de_descuento = mongoose.model('Ficha_de_descuento',schema);
