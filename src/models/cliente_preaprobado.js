
var mongoose =require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
import {Direccion} from './direccion_schema';
//{"id_usuario_direccion":"25","id_usuario":"66","id_persona":"39","rfc":null,"entre_calle":"avendia alfredo del mazo","y_calle":"norte 4","instrucciones":"REFERENCIA: IMPULSORA ELECTRICA MEXICANA","tipo":"envio","predeterminada":"1","created_at":"2017-10-31 20:04:39","updated_at":"2017-10-31 18:04:39","deleted_at":null},
//{"id_persona":"37","nombre":"","calle":"","noext":"","noint":,"colonia":"","localidad":"","cp":"","municipio":"","id_estado":"","id_pais":"","telefono":"2746555","correo":null},
//{"id_usuario":"49","id_usuario_sistema":"9","nombre":"Jorge Espejel","alias":"","correo":"jorge_espejel_r@hotmail.com","telefono":"5545230697","password":"$2y$10$OjgNNxmPUn8jsZn\/ekdMxuEZMkd386twzqXPogk8i8b5jQYDS1Hm2","id_perfil":"5","region":null,"fecha_nacimiento":"1970-02-06","plataforma":"app","push_token":"eQDbULD_xBA:APA91bHDdIhRslaB5lUBV7SPx00ZiofAKbGJNq-oDjWbEFdQjB9_XHqlslt8seZvZ3wPTcddFHWzqu9GRdHGd6DwQpgNnn7bSUrGDKpck--xr4ZYF1njf-5xHGfFwNB8u3zULG-ffhqm","created_at":"2020-02-14 14:43:17","updated_at":"2020-02-14 13:43:17","deleted_at":"2020-02-14 14:43:17"},

var schema = new Schema({
    activo:{type:Boolean,default:true},
    agente :{
        nombre :{type: String ,default :''},
        id :{type: String ,default :''},
        correo :{type: String ,default :''},
    },
    alias :{type: String ,default :''},
    correo :{type: String ,default :'' },
    direcciones_asociadas:[Direccion],   
    fecha_nacimiento:{type:Date ,default :new Date},
    //fecha_creacion:{type:Date ,default :Date.now()},
    localidad:{type:String ,default :''},
    localidad_nombre:{type:String ,default :''},
    location:{
        lat:{type:Number ,default :0},
        lng:{type:Number ,default :0},
    },
    nombre:{type:String ,default :""},
    perfil:{
        perfil:{type:String ,default :"Público en general"},
        porcentaje:{type:Number ,default :0}
        },
    plataforma:{type:String ,default :"web"},
    push_token:{type:String ,default :""},
    region:{type:String ,default :""},
    telefono:{type:String ,default :""},
    password:{type:String ,default :""},
    publica:{
        fue_invitado:{type:Boolean ,default :false}, // se le envio el correo para invitarle
        proceso_terminado:{type:Boolean ,default :false},   //  ya guardo su nuevo password
        proceso_reactivacion_teminado_en_fecha:{type:Date ,default :new Date()},   //  u;timo cambio de paswword
        ultimo_cambio:{type:Date ,default :new Date()},   //  ultimo cambio de paswword
    }  
}, { timestamps: true });

schema.methods.encryptPassword = function(password){
    return bcrypt.hashSync(password , bcrypt.genSaltSync(5) ,null);
};
schema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password , this.password);
}

export var Cliente_preaprobado = mongoose.model('Cliente_preaprobado',schema);
