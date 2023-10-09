
var mongoose =require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');


var schema = new Schema({
    activo:{type:Boolean,default:true},
    agente :{
        nombre :{type: String ,default :''},
        id :{type: String ,default :''},
        correo :{type: String ,default :''},
    },
    alias :{type: String ,default :''},
    correo :{type: String ,default :'' },
    direccion_envio:{
        calle:{type:String ,default :''},
        colonia:{type:String ,default :''},
        cp:{type:String ,default :''},
        entre_calle:{type:String ,default :''},
        estado:{type:String ,default :''},
        localidad:{type:String ,default :''},
        municipio:{type:String ,default :''},
        nombre:{type:String ,default :''},
        notas:{type:String ,default :''},
        numero_exterior:{type:String ,default :''},
        numero_interior:{type:String ,default :''},
        pais:{type:String ,default :''},
        y_calle:{type:String ,default :''},
    },
    domicilio_fiscal:{
        calle:{type:String ,default :''},
        colonia:{type:String ,default :''},
        cp:{type:String ,default :''},
        estado:{type:String ,default :''},
        localidad:{type:String ,default :''},
        municipio:{type:String ,default :''},
        numero_exterior:{type:String ,default :''},
        numero_interior:{type:String ,default :''},
        nombre:{type:String ,default :''},
        notas:{type:String ,default :''},
        pais:{type:String ,default :''},
        razon_social:{type:String ,default :''},
        rfc:{type:String ,default :''},
    },
    fecha_nacimiento:{type:String ,default :""},
    nombre:{type:String ,default :""},
    perfil:{
        perfil:{type:String ,default :"Público en general"},
        porcentaje:{type:Number ,default :0}
        },
    plataforma:{type:String ,default :"web"},
    push_token:{type:String ,default :""},
    region:{type:String ,default :""},
    telefono:{type:String ,default :""},
    uid:{type:String ,default :""},
    password:{type:String ,default :""},
    
});

schema.methods.encryptPassword = function(password){
    return bcrypt.hashSync(password , bcrypt.genSaltSync(5) ,null);
};
schema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password , this.password);
}

export var Cliente = mongoose.model('Cliente',schema);
