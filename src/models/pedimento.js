import mongoose from 'mongoose';
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
    
    // Impuestos deducibles (DTA, PRV, IGI, CNT)
    impuestos: {
        dta: { type: Number, default: 0 },
        prv: { type: Number, default: 0 },
        igi: { type: Number, default: 0 },
        cnt: { type: Number, default: 0 },
        iva: {
            monto: { type: Number, default: 0 },
            porcentaje_acreditable: { type: Number, default: 100 },  // HARDCODED 100% para XENON
            monto_acreditable: { type: Number, default: 0 },
            monto_no_acreditable: { type: Number, default: 0 }
        }
    },
    
    // DEPRECATED: contribuciones_sat (mantener para compatibilidad)
    contribuciones_sat: {
        dta: { type: Number, default: 0 },
        prv: { type: Number, default: 0 },
        igi: { type: Number, default: 0 },
        iva: { type: Number, default: 0 },
        total_efectivo: { type: Number, default: 0 },
        iva_acreditable: {
            porcentaje: { type: Number, default: 100 },
            monto_acreditable: { type: Number, default: 0 },
            monto_no_acreditable: { type: Number, default: 0 }
        }
    },
    
    metodo_valuacion: { type: String, default: 'PEPS', enum: ['PEPS'] },  // HARDCODED PEPS
    
    // --- NUEVA ESTRUCTURA: Gastos separados en 2 categorías ---
    gastos_importacion: {
        // Categoría 1: Gastos de Costo (SAT M3: Seguros, Fletes, Otros)
        gastos_costo: [{
            tipo: { type: String, enum: ['SEGUROS', 'FLETE', 'OTRO_COSTO'], default: 'OTRO_COSTO' },
            importe: { type: Number, default: 0 },
            uuid_cfdi: { type: String, default: '' },
            numero_factura: { type: String, default: '' },
            rfc_proveedor: { type: String, default: '' },
            fecha_factura: { type: Date, default: null },
            fuente: { type: String, enum: ['SAT_M3', 'CFDI_MANUAL'], default: 'SAT_M3' }
        }],
        
        // Categoría 2: Honorarios Agente Aduanal (OBLIGATORIO con UUID CFDI)
        honorarios_agente: [{
            uuid_cfdi: { type: String, required: true },  // ✅ OBLIGATORIO (Ley Aduanera Art. 159/160)
            numero_factura: { type: String, default: '' },
            rfc_agente: { type: String, default: '' },
            importe: { type: Number, default: 0 },
            iva_factura: { type: Number, default: 0 },
            fecha_factura: { type: Date, default: null },
            fuente: { type: String, default: 'CFDI_MANUAL' }
        }],
        
        // Resumen totales
        total_gastos_costo: { type: Number, default: 0 },
        total_honorarios: { type: Number, default: 0 },
        total_general: { type: Number, default: 0 },
        cantidad_facturas: { type: Number, default: 0 },
        
        // DEPRECATED: campos antiguos (mantener para compatibilidad)
        Impuesto_Aduanal: { type: Number, default: 0 },
        Flete: { type: Number, default: 0 },
        Agente_Aduanal: { type: Number, default: 0 },
        Seguridad: { type: Number, default: 0 },
        Seguro: { type: Number, default: 0 },
        otros: [{
            concepto: { type: String, default: '' },
            monto: { type: Number, default: 0 },
            fecha_gasto: { type: Date, default: null },
            uuid_cfdi: { type: String, default: '' },
            proveedor: {
                nombre: { type: String, default: '' },
                rfc: { type: String, default: '' }
            },
            factura: {
                numero: { type: String, default: '' },
                uuid: { type: String, default: '' },
                fecha_emision: { type: Date, default: null }
            },
            observaciones: { type: String, default: '' }
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
        valor_aduana_partida_mxn: { type: Number, default: 0 },
        // -------------------------------
        // Gastos exclusivos de esta partida (ej. re-etiquetado). Se prorratean solo entre sus piezas.
        gastos_adicionales: [{
            concepto: { type: String, default: '' },
            monto: { type: Number, default: 0 },
            fecha_gasto: { type: Date, default: null },
            uuid_cfdi: { type: String, default: '' },
            proveedor: {
                nombre: { type: String, default: '' },
                rfc: { type: String, default: '' }
            },
            factura: {
                numero: { type: String, default: '' },
                uuid: { type: String, default: '' },
                fecha_emision: { type: Date, default: null }
            },
            observaciones: { type: String, default: '' }
        }],
        folios: [{ type: String }] // Lista de folios o números de serie recibidos
    }],
    status: { type: String, enum: ['transito', 'arribado'], default: 'transito' },
    fecha_arribo: { type: Date, default: null }
}, { timestamps: true });

export var Pedimento = mongoose.model('Pedimento', schema);