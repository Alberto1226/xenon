
var mongoose =require('mongoose');
var Schema = mongoose.Schema;
import {Producto_Schema} from './producto_schema';


var schema = new Schema({
    origen:{type: String ,default :'catalogo en línea'},
    
    descuento :{type: Number ,default :0 },
    lista:[
        {
            cantidad:{type: Number ,default :0 },
            fue_agregado_a_un_pedido:{type: Boolean ,default :false },
            fue_anulado_del_pedido:{type: Boolean ,default :false },
            producto:Producto_Schema
        }
    ],
    
    fecha:{type:Date ,default :new Date()}, 

    
    cliente:{
        id:{type:String ,default :""},
        nombre:{type:String ,default :""},
        direccion:{type:String ,default :''},
        correo:{type:String ,default :""},
        perfil:{type:mongoose.Mixed },
    },
    total_pedido:{type:Number,default:0},

    total_pedido_sin_descuento:{type:Number,default:0},
    notas:{type:String ,default :""},
    notas_usuarios:[],
    status:{type:String,default:'Pedido'},   
});


export var Carrito_publico_historico = mongoose.model('Carrito_publico_historico',schema);
