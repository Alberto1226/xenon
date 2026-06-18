var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    numero_pedimento: { type: String, required: true, unique: true }, // Formato oficial SAT de 15 dígitos
    clave_pedimento: { type: String, default: 'A1' },
    fecha_pedimento: { type: Date, required: true, default: Date.now },
    tipo_cambio: { type: Number, required: true, default: 1 },
    
    // --- CAMPOS ADUANEROS SAT ---
    aduana_despacho: { type: String, default: '160' }, // Ej. 160 - Manzanillo
    patente: { type: String, default: '3387' },        // Ej. 3387
    regimen: { type: String, default: 'IMD' },        // Ej. IMD - Importación definitiva
    peso_bruto: { type: Number, default: 0 },
    valor_dolares: { type: Number, default: 0 },
    valor_aduana_mxn: { type: Number, default: 0 },
    cove: { type: String, default: '' },              // Ej. COVE257UVCJ84
    
    // Proveedor
    proveedor: {
        nombre: { type: String, default: '' },
        tax_id: { type: String, default: '' },
        pais: { type: String, default: 'CHN' }
    },
    
    // Desglose de incrementables y contribuciones del SAT
    incrementables_sat: {
        fletes: { type: Number, default: 0 },
        seguros: { type: Number, default: 0 },
        otros: { type: Number, default: 0 }
    },
    contribuciones_sat: {
        dta: { type: Number, default: 0 },
        prv: { type: Number, default: 0 },
        igi: { type: Number, default: 0 },
        iva: { type: Number, default: 0 },
        total_efectivo: { type: Number, default: 0 }
    },
    // ----------------------------

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
        costo_fiscal_unitario_mxn: { type: Number, default: 0 },
        
        // --- DETALLE DE PARTIDAS SAT ---
        sec: { type: Number, default: 1 },
        nico: { type: String, default: '00' },
        marca: { type: String, default: '' },
        modelo: { type: String, default: '' },
        valor_aduana_partida_mxn: { type: Number, default: 0 }
        // -------------------------------
    }],
    status: { type: String, enum: ['transito', 'arribado'], default: 'transito' },
    fecha_arribo: { type: Date, default: null }
}, { timestamps: true });

export var Pedimento = mongoose.model('Pedimento', schema);