import PDFDocument from 'pdfkit';
import fs from 'fs';
import { Carrito } from '../../models/carrito';
import { Pedido } from '../../models/pedido';
import { Catalogo } from '../../models/Catalogos';
import { Carrito_cancelado } from '../../models/carrito_cancelado';
import { text } from 'd3';
import { formato_precio } from '../../routes/stores';
import { NumeroALetras } from "../app/pedidos/exportar/NumeroALetras.js";
import * as accesos from "../app/accesos";

export async function get(req, res) {

    if (accesos.esta_logueado(req) === false) {
        res.send({ ok: false, mensaje: "sesion expirada" })
        return;
    }

    let x = 0;
    let y = 0;

    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.end(pdfData);
    }); // Añadir un logotipo (debes asegurarte de que tienes una imagen logo.png en tu directorio) 
    doc.image('static/imagenes/logo-xenon.png', x, y, {
        width: 380, // ajusta el tamaño a 100 de ancho
        height: 90 // ajusta el tamaño a 100 de alto
    }); // Añadir el encabezado 

    doc.fillColor('red').fontSize(12).text('Folio: ', x += 400, y + 30);
    doc.fillColor('black').fontSize(12).text('16874', x + doc.widthOfString('Folio: '), y = + 30);
    y += 15; // Adjust y position for the next text
    doc.fillColor('#2196F3').fontSize(10).text('Fecha: ', x, y);
    doc.fontSize(10).text('2021-07-08', x + doc.widthOfString('Fecha: '), y);
    y += 15; // Adjust y position for the next text
    doc.fontSize(10).text('Hora: ', x, y);
    doc.fontSize(10).text('11:40:05 a.m.', x + doc.widthOfString('Hora: '), y);
    y += 15; // Adjust y position for the next text
    x = 40; // Asignar un margen normal a x

    doc.moveDown();
    doc.lineWidth(0.5).moveTo(20, 140).lineTo(590, 140).strokeColor('gray').stroke();
    doc.lineWidth(0.5).moveTo(20, 140).lineTo(20, 195).strokeColor('gray').stroke();

    // Add a line break 
    doc.moveDown(); doc.lineWidth(0.5).moveTo(590, 140).lineTo(590, 195).strokeColor('gray').stroke();
    doc.moveDown(); doc.lineWidth(0.5).moveTo(20, 195).lineTo(590, 195).strokeColor('gray').stroke();

    // Add company details 
    let lineSpacing = doc.currentLineHeight() + 1; // Adding extra space
    doc.fillColor('gray').fontSize(10).font('Helvetica-Bold').text('Comercial de Importaciones Xenon Y Más SA de SV', x, y += lineSpacing).font('Helvetica');
    doc.fontSize(8).text('RFC: CIX120105CTA', x, y += lineSpacing);
    doc.fontSize(8).text('Calle: Carretera a Amealco KM 0+218 lote 17, Col.: Col. Barrio de la Cruz,', x, y += lineSpacing);
    doc.fontSize(8).text('San Juan del Rio, Querétaro', x, y += lineSpacing);
    doc.fontSize(8).text('CP: 76807 Tel: 01 800 161 61 59', x, y += lineSpacing);
    doc.fontSize(8).text('E-mail: xenonymas@yahoo.com.mx', x, y += lineSpacing);



    doc.end();
}
