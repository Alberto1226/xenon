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

        if (clasificacion.origen === "importado" && !/^\d{15}$/.test(String(clasificacion.numero_pedimento || "").replace(/\D/g, ""))) {
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
            ? `<cfdi:InformacionAduanera NumeroPedimento="${escaparXml(String(clasificacion.numero_pedimento).replace(/\D/g, "").replace(/(\d{2})(\d{2})(\d{4})(\d{7})/, "$1  $2  $3  $4"))}"/>`
            : "";
        const impuestos = traslados.length > 0
            ? `<cfdi:Impuestos><cfdi:Traslados>${traslados.join("")}</cfdi:Traslados></cfdi:Impuestos>`
            : "";
        const identificacion = producto.codigo
            ? ` NoIdentificacion="${escaparXml(producto.codigo)}"`
            : "";
        return `<cfdi:Concepto ClaveProdServ="${escaparXml(producto.sat_clave_prod_serv)}"${identificacion} Cantidad="${formatoTasa(cantidad)}" ClaveUnidad="${escaparXml(String(producto.sat_clave_unidad).toUpperCase())}" Descripcion="${escaparXml(producto.nombre || "Producto")}" ValorUnitario="${formatoTasa(valorUnitario)}" Importe="${formatoImporte(base)}" ObjetoImp="${escaparXml(objetoImpuesto)}">${impuestos}${infoAduanera}</cfdi:Concepto>`;
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
    const condiciones = String(preparacion.condiciones_pago || "").trim();
    const condicionesAttr = preparacion.metodo_pago === "PPD" && condiciones
        ? ` CondicionesDePago="${escaparXml(condiciones.slice(0, 1000))}"`
        : "";
    const cambioAttr = moneda === "MXN" ? "" : ` TipoCambio="${formatoTasa(tipoCambio)}"`;
    const comprobante = `<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd" Version="4.0" Serie="${escaparXml(serie)}" Folio="${escaparXml(folio)}" Fecha="${fechaTexto}"${condicionesAttr} Sello="" FormaPago="${escaparXml(formaPago)}" NoCertificado="" Certificado="" SubTotal="${formatoImporte(subtotal)}" Moneda="${moneda}"${cambioAttr} Total="${formatoImporte(total)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="${escaparXml(preparacion.metodo_pago)}" LugarExpedicion="${escaparXml(emisor.cp)}"><cfdi:Emisor Rfc="${escaparXml(emisor.rfc)}" Nombre="${escaparXml(emisor.nombre)}" RegimenFiscal="${escaparXml(emisor.regimen)}"/><cfdi:Receptor Rfc="${escaparXml(String(receptor.rfc || "").toUpperCase())}" Nombre="${escaparXml(receptor.nombre.trim().toUpperCase())}" DomicilioFiscalReceptor="${escaparXml(receptor.codigo_postal)}" RegimenFiscalReceptor="${escaparXml(receptor.regimen_fiscal)}" UsoCFDI="${escaparXml(receptor.uso_cfdi)}"/>` +
        `<cfdi:Conceptos>${xmlConceptos}</cfdi:Conceptos>${xmlImpuestos}</cfdi:Comprobante>`;

    const traslados = [...resumenImpuestos.values()].map(impuesto => ({
        impuesto: impuesto.impuesto,
        factor: impuesto.factor,
        tasa: impuesto.tasa,
        base: redondearMoneda(impuesto.base),
        importe: redondearMoneda(impuesto.importe)
    }));

    return { xml: `<?xml version="1.0" encoding="UTF-8"?>${comprobante}`, subtotal, impuestos: impuestosTotal, total, moneda, traslados };
}


const FORMAS_PAGO_CON_CUENTAS = ["02", "03", "04", "05", "06", "28", "29"];

export function formaPagoRequiereCuentas(forma) {
    return FORMAS_PAGO_CON_CUENTAS.includes(String(forma));
}

function formatoFechaHora(fecha) {
    return [
        fecha.getFullYear(), "-", String(fecha.getMonth() + 1).padStart(2, "0"), "-", String(fecha.getDate()).padStart(2, "0"),
        "T", String(fecha.getHours()).padStart(2, "0"), ":", String(fecha.getMinutes()).padStart(2, "0"), ":", String(fecha.getSeconds()).padStart(2, "0")
    ].join("");
}

// CFDI de tipo P con Complemento de Pagos 2.0: un solo nodo Pago que relaciona N facturas PPD (solo MXN).
export function construirREP20({ pago, facturas, emisor, receptor, cuentaDestino, serie, folio, fecha }) {
    if (!emisor || !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(String(emisor.rfc || "").toUpperCase())) {
        throw new Error("El RFC del emisor no es válido.");
    }
    if (!String(emisor.nombre || "").trim() || !/^\d{3}$/.test(String(emisor.regimen || "")) || !/^\d{5}$/.test(String(emisor.cp || ""))) {
        throw new Error("Configura razón social, régimen y código postal del emisor.");
    }
    if (!pago.aplicaciones || pago.aplicaciones.length === 0) {
        throw new Error("El pago no tiene facturas aplicadas.");
    }
    if (!/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(String(receptor.rfc || "")) || !/^\d{5}$/.test(String(receptor.cp || "")) || !/^\d{3}$/.test(String(receptor.regimen || ""))) {
        throw new Error("Faltan RFC, código postal o régimen fiscal del receptor en las facturas relacionadas.");
    }
    const forma = String(pago.forma_pago);
    if (forma === "99") {
        throw new Error("La forma de pago del REP no puede ser 99.");
    }

    let atributosCuentas = "";
    if (formaPagoRequiereCuentas(forma)) {
        if (!cuentaDestino) {
            throw new Error("Selecciona la cuenta destino del pago antes de timbrar el REP.");
        }
        const cuentaBen = String(cuentaDestino.numero_cuenta || "").replace(/\s/g, "");
        const rfcBen = String(cuentaDestino.rfc_banco || "").toUpperCase();
        if (!/^\d{10,18}$/.test(cuentaBen) || !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfcBen)) {
            throw new Error("La cuenta destino requiere RFC del banco y un número de cuenta de 10 a 18 dígitos.");
        }
        const ord = pago.cuenta_ordenante || {};
        const cuentaOrd = String(ord.numero_cuenta || "").replace(/\s/g, "");
        let ordenante = "";
        if (cuentaOrd) {
            const rfcOrd = String(ord.rfc_banco || "").toUpperCase();
            if (!/^\d{10,18}$/.test(cuentaOrd) || !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfcOrd)) {
                throw new Error("La cuenta ordenante requiere RFC del banco y un número de cuenta de 10 a 18 dígitos.");
            }
            ordenante = ` RfcEmisorCtaOrd="${escaparXml(rfcOrd)}" CtaOrdenante="${escaparXml(cuentaOrd)}"`;
        }
        atributosCuentas = `${ordenante} RfcEmisorCtaBen="${escaparXml(rfcBen)}" CtaBeneficiario="${escaparXml(cuentaBen)}"`;
    }

    const facturasPorId = new Map(facturas.map(factura => [String(factura._id), factura]));
    const totalesP = new Map();
    let montoTotal = 0;
    const documentos = pago.aplicaciones.map(aplicacion => {
        const factura = facturasPorId.get(String(aplicacion.factura_id));
        if (!factura) {
            throw new Error("No se encontró una de las facturas relacionadas con el pago.");
        }
        const pagado = redondearMoneda(aplicacion.importe_pagado);
        montoTotal += pagado;
        const proporcion = Number(factura.total) > 0 ? pagado / Number(factura.total) : 0;
        const trasladosDR = (factura.traslados || []).map(traslado => {
            const base = redondearMoneda(traslado.base * proporcion);
            const importe = traslado.factor === "Exento" ? 0 : redondearMoneda(traslado.importe * proporcion);
            const clave = `${traslado.impuesto}|${traslado.factor}|${traslado.tasa === null || traslado.tasa === undefined ? "" : traslado.tasa}`;
            const acumulado = totalesP.get(clave) || { impuesto: traslado.impuesto, factor: traslado.factor, tasa: traslado.tasa, base: 0, importe: 0 };
            acumulado.base = redondearMoneda(acumulado.base + base);
            acumulado.importe = redondearMoneda(acumulado.importe + importe);
            totalesP.set(clave, acumulado);
            const tasaAttr = traslado.factor === "Exento" ? "" : ` TasaOCuotaDR="${formatoTasa(traslado.tasa)}" ImporteDR="${formatoImporte(importe)}"`;
            return `<pago20:TrasladoDR BaseDR="${formatoImporte(base)}" ImpuestoDR="${traslado.impuesto}" TipoFactorDR="${traslado.factor}"${tasaAttr}/>`;
        });
        const impuestosDR = trasladosDR.length > 0
            ? `<pago20:ImpuestosDR><pago20:TrasladosDR>${trasladosDR.join("")}</pago20:TrasladosDR></pago20:ImpuestosDR>`
            : "";
        const serieAttr = factura.serie ? ` Serie="${escaparXml(factura.serie)}"` : "";
        return `<pago20:DoctoRelacionado IdDocumento="${escaparXml(factura.uuid)}"${serieAttr} Folio="${escaparXml(factura.folio)}" MonedaDR="MXN" EquivalenciaDR="1" NumParcialidad="${aplicacion.num_parcialidad}" ImpSaldoAnt="${formatoImporte(aplicacion.saldo_anterior)}" ImpPagado="${formatoImporte(pagado)}" ImpSaldoInsoluto="${formatoImporte(aplicacion.saldo_insoluto)}" ObjetoImpDR="${trasladosDR.length > 0 ? "02" : "01"}">${impuestosDR}</pago20:DoctoRelacionado>`;
    });
    montoTotal = redondearMoneda(montoTotal);

    const acumulados = [...totalesP.values()];
    const trasladosP = acumulados.map(traslado => {
        const tasaAttr = traslado.factor === "Exento" ? "" : ` TasaOCuotaP="${formatoTasa(traslado.tasa)}" ImporteP="${formatoImporte(traslado.importe)}"`;
        return `<pago20:TrasladoP BaseP="${formatoImporte(traslado.base)}" ImpuestoP="${traslado.impuesto}" TipoFactorP="${traslado.factor}"${tasaAttr}/>`;
    }).join("");
    const impuestosP = trasladosP ? `<pago20:ImpuestosP><pago20:TrasladosP>${trasladosP}</pago20:TrasladosP></pago20:ImpuestosP>` : "";

    // Totales solo desglosa IVA; el IEPS va únicamente en los nodos de documento y pago.
    let totalesIva = "";
    for (const [tasa, sufijo] of [[0.16, "16"], [0.08, "8"], [0, "0"]]) {
        const grupo = acumulados.filter(t => t.impuesto === "002" && t.factor === "Tasa" && Number(t.tasa) === tasa);
        if (grupo.length === 0) continue;
        const base = redondearMoneda(grupo.reduce((s, t) => s + t.base, 0));
        const importe = redondearMoneda(grupo.reduce((s, t) => s + t.importe, 0));
        totalesIva += ` TotalTrasladosBaseIVA${sufijo}="${formatoImporte(base)}"` + (sufijo === "0" || true ? ` TotalTrasladosImpuestoIVA${sufijo}="${formatoImporte(importe)}"` : "");
    }
    const exento = acumulados.filter(t => t.impuesto === "002" && t.factor === "Exento");
    if (exento.length > 0) {
        totalesIva += ` TotalTrasladosBaseIVAExento="${formatoImporte(exento.reduce((s, t) => s + t.base, 0))}"`;
    }

    const fechaCfdi = fecha || new Date();
    const fechaPago = new Date(pago.fecha_pago);
    const xml = `<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:pago20="http://www.sat.gob.mx/Pagos20" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd" Version="4.0" Serie="${escaparXml(serie)}" Folio="${escaparXml(folio)}" Fecha="${formatoFechaHora(fechaCfdi)}" Sello="" NoCertificado="" Certificado="" SubTotal="0" Moneda="XXX" Total="0" TipoDeComprobante="P" Exportacion="01" LugarExpedicion="${escaparXml(emisor.cp)}">` +
        `<cfdi:Emisor Rfc="${escaparXml(emisor.rfc)}" Nombre="${escaparXml(emisor.nombre)}" RegimenFiscal="${escaparXml(emisor.regimen)}"/>` +
        `<cfdi:Receptor Rfc="${escaparXml(String(receptor.rfc).toUpperCase())}" Nombre="${escaparXml(String(receptor.nombre).trim())}" DomicilioFiscalReceptor="${escaparXml(receptor.cp)}" RegimenFiscalReceptor="${escaparXml(receptor.regimen)}" UsoCFDI="CP01"/>` +
        `<cfdi:Conceptos><cfdi:Concepto ClaveProdServ="84111506" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago" ValorUnitario="0" Importe="0" ObjetoImp="01"/></cfdi:Conceptos>` +
        `<cfdi:Complemento><pago20:Pagos Version="2.0"><pago20:Totales${totalesIva} MontoTotalPagos="${formatoImporte(montoTotal)}"/>` +
        `<pago20:Pago FechaPago="${formatoFechaHora(fechaPago)}" FormaDePagoP="${escaparXml(forma)}" MonedaP="MXN" TipoCambioP="1" Monto="${formatoImporte(montoTotal)}"${atributosCuentas}>${documentos.join("")}${impuestosP}</pago20:Pago></pago20:Pagos></cfdi:Complemento></cfdi:Comprobante>`;

    return { xml, monto: montoTotal };
}
