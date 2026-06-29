import { Pais } from "../../../../models/Pais";
import * as accesos from "../../accesos";
const { PDFParse } = require('pdf-parse');

export async function post(req, res, next) {
    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" });
        return;
    }

    try {
        const { pdfBase64 } = req.body;
        if (!pdfBase64) {
            res.send({ ok: false, mensaje: "No se proporcionó el archivo PDF" });
            return;
        }

        // Remover cabecera data url si existe
        const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const uint8Array = new Uint8Array(buffer);

        const parser = new PDFParse(uint8Array);
        const parsed = await parser.getText();
        const text = parsed.text;

        // console.log("SAT PDF TEXT:", text);

        // Parse fields
        const rfc = parseField(text, "RFC");
        const curp = parseField(text, "CURP");
        const nombreS = parseField(text, "Nombre (s)");
        const primerApellido = parseField(text, "Primer Apellido");
        const segundoApellido = parseField(text, "Segundo Apellido");
        const razonSocial = parseField(text, "Denominación o Razón Social");

        let nombreCompleto = '';
        let tipoPersona = '';
        if (razonSocial) {
            nombreCompleto = razonSocial;
            tipoPersona = 'MORAL';
        } else if (nombreS) {
            nombreCompleto = [nombreS, primerApellido, segundoApellido].filter(Boolean).join(' ');
            tipoPersona = 'FISICA';
        } else if (rfc) {
            tipoPersona = rfc.length === 12 ? 'MORAL' : 'FISICA';
        }

        const cp = parseField(text, "Código Postal");
        const calle = parseField(text, "Nombre de Vialidad");
        const numeroExterior = parseField(text, "Número Exterior");
        const numeroInterior = parseField(text, "Número Interior");
        const colonia = parseField(text, "Nombre de la Colonia");
        const localidad = parseField(text, "Nombre de la Localidad");
        const municipio = parseField(text, "Nombre del Municipio o Demarcación Territorial");
        const estado = parseField(text, "Nombre de la Entidad Federativa");
        const entreCalle = parseField(text, "Entre Calle");
        const yCalle = parseField(text, "Y Calle");

        // Buscar en la base de datos para resolver IDs de estado y municipio
        const paisDoc = await Pais.findOne({ nombre: "México" }).exec();
        let resolvedEstadoId = "";
        let resolvedEstadoNombre = "";
        let resolvedMunicipioId = "";
        let resolvedMunicipioNombre = "";
        let resolvedPaisId = paisDoc ? paisDoc._id : "";
        let resolvedPaisNombre = "México";

        if (paisDoc) {
            const estadoDoc = paisDoc.estados.find(e => 
                normalizarTexto(e.nombreEstado) === normalizarTexto(estado)
            );
            if (estadoDoc) {
                resolvedEstadoId = estadoDoc._id;
                resolvedEstadoNombre = estadoDoc.nombreEstado;

                const municipioDoc = estadoDoc.municipios.find(m => 
                    normalizarTexto(m.nombreMunicipio) === normalizarTexto(municipio)
                );
                if (municipioDoc) {
                    resolvedMunicipioId = municipioDoc._id;
                    resolvedMunicipioNombre = municipioDoc.nombreMunicipio;
                }
            }
        }

        const result = {
            rfc,
            curp,
            nombre: nombreCompleto,
            tipoPersona,
            cp,
            calle,
            numeroExterior,
            numeroInterior,
            colonia,
            localidad,
            municipio: resolvedMunicipioNombre || municipio,
            idMunicipio: resolvedMunicipioId,
            estado: resolvedEstadoNombre || estado,
            idEstado: resolvedEstadoId,
            pais: resolvedPaisNombre,
            idPais: resolvedPaisId,
            entreCalle,
            yCalle
        };

        res.send({ ok: true, data: result });

    } catch (error) {
        console.error("Error al procesar PDF de SAT:", error);
        res.send({ ok: false, mensaje: "Error al procesar el archivo PDF: " + error.message });
    }
}

const KNOWN_LABELS = [
    "RFC",
    "CURP",
    "Nombre \\(s\\)",
    "Primer Apellido",
    "Segundo Apellido",
    "Denominación o Razón Social",
    "Nombre Comercial",
    "Código Postal",
    "Tipo de Vialidad",
    "Nombre de Vialidad",
    "Número Exterior",
    "Número Interior",
    "Nombre de la Colonia",
    "Nombre de la Localidad",
    "Nombre del Municipio o Demarcación Territorial",
    "Nombre de la Entidad Federativa",
    "Entre Calle",
    "Y Calle",
    "Correo Electrónico",
    "Tel. Fijo",
    "Régimen",
    "Actividad Económica",
    "Obligaciones",
    "Régimen de Capital"
];

function parseField(text, label) {
    const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Create a lookahead pattern matching any of the known labels (except the current one) followed by a colon,
    // or matching the end of the line/string.
    const otherLabels = KNOWN_LABELS.filter(l => {
        const cleanL = l.replace(/\\/g, '');
        return cleanL.toLowerCase() !== label.toLowerCase();
    });
    
    const lookaheadPattern = '(?:' + otherLabels.join('|') + ')\\s*:';
    
    // The regex should match non-greedily up to the next label or a newline/end of string.
    const regex = new RegExp(
        escapedLabel + '\\s*:[\\s\\r\\n]*' +
        '([\\s\\S]*?)' +
        '(?=\\s*(?:' + lookaheadPattern + '|[\\r\\n]|$))',
        'i'
    );
    
    const match = text.match(regex);
    if (match) {
        return match[1].trim();
    }
    
    // Fallback without colon
    const regexNoColon = new RegExp(
        escapedLabel + '[\\s\\r\\n]+' +
        '([\\s\\S]*?)' +
        '(?=\\s*(?:' + lookaheadPattern + '|[\\r\\n]|$))',
        'i'
    );
    const matchNoColon = text.match(regexNoColon);
    return matchNoColon ? matchNoColon[1].trim() : '';
}

function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}
