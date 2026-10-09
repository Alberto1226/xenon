
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
import { Producto_Schema } from './producto_schema';


var schema = new Schema({
    folio: { type: Number, default: 0 },
    tenia_ficha: { type: Boolean, default: false },
    moneda: { type: String, default: '' },
    tipo_de_cambio: { type: Number, default: 1 },
    descuento: { type: Number, default: 0 },
    lista: [
        {
            cantidad: { type: Number, default: 0 },
            promo: {
                con_promo: { type: Boolean, default: false },
            },
            fecha: { type: Date, default: Date.now },//       fecha en la cual fue agregado, o modificado el producto al pedido
            producto: Producto_Schema,
            folios: [],
            preventa: { type: Boolean, default: false },
            pedimento_origen: { type: Schema.Types.ObjectId, ref: 'Pedimento', default: null }
        }
    ],
    contiene_preventa: { type: Boolean, default: false },
    fecha: { type: Date, default: new Date() },
    fecha_creado: { type: Date, default: Date.now() },
    usuario_que_registro: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
        nombre: { type: String, default: "" },
        correo: { type: String, default: "" },
        usuario: { type: String, default: "" },
    },
    agente: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
        nombre: { type: String, default: "" },
        comision: { type: Number, default: 0 },
        correo: { type: String, default: "" },
    },
    cliente: {
        id: { type: Schema.Types.ObjectId, ref: 'Cliente', default: null },
        nombre: { type: String, default: "" },
        direccion: { type: String, default: '' },
        correo: { type: String, default: "" },
        perfil: { type: mongoose.Mixed },
    },
    total_pedido: { type: Number, default: 0 },
    notas: { type: String, default: "" },
    notas_usuarios: [],
    status: { type: String, default: 'Entregado' },
    fecha_entregado: { type: Date, default: new Date() },
    mensajeria: {
        empresa: { type: String, default: '' },
        codigo_de_rastreo: { type: String, default: '' },
        notas: { type: String, default: '' },
    },
    preparacion_factura: {
        estado: { type: String, default: "" },
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
    },
    facturacion: [
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
    ]
});


export var Pedido = mongoose.model('Pedido', schema);
