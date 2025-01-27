import PDFDocument from 'pdfkit';
import fs from 'fs';
import sizeOf from 'image-size';
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
    //-------------------------------------------------------------------------------------------
    //control de datos
    var id = req.query.id;
    var origen = req.query.origen;
    const options = {
        day: "numeric",
        month: "numeric",
        year: "numeric"
    };
    if (id === undefined || origen === undefined) {
        res.send({ ok: false, mensaje: "Faltan datos" });
        return;
    }

    if (origen != "pedidos1" && origen != "pedidos2" && origen != "pedidos3") {
        return res.send('Consulta no se pudo realizar')
    }

    let Productos = [];
    var status = "";

    const carrito = await consultar_carrito(id, origen);
    let catalogo = await Catalogo.findOne().select({ Cuentas: 1, DatosGrals: 1 }).exec();
    let DatosGrals = catalogo.DatosGrals;
    let cuentas = catalogo.Cuentas;
    let logo = DatosGrals.logo
    status = carrito.status;

    let descuento = carrito.descuento;
    let moneda = carrito.moneda;
    let totalPedido = carrito.total;
    let notas = carrito.notas;

    let fecha = '';
    let hora = '';

    if (status === "cancelado") {
        fecha = carrito.fecha_creado ? carrito.fecha_creado.toLocaleDateString('es-MX', options) : carrito.fecha_de_cancelacion.toLocaleDateString('es-MX', options);
        hora = carrito.fecha_creado ? carrito.fecha_creado.toLocaleTimeString('es-MX') : carrito.fecha_de_cancelacion.toLocaleTimeString('es-MX');
    } else {
        fecha = carrito.fecha_creado ? carrito.fecha_creado.toLocaleDateString('es-MX', options) : carrito.fecha.toLocaleDateString('es-MX', options);
        hora = carrito.fecha_creado ? carrito.fecha_creado.toLocaleTimeString('es-MX') : carrito.fecha.toLocaleTimeString('es-MX');
        if (origen === "pedidos2") {
            fecha = carrito.fecha ? carrito.fecha.toLocaleDateString('es-MX', options) : carrito.fecha_creado.toLocaleDateString('es-MX', options);
            hora = carrito.fecha ? carrito.fecha.toLocaleTimeString('es-MX') : carrito.fecha_creado.toLocaleTimeString('es-MX');
        }
    }
    let cliente = carrito.cliente;

    Productos = AcomodarDatosProductos(carrito.lista);
    //--------------------------------------------------------------------------------------------

    let LogoyFolio = false;//esta bariable es para controlar el logo y  el folio, si quieren estos datos en cada pagina ponerla en true
    let fuente = "Courier";
    let tamañoFuente = 10;

    let controlPie = 0;

    let x = 0;
    let y = 0;

    let yTemp = 0;
    let xTemp = 0;
    //el eje y tentra como limites de 10 780
    //el eje x sus limintes seran de 10 600

    const doc = new PDFDocument({
        bufferPages: true,
        margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    let buffers = [];

    /*
    limites generales del documento
        doc.moveDown();
        doc.lineWidth(1).moveTo(10, 10).lineTo(600, 10).strokeColor('red').stroke();
        doc.lineWidth(1).moveTo(10, 780).lineTo(600, 780).strokeColor('red').stroke();
        doc.lineWidth(1).moveTo(10, 10).lineTo(10, 780).strokeColor('red').stroke();
        doc.lineWidth(1).moveTo(600, 780).lineTo(600, 10).strokeColor('red').stroke();

    limites para el logo y el folio
        doc.lineWidth(1).moveTo(15, 15).lineTo(300, 15).strokeColor('blue').stroke();
        doc.lineWidth(1).moveTo(15, 85).lineTo(300, 85).strokeColor('blue').stroke();
        
        doc.lineWidth(1).moveTo(310, 15).lineTo(590, 15).strokeColor('black').stroke();
        doc.lineWidth(1).moveTo(310, 85).lineTo(590, 85).strokeColor('black').stroke();


        ---------------Minimos----------------------------------------------------
        doc.moveDown();
        doc.lineWidth(1).moveTo(10, 10).lineTo(600, 10).strokeColor('red').stroke();
        doc.lineWidth(1).moveTo(10, 780).lineTo(600, 780).strokeColor('red').stroke();
        doc.lineWidth(1).moveTo(10, 10).lineTo(10, 780).strokeColor('red').stroke();
        doc.lineWidth(1).moveTo(600, 780).lineTo(600, 10).strokeColor('red').stroke();

doc.lineWidth(1).moveTo(15, 15).lineTo(300, 15).strokeColor('blue').stroke();
        doc.lineWidth(1).moveTo(15, 85).lineTo(300, 85).strokeColor('blue').stroke();
        
        doc.lineWidth(1).moveTo(310, 15).lineTo(590, 15).strokeColor('black').stroke();
        doc.lineWidth(1).moveTo(310, 85).lineTo(590, 85).strokeColor('black').stroke();
        
        doc.moveDown();
        doc.lineWidth(1).moveTo(10, 90).lineTo(600, 90).strokeColor('gray').stroke();
        doc.lineWidth(1).moveTo(10, 200).lineTo(600, 200).strokeColor('gray').stroke();
        
        doc.lineWidth(1).moveTo(10, 210).lineTo(600, 210).strokeColor('orange').stroke();
        doc.lineWidth(1).moveTo(10, 690).lineTo(600, 690).strokeColor('orange').stroke();
        
        doc.lineWidth(1).moveTo(10, 700).lineTo(600, 700).strokeColor('green').stroke();
        doc.lineWidth(1).moveTo(10, 780).lineTo(600, 780).strokeColor('green').stroke();

    */

    /*
    --------------Maximos------------------------------
    doc.moveDown();
    doc.lineWidth(1).moveTo(10, 10).lineTo(600, 10).strokeColor('red').stroke();
    doc.lineWidth(1).moveTo(10, 780).lineTo(600, 780).strokeColor('red').stroke();
    doc.lineWidth(1).moveTo(10, 10).lineTo(10, 780).strokeColor('red').stroke();
    doc.lineWidth(1).moveTo(600, 780).lineTo(600, 10).strokeColor('red').stroke();

doc.lineWidth(1).moveTo(15, 15).lineTo(300, 15).strokeColor('blue').stroke();
    doc.lineWidth(1).moveTo(15, 85).lineTo(300, 85).strokeColor('blue').stroke();
    
    doc.lineWidth(1).moveTo(310, 15).lineTo(590, 15).strokeColor('black').stroke();
    doc.lineWidth(1).moveTo(310, 85).lineTo(590, 85).strokeColor('black').stroke();
    
    doc.moveDown();
    doc.lineWidth(1).moveTo(10, 90).lineTo(600, 90).strokeColor('gray').stroke();
    doc.lineWidth(1).moveTo(10, 250).lineTo(600, 250).strokeColor('gray').stroke();
    
    doc.lineWidth(1).moveTo(10, 260).lineTo(600, 260).strokeColor('orange').stroke();
    doc.lineWidth(1).moveTo(10, 640).lineTo(600, 640).strokeColor('orange').stroke();
    
    doc.lineWidth(1).moveTo(10, 650).lineTo(600, 650).strokeColor('green').stroke();
    doc.lineWidth(1).moveTo(10, 780).lineTo(600, 780).strokeColor('green').stroke();
    */

    doc.on('data', buffers.push.bind(buffers));

    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.end(pdfData);
    }); // Añadir un logotipo (debes asegurarte de que tienes una imagen logo.png en tu directorio) 

    function cancelado() {
        var gradient = doc.linearGradient(0, 0, 400, 200);
        gradient.stop(0, '#FF0000', 0.2);
        gradient.stop(1, '#FF0000', 0);

        doc.save();
        doc.fontSize(72).fillColor('#FF0000', 0.5)
            .rotate(-45, { origin: [350, 400] })
            .text('CANCELADO', 0, 400, {
                align: 'center', opacity: 0.3

            }
            ).rotate(45);
        doc.restore();
    }


    function logoDatos(logo) {
        var ruta = ('static' + logo);
        /*
        el logo sin importar las dimenciondes de la imagen trndra un espacio asignado den el eje x de 15 a 300
        y el eje y de 15 a 85 y tendra que ser dinamico el ejuste de la imagen para que no exceda esta dimension
        */

        try {
            if (fs.existsSync(ruta)) {
                const image = fs.readFileSync(ruta);
                const fitWidth = 280;
                const fitHeight = 65;

                // Obtener dimensiones originales de la imagen
                const dimensions = sizeOf(ruta);
                const originalWidth = dimensions.width;
                const originalHeight = dimensions.height;

                // Calcular las dimensiones ajustadas proporcionalmente
                let finalWidth, finalHeight;
                const aspectRatio = originalWidth / originalHeight;

                if (originalWidth / fitWidth > originalHeight / fitHeight) {
                    // Ajustar por ancho
                    finalWidth = fitWidth;
                    finalHeight = fitWidth / aspectRatio;
                } else {
                    // Ajustar por alto
                    finalWidth = fitHeight * aspectRatio;
                    finalHeight = fitHeight;
                }

                // Agregar la imagen ajustada al PDF
                doc.image(image, x + 15, y + 15, {
                    fit: [fitWidth, fitHeight], // Limitar el tamaño de la imagen
                    align: 'center',           // Alinear al centro (opcional)
                    valign: 'center'           // Alinear verticalmente al centro (opcional)
                });

                // Mostrar las dimensiones calculadas
                // console.log(`Final width: ${finalWidth}`);
                // console.log(`Final height: ${finalHeight}`);
                yTemp = finalHeight + 15;
            } else {
                console.error("Error loading logo image: File does not exist");
            }
        } catch (error) {
            console.error("Error loading logo image:", error);
        }

        /*
        los datos del folio y la fecha se asignaran en el eje x de 310 a 590
        y el eje y de 15 a 85
        */
        x = 0;
        y = 0;

        doc.fillColor('red').fontSize(12).text('Folio: ', x += 400, y + 30);
        doc.fillColor('black').fontSize(12).text(carrito.folio, x + doc.widthOfString('Folio: '), y = + 30);
        y += 15; // Adjust y position for the next text
        const fechaColor = status === "Cancelado" ? '#FF0000' : '#2196F3';
        doc.fillColor(fechaColor).fontSize(10).text('Fecha: ', x, y);
        doc.fontSize(10).text(fecha, x + doc.widthOfString('Fecha: '), y);
        y += 15; // Adjust y position for the next text
        doc.fontSize(10).text('Hora: ', x, y);
        doc.fontSize(10).text(hora, x + doc.widthOfString('Hora: '), y);

        // console.log("yTemp", yTemp, "y", y);

        y = Math.max(yTemp, y) + doc.currentLineHeight();

        // console.log("fff", y);
    }

    logoDatos(logo);


    let cordY = y;
    x = 30; // Asignar un margen normal a x


    // Add company details 
    let lineSpacing = doc.currentLineHeight() + 1; // Adding extra space

    function addCompanyDetails(cuentas, cliente, DatosGrals) {
        doc.fillColor('gray').fontSize(11).font('Courier-Bold').text(DatosGrals.nombre, x, y += lineSpacing).font('Courier');//nombre
        //el eje x se dividira en 2  desde 20 a 275 y de 297 a 590 
        yTemp = y;
        xTemp = x + 300;
        doc.fontSize(10).text(`RFC: ${DatosGrals.rfc}`, x, y += lineSpacing);//rfc
        doc.fontSize(10).text(`Calle: ${DatosGrals.direccion.calle},`, x, y += lineSpacing);
        doc.fontSize(10).text(`Col.: ${DatosGrals.direccion.colonia},`, x, y += lineSpacing);
        doc.fontSize(10).text(`${DatosGrals.direccion.municipio}, ${DatosGrals.direccion.estado}`, x, y += lineSpacing);
        doc.fontSize(10).text(`CP: ${DatosGrals.direccion.cp} Tel: ${DatosGrals.telefono}`, x, y += lineSpacing);
        doc.fontSize(10).text(`E-mail: ${DatosGrals.email}`, x, y += lineSpacing);
        y += 2;

        doc.fontSize(10).text('Cliente: ', xTemp, yTemp += lineSpacing);
        doc.fontSize(10).font('Courier-Bold').text(cliente.nombre, xTemp + doc.widthOfString('Cliente: '), yTemp).font('Courier');

        doc.fontSize(10).text('Domicilio:', xTemp, yTemp += lineSpacing).font('Courier-Bold');

        xTemp += doc.widthOfString('Domicilio: ');
        const maxWidth = 590 - xTemp;
        const direccion = cliente.direccion.replace(/\s+/g, ' ');

        doc.fontSize(10).text(direccion, xTemp, yTemp, { width: maxWidth }).font('Courier');
        yTemp += doc.heightOfString(direccion, { width: maxWidth });
        xTemp = 340;
        doc.fontSize(10).text('Email:', xTemp, yTemp).font('Courier-Bold');
        doc.fontSize(10).text(cliente.correo, xTemp += doc.widthOfString('Email: '), yTemp).font('Courier');

        // console.log("yTempff", yTemp, "yff", y);

        y = Math.max(y, yTemp);

        y += lineSpacing + 2;
        yTemp = y;

        // doc.moveDown();
        // doc.lineWidth(1).moveTo(40, y).lineTo(190, y).strokeColor('red').stroke();



        //------------Cuentas----------------------------------------------------------------------------

        cuentas.forEach((cuenta, index) => {
            let posX = x - 10;
            y = yTemp;
            if (cuentas.length === 1) {
                posX = 230;
            } else {
                if (index === 1) posX = 220;
                if (index === 2) posX = 410;
            }

            doc.fontSize(9).text(cuenta.banco, posX, y);
            y += lineSpacing;
            doc.fontSize(9).text('Cuenta: ', posX, y);
            doc.fontSize(9).text(cuenta.cuenta, posX + doc.widthOfString('Cuenta: '), y);
            y += lineSpacing;
            doc.fontSize(9).text('CLABE: ', posX, y);
            doc.fontSize(9).text(cuenta.clabe, posX + doc.widthOfString('CLABE: '), y);
        });

        y += lineSpacing + 2;

        //-----------------------------------------------------------------------------------------------
        //----------lineas-----------------------------------
        // doc.moveDown();
        // doc.lineWidth(1).moveTo(10, 74.25).lineTo(600, 74.25).strokeColor('red').stroke();

        doc.lineWidth(1).moveTo(10, cordY).lineTo(600, cordY).strokeColor('gray').stroke();
        doc.moveDown();
        doc.lineWidth(1).moveTo(10, cordY).lineTo(10, y).strokeColor('gray').stroke();

        // Add a line break 
        doc.moveDown();
        doc.lineWidth(1).moveTo(600, cordY).lineTo(600, y).strokeColor('gray').stroke();
        doc.moveDown();
        doc.lineWidth(1).moveTo(10, y).lineTo(600, y).strokeColor('gray').stroke();
    }

    addCompanyDetails(cuentas, cliente, DatosGrals);


    y += 10;
    x = 10;

    const tableHeaders = ['N°', 'Cant.', 'Unidad', 'Marca', 'Código', 'Descripción', 'P. Unit.', 'Importe'];
    const columnWidths = [15, 40, 60, 70, 90, 175, 60, 65];
    const startX = 20;
    let currentY = y;

    function addTableHeaders() {
        doc.fillColor('black').fontSize(11).font('Courier-Bold');
        tableHeaders.forEach((header, i) => {
            doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY);
        });
        doc.font('Courier');
        doc.moveDown();
        currentY += doc.currentLineHeight() + 5;
        doc.lineWidth(1).moveTo(20, currentY - 3).lineTo(590, currentY - 3).strokeColor('black').stroke();
    }

    // Add totals and additional information at the end of each page
    function addTotalsAndFooter() {
        if (status === "Cancelado") {
            cancelado();
        }

        let footerStartY = 700;
        let footerEndY = 770;
        controlPie = footerStartY;

        if (notas) {
            const maxWidth = 480;
            const normalizedNotas = notas.replace(/\s+/g, ' ').trim();
            const notasHeight = doc.heightOfString(`Notas: ${normalizedNotas}`, { width: maxWidth });
            // console.log('-----',notasHeight);
            footerStartY -= notasHeight;
            controlPie = footerStartY;
            // console.log("controlPie", controlPie);
            // const maxWidth = 480;
            // const normalizedNotas = notas.replace(/\s+/g, ' ').trim();
            // const lineHeight = doc.currentLineHeight();
            // const minFooterStartY = 650;
            // footerStartY = Math.min(minFooterStartY, 770 - doc.heightOfString(`Notas: ${normalizedNotas}`, { width: maxWidth }) - doc.currentLineHeight() - 10);
            // console.log("footerStartY2", footerStartY2);
        }

        doc.moveDown();
        doc.lineWidth(1).moveTo(10, footerStartY).lineTo(600, footerStartY).strokeColor('black').stroke();

        doc.moveDown();
        doc.lineWidth(1).moveTo(10, footerEndY).lineTo(600, footerEndY).strokeColor('black').stroke();

        doc.moveDown();
        doc.lineWidth(1).moveTo(10, footerStartY).lineTo(10, footerEndY).strokeColor('black').stroke();

        doc.moveDown();
        doc.lineWidth(1).moveTo(600, footerStartY).lineTo(600, footerEndY).strokeColor('black').stroke();

        let localY = footerStartY + 10;
        let localX = 25;

        doc.fontSize(10).fillColor('black').text('Descuento: ', localX, localY);
        doc.fontSize(10).fillColor('black').text(`${descuento}%  - `, localX += doc.widthOfString('Descuento: '), localY);
        doc.fontSize(10).fillColor('black').text(' Unidades en el Pedido: ', localX += doc.widthOfString(`${descuento}%  - `), localY);
        const Uproductos = Productos.reduce((sum, row) => sum + row.cantidad, 0);
        doc.fontSize(10).fillColor('black').text(Uproductos, localX += doc.widthOfString(' Unidades en el Pedido: '), localY);
        localX = 350;
        const total = Productos.reduce((sum, row) => sum + row.importe, 0);
        const t = `Total: ${formato_precio(total)} MXN`;
        doc.fontSize(10).text(t, 579 - doc.widthOfString(t), localY);

        localY += doc.currentLineHeight() + 7;
        doc.fontSize(10).text(`${NumeroALetras(total, moneda)}`, 30, localY);
        localY += doc.currentLineHeight() + 7;

        const centeredText = 'La paquetería corre a cuenta y riesgo del cliente';
        const textWidth = doc.widthOfString(centeredText);
        const centerX = (doc.page.width - textWidth) / 2;
        doc.fontSize(10).font('Courier-Bold').text(centeredText, centerX, localY).font('Courier');

        localY += doc.currentLineHeight() + 2;

        if (notas) {
            const maxHeight = footerEndY - localY;
            const maxWidth = 480;
            const normalizedNotas = notas.replace(/\s+/g, ' ').trim();
            const notasHeight = doc.heightOfString(`Notas: ${normalizedNotas}`, { width: maxWidth });
            // console.log("notasHeight", notasHeight);
            const lineHeight = doc.currentLineHeight();
            const minLines = 2;
            const minHeight = minLines * lineHeight;

            // doc.lineWidth(1).moveTo(10, localY + lineHeight + 2).lineTo(490, localY + lineHeight + 2).strokeColor('green').stroke();
            // doc.lineWidth(1).moveTo(10, localY + notasHeight + lineHeight + 2).lineTo(490, localY + notasHeight + lineHeight + 2).strokeColor('green').stroke();

            const availableHeight = footerEndY - localY - lineHeight - 4;
            const heightToUse = Math.max(minHeight, availableHeight);
            doc.fontSize(10).text(`Notas: ${normalizedNotas}`, 20, localY + lineHeight + 2, { width: maxWidth, height: heightToUse, ellipsis: true });
        }

        yTemp = footerStartY; // Asignar en yTemp la coordenada mínima de y que se tomó
    }

    function splitTextByWidth(text, width, doc) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach((word) => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const lineWidth = doc.widthOfString(testLine);
            if (lineWidth <= width) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }


    function FoliosLista(lista) {
        // Determina el ancho máximo para los folios
        const maxWidth = 500; // Ajusta según el diseño
        const foliosText = lista.join(', ');

        // Divide el texto en líneas usando una función personalizada
        const foliosLines = splitTextByWidth(foliosText, maxWidth, doc);

        // Calcula el espacio necesario para imprimir todas las líneas
        const totalFoliosHeight = foliosLines.length * doc.currentLineHeight();

        // Verifica si hay espacio suficiente para imprimir los folios
        if (currentY + totalFoliosHeight + doc.currentLineHeight() > controlPie - 2) {
            // Si no hay espacio, agrega una nueva página
            doc.addPage();
            currentY = doc.page.margins.top + 20; // Restablece el margen superior
            addTableHeaders(); // Si hay encabezados, agrégalos
            addTotalsAndFooter(); // Si hay un pie de página, agrégalo
        }

        // Imprime las líneas de folios
        doc.fontSize(11).fillColor('black').text('Folios: ', startX + 10, currentY + 10); // Etiqueta "Folios"
        let foliosY = currentY + doc.currentLineHeight() + 10;

        foliosLines.forEach((line) => {
            // Antes de imprimir cada línea, verifica si hay espacio
            if (foliosY + doc.currentLineHeight() > controlPie - 2) {
                doc.addPage();
                foliosY = doc.page.margins.top + 20; // Reinicia la posición en la nueva página
                addTableHeaders(); // Encabezados
                addTotalsAndFooter(); // Pie de página
            }
            doc.fontSize(11).fillColor('gray').text(line, startX + 60, foliosY, { width: maxWidth });
            foliosY += doc.currentLineHeight();
        });

        // Ajusta currentY para la siguiente sección
        currentY = foliosY + 10; // Espacio adicional después de los folios
    }




    function addProductsPedido() {
        Productos.forEach((row) => {
            const marca = row.marca.toUpperCase().replace(/\s+/g, ' ').replace(/\n/g, '').trim();

            const unidadHeight = doc.heightOfString(row.unidad, { width: columnWidths[2] });
            const descripcionHeight = doc.heightOfString(row.descripcion.replace(/\s+/g, ' '), { width: columnWidths[5] });
            const marcaHeight = doc.heightOfString(marca, { width: columnWidths[3] });

            let maxHeight = Math.max(descripcionHeight, marcaHeight, unidadHeight);

            if (currentY + maxHeight > controlPie - 2) {
                // console.log("C", currentY, "P", controlPie, "CP", controlPie - 2);
                doc.addPage();
                currentY = doc.page.margins.top + 20;
                addTableHeaders();
                addTotalsAndFooter();
            }

            const rowY = currentY + 1;
            doc.fontSize(11).fillColor('black').text(`${row.no})`, startX, rowY);
            doc.fontSize(11).text(row.cantidad, startX + columnWidths[0], rowY, { align: 'center', width: columnWidths[1] });

            doc.fontSize(11).text(row.unidad, startX + columnWidths.slice(0, 2).reduce((a, b) => a + b, 0), rowY, { align: 'justify', width: columnWidths[2] });

            doc.fontSize(11).text(marca, startX + columnWidths.slice(0, 3).reduce((a, b) => a + b, 0), rowY, { align: 'justify', width: columnWidths[3] });

            doc.fontSize(11).text(row.codigo, startX + columnWidths.slice(0, 4).reduce((a, b) => a + b, 0), rowY, { align: 'justify', width: columnWidths[4] });

            doc.fontSize(11).text(row.descripcion.replace(/\s+/g, ' '), startX + columnWidths.slice(0, 5).reduce((a, b) => a + b, 0), rowY, { align: 'justify', width: columnWidths[5] - 8 });
            doc.fontSize(11).text(formato_precio(row.precioUnitario), startX + columnWidths.slice(0, 6).reduce((a, b) => a + b, 0), rowY);
            doc.fontSize(11).text(formato_precio(row.importe), startX + columnWidths.slice(0, 7).reduce((a, b) => a + b, 0), rowY);

            if (row.folios && row.folios.length > 0) {
                currentY += maxHeight > doc.currentLineHeight() ? maxHeight : doc.currentLineHeight() + 10;
                FoliosLista(row.folios);
                // const foliosY = rowY + doc.currentLineHeight() + 10;
                // const foliosText = row.folios.join(', ');
                // const foliosLines = doc.heightOfString(foliosText, { width: 500 }) / doc.currentLineHeight();


                // if (foliosY + (foliosLines * doc.currentLineHeight()) > controlPie - 2) {
                //     doc.addPage();
                //     currentY = doc.page.margins.top + 20;
                //     addTotalsAndFooter();
                //     addTableHeaders();
                //     currentY -= 10;
                // }

                // doc.fontSize(11).fillColor('black').text('Folios:', startX + 10, currentY + doc.currentLineHeight() + 10);
                // doc.fontSize(11).fillColor('gray').text(foliosText, startX + 60, currentY + doc.currentLineHeight() + 10, { width: 500 });
                // currentY += (foliosLines * doc.currentLineHeight()) + 20; // Adjust y position for the next product
            } else {
                // currentY = rowY + doc.currentLineHeight() + 5;
                currentY = rowY + doc.currentLineHeight() + 12;

                // const maxHeight = Math.max(descripcionHeight, marcaHeight, unidadHeight);
                currentY += maxHeight > doc.currentLineHeight() ? maxHeight : doc.currentLineHeight() + 20;
            }
        });
    }

    addTableHeaders();

    addTotalsAndFooter();

    addProductsPedido();

    const range = doc.bufferedPageRange(); // => { start: 0, count: 2 }

    for (let i = range.start, end = range.start + range.count; i < end; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('black').text(`Pagina ${i + 1} de ${range.count}`, 520, 760);
    }

    doc.end();
}

function AcomodarDatosProductos(lista) {
    //funcion para retornar los datos de esta manera 
    //{ no: 1, cantidad: 2, unidad: 'Pza', marca: 'Marca1', codigo: '001', descripcion: 'Producto 1', precioUnitario: 100, importe: 200, folios: ["CAAC08001ET2024060689", "CAAC08001ET2024060690", "CAAC08001ET2024060691", "CAAC08001ET2024060689", "CAAC08001ET2024060690", "CAAC08001ET2024060691", "CAAC08001ET2024060689", "CAAC08001ET2024060690", "CAAC08001ET2024060691", "CAAC08001ET2024060689", "CAAC08001ET2024060690", "CAAC08001ET2024060691"] }
    let Productos = [];
    lista.forEach((item, index) => {
        let producto = item.producto;
        let importe = item.cantidad * producto.precio;
        Productos.push({
            no: index + 1,
            cantidad: item.cantidad,
            unidad: producto.unidad,
            marca: producto.marca,
            codigo: producto.codigo,
            descripcion: producto.nombre,
            precioUnitario: producto.precio,
            importe: importe,
            folios: item.folios
        });
    });
    return Productos;
}

async function consultar_carrito(id, origen) {
    return new Promise(async (resolve, reject) => {
        if (origen === "pedidos1") {
            Carrito.findById(id)
                .then((resultado) => {
                    // console.log(resultado, "pedidos1");
                    resolve(resultado)
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                })
        }

        if (origen === "pedidos2") {
            Pedido.findById(id)
                .then((resultado) => {
                    // console.log(resultado, "pedidos2");
                    resolve(resultado)
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                })
        }

        if (origen === "pedidos3") {
            Carrito_cancelado.findById(id)
                .then((resultado) => {
                    // console.log(resultado, "pedidos3");
                    resolve(resultado)
                })
                .catch((err) => {
                    console.log(err);
                    reject(err);
                })
        }
        //     Carrito.findOne({ folio: folio })
        //         .then(async (resultado) => {
        //             // console.log("Res", resultado.lista[0]);
        //             resolve(resultado);
        //         });
    });
}