
var mongoose =require('mongoose');
var Schema = mongoose.Schema;


var schema = new Schema({
    id_categoria:{type: String ,default :''},
    id_cat_padre:{type: String ,default :'null'},
    descripcion:{type: String ,default :''},
    imagen:{type: String ,default :''},
    creado:{type: Date ,default :new Date()},
    borrado:{type: Date ,default :new Date()},
    actualizado:{type: Date ,default :new Date()},

    
});


export var Categoria = mongoose.model('Categoria',schema);
