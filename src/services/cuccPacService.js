import { obtenerOAuthToken } from "./cuccApiService";

const httpFetch = globalThis.fetch || fetch;

function escaparXml(valor) {
    return String(valor === undefined || valor === null ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function leerEtiqueta(xml, etiqueta) {
    const expresion = new RegExp(`<(?:(?:[\\w.-]+):)?${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${etiqueta}\\s*>`, "i");
    const resultado = xml.match(expresion);
    return resultado ? resultado[1].trim() : "";
}

function decodificarEntidadesXml(valor) {
    return String(valor || "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&");
}

export function obtenerEndpointSoap(config) {
    const endpoint = config.soap_url || `${config.cucc_api_base}/soap/facturas`;
    let url;
    try {
        url = new URL(endpoint);
    } catch (err) {
        throw new Error("Configura una URL válida del servicio SOAP CUCC.");
    }
    if (
        url.protocol !== "https:" ||
        !(url.hostname === "cucc.com.mx" || url.hostname.endsWith(".cucc.com.mx"))
    ) {
        throw new Error("El endpoint SOAP debe pertenecer a un dominio HTTPS de CUCC.");
    }
    if (url.pathname === "/apifacturacion/public/soap/facturas") {
        url.pathname = "/v2/api-cucc/public/soap/facturas";
    }
    url.search = "";
    url.hash = "";
    return url.toString();
}

export async function timbrarConCUCC({ xml, config, soapPassword }) {
    const endpoint = obtenerEndpointSoap(config);
    const envelope = `<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:cuccws"><soapenv:Header/><soapenv:Body><urn:doInvoice soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><requestDoInvoice xsi:type="urn:requestDoInvoice"><usuario xsi:type="xsd:string">${escaparXml(config.soap_user)}</usuario><pass xsi:type="xsd:string">${escaparXml(soapPassword)}</pass><file xsi:type="xsd:string">${Buffer.from(xml, "utf8").toString("base64")}</file></requestDoInvoice></urn:doInvoice></soapenv:Body></soapenv:Envelope>`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await httpFetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "\"urn:cuccws#doInvoice\"",
                "Accept": "text/xml"
            },
            body: envelope,
            signal: controller.signal
        });
        const body = await response.text();
        if (/<(?:[\w.-]+:)?Fault\b/i.test(body)) {
            const fault = decodificarEntidadesXml(leerEtiqueta(body, "faultstring"));
            const error = new Error(fault || `CUCC rechazó la solicitud de timbrado (HTTP ${response.status}).`);
            error.definitivo = true;
            throw error;
        }
        if (!response.ok) {
            throw new Error(`No se confirmó la respuesta de CUCC (HTTP ${response.status}).`);
        }

        const mensaje = decodificarEntidadesXml(leerEtiqueta(body, "response_message"));
        const archivoXml = leerEtiqueta(body, "fileXml").replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1");
        if (!archivoXml) {
            throw new Error(mensaje || "CUCC no devolvió el XML timbrado.");
        }
        const xmlTimbrado = /^[A-Za-z0-9+/=\r\n]+$/.test(archivoXml)
            ? Buffer.from(archivoXml.replace(/\s/g, ""), "base64").toString("utf8")
            : decodificarEntidadesXml(archivoXml);
        const coincidenciaUuid = xmlTimbrado.match(/\bUUID\s*=\s*["']([0-9a-f-]{36})["']/i);
        if (!coincidenciaUuid) {
            throw new Error(mensaje || "CUCC no devolvió un UUID de timbrado verificable.");
        }

        return {
            uuid: coincidenciaUuid[1].toUpperCase(),
            mensaje,
            xmlTimbrado,
            tienePdf: !!leerEtiqueta(body, "filePdf")
        };
    } finally {
        clearTimeout(timeout);
    }
}

export async function descargarDeCUCC({ uuid, tipo, config, soapPassword, clientSecret }) {
    if (!/^[0-9a-f-]{36}$/i.test(String(uuid || ""))) {
        throw new Error("El UUID de factura no es válido.");
    }
    if (!["xml", "pdf"].includes(tipo)) {
        throw new Error("El tipo de comprobante solicitado no es válido.");
    }

    const token = await obtenerOAuthToken({
        cucc_api_base: config.cucc_api_base,
        client_id: config.client_id,
        client_secret: clientSecret,
        soap_user: config.soap_user,
        soap_pass_plain: soapPassword
    });
    if (!token.ok || !token.access_token) {
        throw new Error(token.mensaje || "No se pudo autenticar con CUCC para descargar el comprobante.");
    }

    const baseUrl = String(config.cucc_api_base || "").replace(/\/+$/, "");
    const url = `${baseUrl}/api/facturacion/descargar/${encodeURIComponent(uuid)}/${tipo}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await httpFetch(url, {
            headers: {
                "Authorization": `Bearer ${token.access_token}`,
                "Accept": tipo === "pdf" ? "application/pdf, application/json" : "application/xml, text/xml, application/json"
            },
            signal: controller.signal
        });
        if (!response.ok) {
            throw new Error(`CUCC no pudo entregar el comprobante (HTTP ${response.status}).`);
        }

        const contentType = response.headers.get("content-type") || (tipo === "pdf" ? "application/pdf" : "application/xml");
        const buffer = Buffer.from(await response.arrayBuffer());
        if (/application\/json/i.test(contentType)) {
            const data = JSON.parse(buffer.toString("utf8"));
            const base64 = data.file || data.fileXml || data.filePdf || data.data;
            if (typeof base64 !== "string") {
                throw new Error("CUCC devolvió una respuesta JSON sin el comprobante.");
            }
            return {
                buffer: Buffer.from(base64.replace(/^data:[^;]+;base64,/, ""), "base64"),
                contentType: tipo === "pdf" ? "application/pdf" : "application/xml"
            };
        }
        return { buffer, contentType };
    } finally {
        clearTimeout(timeout);
    }
}
