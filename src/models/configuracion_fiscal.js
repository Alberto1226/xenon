var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    emisor_rfc: { type: String, default: "EKU9003173C9" },
    emisor_nombre: { type: String, default: "ESCUELA KEMPER UGARTE" },
    emisor_regimen: { type: String, default: "601" },
    emisor_cp: { type: String, default: "26015" },

    // Credenciales PAC CUCC
    cucc_api_base: { type: String, default: "https://cucc.com.mx/v2/api-cucc/public" },
    soap_url: { type: String, default: "https://cucc.com.mx/v2/api-cucc/public/soap/facturas" },
    soap_user: { type: String, default: "EKU9003173C9" },
    soap_pass_encrypted: { type: String, default: "" }, // Contraseña cifrada en reposo
    client_id: { type: String, default: "41" },
    client_secret: { type: String, default: "" }, // Compatibilidad temporal con secretos guardados en texto plano
    client_secret_encrypted: { type: String, default: "" },
    ambiente: { type: String, default: "sandbox" }, // sandbox | produccion

    // Metadatos CSD y Logo
    certificado_nombre: { type: String, default: "" },
    llave_nombre: { type: String, default: "" },
    csd_cargado: { type: Boolean, default: false },
    logo_path: { type: String, default: "" },

    // FIEL (e.firma) cargada en CoreCFDI para la descarga masiva del SAT.
    // Solo metadatos: el .key y la contraseña no se guardan en este sistema.
    fiel_tenant: { type: String, default: "" }, // empresa de CoreCFDI para la que se cargó
    fiel_rfc: { type: String, default: "" },
    fiel_status: { type: String, default: "" },
    fiel_valido_hasta: { type: String, default: "" }, // YYYY-MM-DD
    fiel_fecha_carga: { type: Date, default: null },
    fecha_actualizacion: { type: Date, default: Date.now }
});

export var ConfiguracionFiscal = mongoose.model('ConfiguracionFiscal', schema);
