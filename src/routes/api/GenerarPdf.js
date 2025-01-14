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

    let fecha = carrito.fecha_de_cancelacion ? carrito.fecha_de_cancelacion.toLocaleDateString('es-MX', options) : carrito.fecha.toLocaleDateString('es-MX', options);
    let hora = carrito.fecha_de_cancelacion ? carrito.fecha_de_cancelacion.toLocaleTimeString('es-MX') : carrito.fecha.toLocaleTimeString('es-MX');

    let cliente = carrito.cliente;

    Productos = AcomodarDatosProductos(carrito.lista);
    //--------------------------------------------------------------------------------------------

    let x = 0;
    let y = 0;

    const doc = new PDFDocument({
        bufferPages: true,
        margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    let buffers = [];

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
        let w = 380;
        let h = 90;
        if (logo.includes('GLOW')) {
            w = 120;
            h = 40;
            x = 120;
            y = 20;
        }
        if (logo.includes('Carbon') || logo.includes('Carbon2')) {
            w = 220;
            h = 70;
            x = 50;
            y = 10;
        }
        // doc.fillColor('black').fontSize(12).text(('/static' + logo), x + 50, y = + 30);
        try {
            doc.image(ruta, x, y, {
                width: w,
                height: h
            });
        } catch (error) {
            console.error("Error loading logo image:", error);
            // Continue without adding the logo
        }

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
    }

    logoDatos(logo);


    let cordY = y + doc.currentLineHeight() + 10;
    let codX = x;
    y += 15; // Adjust y position for the next text
    x = 40; // Asignar un margen normal a x

    let yTemp = 0;
    let xTemp = 0;
    // Add company details 
    let lineSpacing = doc.currentLineHeight() + 1; // Adding extra space

    function addCompanyDetails(cuentas, cliente, DatosGrals) {
        doc.fillColor('gray').fontSize(10).font('Courier-Bold').text(DatosGrals.nombre, x, y += lineSpacing).font('Courier');//nombre
        yTemp = y;
        xTemp = x + 300;
        doc.fontSize(9).text(`RFC: ${DatosGrals.rfc}`, x, y += lineSpacing);//rfc
        doc.fontSize(9).text(`Calle: ${DatosGrals.direccion.calle},`, x, y += lineSpacing);
        doc.fontSize(9).text(`Col.: ${DatosGrals.direccion.colonia},`, x, y += lineSpacing);
        doc.fontSize(9).text(`${DatosGrals.direccion.municipio}, ${DatosGrals.direccion.estado}`, x, y += lineSpacing);
        doc.fontSize(9).text(`CP: ${DatosGrals.direccion.cp} Tel: ${DatosGrals.telefono}`, x, y += lineSpacing);
        doc.fontSize(9).text(`E-mail: ${DatosGrals.email}`, x, y += lineSpacing);
        y += 2;

        doc.fontSize(9).text('Cliente: ', xTemp, yTemp += lineSpacing);
        doc.fontSize(9).font('Courier-Bold').text(cliente.nombre, xTemp + doc.widthOfString('Cliente: '), yTemp).font('Courier');

        doc.fontSize(9).text('Domicilio:', xTemp, yTemp += lineSpacing).font('Courier-Bold');

        xTemp += doc.widthOfString('Domicilio: ');
        const maxWidth = 580 - xTemp;
        const direccion = cliente.direccion;

        doc.fontSize(9).text(direccion, xTemp, yTemp, { width: maxWidth }).font('Courier');
        yTemp += doc.heightOfString(direccion, { width: maxWidth });

        // doc.fontSize(8).text(cliente.direccion.colonia, xTemp + doc.widthOfString(cliente.direccion.calle + ' '), yTemp);
        // xTemp = 340;
        // doc.fontSize(8).text(`C.P.: ${cliente.direccion.cp} `, xTemp, yTemp);
        // doc.fontSize(8).text(`${cliente.direccion.ciudad}, ${cliente.direccion.estado}`, xTemp += doc.widthOfString(`C.P.: ${cliente.direccion.cp} `), yTemp).font('Courier');
        xTemp = 340;
        doc.fontSize(9).text('Email:', xTemp, yTemp).font('Courier-Bold');
        doc.fontSize(9).text(cliente.correo, xTemp += doc.widthOfString('Email: '), yTemp).font('Courier');

        y += lineSpacing;
        yTemp = y;

        // doc.moveDown();
        // doc.lineWidth(1).moveTo(40, y).lineTo(190, y).strokeColor('red').stroke();



        //------------Cuentas----------------------------------------------------------------------------

        cuentas.forEach((cuenta, index) => {
            let posX = x;
            y = yTemp;
            if (cuentas.length === 1) {
                posX = 230;
            } else {
                if (index === 1) posX = 230;
                if (index === 2) posX = 420;
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
        doc.moveDown();
        doc.lineWidth(1).moveTo(20, cordY).lineTo(590, cordY).strokeColor('gray').stroke();
        doc.moveDown();
        doc.lineWidth(1).moveTo(20, cordY).lineTo(20, y).strokeColor('gray').stroke();

        // Add a line break 
        doc.moveDown();
        doc.lineWidth(1).moveTo(590, cordY).lineTo(590, y).strokeColor('gray').stroke();
        doc.moveDown();
        doc.lineWidth(1).moveTo(20, y).lineTo(590, y).strokeColor('gray').stroke();
    }

    addCompanyDetails(cuentas, cliente, DatosGrals);


    y += 10;
    x = 20;

    const tableHeaders = ['N°', 'Cant.', 'Unidad', 'Marca', 'Código', 'Descripción', 'P. Unitario', 'Importe'];
    const columnWidths = [15, 40, 60, 70, 90, 180, 65, 60];
    const startX = 20;
    let currentY = y;

    function addTableHeaders() {
        doc.fillColor('black').fontSize(8).font('Courier-Bold');
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
        // if (currentY + doc.currentLineHeight() > 700) {
        //     doc.addPage();
        //     currentY = doc.page.margins.top;
        //     addTableHeaders();
        // }

        if (status === "Cancelado") {
            cancelado();
        }

        doc.moveDown();
        doc.lineWidth(1).moveTo(20, 700).lineTo(590, 700).strokeColor('black').stroke();

        doc.moveDown();
        doc.lineWidth(1).moveTo(20, 770).lineTo(590, 770).strokeColor('black').stroke();

        doc.moveDown();
        doc.lineWidth(1).moveTo(20, 700).lineTo(20, 770).strokeColor('black').stroke();

        doc.moveDown();
        doc.lineWidth(1).moveTo(590, 700).lineTo(590, 770).strokeColor('black').stroke();

        let localY = 710; // Set y position to 700 for each page
        let localX = 30;

        doc.fontSize(10).fillColor('black').text('Descuento: ', localX, localY);
        doc.fontSize(10).fillColor('black').text(`${descuento}%  - `, localX += doc.widthOfString('Descuento: '), localY);
        doc.fontSize(10).fillColor('black').text(' Unidades en el Pedido: ', localX += doc.widthOfString(`${descuento}%  - `), localY);
        const Uproductos = Productos.reduce((sum, row) => sum + row.cantidad, 0);
        doc.fontSize(10).fillColor('black').text(Uproductos, localX += doc.widthOfString(' Unidades en el Pedido: '), localY);
        localX = 350;
        const total = Productos.reduce((sum, row) => sum + row.importe, 0);
        const t = `Total: ${formato_precio(total)} MXN`;
        doc.fontSize(10).text(t, 579 - doc.widthOfString(t), localY);

        localY += doc.currentLineHeight() + 4; // Add some space before additional information
        doc.fontSize(10).text(`${NumeroALetras(total, moneda)}`, 30, localY);
        localY += doc.currentLineHeight() + 10;

        const centeredText = 'La paquetería corre a cuenta y riesgo del cliente';
        const textWidth = doc.widthOfString(centeredText);
        const centerX = (doc.page.width - textWidth) / 2;
        doc.fontSize(8).font('Courier-Bold').text(centeredText, centerX, localY).font('Courier');

    }

    addTableHeaders();

    addTotalsAndFooter();

    Productos.forEach((row) => {
        if (currentY + doc.currentLineHeight() > 690) {
            doc.addPage();
            currentY = doc.page.margins.top + 20;
            addTableHeaders();
            addTotalsAndFooter();
        }

        const rowY = currentY + 1;
        doc.fontSize(9).fillColor('black').text(`${row.no})`, startX, rowY);
        doc.fontSize(9).text(row.cantidad, startX + columnWidths[0], rowY);
        doc.fontSize(9).text(row.unidad, startX + columnWidths.slice(0, 2).reduce((a, b) => a + b, 0), rowY);
        doc.fontSize(9).text(row.marca, startX + columnWidths.slice(0, 3).reduce((a, b) => a + b, 0), rowY);
        doc.fontSize(9).text(row.codigo, startX + columnWidths.slice(0, 4).reduce((a, b) => a + b, 0), rowY);
        doc.fontSize(9).text(row.descripcion.replace(/\s+/g, ' '), startX + columnWidths.slice(0, 5).reduce((a, b) => a + b, 0), rowY);
        doc.fontSize(9).text(formato_precio(row.precioUnitario), startX + columnWidths.slice(0, 6).reduce((a, b) => a + b, 0), rowY);
        doc.fontSize(9).text(formato_precio(row.importe), startX + columnWidths.slice(0, 7).reduce((a, b) => a + b, 0), rowY);

        if (row.folios && row.folios.length > 0) {
            const foliosY = rowY + doc.currentLineHeight() + 10;
            const foliosText = row.folios.join(', ');
            const foliosLines = doc.heightOfString(foliosText, { width: 500 }) / doc.currentLineHeight();

            if (foliosY + (foliosLines * doc.currentLineHeight()) > 690) {
                doc.addPage();
                currentY = doc.page.margins.top + 20;
                addTableHeaders();
                addTotalsAndFooter();
            }

            doc.fontSize(8).fillColor('black').text('Folios:', startX + 10, currentY + 10);
            doc.fontSize(8).fillColor('gray').text(foliosText, startX + 50, currentY + 10, { width: 500 });
            currentY += (foliosLines * doc.currentLineHeight()) + 20; // Adjust y position for the next product
        } else {
            currentY = rowY + doc.currentLineHeight() + 10;
        }
    });

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