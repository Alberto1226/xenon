
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var schema = new Schema({
    producto: {
        nombre: { type: String, default: '' },
        id: { type: ObjectId }
    },
    usuario: {
        nombre: { type: String, default: 'anonimo' },
        id: { type: ObjectId }
    },
    fecha: { type: Date, default: Date.now },
    accion: { type: String, default: '' },//    1:inyeccion a inventario, 2:descuento de inventario, 3:sobreescritura de inventario , 4:cambio_en_apartado
    //  4a:nuevo ,4b:cambio_cantidad, 4c:borro_de_pedido
    cantidad: { type: Number, default: 0 },//   cantidad involucrada en el movimiento
    cantidad_anterior: { type: Number, default: 0 },//   cantidad involucrada en el movimiento
    pedido: {
        folio: { type: Number, default: 0 },
        id: { type: ObjectId },
        cliente: {
            nombre: { type: String, default: 'anonimo' },
            id: { type: ObjectId }
        }
    },
    inventario_antes: {
        existencias: { type: Number, default: 0 },
        apartados: { type: Number, default: 0 },
    },
    inventario_despues: {
        existencias: { type: Number, default: 0 },
        apartados: { type: Number, default: 0 },
    },
    folios: []//     Folios involucrados en el movimiento, ejemplos: inyeccion , 
});


export var Producto_snaplog = mongoose.model('Producto_snaplog', schema);


