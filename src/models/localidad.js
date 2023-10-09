
var mongoose =require('mongoose');
var Schema = mongoose.Schema;


var schema = new Schema({
    uid :{type: Number ,default :0},
    municipio_id :{type: Number ,default :0},
    clave :{type: String ,default :''},
    nombre :{type: String ,default :'' },
    latitud :{type: String ,default :''},
    longitud :{type: String ,default :''},
    altitud :{type: String ,default :''},
    carta :{type: String ,default :''},
    ambito :{type: String ,default :''},
    poblacion :{type: Number ,default :0},
    masculino :{type: Number ,default :0},    
    femenino :{type: Number ,default :0},
    viviendas:{type: Number ,default :0},
    lat :{type: String ,default :''},
    lng :{type: String ,default :''},
    activo :{type: Boolean ,default :true},
});


export var Localidad = mongoose.model('Localidad',schema);
