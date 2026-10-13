var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Candados compartidos entre procesos para la integración con CoreCFDI
// (refresh de token por tenant y verificación por solicitud).
var schema = new Schema({
    clave: { type: String, required: true, unique: true },
    dueno: { type: String, default: "" },
    expira: { type: Date, required: true }
});

export var CoreCfdiLock = mongoose.model('CoreCfdiLock', schema);
