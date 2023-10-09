
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');


var schema = new Schema({
    activo: { type: Boolean, default: true },
    aplicar_descuento_distribuidor: { type: Boolean, default: true },
    caracteristicas_tecnicas: [],
    carritos: [],
    categoria_tags: [],// para facilitar encontrar todas las categorias padres de un producto
    //      {descripcion:"",id_cat_padre:"",id_categoria:""}
    //categoria:{type:String,default:true},
    category: {
        nombre: { type: String, default: '' },
        imagen: { type: String, default: '' }
    },
    subcategoria: {
        nombre: { type: String, default: '' },
        imagen: { type: String, default: '' }
    },
    codigo: { type: String, default: true },
    codigo_clave: { type: String, default: true },
    descripcion: { type: String, default: true },
    existencia: {
        actual: { type: Number, default: 0 },
        minimo: { type: Number, default: 0 },
        maximo: { type: Number, default: 0 },
        folios: []
    },
    promo: {
        tiene_promo: { type: Boolean, default: false },
        precio: { type: Number, default: 0 },//    precio del prodcuto con promocion
        tipo_condicion: { type: Number, default: 0 },//    1: Sin condicion, 2: minimo de el mismo producto, 3: Minimo de combo
        id_promocion: { type: String, default: "" },//    id de la promocion, nunca se debe de borrar las promos solo virtualmente
    },
    galeria_imagenes: [],
    marca: { type: String, default: 0 },
    nombre: { type: String, default: 0 },
    para_venta_publico: { type: Boolean, default: true },
    recomendar_como_paqueteria: { type: Boolean, default: false },
    precio: { type: Number, default: 0 },
    unidad: { type: String, default: 0 }
});




export var Producto_Schema = schema;
