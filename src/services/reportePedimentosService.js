import { Pedimento } from '../models/pedimento.js';
import { Producto } from '../models/producto.js';

/**
 * Servicio de extracción y consolidación de datos para el Historial de Pedimentos SAT.
 * 
 * @param {Object} params
 * @param {Date|string} params.fecha_inicio
 * @param {Date|string} params.fecha_fin
 * @param {string} [params.estatus='todos'] 'todos' | 'arribado' | 'transito'
 * @param {string} [params.buscar='']
 * @returns {Promise<{ kpis: Object, muestra: Array, pedimentos: Array, partidas_globales: Array, gastos_globales: Array }>}
 */
export async function obtenerDatosReportePedimentos({
    fecha_inicio,
    fecha_fin,
    estatus = 'todos',
    buscar = ''
}) {
    // 1. Normalizar fechas
    let dInicio;
    if (fecha_inicio) {
        dInicio = new Date(fecha_inicio);
    } else {
        // Por defecto primer día del año en curso
        const ahora = new Date();
        dInicio = new Date(ahora.getFullYear(), 0, 1);
    }
    dInicio.setHours(0, 0, 0, 0);

    const dFin = fecha_fin ? new Date(fecha_fin) : new Date();
    dFin.setHours(23, 59, 59, 999);

    // 2. Construir query de búsqueda
    const query = {
        fecha_pedimento: { $gte: dInicio, $lte: dFin }
    };

    if (estatus && estatus !== 'todos') {
        query.status = estatus;
    }

    if (buscar && buscar.trim() !== '') {
        const regex = new RegExp(buscar.trim(), 'i');
        query.$or = [
            { numero_pedimento: regex },
            { 'proveedor.nombre': regex },
            { cove: regex },
            { patente: regex }
        ];
    }

    // 3. Consultar pedimentos ordenados por fecha descendente
    const pedimentosDB = await Pedimento.find(query)
        .populate('productos.producto', 'nombre codigo category precio')
        .sort({ fecha_pedimento: -1 })
        .lean()
        .exec();

    // 4. Variables de consolidación para KPIs
    let totalPiezas = 0;
    let totalPartidas = 0;
    let totalValorAduanaMXN = 0;
    let totalValorComercialUSD = 0;
    let totalImpuestosDeducibles = 0;
    let totalIncrementables = 0;
    let totalGastosIndirectosNetos = 0;
    let totalDevoluciones = 0;
    let totalCostoFiscalConsolidado = 0;

    const partidasGlobales = [];
    const gastosGlobales = [];

    // 5. Procesar cada pedimento y sus subdocumentos
    const pedimentosProcesados = pedimentosDB.map((ped, index) => {
        const tc = parseFloat(ped.tipo_cambio) || 1;
        const inc = ped.incrementables_sat || {};
        const cont = ped.contribuciones_sat || {};
        const imp = ped.impuestos || {};
        const g = ped.gastos_importacion || {};

        // Impuestos deducibles (DTA + PRV + IGI + CNT)
        const dta = parseFloat(imp.dta || cont.dta || 0) || 0;
        const prv = parseFloat(imp.prv || cont.prv || 0) || 0;
        const igi = parseFloat(imp.igi || cont.igi || 0) || 0;
        const cnt = parseFloat(imp.cnt || cont.cnt || 0) || 0;
        const impuestosDeducibles = dta + prv + igi + cnt;

        // IVA de importación (100% acreditable - referencial, no forma parte del costo)
        const ivaImportacion = parseFloat(
            (imp.iva && imp.iva.monto) || 
            cont.iva || 
            (cont.iva_acreditable && cont.iva_acreditable.monto_acreditable) || 
            0
        ) || 0;

        // Fletes y Seguros
        const fletes = parseFloat(inc.fletes || g.Flete || 0) || 0;
        const seguros = parseFloat(inc.seguros || g.Seguro || 0) || 0;
        const otrosIncrementables = parseFloat(inc.otros || 0) || 0;
        const totalIncrementablesPed = fletes + seguros + otrosIncrementables;

        // Honorarios de agente aduanal
        let agenteAduanal = parseFloat(g.Agente_Aduanal || 0) || 0;
        if (Array.isArray(g.honorarios_agente) && g.honorarios_agente.length > 0) {
            agenteAduanal = g.honorarios_agente.reduce((acc, h) => acc + (parseFloat(h.importe) || 0), 0);
        }

        // Otros gastos brutos vs devoluciones (negativas)
        let otrosGastosBrutos = 0;
        let devolucionesReembolsos = 0;
        const listaGastosPed = [];

        // Integrar honorarios de agente como gasto detallado si existen
        if (Array.isArray(g.honorarios_agente) && g.honorarios_agente.length > 0) {
            g.honorarios_agente.forEach(ha => {
                const monto = parseFloat(ha.importe) || 0;
                listaGastosPed.push({
                    tipo: 'HONORARIOS_AGENTE',
                    tipo_texto: 'Honorarios Agente Aduanal',
                    concepto: 'Honorarios Agente Aduanal',
                    monto,
                    uuid_cfdi: ha.uuid_cfdi || '',
                    numero_factura: ha.numero_factura || '',
                    rfc_proveedor: ha.rfc_agente || '',
                    nombre_proveedor: 'Agente Aduanal',
                    fecha_gasto: ha.fecha_factura || ped.fecha_pedimento,
                    observaciones: 'CFDI Honorarios SAT'
                });
            });
        } else if (agenteAduanal > 0) {
            listaGastosPed.push({
                tipo: 'HONORARIOS_AGENTE',
                tipo_texto: 'Honorarios Agente Aduanal',
                concepto: 'Honorarios Agente Aduanal',
                monto: agenteAduanal,
                uuid_cfdi: '',
                numero_factura: '',
                rfc_proveedor: '',
                nombre_proveedor: 'Agente Aduanal',
                fecha_gasto: ped.fecha_pedimento,
                observaciones: 'Registro directo'
            });
        }

        // Integrar gastos_costo si existen
        if (Array.isArray(g.gastos_costo) && g.gastos_costo.length > 0) {
            g.gastos_costo.forEach(gc => {
                const monto = parseFloat(gc.importe) || 0;
                if (monto >= 0) otrosGastosBrutos += monto;
                else devolucionesReembolsos += monto;

                listaGastosPed.push({
                    tipo: gc.tipo || 'OTRO_COSTO',
                    tipo_texto: gc.tipo === 'FLETE' ? 'Flete' : (gc.tipo === 'SEGUROS' ? 'Seguro' : 'Otro Costo'),
                    concepto: gc.tipo || 'Gasto de Costo',
                    monto,
                    uuid_cfdi: gc.uuid_cfdi || '',
                    numero_factura: gc.numero_factura || '',
                    rfc_proveedor: gc.rfc_proveedor || '',
                    nombre_proveedor: '',
                    fecha_gasto: gc.fecha_factura || ped.fecha_pedimento,
                    observaciones: gc.fuente || 'SAT_M3'
                });
            });
        }

        // Integrar lista de 'otros' gastos
        if (Array.isArray(g.otros) && g.otros.length > 0) {
            g.otros.forEach(o => {
                const monto = parseFloat(o.monto) || 0;
                if (monto >= 0) otrosGastosBrutos += monto;
                else devolucionesReembolsos += monto;

                const fac = o.factura || {};
                const prov = o.proveedor || {};

                listaGastosPed.push({
                    tipo: monto < 0 ? 'DEVOLUCION' : 'GASTO_EXTRA',
                    tipo_texto: monto < 0 ? 'Devolución / Reembolso' : 'Gasto Extra',
                    concepto: o.concepto || (monto < 0 ? 'Devolución' : 'Gasto General'),
                    monto,
                    uuid_cfdi: o.uuid_cfdi || fac.uuid || '',
                    numero_factura: fac.numero || '',
                    rfc_proveedor: prov.rfc || '',
                    nombre_proveedor: prov.nombre || '',
                    fecha_gasto: o.fecha_gasto || fac.fecha_emision || ped.fecha_pedimento,
                    observaciones: o.observaciones || ''
                });
            });
        }

        // Total indirectos neto a prorratear (Fletes + Seguros + Impuestos + Agente + Gastos Brutos + Devoluciones [-])
        const otrosIndirectosNeto = otrosGastosBrutos + devolucionesReembolsos;
        const totalIndirectosNetos = fletes + seguros + otrosIncrementables + impuestosDeducibles + agenteAduanal + otrosIndirectosNeto;

        // Procesar Partidas y Productos
        let piezasPed = 0;
        let valorAduanaPedMXN = 0;
        let valorComercialPedUSD = 0;
        let gastosDirectosPartidasPed = 0;
        let costoFiscalTotalPartidasPed = 0;

        const partidasPed = (ped.productos || []).map((part, pIdx) => {
            const cant = parseFloat(part.cantidad) || 0;
            const precioUSD = parseFloat(part.precio_compra_usd) || 0;
            const totalUSD = cant * precioUSD;
            const valorAduanaPartidaMXN = parseFloat(part.valor_aduana_partida_mxn) || (totalUSD * tc);
            const costoFiscalUnitarioMXN = parseFloat(part.costo_fiscal_unitario_mxn) || 0;
            const costoFiscalTotalPartida = costoFiscalUnitarioMXN * cant;

            // Gastos adicionales directos por partida (ej. etiquetado exclusivo)
            let gastosDirectosPartida = 0;
            if (Array.isArray(part.gastos_adicionales)) {
                gastosDirectosPartida = part.gastos_adicionales.reduce((acc, ga) => acc + (parseFloat(ga.monto) || 0), 0);
            }

            piezasPed += cant;
            valorAduanaPedMXN += valorAduanaPartidaMXN;
            valorComercialPedUSD += totalUSD;
            gastosDirectosPartidasPed += gastosDirectosPartida;
            costoFiscalTotalPartidasPed += costoFiscalTotalPartida;

            const prodObj = part.producto || {};
            const itemPartida = {
                indice: pIdx + 1,
                id_pedimento: ped._id,
                numero_pedimento: ped.numero_pedimento,
                fecha_pedimento: ped.fecha_pedimento,
                sec: part.sec || (pIdx + 1),
                fraccion_arancelaria: part.fraccion_arancelaria || '',
                nico: part.nico || '00',
                codigo_sku: prodObj.codigo || part.modelo || 'S/C',
                producto_nombre: prodObj.nombre || part.modelo || 'Partida sin nombre',
                marca: part.marca || (prodObj.marca || ''),
                modelo: part.modelo || '',
                cantidad: cant,
                unidad: part.unidad_medida || 'Pza',
                precio_compra_usd: precioUSD,
                valor_comercial_usd: Math.round(totalUSD * 100) / 100,
                valor_aduana_partida_mxn: Math.round(valorAduanaPartidaMXN * 100) / 100,
                gastos_directos_partida_mxn: Math.round(gastosDirectosPartida * 100) / 100,
                costo_fiscal_unitario_mxn: Math.round(costoFiscalUnitarioMXN * 100) / 100,
                costo_fiscal_total_partida_mxn: Math.round(costoFiscalTotalPartida * 100) / 100
            };

            partidasGlobales.push(itemPartida);
            return itemPartida;
        });

        // Registrar gastos en la lista global
        listaGastosPed.forEach(gItem => {
            gastosGlobales.push({
                ...gItem,
                id_pedimento: ped._id,
                numero_pedimento: ped.numero_pedimento,
                fecha_pedimento: ped.fecha_pedimento
            });
        });

        // Si el pedimento tiene valor_aduana_mxn declarado en cabecera, respetarlo o tomar la suma de partidas
        const valorAduanaFinalPed = parseFloat(ped.valor_aduana_mxn) > 0 ? parseFloat(ped.valor_aduana_mxn) : valorAduanaPedMXN;
        const valorDolaresFinalPed = parseFloat(ped.valor_dolares) > 0 ? parseFloat(ped.valor_dolares) : valorComercialPedUSD;
        
        // Costo Fiscal Total del Pedimento
        const costoFiscalTotalPed = costoFiscalTotalPartidasPed > 0 
            ? costoFiscalTotalPartidasPed 
            : (valorAduanaFinalPed + totalIndirectosNetos + gastosDirectosPartidasPed);

        // Sumatorias para KPIs Globales
        totalPiezas += piezasPed;
        totalPartidas += partidasPed.length;
        totalValorAduanaMXN += valorAduanaFinalPed;
        totalValorComercialUSD += valorDolaresFinalPed;
        totalImpuestosDeducibles += impuestosDeducibles;
        totalIncrementables += totalIncrementablesPed;
        totalGastosIndirectosNetos += totalIndirectosNetos;
        totalDevoluciones += devolucionesReembolsos;
        totalCostoFiscalConsolidado += costoFiscalTotalPed;

        return {
            indice: index + 1,
            id: ped._id,
            numero_pedimento: ped.numero_pedimento,
            clave_pedimento: ped.clave_pedimento || 'A1',
            fecha_pedimento: ped.fecha_pedimento,
            tipo_cambio: tc,
            aduana_despacho: ped.aduana_despacho || '160',
            patente: ped.patente || '3387',
            regimen: ped.regimen || 'IMD',
            cove: ped.cove || '',
            status: ped.status || 'transito',
            fecha_arribo: ped.fecha_arribo || null,
            proveedor_nombre: (ped.proveedor && ped.proveedor.nombre) ? ped.proveedor.nombre : 'Sin proveedor',
            proveedor_tax_id: (ped.proveedor && ped.proveedor.tax_id) ? ped.proveedor.tax_id : '',
            proveedor_pais: (ped.proveedor && ped.proveedor.pais) ? ped.proveedor.pais : 'CHN',
            valor_comercial_usd: Math.round(valorDolaresFinalPed * 100) / 100,
            valor_aduana_mxn: Math.round(valorAduanaFinalPed * 100) / 100,
            
            // Impuestos e Incrementables
            fletes,
            seguros,
            otros_incrementables: otrosIncrementables,
            total_incrementables: totalIncrementablesPed,
            dta,
            prv,
            igi,
            cnt,
            total_impuestos_deducibles: impuestosDeducibles,
            iva_importacion: ivaImportacion,
            
            // Indirectos y Devoluciones
            agente_aduanal: agenteAduanal,
            otros_gastos_brutos: otrosGastosBrutos,
            devoluciones_reembolsos: devolucionesReembolsos,
            otros_indirectos_neto: otrosIndirectosNeto,
            total_indirectos_netos: totalIndirectosNetos,
            gastos_directos_partidas: gastosDirectosPartidasPed,
            costo_fiscal_total: Math.round(costoFiscalTotalPed * 100) / 100,
            
            total_partidas: partidasPed.length,
            total_piezas: piezasPed,
            partidas: partidasPed,
            gastos: listaGastosPed
        };
    });

    const kpis = {
        total_pedimentos: pedimentosProcesados.length,
        total_partidas: totalPartidas,
        total_piezas: totalPiezas,
        total_valor_comercial_usd: Math.round(totalValorComercialUSD * 100) / 100,
        total_valor_aduana_mxn: Math.round(totalValorAduanaMXN * 100) / 100,
        total_impuestos_deducibles: Math.round(totalImpuestosDeducibles * 100) / 100,
        total_gastos_indirectos_netos: Math.round(totalGastosIndirectosNetos * 100) / 100,
        total_devoluciones: Math.round(totalDevoluciones * 100) / 100,
        total_costo_fiscal: Math.round(totalCostoFiscalConsolidado * 100) / 100,
        fecha_inicio: dInicio.toISOString().slice(0, 10),
        fecha_fin: dFin.toISOString().slice(0, 10),
        estatus
    };

    // Muestra de los primeros 5 pedimentos para visualización en el modal
    const muestra = pedimentosProcesados.slice(0, 5);

    return {
        kpis,
        muestra,
        pedimentos: pedimentosProcesados,
        partidas_globales: partidasGlobales,
        gastos_globales: gastosGlobales
    };
}
