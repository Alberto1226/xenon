import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import { Carrito } from '../../../../models/carrito';
import { Pedido } from '../../../../models/pedido';
import { Carrito_cancelado } from '../../../../models/carrito_cancelado';
import { Producto } from '../../../../models/producto';
import * as accesos from '../../accesos';

export async function get(req, res) {
    if (!accesos.esta_logueado(req)) {
        return res.status(401).send('Sesión expirada.');
    }
    if (!accesos.tiene_permisos_administrativos(req) || req.user.usuario !== 'isotech_Xenonymas') {
        return res.status(403).send('Acceso restringido al usuario autorizado.');
    }

    const folioParam = req.query.folio;
    if (!/^[1-9]\d*$/.test(String(folioParam))) {
        return res.status(400).send('Folio inválido.');
    }
    const folio = Number(folioParam);

    try {
        // Consultar el pedido para obtener datos del cliente y lista
        const [carritos, pedidos, cancelados] = await Promise.all([
            Carrito.collection.find({ folio: { $in: [folio, String(folio)] } }).toArray(),
            Pedido.collection.find({ folio: { $in: [folio, String(folio)] } }).toArray(),
            Carrito_cancelado.collection.find({ folio: { $in: [folio, String(folio)] } }).toArray()
        ]);
        const ordenes = carritos.concat(pedidos).concat(cancelados);
        const orden = ordenes[0] || { folio, cliente: { nombre: 'Cliente no identificado' } };
        const clienteNombre = (orden.cliente && orden.cliente.nombre) || 'Cliente sin nombre';

        // Consultar los productos que tienen registrada la corrección para este folio
        const productosDB = await Producto.collection.find({
            'correcciones_salida_duplicada.folio': { $in: [folio, String(folio)] }
        }, {
            projection: { _id: 1, nombre: 1, codigo: 1, existencia: 1, unidad: 1, marca: 1, correcciones_salida_duplicada: 1 }
        }).sort({ codigo: 1, nombre: 1 }).toArray();

        // Mapear los productos corregidos
        let items = productosDB.map(p => {
            const c = Array.isArray(p.correcciones_salida_duplicada)
                ? p.correcciones_salida_duplicada.find(x => Number(x.folio) === folio)
                : null;
            return {
                id: String(p._id),
                codigo: p.codigo || 'S/C',
                nombre: p.nombre || 'Sin nombre',
                unidad: p.unidad || 'Pza',
                marca: p.marca || '',
                stock_actual: p.existencia && Number.isFinite(p.existencia.actual) ? p.existencia.actual : 0,
                reincorporado: c && c.cantidad ? c.cantidad : 1,
                fecha_correccion: c && c.snaplog && c.snaplog.fecha ? new Date(c.snaplog.fecha) : new Date()
            };
        });

        // Si aún no tenían la marca en DB pero están en la orden, traer las partidas de la orden
        if (items.length === 0 && orden && Array.isArray(orden.lista)) {
            const ids = orden.lista.map(i => i.producto && i.producto._id).filter(id => id && mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(String(id)));
            const prodsOrden = await Producto.collection.find({ _id: { $in: ids } }).toArray();
            items = orden.lista.map(item => {
                const prod = prodsOrden.find(p => String(p._id) === String(item.producto && item.producto._id));
                return {
                    id: String(item.producto && item.producto._id),
                    codigo: (item.producto && item.producto.codigo) || (prod && prod.codigo) || 'S/C',
                    nombre: (item.producto && item.producto.nombre) || (prod && prod.nombre) || 'Sin nombre',
                    unidad: (item.producto && item.producto.unidad) || 'Pza',
                    stock_actual: prod && prod.existencia && Number.isFinite(prod.existencia.actual) ? prod.existencia.actual : 0,
                    reincorporado: item.cantidad || 1,
                    fecha_correccion: new Date()
                };
            });
        }

        // Crear el documento PDF con PDFKit
        const doc = new PDFDocument({
            size: 'LETTER',
            bufferPages: true,
            margins: { top: 30, bottom: 20, left: 36, right: 36 }
        });

        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="corroboracion_fisica_folio_${folio}.pdf"`);
            res.end(pdfData);
        });

        const fechaImpresion = new Date().toLocaleString('es-MX', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Función para dibujar encabezado institucional en cada página
        function dibujarEncabezado() {
            doc.save();
            // Barra superior
            doc.rect(36, 30, 540, 4).fill('#16785c');

            // Títulos
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#16785c')
                .text('CORROBORACIÓN DE EXISTENCIAS FÍSICAS EN ALMACÉN', 36, 40, { width: 540, align: 'center' });
            
            doc.font('Helvetica').fontSize(9).fillColor('#4a5e62')
                .text('Auditoría de Reincorporación por Salidas Duplicadas · Sistema Xenon', 36, 56, { width: 540, align: 'center' });

            // Cuadro de datos del pedido
            doc.rect(36, 70, 540, 52).fillAndStroke('#f4f8f7', '#d0e1dc');

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#233942')
                .text(`Folio del Pedido:`, 46, 78)
                .text(`Cliente:`, 46, 92)
                .text(`Fecha de Emisión:`, 46, 106);

            doc.font('Helvetica').fontSize(9).fillColor('#16785c')
                .text(`#${folio}`, 130, 78);
            doc.font('Helvetica').fontSize(9).fillColor('#233942')
                .text(clienteNombre, 130, 92, { width: 220, ellipsis: true })
                .text(fechaImpresion, 130, 106);

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#233942')
                .text(`Total Productos:`, 370, 78)
                .text(`Auditor:`, 370, 92)
                .text(`Estatus:`, 370, 106);

            doc.font('Helvetica').fontSize(9).fillColor('#233942')
                .text(`${items.length} producto(s) corregido(s)`, 450, 78)
                .text(`Soporte Isotech`, 450, 92);
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#14583e')
                .text(`CORREGIDO EN SISTEMA`, 450, 106);

            // Instrucción para almacén
            doc.rect(36, 126, 540, 20).fill('#fff8e8');
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#825300')
                .text('INSTRUCCIÓN PARA ALMACÉN:', 42, 131, { continued: true })
                .font('Helvetica').fillColor('#5c4300')
                .text(' Contar físicamente en anaquel cada producto y anotar la cantidad real en la columna "Físico Real".', { continued: false });

            doc.restore();
        }

        // Encabezados de la tabla
        const colW = { num: 24, cod: 85, desc: 195, reinc: 48, stock: 72, fisico: 74, check: 42 };
        const colX = {
            num: 36,
            cod: 36 + 24,
            desc: 36 + 24 + 85,
            reinc: 36 + 24 + 85 + 195,
            stock: 36 + 24 + 85 + 195 + 48,
            fisico: 36 + 24 + 85 + 195 + 48 + 72,
            check: 36 + 24 + 85 + 195 + 48 + 72 + 74
        };

        function dibujarCabeceraTabla(yPos) {
            doc.save();
            doc.rect(36, yPos, 540, 18).fill('#16785c');

            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('white');
            doc.text('#', colX.num, yPos + 5, { width: colW.num, align: 'center' });
            doc.text('CÓDIGO', colX.cod + 4, yPos + 5, { width: colW.cod - 4, align: 'left' });
            doc.text('DESCRIPCIÓN DEL PRODUCTO', colX.desc + 4, yPos + 5, { width: colW.desc - 4, align: 'left' });
            doc.text('REINC.', colX.reinc, yPos + 5, { width: colW.reinc, align: 'center' });
            doc.text('STOCK SISTEMA', colX.stock, yPos + 5, { width: colW.stock, align: 'center' });
            doc.text('FÍSICO REAL', colX.fisico, yPos + 5, { width: colW.fisico, align: 'center' });
            doc.text('V.B. [ ✓ ]', colX.check, yPos + 5, { width: colW.check, align: 'center' });
            doc.restore();
        }

        dibujarEncabezado();
        let currentY = 152;
        dibujarCabeceraTabla(currentY);
        currentY += 18;

        // Iterar productos
        doc.font('Helvetica').fontSize(7.5);
        items.forEach((item, index) => {
            // Verificar si cabe en la página actual
            if (currentY > 690) {
                doc.addPage();
                dibujarEncabezado();
                currentY = 152;
                dibujarCabeceraTabla(currentY);
                currentY += 18;
            }

            const rowHeight = 17;
            const bgFila = index % 2 === 0 ? '#ffffff' : '#f9fbfb';

            doc.save();
            doc.rect(36, currentY, 540, rowHeight).fillAndStroke(bgFila, '#e5edea');

            doc.fillColor('#233942');
            doc.font('Helvetica').fontSize(7.5);

            // 1. #
            doc.text(String(index + 1), colX.num, currentY + 4, { width: colW.num, align: 'center' });

            // 2. Código
            doc.font('Helvetica-Bold').text(item.codigo, colX.cod + 4, currentY + 4, { width: colW.cod - 8, ellipsis: true });

            // 3. Descripción
            doc.font('Helvetica').text(item.nombre, colX.desc + 4, currentY + 4, { width: colW.desc - 8, ellipsis: true });

            // 4. Reincorporado (+X)
            doc.font('Helvetica-Bold').fillColor('#16785c')
                .text(`+${item.reincorporado}`, colX.reinc, currentY + 4, { width: colW.reinc, align: 'center' });

            // 5. Stock Sistema (Físico esperado)
            doc.font('Helvetica-Bold').fillColor('#0b4f3b')
                .text(String(item.stock_actual), colX.stock, currentY + 4, { width: colW.stock, align: 'center' });

            // 6. Físico Real (Cuadro o línea en blanco para escribir)
            doc.rect(colX.fisico + 12, currentY + 3, colW.fisico - 24, 11).strokeColor('#8aa6a0').stroke();

            // 7. Visto Bueno ([  ])
            doc.rect(colX.check + 15, currentY + 3, 11, 11).strokeColor('#8aa6a0').stroke();

            doc.restore();
            currentY += rowHeight;
        });

        // Sección de Firmas de Auditoría
        if (currentY > 620) {
            doc.addPage();
            dibujarEncabezado();
            currentY = 160;
        } else {
            currentY += 15;
        }

        doc.save();
        doc.rect(36, currentY, 540, 75).fillAndStroke('#f8faf9', '#d5dfe0');

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#16785c')
            .text('FIRMAS DE CONFORMIDAD Y AUDITORÍA DE INVENTARIO', 36, currentY + 7, { width: 540, align: 'center' });

        const firmaY = currentY + 44;
        // Firma 1: Auditó Sistema
        doc.moveTo(60, firmaY).lineTo(200, firmaY).strokeColor('#4a5e62').stroke();
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#233942')
            .text('Auditado en Sistema', 60, firmaY + 3, { width: 140, align: 'center' });
        doc.font('Helvetica').fontSize(6.5).fillColor('#607679')
            .text('Soporte Isotech (isotech_Xenonymas)', 60, firmaY + 12, { width: 140, align: 'center' });

        // Firma 2: Conteo Almacén
        doc.moveTo(235, firmaY).lineTo(375, firmaY).strokeColor('#4a5e62').stroke();
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#233942')
            .text('Conteo Físico en Almacén', 235, firmaY + 3, { width: 140, align: 'center' });
        doc.font('Helvetica').fontSize(6.5).fillColor('#607679')
            .text('Nombre y Firma del Almacenista', 235, firmaY + 12, { width: 140, align: 'center' });

        // Firma 3: Validación Supervisor
        doc.moveTo(410, firmaY).lineTo(550, firmaY).strokeColor('#4a5e62').stroke();
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#233942')
            .text('Supervisor de Inventario', 410, firmaY + 3, { width: 140, align: 'center' });
        doc.font('Helvetica').fontSize(6.5).fillColor('#607679')
            .text('Fecha de Verificación Física: ____/____/2026', 410, firmaY + 12, { width: 140, align: 'center' });

        doc.restore();

        // Numeración de páginas en el pie (sin salto automático)
        const totalPaginas = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPaginas; i++) {
            doc.switchToPage(i);
            doc.font('Helvetica').fontSize(7).fillColor('#607679')
                .text(`Xenon y Más · Folio #${folio} · Página ${i + 1} de ${totalPaginas}`, 36, 752, { width: 540, align: 'center', lineBreak: false });
        }

        doc.end();
    } catch (e) {
        console.error('Error generando PDF de corroboración:', e);
        if (!res.headersSent) {
            res.status(500).send('Error generando el documento PDF: ' + e.message);
        }
    }
}

