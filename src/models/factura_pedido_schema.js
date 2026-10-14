var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Definición compartida por Carrito, Carrito_cancelado y Pedido: al trasladar un documento
// entre colecciones Mongoose descarta los campos que el esquema destino no declare.
export const preparacionFacturaDef = {
    estado: { type: String, default: "" },
    tipo: { type: String, enum: ["PUE", "PPD", ""], default: "" },
    receptor: {
        rfc: { type: String, default: "" },
        nombre: { type: String, default: "" },
        codigo_postal: { type: String, default: "" },
        tipo_persona: { type: String, enum: ["FISICA", "MORAL", ""], default: "" },
        regimen_fiscal: { type: String, default: "" },
        uso_cfdi: { type: String, default: "" }
    },
    metodo_pago: { type: String, default: "" },
    forma_pago: { type: String, default: "" },
    dias_credito: { type: Number, default: 0 },
    condiciones_pago: { type: String, default: "" },
    factura_uuid: { type: String, default: "" },
    error_emision: { type: String, default: "" },
    conceptos: [{
        indice: { type: Number, required: true },
        producto_id: { type: Schema.Types.ObjectId, default: null },
        origen: { type: String, enum: ["importado", "nacional"], required: true },
        pedimento_id: { type: Schema.Types.ObjectId, ref: "Pedimento", default: null },
        sat_clave_prod_serv: { type: String, default: "" },
        sat_clave_unidad: { type: String, default: "" },
        sat_objeto_impuesto: { type: String, default: "" },
        impuestos_venta: {
            iva: { type: String, default: "" },
            ieps_tasa_porcentaje: { type: Number, default: 0 }
        }
    }],
    fecha_actualizacion: { type: Date, default: null },
    usuario_actualizacion: { type: Schema.Types.ObjectId, ref: "Usuario", default: null }
};

export const facturacionDef = [
    {
        uuid: { type: String, default: "" },
        serie: { type: String, default: "F" },
        folio: { type: String, default: "" },
        fecha_emision: { type: Date, default: Date.now },
        total: { type: Number, default: 0 },
        rfc_receptor: { type: String, default: "" },
        razon_social_receptor: { type: String, default: "" },
        regimen_fiscal_receptor: { type: String, default: "" },
        uso_cfdi: { type: String, default: "G03" },
        metodo_pago: { type: String, default: "PUE" },
        forma_pago: { type: String, default: "01" },
        tipo_cfdi: { type: String, default: "I" },
        status: { type: String, default: "Vigente" },
        fecha_cancelacion: { type: Date, default: null },
        motivo_cancelacion: { type: String, default: "" },
        uuid_sustitucion: { type: String, default: "" }
    }
];
