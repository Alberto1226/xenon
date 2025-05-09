
var mongoose =require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');


var schema = new Schema({
    usuario :{type: String ,required :''},
    alias :{type: String ,default :''},
    password :{type: String ,required :''},
    rol :{type: String ,default :true },
    activo:{type:Boolean,default:true},
    notas:{type:String ,default :""},
    correo:{type:String ,default :""},
    comision:{type:Number,default:0},
    nombre:{type:String ,default :""},
    edit:{type:Boolean,default:false},//el campo se agrega para dar permiso que el usuario pueda editar sus clientes asignados
});

schema.methods.encryptPassword = function(password){
    return bcrypt.hashSync(password , bcrypt.genSaltSync(5) ,null);
};
schema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password , this.password);
}



export var Usuario = mongoose.model('Usuario',schema);
