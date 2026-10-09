const IVA_TASAS = {
    "16": 0.16,
    "8": 0.08,
    "0": 0
};

function redondearMoneda(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function formatoImporte(valor) {
    return redondearMoneda(valor).toFixed(2);
}

function formatoTasa(valor) {
    return Number(valor).toFixed(6);
}

function escaparXml(valor) {
    return String(valor === undefined || valor === null ? "" : valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function obtenerTasaIva(clave) {
    return Object.prototype.hasOwnProperty.call(IVA_TASAS, clave)
        ? IVA_TASAS[clave]
        : 0;
}

export function prepararConceptosCFDI(pedido, preparacion) {
    const conceptosPreparados = [];

    for (let indice = 0; indice < pedido.lista.length; indice++) {
        const item = pedido.lista[indice];
        const clasificacion = preparacion.conceptos[indice];
        // El pedido llega como documento de Mongoose; al copiarlo con spread se pierden sus campos.
        const productoBase = item.producto && typeof item.producto.toObject === "function"
            ? item.producto.toObject()
            : (item.producto || {});
        const producto = {
            ...productoBase,
            sat_clave_prod_serv: clasificacion.sat_clave_prod_serv || (item.producto && item.producto.sat_clave_prod_serv),
            sat_clave_unidad: clasificacion.sat_clave_unidad || (item.producto && item.producto.sat_clave_unidad),
            sat_objeto_impuesto: clasificacion.sat_objeto_impuesto || (item.producto && item.producto.sat_objeto_impuesto),
            impuestos_venta: clasificacion.impuestos_venta || (item.producto && item.producto.impuestos_venta)
        };
        const claveProdServ = String(producto.sat_clave_prod_serv || "").trim();
        const claveUnidad = String(producto.sat_clave_unidad || "").trim().toUpperCase();
        const objetoImpuesto = String(producto.sat_objeto_impuesto || "");
        const impuestosVenta = producto.impuestos_venta || {};
        const ivaClave = String(impuestosVenta.iva || "");
        const tasaIeps = Number(impuestosVenta.ieps_tasa_porcentaje || 0) / 100;
        const precioBruto = Number(producto.precio);
        const cantidad = Number(item.cantidad);

        if (!/^\d{8}$/.test(claveProdServ)) {
            throw new Error(`Configura la ClaveProdServ SAT del producto ${producto.nombre || indice + 1}.`);
        }
        if (!/^[A-Z0-9]{2,3}$/.test(claveUnidad)) {
            throw new Error(`Configura la ClaveUnidad SAT del producto ${producto.nombre || indice + 1}.`);
        }
        if (!Number.isFinite(precioBruto) || precioBruto < 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
            throw new Error(`El precio o la cantidad del producto ${producto.nombre || indice + 1} no es válido.`);
        }
        if (!["01", "02", "03", "04"].includes(objetoImpuesto)) {
            throw new Error(`Configura el objeto de impuesto del producto ${producto.nombre || indice + 1}.`);
        }
        if (!["", "16", "8", "0", "exento", "no_aplica"].includes(ivaClave)) {
            throw new Error(`El tratamiento de IVA del producto ${producto.nombre || indice + 1} no es válido.`);
        }
        if (objetoImpuesto !== "02" && ivaClave && ivaClave !== "no_aplica") {
            throw new Error(`El producto ${producto.nombre || indice + 1} tiene IVA configurado, pero su objeto de impuesto no es 02.`);
        }
        if (objetoImpuesto === "02" && !ivaClave) {
            throw new Error(`Configura el IVA de venta del producto ${producto.nombre || indice + 1}.`);
        }
        if (!Number.isFinite(tasaIeps) || tasaIeps < 0 || tasaIeps > 1) {
            throw new Error(`La tasa IEPS del producto ${producto.nombre || indice + 1} no es válida.`);
        }
        if (tasaIeps > 0 && objetoImpuesto !== "02") {
            throw new Error(`El producto ${producto.nombre || indice + 1} tiene IEPS, pero su objeto de impuesto no es 02.`);
        }
        if (objetoImpuesto === "02" && ivaClave === "no_aplica" && tasaIeps === 0) {
            throw new Error(`El producto ${producto.nombre || indice + 1} debe tener IVA o IEPS configurado.`);
        }

        const bruto = redondearMoneda(precioBruto * cantidad);
        const tasaIva = objetoImpuesto === "02" && IVA_TASAS[ivaClave] !== undefined
            ? obtenerTasaIva(ivaClave)
            : 0;
        const factorIva = objetoImpuesto === "02" && ivaClave !== "exento" && ivaClave !== "no_aplica"
            ? tasaIva
            : 0;
        const base = redondearMoneda(bruto / ((1 + tasaIeps) * (1 + factorIva)));
        const importeIeps = redondearMoneda(base * tasaIeps);
        const importeIva = factorIva > 0
            ? redondearMoneda((base + importeIeps) * factorIva)
            : 0;
        const ajuste = redondearMoneda(bruto - base - importeIeps - importeIva);

        if (Math.abs(ajuste) > 0.01) {
            throw new Error(`No se pudo reconciliar el desglose de impuestos del producto ${producto.nombre || indice + 1}.`);
        }

        let importeIepsFinal = importeIeps;
        let importeIvaFinal = importeIva;
        if (ajuste !== 0 && factorIva > 0) {
            importeIvaFinal = redondearMoneda(importeIvaFinal + ajuste);
        } else if (ajuste !== 0 && tasaIeps > 0) {
            importeIepsFinal = redondearMoneda(importeIepsFinal + ajuste);
        } else if (ajuste !== 0) {
            throw new Error(`El desglose fiscal del producto ${producto.nombre || indice + 1} requiere revisión.`);
        }

        if (clasificacion.origen === "importado" && !/^\d{15}$/.test(String(clasificacion.numero_pedimento || ""))) {
            throw new Error(`El pedimento del producto ${producto.nombre || indice + 1} no tiene los 15 dígitos requeridos.`);
        }

        conceptosPreparados.push({
            producto,
            cantidad,
            bruto,
            base,
            objetoImpuesto,
            ivaClave,
            tasaIva,
            tasaIeps,
            importeIva: importeIvaFinal,
            importeIeps: importeIepsFinal,
            clasificacion
        });
    }

    return conceptosPreparados;
}

export function construirCFDI40({ pedido, preparacion, emisor, serie, folio, fecha }) {
    if (!pedido || !Array.isArray(pedido.lista) || pedido.lista.length === 0) {
        throw new Error("El pedido no tiene conceptos para facturar.");
    }
    if (!emisor || !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(String(emisor.rfc || "").toUpperCase())) {
        throw new Error("El RFC del emisor no es válido.");
    }
    if (!String(emisor.nombre || "").trim() || !/^\d{3}$/.test(String(emisor.regimen || ""))) {
        throw new Error("Configura la razón social y el régimen fiscal del emisor.");
    }
    if (!/^\d{5}$/.test(String(emisor.cp || ""))) {
        throw new Error("Configura el código postal de expedición del emisor.");
    }
    if (!preparacion || !preparacion.receptor) {
        throw new Error("El pedido no tiene una preparación de factura guardada.");
    }
    if (!["PUE", "PPD"].includes(preparacion.metodo_pago) || !/^\d{3}$/.test(String(preparacion.receptor.regimen_fiscal || "")) || !/^[A-Z]\d{2}$/.test(String(preparacion.receptor.uso_cfdi || ""))) {
        throw new Error("El método de pago, régimen o Uso CFDI no es válido.");
    }

    const conceptos = prepararConceptosCFDI(pedido, preparacion);
    const totalPedido = redondearMoneda(Number(pedido.total_pedido));
    const totalConceptos = redondearMoneda(conceptos.reduce((suma, concepto) => suma + concepto.bruto, 0));
    if (!Number.isFinite(totalPedido) || Math.abs(totalPedido - totalConceptos) > 0.001) {
        throw new Error("La suma de conceptos no coincide con el total guardado del pedido.");
    }

    const moneda = pedido.moneda === "Pesos Mexicanos"
        ? "MXN"
        : (pedido.moneda === "Dolares USA" ? "USD" : "");
    if (!moneda) {
        throw new Error("La moneda del pedido no es compatible con CFDI 4.0.");
    }
    const tipoCambio = Number(pedido.tipo_de_cambio || 1);
    if (moneda !== "MXN" && (!Number.isFinite(tipoCambio) || tipoCambio <= 0)) {
        throw new Error("Configura el tipo de cambio del pedido.");
    }

    const subtotal = redondearMoneda(conceptos.reduce((suma, concepto) => suma + concepto.base, 0));
    const totalIva = redondearMoneda(conceptos.reduce((suma, concepto) => suma + concepto.importeIva, 0));
    const totalIeps = redondearMoneda(conceptos.reduce((suma, concepto) => suma + concepto.importeIeps, 0));
    const impuestosTotal = redondearMoneda(totalIva + totalIeps);
    const total = redondearMoneda(subtotal + impuestosTotal);
    if (Math.abs(total - totalPedido) > 0.001) {
        throw new Error("El total calculado de CFDI no coincide con el importe cobrado en el pedido.");
    }

    const receptor = preparacion.receptor;
    if (!/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$|^XAXX010101000$|^XEXX010101000$/i.test(String(receptor.rfc || ""))) {
        throw new Error("El RFC del receptor no es válido.");
    }
    if (!String(receptor.nombre || "").trim() || !/^\d{5}$/.test(String(receptor.codigo_postal || ""))) {
        throw new Error("Faltan la razón social o el código postal fiscal del receptor.");
    }

    const fechaCfdi = fecha || new Date();
    const fechaTexto = [
        fechaCfdi.getFullYear(),
        String(fechaCfdi.getMonth() + 1).padStart(2, "0"),
        String(fechaCfdi.getDate()).padStart(2, "0")
    ].join("-") + "T" + [
        String(fechaCfdi.getHours()).padStart(2, "0"),
        String(fechaCfdi.getMinutes()).padStart(2, "0"),
        String(fechaCfdi.getSeconds()).padStart(2, "0")
    ].join(":");

    const xmlConceptos = conceptos.map(concepto => {
        const { producto, cantidad, base, objetoImpuesto, ivaClave, tasaIva, tasaIeps, importeIva, importeIeps, clasificacion } = concepto;
        const valorUnitario = base / cantidad;
        const traslados = [];
        if (objetoImpuesto === "02" && tasaIeps > 0) {
            traslados.push(`<cfdi:Traslado Base="${formatoImporte(base)}" Impuesto="003" TipoFactor="Tasa" TasaOCuota="${formatoTasa(tasaIeps)}" Importe="${formatoImporte(importeIeps)}"/>`);
        }
        if (objetoImpuesto === "02" && ivaClave === "exento") {
            traslados.push(`<cfdi:Traslado Base="${formatoImporte(base + importeIeps)}" Impuesto="002" TipoFactor="Exento"/>`);
        } else if (objetoImpuesto === "02" && ivaClave !== "no_aplica") {
            traslados.push(`<cfdi:Traslado Base="${formatoImporte(base + importeIeps)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${formatoTasa(tasaIva)}" Importe="${formatoImporte(importeIva)}"/>`);
        }

        const infoAduanera = clasificacion.origen === "importado"
            ? `<cfdi:InformacionAduanera NumeroPedimento="${escaparXml(clasificacion.numero_pedimento.replace(/(\d{2})(\d{2})(\d{4})(\d{7})/, "$1  $2  $3  $4"))}"/>`
            : "";
        const impuestos = traslados.length > 0
            ? `<cfdi:Impuestos><cfdi:Traslados>${traslados.join("")}</cfdi:Traslados></cfdi:Impuestos>`
            : "";
        const identificacion = producto.codigo
            ? ` NoIdentificacion="${escaparXml(producto.codigo)}"`
            : "";
        return `<cfdi:Concepto ClaveProdServ="${escaparXml(producto.sat_clave_prod_serv)}"${identificacion} Cantidad="${formatoTasa(cantidad)}" ClaveUnidad="${escaparXml(String(producto.sat_clave_unidad).toUpperCase())}" Descripcion="${escaparXml(producto.nombre || "Producto")}" ValorUnitario="${formatoTasa(valorUnitario)}" Importe="${formatoImporte(base)}" ObjetoImp="${escaparXml(objetoImpuesto)}">${infoAduanera}${impuestos}</cfdi:Concepto>`;
    }).join("");

    const agrupados = [];
    for (const concepto of conceptos) {
        if (concepto.objetoImpuesto !== "02") continue;
        if (concepto.tasaIeps > 0) {
            agrupados.push({ impuesto: "003", factor: "Tasa", tasa: concepto.tasaIeps, base: concepto.base, importe: concepto.importeIeps });
        }
        if (concepto.ivaClave === "exento") {
            agrupados.push({ impuesto: "002", factor: "Exento", tasa: null, base: concepto.base + concepto.importeIeps, importe: 0 });
        } else if (concepto.ivaClave !== "no_aplica") {
            agrupados.push({ impuesto: "002", factor: "Tasa", tasa: concepto.tasaIva, base: concepto.base + concepto.importeIeps, importe: concepto.importeIva });
        }
    }
    const resumenImpuestos = new Map();
    for (const impuesto of agrupados) {
        const clave = `${impuesto.impuesto}|${impuesto.factor}|${impuesto.tasa === null ? "" : impuesto.tasa}`;
        const resumen = resumenImpuestos.get(clave) || { ...impuesto, base: 0, importe: 0 };
        resumen.base += impuesto.base;
        resumen.importe += impuesto.importe;
        resumenImpuestos.set(clave, resumen);
    }
    const xmlTraslados = [...resumenImpuestos.values()].map(impuesto => {
        const tasaAttr = impuesto.tasa === null ? "" : ` TasaOCuota="${formatoTasa(impuesto.tasa)}"`;
        const importeAttr = impuesto.factor === "Exento" ? "" : ` Importe="${formatoImporte(impuesto.importe)}"`;
        return `<cfdi:Traslado Base="${formatoImporte(impuesto.base)}" Impuesto="${impuesto.impuesto}" TipoFactor="${impuesto.factor}"${tasaAttr}${importeAttr}/>`;
    }).join("");
    const tieneTrasladosTasa = [...resumenImpuestos.values()].some(impuesto => impuesto.factor === "Tasa");
    const totalTrasladados = tieneTrasladosTasa ? ` TotalImpuestosTrasladados="${formatoImporte(impuestosTotal)}"` : "";
    const xmlImpuestos = xmlTraslados
        ? `<cfdi:Impuestos${totalTrasladados}><cfdi:Traslados>${xmlTraslados}</cfdi:Traslados></cfdi:Impuestos>`
        : "";

    const formaPago = preparacion.metodo_pago === "PPD" ? "99" : preparacion.forma_pago;
    const cambioAttr = moneda === "MXN" ? "" : ` TipoCambio="${formatoTasa(tipoCambio)}"`;
    const comprobante = `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${escaparXml(serie)}" Folio="${escaparXml(folio)}" Fecha="${fechaTexto}" Sello="" FormaPago="${escaparXml(formaPago)}" NoCertificado="" Certificado="" SubTotal="${formatoImporte(subtotal)}" Moneda="${moneda}"${cambioAttr} Total="${formatoImporte(total)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="${escaparXml(preparacion.metodo_pago)}" LugarExpedicion="${escaparXml(emisor.cp)}"><cfdi:Emisor Rfc="${escaparXml(emisor.rfc)}" Nombre="${escaparXml(emisor.nombre)}" RegimenFiscal="${escaparXml(emisor.regimen)}"/><cfdi:Receptor Rfc="${escaparXml(String(receptor.rfc || "").toUpperCase())}" Nombre="${escaparXml(receptor.nombre.trim().toUpperCase())}" DomicilioFiscalReceptor="${escaparXml(receptor.codigo_postal)}" RegimenFiscalReceptor="${escaparXml(receptor.regimen_fiscal)}" UsoCFDI="${escaparXml(receptor.uso_cfdi)}"/>` +
        `<cfdi:Conceptos>${xmlConceptos}</cfdi:Conceptos>${xmlImpuestos}</cfdi:Comprobante>`;

    return { xml: `<?xml version="1.0" encoding="UTF-8"?>${comprobante}`, subtotal, impuestos: impuestosTotal, total, moneda };
}
