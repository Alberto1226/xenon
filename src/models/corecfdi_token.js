var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Sesión de CoreCFDI de cada usuario de este sistema: empresa (tenant), email y tokens.
// Los tokens se guardan cifrados. La contraseña de CoreCFDI nunca se guarda.
var schema = new Schema({
    usuario: { type: String, required: true, unique: true }, // _id del usuario de Xenon dueño de la sesión
    tenant: { type: String, required: true },
    email: { type: String, default: "" },
    access_token_encrypted: { type: String, default: "" },
    refresh_token_encrypted: { type: String, default: "" },
    tenant_id: { type: String, default: "" },
    user: { type: Schema.Types.Mixed, default: null },
    expires_at: { type: Date, default: null },
    fecha_actualizacion: { type: Date, default: Date.now }
});

export var CoreCfdiToken = mongoose.model('CoreCfdiToken', schema);
