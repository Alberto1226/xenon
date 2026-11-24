import PDFDocument from 'pdfkit';
import * as accesos from '../../accesos.js';
import { obtenerDatosReporteInventario } from '../../../../services/reporteInventarioService.js';

export async function post(req, res) {
    if (!accesos.esta_logueado(req)) {
        return res.status(401).send("Sesión expirada");
    }

    try {
        const { fecha_inicio, fecha_fin, incluir_inactivos, categoria, buscar } = req.body;

        const resultado = await obtenerDatosReporteInventario({
            fecha_inicio,
            fecha_fin,
            incluir_inactivos: incluir_inactivos === true,
            categoria,
            buscar
        });

        const { kpis, productos } = resultado;

        // Configuración de documento PDF apaisado para tabla ancha
        const doc = new PDFDocument({
            size: 'letter',
            layout: 'landscape',
            margins: { top: 35, bottom: 40, left: 35, right: 35 },
            bufferPages: true
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('error', errPdf => {
            console.error("Error en generación de PDFKit:", errPdf);
            if (!res.headersSent) res.status(500).send("Error generando PDF: " + errPdf.message);
        });
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            const nombreArchivo = `Reporte_Inventario_${kpis.fecha_inicio}_al_${kpis.fecha_fin}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.setHeader('Content-Length', pdfBuffer.length);
            res.end(pdfBuffer);
        });

        const formatMoney = num => "$" + Number(num || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatNum = num => Number(num || 0).toLocaleString("es-MX");

        // --- ENCABEZADO INSTITUCIONAL ---
        doc.rect(35, 30, 722, 60).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
           .text('XENON Y MÁS - REPORTE DE MOVIMIENTOS DE INVENTARIO', 48, 42);
        
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
           .text(`Período: del ${kpis.fecha_inicio} al ${kpis.fecha_fin}  |  Emisión: ${new Date().toLocaleDateString('es-MX')}  |  Usuario: ${req.user ? (req.user.nombre || req.user.usuario) : 'Sistema'}`, 48, 64);

        // --- TARJETAS KPI RESUMEN ---
        const kpiY = 100;
        const cardWidth = 138;
        const cardHeight = 44;
        const cardGap = 8;
        
        const kpiItems = [
            { label: 'Total Productos', val: `${formatNum(kpis.total_productos)} SKU`, color: '#1e293b' },
            { label: 'Entradas (+)', val: `+${formatNum(kpis.total_entradas)} pza`, color: '#16a34a' },
            { label: 'Salidas (-)', val: `-${formatNum(kpis.total_salidas)} pza`, color: '#dc2626' },
            { label: 'Existencias Actuales', val: `${formatNum(kpis.total_existencias)} pza`, color: '#0284c7' },
            { label: 'Valor Inventario', val: formatMoney(kpis.total_valor_inventario), color: '#d97706' }
        ];

        kpiItems.forEach((kpi, idx) => {
            const x = 35 + idx * (cardWidth + cardGap);
            doc.rect(x, kpiY, cardWidth, cardHeight).fill('#f8fafc').strokeColor('#cbd5e1').lineWidth(1).stroke();
            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(kpi.label, x + 8, kpiY + 8, { width: cardWidth - 16 });
            doc.fillColor(kpi.color).fontSize(11).font('Helvetica-Bold').text(kpi.val, x + 8, kpiY + 22, { width: cardWidth - 16 });
        });

        // --- TABLA DE DATOS ---
        const tableYStart = 158;
        let currentY = tableYStart;

        const cols = [
            { header: '#', x: 38, w: 24, align: 'center' },
            { header: 'Código / SKU', x: 64, w: 90, align: 'left' },
            { header: 'Descripción del Producto', x: 156, w: 215, align: 'left' },
            { header: 'Entradas', x: 373, w: 68, align: 'right' },
            { header: 'Salidas', x: 443, w: 68, align: 'right' },
            { header: 'Existencia', x: 513, w: 72, align: 'right' },
            { header: 'P. Venta', x: 587, w: 75, align: 'right' },
            { header: 'Valor Total', x: 664, w: 88, align: 'right' }
        ];

        function drawTableHeader(y) {
            doc.rect(35, y, 722, 20).fill('#e2e8f0');
            doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
            cols.forEach(c => {
                doc.text(c.header, c.x, y + 6, { width: c.w, align: c.align });
            });
            return y + 20;
        }

        currentY = drawTableHeader(currentY);

        productos.forEach((p, index) => {
            if (currentY > 540) {
                doc.addPage();
                currentY = 35;
                currentY = drawTableHeader(currentY);
            }

            const rowHeight = 16;
            if (index % 2 === 1) {
                doc.rect(35, currentY, 722, rowHeight).fill('#f8fafc');
            }

            doc.fillColor(p.activo ? '#0f172a' : '#94a3b8').fontSize(7.5).font('Helvetica');

            doc.text(String(p.indice), cols[0].x, currentY + 4, { width: cols[0].w, align: cols[0].align });
            doc.text(p.codigo, cols[1].x, currentY + 4, { width: cols[1].w, align: cols[1].align });
            
            const nombreCorto = p.nombre.length > 44 ? p.nombre.substring(0, 42) + '...' : p.nombre;
            doc.text(nombreCorto + (p.activo ? '' : ' [Inactivo]'), cols[2].x, currentY + 4, { width: cols[2].w, align: cols[2].align });

            doc.fillColor(p.entradas > 0 ? '#16a34a' : '#64748b').text(formatNum(p.entradas), cols[3].x, currentY + 4, { width: cols[3].w, align: cols[3].align });
            doc.fillColor(p.salidas > 0 ? '#dc2626' : '#64748b').text(formatNum(p.salidas), cols[4].x, currentY + 4, { width: cols[4].w, align: cols[4].align });
            doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatNum(p.existencia), cols[5].x, currentY + 4, { width: cols[5].w, align: cols[5].align });
            doc.font('Helvetica').text(formatMoney(p.precio), cols[6].x, currentY + 4, { width: cols[6].w, align: cols[6].align });
            doc.font('Helvetica-Bold').text(formatMoney(p.valorTotal), cols[7].x, currentY + 4, { width: cols[7].w, align: cols[7].align });

            currentY += rowHeight;
        });

        // Totales al final
        if (currentY > 530) {
            doc.addPage();
            currentY = 35;
        }
        doc.rect(35, currentY, 722, 22).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('TOTALES CONSOLIDADOS', cols[1].x, currentY + 6, { width: 250, align: 'left' });
        doc.text(formatNum(kpis.total_entradas), cols[3].x, currentY + 6, { width: cols[3].w, align: cols[3].align });
        doc.text(formatNum(kpis.total_salidas), cols[4].x, currentY + 6, { width: cols[4].w, align: cols[4].align });
        doc.text(formatNum(kpis.total_existencias), cols[5].x, currentY + 6, { width: cols[5].w, align: cols[5].align });
        doc.text(formatMoney(kpis.total_valor_inventario), cols[7].x, currentY + 6, { width: cols[7].w, align: cols[7].align });

        // Numeración de páginas
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
               .text(`Xenon ERP - Reporte de Inventario  |  Página ${i + 1} de ${range.count}`, 35, 575, { width: 722, align: 'center' });
        }

        doc.end();

    } catch (err) {
        console.error("Error al generar PDF de inventario:", err);
        res.status(500).send("Error al generar archivo PDF: " + err.message);
    }
}
