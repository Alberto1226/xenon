
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var schema = new Schema({
    Marcas: [String],
    Categorias: [String],
    Subcategorias: [String],
    Medidas: [String],
    Unidades: [String],
    Cuentas: {
        type: [{
            banco: { type: String },
            cuenta: { type: String },
            clabe: { type: String },
        }],
        validate: [arrayLimit, '{PATH} exceeds the limit of 3']
    },
    DatosGrals: {
        nombre: { type: String },
        rfc: { type: String },
        direccion: {
            calle: { type: String },
            colonia: { type: String },
            municipio: { type: String },
            estado: { type: String },
            cp: { type: String },
        },
        telefono: { type: String },
        email: { type: String },
        web: { type: String },
        logo: {
            type: String
        },
        // colors: type[
        //     {
        //         color: { type: String },
        //         hex: { type: String },
        //         control: { type: String },
        //     }
        // ],
    },
    // dbName: { type: String, default: mongoose.connection.name }
});

function arrayLimit(val) {
    return val.length <= 3;
}

export var Catalogo = mongoose.model('Catalogo', schema);