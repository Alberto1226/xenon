/**
 * Servicio de parseo de archivos de validación M3 de pedimentos del SAT (.338, .034, .txt, .m3)
 * Conforme a la especificación del Anexo 22 del SAT
 */

function parseM3Content(content, allProducts = []) {
  if (!content) {
    throw new Error('El contenido del archivo se encuentra vacío.');
  }

  // Limpiar BOM (\xEF\xBB\xBF) si existe
  let cleanContent = content.replace(/^\uFEFF/, '').replace(/\r/g, '');

  // Validaciones iniciales
  if (cleanContent.trim().startsWith('%PDF')) {
    throw new Error("Subiste un documento PDF. Por favor selecciona el archivo de texto plano M3 (.338, .034, .txt) enviado por tu agencia aduanal.");
  }

  const first100 = cleanContent.trim().substring(0, 100);
  if (first100.startsWith('4001') || (first100.includes('CIX') && !cleanContent.includes('501|'))) {
    throw new Error("El archivo seleccionado parece ser un Acuse o Firma de validación (inicia con '4001...'). Por favor sube el archivo M3 principal del pedimento (el archivo cuyo nombre contiene '_M' o incluye los registros 501 y 551).");
  }

  const lines = cleanContent.split('\n');

  const resumen = {
    numero_pedimento: '',
    clave_pedimento: 'A1',
    fecha_pedimento: new Date().toISOString().substring(0, 10),
    tipo_cambio: 1.0,
    aduana_despacho: '160',
    patente: '3387',
    regimen: 'IMD',
    peso_bruto: 0,
    valor_dolares: 0,
    valor_aduana_mxn: 0,
    cove: '',
    proveedor: {
      nombre: '',
      tax_id: '',
      pais: 'CHN'
    },
    incrementables_sat: {
      fletes: 0,
      seguros: 0,
      otros: 0
    },
    contribuciones_sat: {
      dta: 0,
      prv: 0,
      igi: 0,
      iva: 0,
      total_efectivo: 0
    },
    gastos_importacion: {
      Impuesto_Aduanal: 0,
      Flete: 0,
      Agente_Aduanal: 0,
      Seguridad: 0,
      otros: []
    },
    productos: []
  };

  let hasFound501 = false;
  const partidasMap = {};

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const cols = line.split('|');
    const regKey = cols[0] ? cols[0].trim() : '';

    switch (regKey) {
      case '501': {
        hasFound501 = true;
        const patente = cols[1] ? cols[1].trim() : '';
        const numSec = cols[2] ? cols[2].trim() : '';
        const aduana = cols[3] ? cols[3].trim() : '';
        const clavePed = cols[5] ? cols[5].trim() : 'A1';
        const tc = parseFloat(cols[10]) || 1.0;
        const fletesSat = parseFloat(cols[11]) || 0;
        const segurosSat = parseFloat(cols[12]) || 0;
        const otrosIncSat = parseFloat(cols[14]) || 0;

        // Formatear Pedimento: YY AD PATENTE NUMERO (15 dígitos)
        const firstChar = numSec.charAt(0);
        let ano2 = '25';
        if (firstChar === '6') ano2 = '26';
        else if (firstChar === '5') ano2 = '25';
        else if (firstChar === '4') ano2 = '24';
        else ano2 = String(new Date().getFullYear()).substring(2);

        const adCode = aduana ? (aduana.length >= 2 ? aduana.substring(0, 2) : aduana) : '87';
        const patentePadded = patente.padStart(4, '0');
        const numSecPadded = numSec.padStart(7, '0');
        const pedimentoFormateado = `${ano2}  ${adCode}  ${patentePadded}  ${numSecPadded}`;

        resumen.numero_pedimento = pedimentoFormateado.trim();
        resumen.clave_pedimento = clavePed ? clavePed.toUpperCase() : 'A1';
        resumen.tipo_cambio = tc > 0 ? tc : 1.0;
        resumen.incrementables_sat.fletes = fletesSat;
        resumen.incrementables_sat.seguros = segurosSat;
        resumen.incrementables_sat.otros = otrosIncSat;
        resumen.gastos_importacion.Flete = fletesSat;
        break;
      }

      case '505': {
        // COVE y Proveedor Extranjero
        const cove = cols[3] ? cols[3].trim() : '';
        const taxIdProv = cols[10] ? cols[10].trim() : '';
        const nombreProv = cols[11] ? cols[11].trim() : '';

        if (cove) resumen.cove = cove;
        if (taxIdProv) resumen.proveedor.tax_id = taxIdProv;
        if (nombreProv) resumen.proveedor.nombre = nombreProv;
        break;
      }

      case '506': {
        // Fechas (1 = Entrada, 2 = Pago)
        const tipoFecha = cols[2] ? cols[2].trim() : '';
        const rawFecha = cols[3] ? cols[3].trim() : ''; // DDMMAAAA
        if (rawFecha.length === 8) {
          const fFormatted = `${rawFecha.substring(4, 8)}-${rawFecha.substring(2, 4)}-${rawFecha.substring(0, 2)}`;
          if (tipoFecha === '2' || !resumen.fecha_pedimento) {
            resumen.fecha_pedimento = fFormatted;
          }
        }
        break;
      }

      case '510': {
        // Contribuciones globales (1 = DTA, 15 = PRV, 6 = IGI)
        const claveContrib = cols[2] ? cols[2].trim() : '';
        const montoContrib = parseFloat(cols[4]) || 0;

        if (claveContrib === '1') {
          resumen.contribuciones_sat.dta = montoContrib;
        } else if (claveContrib === '15') {
          resumen.contribuciones_sat.prv = montoContrib;
        } else if (claveContrib === '6') {
          resumen.contribuciones_sat.igi += montoContrib;
        }
        
        // Suma total de impuestos aduanales para prorrateo
        const totalImpSat = (resumen.contribuciones_sat.igi || 0) + (resumen.contribuciones_sat.dta || 0) + (resumen.contribuciones_sat.prv || 0);
        resumen.gastos_importacion.Impuesto_Aduanal = totalImpSat;
        break;
      }

      case '551': {
        // Partida de Mercancías
        const fraccion = cols[2] ? cols[2].trim() : '';
        const sec = parseInt(cols[3]) || (Object.keys(partidasMap).length + 1);
        const nico = cols[4] ? cols[4].trim() : '00';
        const descripcion = cols[5] ? cols[5].trim() : '';
        const precioUnitarioSat = parseFloat(cols[6]) || 0;
        const importePagadoMXN = parseFloat(cols[7]) || 0;
        const valorAduanaMXN = parseFloat(cols[8]) || 0;

        const cantTarifa = parseFloat(cols[9]) || 0;
        const cantComercial = parseFloat(cols[10]) || 0;
        const uMedTarifa = cols[11] ? cols[11].trim() : '';
        const uMedComercial = cols[13] ? cols[13].trim() : '';

        const cantidadReal = cantComercial > 0 ? cantComercial : (cantTarifa > 0 ? cantTarifa : 1.0);
        const uMedidaStr = mapUnidadMedida(uMedComercial, uMedTarifa);

        let fraccionFormatted = fraccion;
        const fraccionClean = fraccion.replace(/[^0-9]/g, '');
        if (fraccionClean.length === 8) {
          fraccionFormatted = `${fraccionClean.substring(0, 4)}.${fraccionClean.substring(4, 6)}.${fraccionClean.substring(6, 8)}`;
        }

        const tc = resumen.tipo_cambio > 0 ? resumen.tipo_cambio : 1.0;
        const precioCompraUsd = (tc > 0 && cantidadReal > 0)
          ? parseFloat(((importePagadoMXN / tc) / cantidadReal).toFixed(4))
          : parseFloat(precioUnitarioSat.toFixed(4));

        partidasMap[sec] = {
          sec: sec,
          nombre: descripcion,
          codigo: '',
          fraccion_arancelaria: fraccionFormatted,
          nico: nico ? nico.padStart(2, '0') : '00',
          cantidad: cantidadReal,
          unidad_medida: uMedidaStr,
          precio_unitario_sat: precioUnitarioSat,
          importe_precio_pagado_mxn: importePagadoMXN,
          valor_aduana_partida_mxn: valorAduanaMXN,
          precio_compra_usd: precioCompraUsd,
          marca: '',
          modelo: '',
          costo_fiscal_unitario_mxn: 0
        };
        break;
      }

      case '558':
      case '554': {
        const secPartida = parseInt(cols[3]) || 1;
        const textoObs = cols[5] ? cols[5].trim() : '';

        if (partidasMap[secPartida]) {
          if (textoObs.toLowerCase().includes('marca:')) {
            partidasMap[secPartida].marca = textoObs.replace(/marca:/i, '').trim();
          } else if (textoObs.toLowerCase().includes('modelo:')) {
            partidasMap[secPartida].modelo = textoObs.replace(/modelo:/i, '').trim();
          }
        }
        break;
      }
    }
  }

  if (!hasFound501) {
    throw new Error("No se encontró el registro de encabezado del pedimento (registro 501). Asegúrate de subir un archivo plano M3 (.338, .034, .txt) válido del SAT.");
  }

  // Vincular partidas con productos existentes de Xenon por SKU / Código / Modelo / Descripción
  const partidasArray = Object.values(partidasMap).map(partida => {
    let matchedProd = null;

    if (allProducts && allProducts.length > 0) {
      const modeloClean = (partida.modelo || '').toLowerCase().trim();
      const nombreClean = (partida.nombre || '').toLowerCase().trim();

      // 1. Coincidencia exacta por código/SKU con modelo
      if (modeloClean) {
        matchedProd = allProducts.find(p => p.codigo && p.codigo.toLowerCase().trim() === modeloClean);
      }

      // 2. Coincidencia exacta por nombre/descripción
      if (!matchedProd && nombreClean) {
        matchedProd = allProducts.find(p => p.nombre && p.nombre.toLowerCase().trim() === nombreClean);
      }

      // 3. Substring: El código del producto (p.codigo) está contenido dentro del modelo o del nombre de la partida
      if (!matchedProd) {
        matchedProd = allProducts.find(p => {
          if (!p.codigo || p.codigo.trim().length < 3) return false;
          const code = p.codigo.toLowerCase().trim();
          return (modeloClean && modeloClean.includes(code)) || (nombreClean && nombreClean.includes(code));
        });
      }

      // 4. Substring inverso: El modelo de la partida está contenido dentro del p.codigo o p.nombre
      if (!matchedProd && modeloClean && modeloClean.length >= 3) {
        matchedProd = allProducts.find(p => {
          const pCode = (p.codigo || '').toLowerCase().trim();
          const pNombre = (p.nombre || '').toLowerCase().trim();
          return (pCode && pCode.includes(modeloClean)) || (pNombre && pNombre.includes(modeloClean));
        });
      }
    }

    return {
      producto: matchedProd ? matchedProd._id : null,
      nombre: matchedProd ? matchedProd.nombre : partida.nombre,
      codigo: matchedProd ? matchedProd.codigo : (partida.modelo || partida.codigo || ''),
      fraccion_arancelaria: partida.fraccion_arancelaria,
      cantidad: partida.cantidad,
      unidad_medida: partida.unidad_medida,
      precio_compra_usd: partida.precio_compra_usd,
      sec: partida.sec,
      nico: partida.nico,
      marca: partida.marca,
      modelo: partida.modelo,
      valor_aduana_partida_mxn: partida.valor_aduana_partida_mxn,
      costo_fiscal_unitario_mxn: 0
    };
  });

  resumen.productos = partidasArray;
  return resumen;
}

function mapUnidadMedida(codeComercial, codeTarifa = '') {
  const candidates = [String(codeComercial).trim(), String(codeTarifa).trim()];
  for (const c of candidates) {
    switch (c) {
      case '6':
      case '12':
      case 'PZA':
      case 'PIEZA':
      case 'PIEZAS':
        return 'pza';
      case '1':
      case 'KG':
      case 'KILOGRAMO':
        return 'kg';
      case '2':
      case 'M':
      case 'METRO':
        return 'm';
      case '3':
      case 'M2':
        return 'm²';
      case '4':
      case 'M3':
        return 'm³';
      case '5':
      case 'L':
      case 'LITRO':
        return 'L';
      case '7':
      case 'PAR':
        return 'par';
      case '8':
      case 'DOC':
        return 'doc';
    }
  }
  return 'pza';
}

module.exports = {
  parseM3Content
};
