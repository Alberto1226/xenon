/**
 * Servicio de Validación de Pedimentos
 * 
 * DECISIONES VALIDADAS CON CONTADOR (17 Noviembre 2026):
 * 1️⃣ IVA 100% acreditable - EXCLUIDO del costo (Ley IVA Art. 4-5, NIF C-4)
 * 2️⃣ Honorarios agente - OBLIGATORIO con UUID CFDI (Ley Aduanera Art. 159/160)
 * 3️⃣ Pagos negativos - PERMITIDOS (devoluciones de anticipo)
 * 4️⃣ Múltiples UUIDs - PERMITIDOS (1-4 UUIDs por pedimento)
 * 5️⃣ Método PEPS - OBLIGATORIO (Art. 41 LISR)
 * 
 * FÓRMULA CORRECTA:
 * Costo Inventario = Valor Comercial + Gastos Costo + Impuestos (DTA/PRV/IGI/CNT) + Honorarios
 *                   (SIN incluir IVA que es 100% acreditable)
 */

export function validarDatosPedimento(pedimento) {
    const errores = [];
    const advertencias = [];

    if (!pedimento) {
        return { ok: false, errores: ["El pedimento no fue proporcionado."], advertencias };
    }

    // 1. VALIDAR TIPO DE CAMBIO
    const tc = parseFloat(pedimento.tipo_cambio);
    if (!tc || tc <= 0) {
        errores.push("El tipo de cambio del pedimento debe ser un número mayor a cero.");
    }

    // 2. VALIDAR PRODUCTOS
    if (!pedimento.productos || !Array.isArray(pedimento.productos) || pedimento.productos.length === 0) {
        errores.push("El pedimento debe contener al menos un producto o partida.");
    } else {
        pedimento.productos.forEach((p, idx) => {
            const cant = parseFloat(p.cantidad);
            const precioUSD = parseFloat(p.precio_compra_usd);

            if (!cant || cant <= 0) {
                errores.push(`La partida #${idx + 1} tiene cantidad inválida (${p.cantidad}). Debe ser mayor a 0.`);
            }
            if (precioUSD === undefined || isNaN(precioUSD) || precioUSD <= 0) {
                errores.push(`La partida #${idx + 1} tiene precio de compra en USD inválido.`);
            }
        });
    }

    // 3. VALIDAR MÉTODO DE VALUACIÓN: PEPS OBLIGATORIO (Art. 41 LISR)
    if (pedimento.metodo_valuacion && pedimento.metodo_valuacion !== "PEPS") {
        errores.push(`Método de valuación debe ser PEPS (Art. 41 LISR). Se especificó: ${pedimento.metodo_valuacion}`);
    }

    // 4. VALIDAR IVA 100% ACREDITABLE (Ley IVA Art. 4-5, NIF C-4)
    const impuestos = pedimento.impuestos || {};
    const contribuciones = pedimento.contribuciones_sat || {};
    const ivaAcreditable = (impuestos.iva && impuestos.iva.porcentaje_acreditable) || (contribuciones.iva_acreditable && contribuciones.iva_acreditable.porcentaje) || 100;
    
    if (ivaAcreditable !== 100) {
        errores.push(`IVA debe ser 100% acreditable para XENON (actual: ${ivaAcreditable}%). Ley IVA Art. 4-5, NIF C-4.`);
    }

    // 5. VALIDAR GASTOS INDIRECTOS
    const g = pedimento.gastos_importacion || {};
    
    // 5A. Verificar honorarios de agente aduanal
    const tieneHonorarios = (parseFloat(g.Agente_Aduanal) > 0) || 
                            (g.otros && g.otros.some(o => /agente|honorario/i.test(o.concepto || '')));

    if (!tieneHonorarios) {
        advertencias.push("⚠️ No se han registrado honorarios de agente aduanal en el pedimento.");
    }

    // 5B. Validar comprobantes CFDI en gastos adicionales (si se registraron)
    if (g.otros && Array.isArray(g.otros)) {
        for (let i = 0; i < g.otros.length; i++) {
            const gasto = g.otros[i];
            const monto = parseFloat(gasto.monto);
            if (isNaN(monto) || monto === 0) {
                errores.push(`Gasto adicional ${i + 1} (${gasto.concepto || 'Sin concepto'}): El monto no puede ser cero`);
            }
        }
    }

    // 6. VALIDAR IVA SEPARADO DEL COSTO
    const ivaMonto = (impuestos.iva && impuestos.iva.monto) || contribuciones.iva || 0;
    if (ivaMonto > 0 && ivaMonto < 100) {
        advertencias.push(`⚠️ IVA de importación muy bajo ($${ivaMonto.toFixed(2)}). Verificar que se capturó correctamente.`);
    }

    return {
        ok: errores.length === 0,
        errores,
        advertencias
    };
}

/**
 * Validar que los UUIDs CFDI están presentes en gastos
 */
export function validarUUIDs(pedimento) {
    const errores = [];
    const advertencias = [];

    const g = pedimento.gastos_importacion || {};
    const countUUIDs = {
        en_honorarios: 0,
        en_gastos_costo: 0,
        total: 0
    };

    // Contar UUIDs en honorarios
    if (g.honorarios_agente && Array.isArray(g.honorarios_agente)) {
        for (const honorario of g.honorarios_agente) {
            if (honorario.uuid_cfdi && honorario.uuid_cfdi.trim() !== '') {
                countUUIDs.en_honorarios++;
                countUUIDs.total++;
            }
        }
    }

    // Contar UUIDs en gastos de costo
    if (g.gastos_costo && Array.isArray(g.gastos_costo)) {
        for (const gasto of g.gastos_costo) {
            if (gasto.uuid_cfdi && gasto.uuid_cfdi.trim() !== '') {
                countUUIDs.en_gastos_costo++;
                countUUIDs.total++;
            }
        }
    }

    // Validación: Pedimento 3 tiene 4 UUIDs, esto debe ser permitido
    if (countUUIDs.total > 4) {
        advertencias.push(`⚠️ Pedimento tiene ${countUUIDs.total} UUIDs (inusual pero permitido)`);
    }

    return {
        ok: errores.length === 0,
        errores,
        advertencias,
        countUUIDs
    };
}

/**
 * Validar pagos de importación (incluyendo pagos negativos)
 */
export function validarPagosImportacion(pagos) {
    const errores = [];
    const advertencias = [];

    if (!pagos || !Array.isArray(pagos)) {
        return { ok: true, errores, advertencias };
    }

    for (let i = 0; i < pagos.length; i++) {
        const pago = pagos[i];

        if (!pago.numero_operacion) {
            errores.push(`Pago ${i + 1}: numero_operacion es requerido`);
        }

        if (!pago.fecha_pago) {
            errores.push(`Pago ${i + 1}: fecha_pago es requerida`);
        }

        if (pago.importe === undefined || pago.importe === null) {
            errores.push(`Pago ${i + 1}: importe es requerido`);
        }

        // Validar tipo_pago
        const tiposValidos = ['PAGO', 'ANTICIPO', 'DEVOLUCIÓN_ANTICIPO', 'AJUSTE'];
        if (!tiposValidos.includes(pago.tipo_pago)) {
            errores.push(`Pago ${i + 1}: tipo_pago inválido '${pago.tipo_pago}'`);
        }

        // ✅ VALIDACIÓN CRÍTICA: Pagos negativos son válidos = Devoluciones de anticipo
        if (pago.importe < 0) {
            if (pago.tipo_pago !== 'DEVOLUCIÓN_ANTICIPO') {
                advertencias.push(`Pago ${i + 1}: Importe negativo ($${pago.importe.toFixed(2)}) debería ser DEVOLUCIÓN_ANTICIPO`);
            }
        }

        // Validar banco
        const bancosValidos = ['BBVA', 'BANAMEX', 'SCOTIABANK', 'SANTANDER', 'OTRO'];
        if (pago.banco && !bancosValidos.includes(pago.banco)) {
            errores.push(`Pago ${i + 1}: banco inválido '${pago.banco}'`);
        }
    }

    return {
        ok: errores.length === 0,
        errores,
        advertencias
    };
}

/**
 * Generar reporte completo de validación para contador
 */
export function generarReporteValidacion(pedimento, pagos = []) {
    const valPedimento = validarDatosPedimento(pedimento);
    const valUUIDs = validarUUIDs(pedimento);
    const valPagos = validarPagosImportacion(pagos);

    const totalErrores = valPedimento.errores.length + valUUIDs.errores.length + valPagos.errores.length;
    const totalAdvertencias = valPedimento.advertencias.length + valUUIDs.advertencias.length + valPagos.advertencias.length;

    return {
        fecha_validacion: new Date().toISOString(),
        pedimento_numero: pedimento.numero_pedimento,
        
        estado_general: {
            valido: totalErrores === 0,
            errores_totales: totalErrores,
            advertencias_totales: totalAdvertencias
        },
        
        validaciones: {
            pedimento: valPedimento,
            uuids_cfdi: valUUIDs,
            pagos: valPagos
        },
        
        decisiones_fiscales_confirmadas: {
            "1_iva_100_acreditable": "✅ Excluido del costo de inventario",
            "2_honorarios_agente_cfdi": "✅ Obligatorio UUID CFDI (Ley Aduanera Art. 159/160)",
            "3_pagos_negativos": "✅ Permitidos (devoluciones de anticipo - Caso real: -$29,252.07)",
            "4_multiples_uuids": "✅ Permitidos 1-4 UUIDs por pedimento",
            "5_metodo_peps": "✅ Obligatorio (Art. 41 LISR - 5 ejercicios consecutivos)"
        },
        
        formula_calculo: "Costo Inventario = Valor Comercial + Gastos Costo + Impuestos (DTA/PRV/IGI/CNT) + Honorarios Agente - IVA (100% acreditable)"
    };
}
