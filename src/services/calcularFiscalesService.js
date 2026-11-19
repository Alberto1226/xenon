/**
 * Servicio Centralizado de Cálculo Fiscal de Pedimentos
 * 
 * DECISIONES VALIDADAS CON CONTADOR (17 Nov 2026):
 * 1️⃣ IVA 100% ACREDITABLE - Se EXCLUYE del costo de inventario
 * 2️⃣ HONORARIOS AGENTE - Vienen de CFDI (NO fórmula %)
 * 3️⃣ PAGOS NEGATIVOS - Válidos (devoluciones de anticipo)
 * 4️⃣ MÚLTIPLES UUIDs - Permitidos (Pedimento 3 tiene 4 UUIDs)
 * 5️⃣ MÉTODO PEPS - Obligatorio (Art. 41 LISR)
 * 
 * FÓRMULA DE CÁLCULO (SIN IVA):
 * 
 * Costo Total Inventario = Valor Comercial + Gastos Costo + Impuestos (DTA/PRV/IGI/CNT) + Honorarios
 *                        (SIN incluir IVA que es 100% acreditable)
 * 
 * PRUEBA MATEMÁTICA - Pedimento 1:
 *   Valor Comercial:          $1,213,780.62 MXN
 *   + Seguros/Fletes/Otros:      $64,511.00 MXN
 *   + Impuestos (DTA/PRV/IGI):  $135,713.00 MXN
 *   + Honorarios Agente:         $21,253.39 MXN
 *   ─────────────────────────────────────────
 *   = Costo Inventario:        $1,435,257.99 MXN ✅
 *   
 *   ❌ NO incluir IVA:            $226,241.00 MXN (es 100% acreditable)
 */

export function calcularCostosFiscales(pedimento, metodologia = "ad-valorem", factor_fijo = 0) {
    if (!pedimento) {
        throw new Error("Pedimento no especificado");
    }

    const tc = parseFloat(pedimento.tipo_cambio) || 1;
    if (tc <= 0) {
        throw new Error("El tipo de cambio debe ser mayor a cero");
    }

    // 1. TOTAL COMPRA COMERCIAL EN MXN (Tomando montos directos en MXN del pedimento SAT)
    let totalCompraMXN = 0;
    let totalPiezas = 0;

    for (const item of (pedimento.productos || [])) {
        const cant = parseFloat(item.cantidad) || 0;
        const precioUSD = parseFloat(item.precio_compra_usd) || 0;
        
        // Priorizar el valor en pesos (MXN) ya liquidado en el pedimento SAT
        const vAduanaMxn = parseFloat(item.valor_aduana_partida_mxn) || 0;
        const vPagadoMxn = parseFloat(item.importe_precio_pagado_mxn) || 0;
        let valorPartidaMXN = 0;

        if (vAduanaMxn > 0) {
            valorPartidaMXN = vAduanaMxn;
        } else if (vPagadoMxn > 0) {
            valorPartidaMXN = vPagadoMxn;
        } else {
            // Fallback de respaldo en caso de registros manuales sin desglose MXN
            valorPartidaMXN = cant * precioUSD * tc;
        }

        if (cant <= 0 || (precioUSD <= 0 && valorPartidaMXN <= 0)) {
            throw new Error(`Producto inválido: cantidad=${cant}, precio=${precioUSD}`);
        }
        
        totalCompraMXN += valorPartidaMXN;
        totalPiezas += cant;
    }

    if (totalCompraMXN === 0 || totalPiezas === 0) {
        throw new Error("El pedimento no tiene partidas válidas para el cálculo");
    }

    // 2. GASTOS INDIRECTOS DEDUCIBLES (SIN IVA)
    const g = pedimento.gastos_importacion || {};
    const cont = pedimento.contribuciones_sat || {};
    const inc = pedimento.incrementables_sat || {};

    // 2A. IMPUESTOS DEDUCIBLES (DTA + PRV + IGI - SIN IVA)
    let dta = parseFloat(cont.dta) || 0;
    let prv = parseFloat(cont.prv) || 0;
    let igi = parseFloat(cont.igi) || 0;
    let cnt = parseFloat(cont.cnt) || 0;
    
    let totalImpuestosDeducibles = dta + prv + igi + cnt;

    // Si no estaban desglosados en contribuciones_sat, pero sí en g.Impuesto_Aduanal:
    if (totalImpuestosDeducibles === 0 && parseFloat(g.Impuesto_Aduanal) > 0) {
        totalImpuestosDeducibles = parseFloat(g.Impuesto_Aduanal);
    }

    // ✅ IVA EXCLUIDO (100% acreditable según Ley IVA Art. 4-5 y NIF C-4)
    const ivaSat = parseFloat(cont.iva) || parseFloat(cont.iva_acreditable) || 0;

    // 2B. FLETES Y SEGUROS (Incrementables SAT)
    let fletes = parseFloat(g.Flete) || parseFloat(inc.fletes) || 0;
    let seguros = parseFloat(g.Seguro) || parseFloat(g.Seguridad) || parseFloat(inc.seguros) || 0;

    // 2C. HONORARIOS DEL AGENTE ADUANAL
    let totalHonorarios = parseFloat(g.Agente_Aduanal) || 0;

    // 2D. OTROS GASTOS INDIRECTOS (Maniobras, demoras, honorarios extra o devoluciones negativas de anticipo)
    let otros = 0;
    let countUUIDs = 0;

    if (g.otros && Array.isArray(g.otros) && g.otros.length > 0) {
        for (const o of g.otros) {
            otros += (parseFloat(o.monto) || 0);
            if (o.uuid_cfdi || (o.factura && o.factura.uuid)) {
                countUUIDs++;
            }
        }
    } else {
        otros = parseFloat(inc.otros) || 0;
    }

    // ✅ TOTAL DE GASTOS A PRORRATEAR (SIN IVA)
    const totalIndirectos = totalImpuestosDeducibles + seguros + fletes + totalHonorarios + otros;

    // 3. DISTRIBUIR POR METODOLOGÍA
    
    const productosCalculados = (pedimento.productos || []).map(itemRaw => {
        // Asegurar que obtenemos un objeto plano limpio si viene de Mongoose
        const item = (itemRaw && typeof itemRaw.toObject === 'function')
            ? itemRaw.toObject()
            : (itemRaw && itemRaw._doc ? { ...itemRaw._doc } : { ...itemRaw });

        const cant = parseFloat(item.cantidad) || 1;
        
        // Priorizar el valor en pesos (MXN) directo del pedimento SAT sin recalcular con TC
        const vAduanaMxn = parseFloat(item.valor_aduana_partida_mxn) || 0;
        const vPagadoMxn = parseFloat(item.importe_precio_pagado_mxn) || 0;
        let valorPartidaMXN = 0;

        if (vAduanaMxn > 0) {
            valorPartidaMXN = vAduanaMxn;
        } else if (vPagadoMxn > 0) {
            valorPartidaMXN = vPagadoMxn;
        } else {
            valorPartidaMXN = cant * (parseFloat(item.precio_compra_usd) || 0) * tc;
        }

        const precioBaseMXN = cant > 0 ? (valorPartidaMXN / cant) : 0;
        let costoFiscalUnitario = 0;

        if (metodologia === 'ad-valorem') {
            // Prorrateo Ad-Valorem (por valor de importación - SAT)
            // Factor = Gastos Totales / Valor Compra Comercial
            // Costo Unitario = Precio Base * (1 + Factor)
            
            const factor = totalIndirectos / totalCompraMXN;
            costoFiscalUnitario = precioBaseMXN * (1 + factor);
            
        } else if (metodologia === 'unitario') {
            // Prorrateo Unitario (por cantidad de piezas)
            // Gasto por Pieza = Gastos Totales / Cantidad Total
            // Costo Unitario = Precio Base + Gasto por Pieza
            
            const gastoPorPieza = totalIndirectos / totalPiezas;
            costoFiscalUnitario = precioBaseMXN + gastoPorPieza;
            
        } else if (metodologia === 'mixto') {
            // Prorrateo Mixto (separar impuestos+agente por valor, flete+seguridad por cantidad)
            // Lógica: Maniobras y honorarios van por valor (ad-valorem)
            //         Fletes, seguros y otros van por cantidad (unitario)
            
            const gastosValor = totalImpuestosDeducibles + totalHonorarios;
            const factorValor = gastosValor / totalCompraMXN;
            
            const gastosCantidad = seguros + fletes + otros;
            const gastoPorPieza = gastosCantidad / totalPiezas;

            costoFiscalUnitario = (precioBaseMXN * (1 + factorValor)) + gastoPorPieza;
            
        } else if (metodologia === 'fijo') {
            // Prorrateo Fijo (factor porcentual manual)
            // Costo Unitario = Precio Base * (1 + Factor%)
            
            const factor = parseFloat(factor_fijo) || 0;
            costoFiscalUnitario = precioBaseMXN * (1 + factor / 100);
            
        } else {
            throw new Error(`Metodología '${metodologia}' no soportada`);
        }

        // Gastos propios de la partida (si aplica)
        const gastosPartida = (item.gastos_adicionales || []).reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
        if (gastosPartida > 0 && cant > 0) {
            costoFiscalUnitario += gastosPartida / cant;
        }

        costoFiscalUnitario = Math.round(costoFiscalUnitario * 100) / 100;

        return {
            ...item,
            costo_fiscal_unitario_mxn: costoFiscalUnitario
        };
    });

    // 4. RETORNO CON AUDITORÍA COMPLETA
    
    return {
        productos: productosCalculados,
        auditoria: {
            // Componentes del cálculo
            valor_compra_comercial_mxn: Math.round(totalCompraMXN * 100) / 100,
            
            gastos_desglosados: {
                impuestos_deducibles: totalImpuestosDeducibles,
                impuestos_detalle: { dta, prv, igi, cnt },
                seguros: seguros,
                fletes: fletes,
                honorarios_agente: totalHonorarios,
                otros: otros,
                total_a_prorratear: Math.round(totalIndirectos * 100) / 100
            },
            
            // Exclusión de IVA ✅
            iva_acreditable_excluido: Math.round(ivaSat * 100) / 100,
            
            // Información de facturas
            cantidad_uuids_cfdi: countUUIDs,
            
            // Método y validación
            metodo_valuacion: pedimento.metodo_valuacion || 'PEPS',
            metodologia_prorrateo: metodologia,
            factor_prorrateo: totalCompraMXN > 0 ? Math.round((totalIndirectos / totalCompraMXN * 100) * 100) / 100 : 0,
            
            // Fórmula aplicada (documentación)
            formula: `Costo = Precio Base + Prorrateo Gastos (${metodologia})\n` +
                     `Costo Total Inventario = Valor Comercial + Gastos Costo + Impuestos (DTA/PRV/IGI/CNT) + Honorarios\n` +
                     `✅ Excluir IVA ($${ivaSat.toFixed(2)}) - 100% acreditable (Ley IVA Art. 4-5, NIF C-4)`
        }
    };
}
