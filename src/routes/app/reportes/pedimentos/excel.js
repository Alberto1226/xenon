import XLSX from 'xlsx';
import * as accesos from '../../accesos.js';
import { obtenerDatosReportePedimentos } from '../../../../services/reportePedimentosService.js';

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) {
        return res.status(401).send("Sesión expirada");
    }

    try {
        const { fecha_inicio, fecha_fin, estatus, buscar } = req.body;

        const resultado = await obtenerDatosReportePedimentos({
            fecha_inicio,
            fecha_fin,
            estatus,
            buscar
        });

        const { kpis, pedimentos, partidas_globales, gastos_globales } = resultado;

        const wb = XLSX.utils.book_new();

        // =========================================================================
        // HOJA 1: RESUMEN MAESTRO DE PEDIMENTOS
        // =========================================================================
        const filasPedimentos = [];
        filasPedimentos.push(["XENON Y MÁS - HISTORIAL Y COSTEO DE PEDIMENTOS SAT"]);
        filasPedimentos.push([`Período: del ${kpis.fecha_inicio} al ${kpis.fecha_fin}`]);
        filasPedimentos.push([`Fecha de Generación: ${new Date().toLocaleString('es-MX')} | Usuario: ${req.user ? (req.user.nombre || req.user.usuario) : 'Usuario'}`]);
        filasPedimentos.push([`Filtro Estatus: ${(estatus || 'todos').toUpperCase()} | Total Pedimentos: ${kpis.total_pedimentos}`]);
        filasPedimentos.push([]); // Renglón en blanco

        filasPedimentos.push([
            "#",
            "Número Pedimento",
            "Clave",
            "Fecha Pedimento",
            "Estatus",
            "Aduana",
            "Patente",
            "Régimen",
            "COVE",
            "Proveedor",
            "País",
            "Tipo de Cambio (MXN)",
            "Valor Comercial (USD)",
            "Valor Aduana (MXN)",
            "Fletes M3 (MXN)",
            "Seguros M3 (MXN)",
            "DTA (MXN)",
            "PRV (MXN)",
            "IGI (MXN)",
            "Total Impuestos Deducibles (MXN)",
            "IVA Importación Acreditable (MXN)",
            "Agente Aduanal (MXN)",
            "Otros Gastos Brutos (MXN)",
            "(-) Devoluciones / Reembolsos (MXN)",
            "Otros Indirectos Neto (MXN)",
            "Total Gastos Indirectos (MXN)",
            "Gastos Directos Partidas (MXN)",
            "Costo Fiscal Consolidado (MXN)",
            "Partidas",
            "Total Piezas"
        ]);

        for (const p of pedimentos) {
            const fechaPedStr = p.fecha_pedimento ? new Date(p.fecha_pedimento).toISOString().slice(0, 10) : '';
            filasPedimentos.push([
                p.indice,
                p.numero_pedimento,
                p.clave_pedimento,
                fechaPedStr,
                p.status === 'arribado' ? 'Arribado' : 'En Tránsito',
                p.aduana_despacho,
                p.patente,
                p.regimen,
                p.cove,
                p.proveedor_nombre,
                p.proveedor_pais,
                p.tipo_cambio,
                p.valor_comercial_usd,
                p.valor_aduana_mxn,
                p.fletes,
                p.seguros,
                p.dta,
                p.prv,
                p.igi,
                p.total_impuestos_deducibles,
                p.iva_importacion,
                p.agente_aduanal,
                p.otros_gastos_brutos,
                p.devoluciones_reembolsos,
                p.otros_indirectos_neto,
                p.total_indirectos_netos,
                p.gastos_directos_partidas,
                p.costo_fiscal_total,
                p.total_partidas,
                p.total_piezas
            ]);
        }

        // Fila de totales
        filasPedimentos.push([]);
        filasPedimentos.push([
            "TOTALES",
            `${kpis.total_pedimentos} pedimentos`,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            kpis.total_valor_comercial_usd,
            kpis.total_valor_aduana_mxn,
            "",
            "",
            "",
            "",
            "",
            kpis.total_impuestos_deducibles,
            "",
            "",
            "",
            kpis.total_devoluciones,
            "",
            kpis.total_gastos_indirectos_netos,
            "",
            kpis.total_costo_fiscal,
            kpis.total_partidas,
            kpis.total_piezas
        ]);

        const wsPedimentos = XLSX.utils.aoa_to_sheet(filasPedimentos);
        wsPedimentos['!cols'] = [
            { wch: 5 },   // #
            { wch: 24 },  // No. Pedimento
            { wch: 8 },   // Clave
            { wch: 14 },  // Fecha
            { wch: 12 },  // Estatus
            { wch: 10 },  // Aduana
            { wch: 10 },  // Patente
            { wch: 10 },  // Régimen
            { wch: 18 },  // COVE
            { wch: 35 },  // Proveedor
            { wch: 8 },   // País
            { wch: 16 },  // TC
            { wch: 20 },  // Valor USD
            { wch: 22 },  // Valor Aduana MXN
            { wch: 16 },  // Fletes
            { wch: 16 },  // Seguros
            { wch: 14 },  // DTA
            { wch: 14 },  // PRV
            { wch: 14 },  // IGI
            { wch: 24 },  // Impuestos Deducibles
            { wch: 26 },  // IVA Acreditable
            { wch: 18 },  // Agente Aduanal
            { wch: 20 },  // Otros Gastos Brutos
            { wch: 26 },  // Devoluciones
            { wch: 22 },  // Otros Neto
            { wch: 24 },  // Total Indirectos
            { wch: 22 },  // Gastos Directos Partidas
            { wch: 26 },  // Costo Fiscal Total
            { wch: 10 },  // Partidas
            { wch: 14 }   // Piezas
        ];
        XLSX.utils.book_append_sheet(wb, wsPedimentos, "Resumen_Pedimentos");

        // =========================================================================
        // HOJA 2: DETALLE DE PARTIDAS Y PRODUCTOS
        // =========================================================================
        const filasPartidas = [];
        filasPartidas.push(["XENON Y MÁS - DETALLE DE PARTIDAS Y COSTEO UNITARIO FISCAL"]);
        filasPartidas.push([`Período: del ${kpis.fecha_inicio} al ${kpis.fecha_fin} | Total Partidas: ${partidas_globales.length}`]);
        filasPartidas.push([]);

        filasPartidas.push([
            "No. Pedimento",
            "Fecha Pedimento",
            "Sec (#)",
            "Fracción Arancelaria",
            "NICO",
            "Código / SKU",
            "Descripción del Producto",
            "Marca",
            "Modelo",
            "Piezas",
            "U.M.",
            "Precio Compra (USD)",
            "Valor Comercial (USD)",
            "Valor Aduana Partida (MXN)",
            "Gastos Directos Partida (MXN)",
            "Costo Fiscal Unitario (MXN)",
            "Costo Fiscal Total Partida (MXN)"
        ]);

        let sumPiezasPart = 0;
        let sumUsdPart = 0;
        let sumAduanaMxnPart = 0;
        let sumDirectosPart = 0;
        let sumCostoFiscalTotalPart = 0;

        for (const item of partidas_globales) {
            const fechaStr = item.fecha_pedimento ? new Date(item.fecha_pedimento).toISOString().slice(0, 10) : '';
            sumPiezasPart += item.cantidad;
            sumUsdPart += item.valor_comercial_usd;
            sumAduanaMxnPart += item.valor_aduana_partida_mxn;
            sumDirectosPart += item.gastos_directos_partida_mxn;
            sumCostoFiscalTotalPart += item.costo_fiscal_total_partida_mxn;

            filasPartidas.push([
                item.numero_pedimento,
                fechaStr,
                item.sec,
                item.fraccion_arancelaria,
                item.nico,
                item.codigo_sku,
                item.producto_nombre,
                item.marca,
                item.modelo,
                item.cantidad,
                item.unidad,
                item.precio_compra_usd,
                item.valor_comercial_usd,
                item.valor_aduana_partida_mxn,
                item.gastos_directos_partida_mxn,
                item.costo_fiscal_unitario_mxn,
                item.costo_fiscal_total_partida_mxn
            ]);
        }

        filasPartidas.push([]);
        filasPartidas.push([
            "TOTALES",
            "",
            "",
            "",
            "",
            "",
            `${partidas_globales.length} partidas`,
            "",
            "",
            sumPiezasPart,
            "",
            "",
            Math.round(sumUsdPart * 100) / 100,
            Math.round(sumAduanaMxnPart * 100) / 100,
            Math.round(sumDirectosPart * 100) / 100,
            "",
            Math.round(sumCostoFiscalTotalPart * 100) / 100
        ]);

        const wsPartidas = XLSX.utils.aoa_to_sheet(filasPartidas);
        wsPartidas['!cols'] = [
            { wch: 24 }, // No. Pedimento
            { wch: 14 }, // Fecha
            { wch: 8 },  // Sec
            { wch: 18 }, // Fracción
            { wch: 8 },  // NICO
            { wch: 18 }, // SKU
            { wch: 38 }, // Producto
            { wch: 16 }, // Marca
            { wch: 16 }, // Modelo
            { wch: 12 }, // Piezas
            { wch: 8 },  // U.M.
            { wch: 18 }, // Precio USD
            { wch: 20 }, // Valor USD
            { wch: 24 }, // Aduana MXN
            { wch: 24 }, // Directos MXN
            { wch: 24 }, // Costo Unitario MXN
            { wch: 26 }  // Costo Total MXN
        ];
        XLSX.utils.book_append_sheet(wb, wsPartidas, "Detalle_Partidas_Productos");

        // =========================================================================
        // HOJA 3: GASTOS, COMPROBANTES Y DEVOLUCIONES
        // =========================================================================
        const filasGastos = [];
        filasGastos.push(["XENON Y MÁS - BITÁCORA DE GASTOS, CFDI Y DEVOLUCIONES DE IMPORTACIÓN"]);
        filasGastos.push([`Período: del ${kpis.fecha_inicio} al ${kpis.fecha_fin} | Total Registros: ${gastos_globales.length}`]);
        filasGastos.push([]);

        filasGastos.push([
            "No. Pedimento",
            "Fecha Movimiento",
            "Tipo de Movimiento",
            "Concepto / Descripción",
            "Monto MXN (Neto)",
            "UUID CFDI (SAT)",
            "No. Factura",
            "RFC Proveedor",
            "Razón Social Proveedor",
            "Observaciones"
        ]);

        let sumGastosTotal = 0;
        for (const g of gastos_globales) {
            const fechaStr = g.fecha_gasto ? new Date(g.fecha_gasto).toISOString().slice(0, 10) : '';
            sumGastosTotal += g.monto;

            filasGastos.push([
                g.numero_pedimento,
                fechaStr,
                g.tipo_texto,
                g.concepto,
                g.monto,
                g.uuid_cfdi,
                g.numero_factura,
                g.rfc_proveedor,
                g.nombre_proveedor,
                g.observaciones
            ]);
        }

        filasGastos.push([]);
        filasGastos.push([
            "TOTALES",
            "",
            "",
            `${gastos_globales.length} movimientos`,
            Math.round(sumGastosTotal * 100) / 100,
            "",
            "",
            "",
            "",
            ""
        ]);

        const wsGastos = XLSX.utils.aoa_to_sheet(filasGastos);
        wsGastos['!cols'] = [
            { wch: 24 }, // No. Pedimento
            { wch: 14 }, // Fecha
            { wch: 22 }, // Tipo
            { wch: 30 }, // Concepto
            { wch: 20 }, // Monto MXN
            { wch: 38 }, // UUID
            { wch: 16 }, // Factura
            { wch: 18 }, // RFC
            { wch: 30 }, // Razón Social
            { wch: 30 }  // Observaciones
        ];
        XLSX.utils.book_append_sheet(wb, wsGastos, "Gastos_Facturas_Devoluciones");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const nombreArchivo = `Reporte_Costeo_Pedimentos_SAT_${kpis.fecha_inicio}_al_${kpis.fecha_fin}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);

    } catch (err) {
        console.error("Error al generar Excel de pedimentos SAT:", err);
        res.status(500).send("Error al generar archivo Excel de pedimentos: " + err.message);
    }
}
