var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    id_salida: { type: Schema.Types.ObjectId, ref: 'SalidasVentas', required: true },
    id_carrito_origen: { type: Schema.Types.ObjectId, ref: 'Carrito', required: true },
    id_ruta: { type: Schema.Types.ObjectId, ref: 'Rutas', required: true },
    nombre_ruta: { type: String, required: true },
    folio_salida: { type: String, required: true },

    agente: {
        id: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
        nombre: { type: String, default: "" },
        correo: { type: String, default: "" }
    },

    fecha_salida: { type: Date, required: true },
    fecha_finalizacion: { type: Date, default: Date.now },

    inventario_conciliacion: [
        {
            producto: {
                id: { type: Schema.Types.ObjectId, ref: 'Producto' },
                nombre: { type: String, default: "" },
                codigo: { type: String, default: "" },
                precio: { type: Number, default: 0 }
            },
            cantidad_cargada: { type: Number, default: 0 },
            cantidad_vendida: { type: Number, default: 0 },
            cantidad_devuelta: { type: Number, default: 0 },
            diferencia: { type: Number, default: 0 }
        }
    ],

    totales_financieros: {
        total_cargado_estimado: { type: Number, default: 0 },
        total_vendido: { type: Number, default: 0 },
        desglose_pagos: {
            efectivo: { type: Number, default: 0 },
            transferencia: { type: Number, default: 0 },
            credito: { type: Number, default: 0 }
        }
    },

    pedidos_generados: [{ type: Schema.Types.ObjectId, ref: 'Pedido' }],

    notas_cierre: { type: String, default: "" },
    estatus_conciliacion: { type: String, enum: ['Correcto', 'Con Faltantes', 'Revisado'], default: 'Correcto' }
}, { timestamps: true });

export var RutasFinalizadas = mongoose.model('RutasFinalizadas', schema);
