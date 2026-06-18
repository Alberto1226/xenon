var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    numero_pedimento: { type: String, required: true, unique: true }, // Formato oficial SAT de 15 dígitos
    clave_pedimento: { type: String, default: 'A1' },
    fecha_pedimento: { type: Date, required: true, default: Date.now },
    tipo_cambio: { type: Number, required: true, default: 1 },
    gastos_importacion: {
        Impuesto_Aduanal: { type: Number, default: 0 },
        Flete: { type: Number, default: 0 },
        Agente_Aduanal: { type: Number, default: 0 },
        Seguridad: { type: Number, default: 0 },
        otros: [{
            concepto: { type: String, default: '' },
            monto: { type: Number, default: 0 }
        }]
    },
    productos: [{
        producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
        fraccion_arancelaria: { type: String, default: '' },
        cantidad: { type: Number, required: true, default: 0 },
        unidad_medida: { type: String, default: 'pza' },
        precio_compra_usd: { type: Number, required: true, default: 0 },
        costo_fiscal_unitario_mxn: { type: Number, default: 0 }
    }],
    status: { type: String, enum: ['transito', 'arribado'], default: 'transito' },
    fecha_arribo: { type: Date, default: null }
}, { timestamps: true });

export var Pedimento = mongoose.model('Pedimento', schema);