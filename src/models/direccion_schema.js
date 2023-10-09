
var mongoose =require('mongoose');
var Schema = mongoose.Schema;


var schema = new Schema({
    calle:{type:String ,default :''},
    colonia:{type:String ,default :''},
    cp:{type:String ,default :''},
    entre_calle:{type:String ,default :''},
    estado:{type:String ,default :''},
    localidad:{type:String ,default :''},
    localidad_nombre:{type:String ,default :''},
    municipio:{type:String ,default :''},
    nombre:{type:String ,default :''},
    notas:{type:String ,default :''},
    numero_exterior:{type:String ,default :''},
    numero_interior:{type:String ,default :''},
    pais:{type:String ,default :''},
    y_calle:{type:String ,default :''},
    rfc:{type:String ,default :''},
    tipo:{type:String ,default :''},
    telefono :{type: String ,default :'' },
    correo :{type: String ,default :'' },
});
//{"id_usuario_direccion":"25","id_usuario":"66","id_persona":"39","rfc":null,"entre_calle":"avendia alfredo del mazo","y_calle":"norte 4","instrucciones":"REFERENCIA: IMPULSORA ELECTRICA MEXICANA","tipo":"envio","predeterminada":"1","created_at":"2017-10-31 20:04:39","updated_at":"2017-10-31 18:04:39","deleted_at":null},
//{"id_persona":"37","nombre":"","calle":"","noext":"","noint":,"colonia":"","localidad":"","cp":"","municipio":"","id_estado":"","id_pais":"","telefono":"2746555","correo":null},


export var Direccion = schema;
