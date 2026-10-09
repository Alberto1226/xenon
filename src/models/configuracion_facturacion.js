var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    // Si es false, la factura no pide ni envía pedimentos (InformacionAduanera) por producto.
    requerir_pedimentos: { type: Boolean, default: false },
    fecha_modificacion: { type: Date, default: Date.now },
    usuario_modifico: { type: String }
});

export var ConfiguracionFacturacion = mongoose.model('ConfiguracionFacturacion', schema);
