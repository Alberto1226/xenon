import PDFDocument from 'pdfkit';
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

        const { kpis, pedimentos } = resultado;

        // Configuración de documento PDF apaisado para formato de cédula fiscal
        const doc = new PDFDocument({
            size: 'letter',
            layout: 'landscape',
            margins: { top: 30, bottom: 35, left: 35, right: 35 },
            bufferPages: true
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('error', errPdf => {
            console.error("Error en PDFKit de pedimentos:", errPdf);
            if (!res.headersSent) res.status(500).send("Error generando PDF: " + errPdf.message);
        });
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            const nombreArchivo = `Reporte_Costeo_Pedimentos_SAT_${kpis.fecha_inicio}_al_${kpis.fecha_fin}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer);
        });

        const formatMoney = num => "$" + Number(num || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatNum = num => Number(num || 0).toLocaleString("es-MX");
        const formatDate = d => d ? new Date(d).toLocaleDateString('es-MX') : 'N/A';

        // --- ENCABEZADO INSTITUCIONAL ---
        doc.rect(35, 25, 722, 55).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
           .text('XENON Y MÁS - HISTORIAL Y COSTEO DE PEDIMENTOS SAT', 48, 35);
        
        doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica')
           .text(`Período: del ${kpis.fecha_inicio} al ${kpis.fecha_fin}  |  Estatus: ${(estatus || 'todos').toUpperCase()}  |  Emisión: ${new Date().toLocaleDateString('es-MX')}  |  Usuario: ${req.user ? (req.user.nombre || req.user.usuario) : 'Sistema'}`, 48, 54);

        // --- TARJETAS KPI RESUMEN ---
        const kpiY = 88;
        const cardWidth = 138;
        const cardHeight = 44;
        const cardGap = 8;
        
        const kpiItems = [
            { label: 'Total Pedimentos', val: `${formatNum(kpis.total_pedimentos)} Ped`, color: '#1e293b' },
            { label: 'Piezas Importadas', val: `${formatNum(kpis.total_piezas)} pza`, color: '#0284c7' },
            { label: 'Valor Aduana MXN', val: formatMoney(kpis.total_valor_aduana_mxn), color: '#334155' },
            { label: 'Gastos Indirectos', val: formatMoney(kpis.total_gastos_indirectos_netos), color: '#d97706' },
            { label: 'Costo Fiscal Consolidado', val: formatMoney(kpis.total_costo_fiscal), color: '#15803d' }
        ];

        kpiItems.forEach((kpi, idx) => {
            const x = 35 + idx * (cardWidth + cardGap);
            doc.rect(x, kpiY, cardWidth, cardHeight).fill('#f8fafc').strokeColor('#cbd5e1').lineWidth(1).stroke();
            doc.fillColor('#64748b').fontSize(7.5).font('Helvetica').text(kpi.label, x + 8, kpiY + 7, { width: cardWidth - 16 });
            doc.fillColor(kpi.color).fontSize(10.5).font('Helvetica-Bold').text(kpi.val, x + 8, kpiY + 22, { width: cardWidth - 16 });
        });

        let currentY = 142;

        // --- CÉDULA DE AUDITORÍA POR CADA PEDIMENTO ---
        pedimentos.forEach((p, pIndex) => {
            // Verificar si hay espacio suficiente para la carátula del pedimento
            if (currentY > 440) {
                doc.addPage();
                currentY = 30;
            }

            // 1. Cabecera del Pedimento
            doc.rect(35, currentY, 722, 24).fill('#1e293b');
            doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold')
               .text(`PEDIMENTO #${p.indice}: ${p.numero_pedimento}  |  CLAVE: ${p.clave_pedimento}  |  FECHA: ${formatDate(p.fecha_pedimento)}  |  T.C.: ${p.tipo_cambio.toFixed(4)} MXN`, 42, currentY + 7);
            
            doc.fontSize(8.5).font('Helvetica')
               .text(`ESTATUS: ${p.status.toUpperCase()}  |  PROVEEDOR: ${p.proveedor_nombre} (${p.proveedor_pais})`, 480, currentY + 7, { width: 270, align: 'right' });
            
            currentY += 28;

            // 2. Balanza Financiera a 2 columnas (SAT vs Indirectos)
            const boxW = 356;
            const boxH = 68;

            // Caja Izquierda: SAT M3 & Aduana
            doc.rect(35, currentY, boxW, boxH).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(0.8).stroke();
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('VALOR ADUANA E IMPUESTOS SAT (M3):', 42, currentY + 6);
            
            doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
            doc.text(`Valor Comercial USD: ${formatMoney(p.valor_comercial_usd)}`, 42, currentY + 20);
            doc.text(`Valor Aduana MXN: ${formatMoney(p.valor_aduana_mxn)}`, 42, currentY + 34);
            doc.text(`Incrementables (Fletes/Seguros): ${formatMoney(p.total_incrementables)}`, 42, currentY + 48);

            doc.text(`DTA: ${formatMoney(p.dta)}  |  PRV: ${formatMoney(p.prv)}  |  IGI: ${formatMoney(p.igi)}`, 200, currentY + 20);
            doc.fillColor('#15803d').font('Helvetica-Bold').text(`Impuestos Deducibles: ${formatMoney(p.total_impuestos_deducibles)}`, 200, currentY + 34);
            doc.fillColor('#166534').font('Helvetica').text(`IVA Importación: ${formatMoney(p.iva_importacion)} (100% Acreditable)`, 200, currentY + 48);

            // Caja Derecha: Gastos Indirectos y Devoluciones
            const rightX = 35 + boxW + 10;
            doc.rect(rightX, currentY, boxW, boxH).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(0.8).stroke();
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text('GASTOS INDIRECTOS Y PRORRATEO:', rightX + 8, currentY + 6);

            doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
            doc.text(`Agente Aduanal: ${formatMoney(p.agente_aduanal)}`, rightX + 8, currentY + 20);
            doc.text(`Otros Gastos Brutos: ${formatMoney(p.otros_gastos_brutos)}`, rightX + 8, currentY + 34);
            
            // Devoluciones en rojo
            if (p.devoluciones_reembolsos < 0) {
                doc.fillColor('#dc2626').font('Helvetica-Bold').text(`(-) Devoluciones / Reembolsos: ${formatMoney(p.devoluciones_reembolsos)}`, rightX + 8, currentY + 48);
            } else {
                doc.fillColor('#64748b').text(`Devoluciones / Reembolsos: $0.00`, rightX + 8, currentY + 48);
            }

            doc.fillColor('#d97706').font('Helvetica-Bold').text(`Total Indirectos Netos: ${formatMoney(p.total_indirectos_netos)}`, rightX + 185, currentY + 20);
            doc.fillColor('#475569').font('Helvetica').text(`Gastos Directos Partidas: ${formatMoney(p.gastos_directos_partidas)}`, rightX + 185, currentY + 34);
            doc.fillColor('#15803d').font('Helvetica-Bold').text(`COSTO TOTAL PEDIMENTO: ${formatMoney(p.costo_fiscal_total)}`, rightX + 185, currentY + 48);

            currentY += boxH + 8;

            // 3. Subtabla de Partidas / Productos del Pedimento
            if (p.partidas && p.partidas.length > 0) {
                // Verificar salto de página para partidas
                if (currentY > 480) {
                    doc.addPage();
                    currentY = 30;
                }

                // Header de partidas
                doc.rect(35, currentY, 722, 16).fill('#e2e8f0');
                doc.fillColor('#1e293b').fontSize(7.5).font('Helvetica-Bold');
                doc.text('SEC', 38, currentY + 4, { width: 22, align: 'center' });
                doc.text('SKU / CÓDIGO', 64, currentY + 4, { width: 95, align: 'left' });
                doc.text('DESCRIPCIÓN DEL PRODUCTO', 162, currentY + 4, { width: 200, align: 'left' });
                doc.text('PIEZAS', 365, currentY + 4, { width: 50, align: 'right' });
                doc.text('PRECIO USD', 420, currentY + 4, { width: 65, align: 'right' });
                doc.text('VALOR ADUANA MXN', 490, currentY + 4, { width: 85, align: 'right' });
                doc.text('COSTO UNIT. MXN', 580, currentY + 4, { width: 80, align: 'right' });
                doc.text('COSTO TOTAL MXN', 665, currentY + 4, { width: 88, align: 'right' });

                currentY += 16;

                p.partidas.forEach((part, partIdx) => {
                    if (currentY > 540) {
                        doc.addPage();
                        currentY = 30;
                    }

                    if (partIdx % 2 === 1) {
                        doc.rect(35, currentY, 722, 14).fill('#f8fafc');
                    }

                    doc.fillColor('#1e293b').fontSize(7).font('Helvetica');
                    doc.text(String(part.sec), 38, currentY + 3, { width: 22, align: 'center' });
                    doc.font('Helvetica-Bold').text(part.codigo_sku, 64, currentY + 3, { width: 95, align: 'left' });
                    
                    const descCorta = part.producto_nombre.length > 40 ? part.producto_nombre.substring(0, 38) + '...' : part.producto_nombre;
                    doc.font('Helvetica').text(descCorta, 162, currentY + 3, { width: 200, align: 'left' });

                    doc.text(formatNum(part.cantidad) + ' ' + part.unidad, 365, currentY + 3, { width: 50, align: 'right' });
                    doc.text(formatMoney(part.precio_compra_usd), 420, currentY + 3, { width: 65, align: 'right' });
                    doc.text(formatMoney(part.valor_aduana_partida_mxn), 490, currentY + 3, { width: 85, align: 'right' });
                    doc.fillColor('#15803d').font('Helvetica-Bold').text(formatMoney(part.costo_fiscal_unitario_mxn), 580, currentY + 3, { width: 80, align: 'right' });
                    doc.fillColor('#0f172a').text(formatMoney(part.costo_fiscal_total_partida_mxn), 665, currentY + 3, { width: 88, align: 'right' });

                    currentY += 14;
                });
            }

            // 4. Subtabla de Comprobantes CFDI y Devoluciones del Pedimento
            if (p.gastos && p.gastos.length > 0) {
                if (currentY > 490) {
                    doc.addPage();
                    currentY = 30;
                }

                currentY += 4;
                doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text('COMPROBANTES CFDI, GASTOS Y DEVOLUCIONES ASOCIADAS:', 35, currentY);
                currentY += 11;

                p.gastos.forEach(gItem => {
                    if (currentY > 540) {
                        doc.addPage();
                        currentY = 30;
                    }

                    const isDevolucion = gItem.monto < 0;
                    doc.rect(35, currentY, 722, 13).fill(isDevolucion ? '#fef2f2' : '#f8fafc');

                    doc.fillColor(isDevolucion ? '#b91c1c' : '#334155').fontSize(6.8).font('Helvetica');
                    doc.text(`• ${gItem.tipo_texto}: ${gItem.concepto}`, 40, currentY + 2.5, { width: 200, align: 'left' });
                    doc.text(`Factura: ${gItem.numero_factura || 'S/N'}  |  RFC: ${gItem.rfc_proveedor || 'N/A'}`, 245, currentY + 2.5, { width: 180, align: 'left' });
                    doc.text(`UUID: ${gItem.uuid_cfdi || 'Sin UUID registrado'}`, 430, currentY + 2.5, { width: 200, align: 'left' });
                    
                    doc.font('Helvetica-Bold').text(formatMoney(gItem.monto), 635, currentY + 2.5, { width: 115, align: 'right' });

                    currentY += 13;
                });
            }

            currentY += 16; // Espacio entre pedimentos
        });

        // --- NÚMEROS DE PÁGINA ---
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
               .text(`Xenon ERP - Historial y Costeo de Pedimentos SAT  |  Página ${i + 1} de ${range.count}`, 35, 575, { width: 722, align: 'center' });
        }

        doc.end();

    } catch (err) {
        console.error("Error al generar PDF de pedimentos SAT:", err);
        res.status(500).send("Error al generar archivo PDF de pedimentos: " + err.message);
    }
}
