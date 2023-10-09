//   Como superadmin crea productos
import { Carrito } from './../../../../models/carrito';
import * as accesos from "./../../accesos";
import * as pdfkit from "pdfkit";
var nodemailer = require("nodemailer");

var smtpConfig = {
  host: "mail.xenonymas.com.mx",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: "noreply@xenonymas.com.mx",
    pass: "^LM12B0UulO2^LM12B0UulO2"
  }
};
var mailTransport = nodemailer.createTransport(smtpConfig);


export async function post(req, res, next) {
  if (accesos.esta_logueado(req) === false) {
    res.send({ ok: false, mensaje: "sesion expirada" })
    return;
  }

  let solicitud = req.body;
  if (
    solicitud.id === null ||
    solicitud.id === ""
  ) {
    return res.send({ ok: false, mensaje: "faltan datos" });
  }

  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  };

  const carritoDB_proceso = await obtener_carrito(solicitud.id);
  if (carritoDB_proceso.ok === false) {
    res.send({
      ok: false, mensaje: 'error al obtener el carrito'
    })
    return;
  }
  let carritoDB = carritoDB_proceso.carrito;

  let factor_cambio = 1;
  if (carritoDB.moneda != 'Pesos Mexicanos') factor_cambio = (carritoDB.tipo_de_cambio);
  const doc = new pdfkit();


  //const bucketFileStream = file.createWriteStream();
  const fecha = carritoDB.fecha
    .toLocaleDateString("es-MX", options);
  var buffers = [];
  const total_productos = carritoDB.lista.length;
  const residuo_paginas = total_productos % 24 > 0 ? 1 : 0;
  const total_paginas = total_productos / 24 + +residuo_paginas;
  let columnas = [0, 40, 80, 150, 330, 380];
  let columnas_lista = [-40, 0, 40,120, 190, 350,400];
  let p = new Promise((resolve, reject) => {
    doc.on("end", function () {
      resolve(buffers);
    });
    doc.on("error", function () {
      reject();
    });
  });
  let y = 0;
  //doc.pipe(fs.createWriteStream('/path/to/file.pdf')); // write to PDF
  doc.on("data", buffers.push.bind(buffers));
  let espacio_vertical_header = 15;
  let margen_izq = 50;
  //    Logo negro
  doc
    .translate(50, -50)
    .path(logo_negro)
    .fill("black", "even-odd");
  //   LOGO ROJO
  doc.fill("red", "even-odd");
  doc
    .translate(0, 46)
    .path(logo_rojo)
    .fill("red", "even-odd");

  y = 50;
  //   Folio
  doc
    .fill("red", "even-odd")
    .fontSize(10)
    .text("Folio #", 400, y);
  doc
    .fill("gray", "even-odd")
    .fontSize(10)
    .text(carritoDB.folio, 450, y);
  y += +espacio_vertical_header;
  //    FEcha
  doc
    .fill("green", "even-odd")
    .fontSize(7)
    .text(`Fecha: ${fecha}  `, 400, y);
  ///    HORA
  y += +espacio_vertical_header;
  doc
    .fill("green", "even-odd")
    .fontSize(7)
    .text(
      `Hora: ${new Date(carritoDB.fecha).toLocaleTimeString("es-MX")}  `,
      400,
      y
    );
  doc.fill("gray", "even-odd");

  y = 100;
  //     Datos de Xenon  *****
  doc
    .fill("gray", "even-odd")
    .fontSize(7)
    .text("Comercial de Importaciones Xenon Y Más SA de CV   ", 0, y);

  y += +espacio_vertical_header;
  doc
    .text("RFC CIX120105CTA  ", 0, y)
    .fill("gray", "even-odd")
    .fontSize(7);

  y += +espacio_vertical_header;
  doc
    .text("Ignacio López Rayón #111 Centro, Queretaro   ", 0, y)
    .fill("gray", "even-odd")
    .fontSize(7);

  y += +espacio_vertical_header;
  doc
    .text("C.P.76800 Teléfono: 01 800 161 61 59   ", 0, y)
    .fill("gray", "even-odd")
    .fontSize(7);

  y += +espacio_vertical_header;
  doc
    .text("E-mail: xenonymas@yahoo.com.mx   ", 0, y)
    .fill("gray", "even-odd")
    .fontSize(7);

  y = 100;
  // Datos de cliente   *****
  doc
    .fill("gray", "even-odd")
    .fontSize(7)
    .text(`Cliente ${carritoDB.cliente.nombre} `, 300, y);

  y += +espacio_vertical_header;
  doc
    .text(
      `Domicilio: ${carritoDB.cliente.direccion.substring(0, 45)} `,
      300,
      y
    )
    .fill("gray", "even-odd")
    .restore();

  y += +espacio_vertical_header;
  // Direccion de cliente
  doc
    .text(` ${carritoDB.cliente.direccion.substring(46, 90)} `, 300, y)
    .fill("gray", "even-odd");

  y += +espacio_vertical_header;
  doc
    .text(` ${carritoDB.cliente.direccion.substring(91, 135)} `, 300, y)
    .fill("gray", "even-odd");

  y += +espacio_vertical_header;
  // Correo de cliente
  doc
    .text(`E-mail: ${carritoDB.cliente.correo}   `, 300, y)
    .fill("gray", "even-odd");
  //  FOOTER
  y += +espacio_vertical_header;
  doc.text("Datos bancarios", columnas[3], y);
  y += +espacio_vertical_header;
  doc.text("HSBC", columnas[0], y);
  doc.text("BAJIO", columnas[3], y);
  doc.text("BANAMEX", columnas[4], y);

  y += +espacio_vertical_header;

  doc.text("CUENTA: 40 54 62 83 83", columnas[0], y);
  doc.text("CUENTA: 00 97 44 08 70 201", columnas[3], y);
  doc.text("CUENTA: 16 67 578", columnas[4], y);

  y += +espacio_vertical_header;

  doc.text("CLABE: 02 168 50 40 54 62 83 839", columnas[0], y);
  doc.text("CLABE: 03 068 59 00 00 102 10 94", columnas[3], y);
  doc.text("CLABE: 002 68 57 01 01 66 75 785", columnas[4], y);

  y += +espacio_vertical_header;
  doc.text("SUCURSAL: 7010", margen_izq + columnas[4], y);

  doc.text(
    `**Favor de verificar los colores cotizados, son sugerencias ya que la tonalidad que pide no la hay. Pido confirmar si lo requiere así o lo quitamos de la cotización.  En caso de no confirmar o no hacerme mención alguna se da por entendido que acepta esa tonalidad.
    **La paquetería corre a cuenta y riesgo del cliente.`,
    margen_izq + columnas[0],
    690
  );
  ///   TOTALES SOLO SI es de 1 pagina   --*-*-*-*-

  ///  Caja de primer pagina  ***
  doc.fill("gray", "even-odd");
  doc.lineWidth(1);
  doc
    .lineJoin("round")
    .rect(-10, 90, 530, 160)
    .stroke();
  doc.fill("black", "even-odd");
  ///   Lineas ***

  if (total_productos <= 24) {
    doc.text("Total $ ", margen_izq + columnas[4], 650);
    doc.text("Descuento del " + formato_precio(carritoDB.descuento) + " %", margen_izq + columnas[0], 650);
    doc.text(carritoDB.moneda, margen_izq + columnas[5], 660);

    doc.text(
      formato_precio(carritoDB.total_pedido / factor_cambio),
      margen_izq + columnas[5],
      650
    );


    doc.text(
      NumeroALetras(
        carritoDB.total_pedido/factor_cambio,
        carritoDB.moneda
      ),
      margen_izq + columnas[0] - 50,
      670
    );

    ///  Caja de total primer pagina  ***
    doc.fill("gray", "even-odd");
    doc.lineWidth(1);
    doc
      .lineJoin("round")
      .rect(-10, 640, 530, 110)
      .stroke();
    doc.fill("black", "even-odd");
    ///   Lineas ***
  }
  ///   TOTALES SOLO SI es de 1 pagina   --*-*-*-*-

  ///   Pagina nueva evento  ****
  doc.on("pageAdded", () => {
    doc
      .text(
        "Xenon y más, página " +
        pagina_actual +
        " /" +
        Math.round(total_paginas)
      )
      .fill("gray", "even-odd");
    doc
      .text(`folio ${carritoDB.folio} ${fecha}`)
      .fill("black", "even-odd");
    y = 110;
    margen_izq = 100;
    doc.text("Cantidad", margen_izq + columnas_lista[0], y);
    doc.text("Unidad", margen_izq + columnas_lista[1], y);
    //  doc.text("Nombre", columnas[2], y);
    doc.text("Marca", margen_izq + columnas_lista[2], y);
    doc.text("Código", margen_izq + columnas_lista[3], y);
    doc.text("Descripción", margen_izq + columnas_lista[4], y);
    doc.text("P. Unitario", margen_izq + columnas_lista[5], y);
    doc.text("Importe", margen_izq + columnas_lista[6], y);
    ///  si es la ultima poner total , para mas de una pagina

    if (total_paginas <= pagina_actual + 1) {
      doc.text("Total  ", margen_izq + columnas_lista[4]+100, 630);
      doc.text(carritoDB.moneda, margen_izq + columnas_lista[5] - 50, 640);

      doc.text(
        NumeroALetras(
          carritoDB.total_pedido / factor_cambio, carritoDB.moneda
        ),
        margen_izq + columnas_lista[0] - 10,
        650
      );

      doc.text(
        "$ "+formato_precio(carritoDB.total_pedido / factor_cambio),
        margen_izq + columnas_lista[5],
        630
      );


      ///  Caja de total en otras paginas   ***
      doc.fill("gray", "even-odd");
      doc.lineWidth(1);
      doc
        .lineJoin("round")
        .rect(40, 615, 530, 100)
        .stroke();
      doc.fill("black", "even-odd");
    }

    doc.fill("black", "even-odd");
    doc.fontSize(7);
    doc
      .text(
        "Xenon y más, página " +
        pagina_actual +
        " /" +
        Math.round(total_paginas),
        300,
        690
      )
      .fill("gray", "even-odd");
    doc.text(
      `**Favor de verificar los colores cotizados, son sugerencias ya que la tonalidad que pide no la hay. Pido confirmar si lo requiere así o lo quitamos de la cotización. En caso de no confirmar o no hacerme mención alguna se da por entendido que acepta esa tonalidad.
      **La paquetería corre a cuenta y riesgo del cliente.`,
      margen_izq + columnas[0],
      670
    );
  });
  //  Header de tabla
  // Paginas

  let lista = carritoDB.lista;

  let espaciado_vertical = 20;

  //console.log(carritoDB);
  //console.log(carritoDB.lista);
  //console.log(lista);

  let pagina_actual = 1;
  y = 280;
  doc.text("Cantidad", margen_izq + columnas_lista[0], y);
  doc.text("Unidad", margen_izq + columnas_lista[1], y);
  //  doc.text("Nombre", columnas[2], y);
  doc.text("Marca", margen_izq + columnas_lista[2], y);
  doc.text("Código", margen_izq + columnas_lista[3], y);
  doc.text("Descripción", margen_izq + columnas_lista[4], y);
  doc.text("P. Unitario", margen_izq + columnas_lista[5], y);
  doc.text("Importe", margen_izq + columnas_lista[6], y);
// LISTA Productos
  for (let index = 0; index < lista.length; index++) {
    const item = lista[index];
    if (y > 600) {
      pagina_actual += 1;
      //margen_izq +=500;
      doc.addPage();
      y = 150;
    } else {
      y += espaciado_vertical;
    }

    doc
      .fill("gray", "even-odd")
      .fontSize(7)
      .restore();
    doc
      .text(+index + 1 + ") ", margen_izq + columnas_lista[0] - 20, y)
      .fontSize(5)
      .fill("black", "even-odd")
      .restore();
    doc.fontSize(7);
    doc
      .text(item.cantidad, margen_izq + columnas_lista[0], y)
      .fill("black", "even-odd")
      .fontSize(7)
      .restore();

    doc
      .text(item.producto.unidad, margen_izq + columnas_lista[1], y)
      .fill("gray", "even-odd")
      .fontSize(7)
      .restore();

    doc
      .fill("black", "even-odd")
      .fontSize(7)
      .restore();

    doc
      .text(item.producto.marca, margen_izq + columnas_lista[2], y)
      .fill("gray", "even-odd")
      .restore();



    doc
    .text(item.producto.codigo, margen_izq + columnas_lista[3], y)
    .fill("gray", "even-odd")
    .restore();


    doc
      .text(item.producto.nombre, margen_izq + columnas_lista[4], y)
      .fill("gray", "even-odd")
      .fontSize(7)
      .restore();
    doc
      .text(
        "$ " + formato_precio(item.producto.precio / factor_cambio),
        margen_izq + columnas_lista[5],
        y
      )
      .fill("black", "even-odd")
      .fontSize(7)
      .restore();

    doc
      .text(
        "$ " + formato_precio(item.producto.precio * item.cantidad / factor_cambio),
        margen_izq + columnas_lista[6],
        y
      )
      .fill("black", "even-odd")
      .fontSize(7)
      .restore();
  }

  doc.end();

  return p.then(function (buffers2) {
    return sendMail(buffers2, carritoDB, factor_cambio, res);
  });
}

async function sendMail(buffers, carrito, factor_cambio, res) {
  const pdfData = Buffer.concat(buffers);
  const tabla_pedidos = await hacer_tabla_peido(carrito.lista,factor_cambio);
  const mailTemplate = `<h2 style="text-align:center">Xenon y más</h2>
   
          <br>
          <div style="text-align:center;">
          <div style="font-size:1.3em;">
          <b> ${carrito.cliente.nombre}</b>
          </div>
          Se ha realizado un pedido relacionado a tu cuenta <br>
          Se adjunta el archivo PDF correspondiente.
  
          <table style="width:80%;padding-top:30px;margin: 0 auto;">
          ${tabla_pedidos}
          <tr style="background: aliceblue;" ><td></td><td></td><td></td><td></td><td>Total </td><td>$ ${formato_precio(
    carrito.total_pedido / factor_cambio
  )}</td></tr>
  <tr style="background: aliceblue;" ><td></td><td></td><td></td><td></td><td>Moneda </td><td> ${carrito.moneda}</td></tr>
          </table>
          <div style="text-align:center;"> Datos bancarios</div>
          <table style="width:80%">
          <tr>
            <td style="width:33%">
            HSBC
            </td>
            <td style="width:33%">
            BAJIO
            </td>
            <td style="width:33%">
            BANAMEX
            </td>
          </tr>
          <tr>
            <td style="width:33%">
            CUENTA: 40 54 62 83 83
            </td>
            <td style="width:33%">
            CUENTA: 00 97 44 08 70 201
            </td>
            <td style="width:33%">
            CUENTA: 16 67 578
            </td>
          </tr>
          <tr>
            <td style="width:33%">
            CLABE: 02 168 50 40 54 62 83 839
            </td>
            <td style="width:33%">
            CLABE: 03 068 59 00 00 102 10 94
            </td>
            <td style="width:33%">
            CLABE: 002 68 57 01 01 66 75 785
            <br>
  SUCURSAL: 7010
            </td>
          </tr>
          </table>
          
          <div style="text-align:center;color:gray;font-size:.8em;"> xenon y más </div>
        </div>
      </div>
      `;

  const mailOptions = {
    from: "Xenon y mas <noreply@xenonymas.com.mx>",
    to: carrito.cliente.correo,
    subject: "Pedido no. " + carrito.folio,
    html: mailTemplate,
    attachments: [
      {
        filename: "pedido-" + carrito.folio + ".pdf",
        content: pdfData
      }
    ]
  };

  return mailTransport
    .sendMail(mailOptions)
    .then(() => {
      //console.log("Nuevo email enviado a :", carrito.cliente.correo);
      res.send({ ok: true, mensaje: 'Email enviado' });
      return;
    })
    .catch((error) => {
      console.error(error);
      res.send({ ok: false, mensaje: 'Email no pudo ser enviado enviado' })
      return;
    });
}

// funcion que tra el auincrementable apara folio
function obtener_carrito(id_carrito) {
  return new Promise((resolve, reject) => {

    Carrito.findById(id_carrito)
      .then((carrito) => {
        resolve({ ok: true, carrito });
      })
      .catch((err) => {
        console.log(err);
        reject({ ok: false, err });
      });
  });
}

function hacer_tabla_peido(lista, factor_cambio) {
  return new Promise((resolve, reject) => {


    let txt = "";
    lista.forEach((element, i) => {
      txt += ` <tr style="border-bottom:1px solid gray;height:80px;">`;
      txt += ` <td style="width:50px;" > ${element.cantidad} </td>`;
      txt += ` <td style="width:50px;" > ${element.producto.unidad} </td>`;
      txt += ` <td style="width:150px;" > ${element.producto.marca} </td>`;
      txt += ` <td style="width:350px;" > ${element.producto.descripcion} </td>`;
      txt += ` <td style="min-width:50px" >$ ${formato_precio(
        element.producto.precio/factor_cambio
      )} </td>`;
      txt += ` <td style="min-width:50px" >$ ${formato_precio(
        element.producto.precio * element.cantidad/factor_cambio
      )} </td>`;
      txt += ` </tr>`;
      if (i + 1 == lista.length) {
        txt =
          ` <tr style="background: gray;color:white"><th>Cantidad</th><th>Unidad</th><th>Marca</th><th>Descripción</th><th>P. Público</th><th>Importe</th></tr> ` +
          txt;
        resolve(txt);
      }

      if (i + 1 == lista.length + 1) {
        txt = "";
        reject(txt);
      }
    });
  });
}

// formato de carbopuntos y precio
function formato_precio(precio) {
  if (precio == undefined) return "0.00";
  if (precio == "" || isNaN(precio)) return "0.00";

  let precio_tmp = parseFloat(precio);
  var precio_txt = precio_tmp.toLocaleString("en-US", {
    style: "decimal",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
  if (precio_tmp == 0) return "0.00";
  return precio_txt;
}

/*************************************************************/
// NumeroALetras
// @author   Rodolfo Carmona
/*************************************************************/
function Unidades(num) {
  switch (num) {
    case 1:
      return "UN";
    case 2:
      return "DOS";
    case 3:
      return "TRES";
    case 4:
      return "CUATRO";
    case 5:
      return "CINCO";
    case 6:
      return "SEIS";
    case 7:
      return "SIETE";
    case 8:
      return "OCHO";
    case 9:
      return "NUEVE";
  }

  return "";
}

function Decenas(num) {
  const decena = Math.floor(num / 10);
  const unidad = num - decena * 10;

  switch (decena) {
    case 1:
      switch (unidad) {
        case 0:
          return "DIEZ";
        case 1:
          return "ONCE";
        case 2:
          return "DOCE";
        case 3:
          return "TRECE";
        case 4:
          return "CATORCE";
        case 5:
          return "QUINCE";
        default:
          return "DIECI" + Unidades(unidad);
      }
    case 2:
      switch (unidad) {
        case 0:
          return "VEINTE";
        default:
          return "VEINTI" + Unidades(unidad);
      }
    case 3:
      return DecenasY("TREINTA", unidad);
    case 4:
      return DecenasY("CUARENTA", unidad);
    case 5:
      return DecenasY("CINCUENTA", unidad);
    case 6:
      return DecenasY("SESENTA", unidad);
    case 7:
      return DecenasY("SETENTA", unidad);
    case 8:
      return DecenasY("OCHENTA", unidad);
    case 9:
      return DecenasY("NOVENTA", unidad);
    case 0:
      return Unidades(unidad);
  }
} //Unidades()

function DecenasY(strSin, numUnidades) {
  if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);

  return strSin;
} //DecenasY()

function Centenas(num) {
  const centenas = Math.floor(num / 100);
  const decenas = num - centenas * 100;

  switch (centenas) {
    case 1:
      if (decenas > 0) return "CIENTO " + Decenas(decenas);
      return "CIEN";
    case 2:
      return "DOSCIENTOS " + Decenas(decenas);
    case 3:
      return "TRESCIENTOS " + Decenas(decenas);
    case 4:
      return "CUATROCIENTOS " + Decenas(decenas);
    case 5:
      return "QUINIENTOS " + Decenas(decenas);
    case 6:
      return "SEISCIENTOS " + Decenas(decenas);
    case 7:
      return "SETECIENTOS " + Decenas(decenas);
    case 8:
      return "OCHOCIENTOS " + Decenas(decenas);
    case 9:
      return "NOVECIENTOS " + Decenas(decenas);
  }

  return Decenas(decenas);
} //Centenas()

function Seccion(
  num,
  divisor,
  strSingular,
  strPlural
) {
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  let letras = "";

  if (cientos > 0)
    if (cientos > 1) letras = Centenas(cientos) + " " + strPlural;
    else letras = strSingular;

  if (resto > 0) letras += "";

  return letras;
} //Seccion()

function Miles(num) {
  const divisor = 1000;
  const cientos = Math.floor(num / divisor);
  let resto = num - cientos * divisor;

  const strMiles = Seccion(num, divisor, "UN MIL", "MIL");
  const strCentenas = Centenas(resto);

  if (strMiles == "") return strCentenas;

  return strMiles + " " + strCentenas;

  //return Seccion(num, divisor, "UN MIL", "MIL") + " " + Centenas(resto);
} //Miles()

function Millones(num) {
  const divisor = 1000000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  const strMillones = Seccion(num, divisor, "UN MILLON", "MILLONES");
  const strMiles = Miles(resto);

  if (strMillones == "") return strMiles;

  return strMillones + " " + strMiles;

  //return Seccion(num, divisor, "UN MILLON", "MILLONES") + " " + Miles(resto);
} //Millones()

function NumeroALetras(num, moneda) {
  var data = {
    numero: num,
    enteros: Math.floor(num),
    centavos: Math.round(num * 100) - Math.floor(num) * 100,
    letrasCentavos: "Centavos",
    letrasMonedaPlural: moneda,
    letrasMonedaSingular: moneda
  };

  if (data.centavos > 0) data.letrasCentavos = "CON " + data.centavos + "/100";
  if (data.centavos == 0) data.letrasCentavos = "CON CERO " + data.letrasCentavos;

  if (data.enteros == 0)
    return "CERO " + data.letrasMonedaPlural + " " + data.letrasCentavos;
  if (data.enteros == 1)
    return (
      Millones(data.enteros) +
      " " +
      data.letrasMonedaSingular +
      " " +
      data.letrasCentavos
    );
  else
    return (
      Millones(data.enteros) +
      " " +
      data.letrasMonedaPlural +
      " " +
      data.letrasCentavos
    );
} //NumeroALetras()

const logo_rojo = `m 144.9197,52.16815 c -5.01009,-0.515626 -9.05387,-2.250341 -11.54308,-4.951789 -1.31135,-1.423147 -2.05392,-3.026121 -2.2125,-4.776049 l -0.0499,-0.550787 0.25096,-0.05019 c 0.13803,-0.02761 1.37369,-0.05019 2.7459,-0.05019 2.16514,0 2.51098,-0.01604 2.61631,-0.121368 0.091,-0.09105 0.12136,-0.283279 0.12136,-0.769623 0,-0.561866 -0.0199,-0.658911 -0.14939,-0.728208 -0.0944,-0.0505 -1.09239,-0.07995 -2.70933,-0.07995 h -2.55993 l 0.0498,-0.25101 c 0.0767,-0.386453 0.69984,-1.646944 1.09028,-2.205471 1.06288,-1.520464 2.57441,-2.76701 4.6261,-3.815092 2.24198,-1.145298 4.32375,-1.727037 7.38995,-2.065088 1.72108,-0.18975 2.50573,-0.197822 4.08779,-0.04205 4.21488,0.415001 7.34036,1.478507 9.91646,3.37427 0.85104,0.626281 2.34553,2.17053 2.78044,2.873015 0.38206,0.617117 0.88412,1.747668 0.88651,1.996267 0.001,0.126242 -0.18197,0.135159 -2.77641,0.135159 -3.20744,0 -2.93761,-0.07804 -2.93761,0.849575 0,0.929994 -0.2937,0.849575 3.1027,0.849575 h 2.94279 l -0.0534,0.657701 c -0.10178,1.254318 -0.60183,2.630994 -1.36257,3.751235 -0.45903,0.675954 -1.44628,1.689035 -2.26229,2.321481 -2.42856,1.882245 -5.24032,2.981598 -8.97078,3.507429 -0.8138,0.11471 -4.31945,0.213285 -5.02022,0.141163 z m 3.30892,-2.895823 c 0.10351,-0.04716 0.22405,-0.16445 0.26788,-0.260638 0.15944,-0.349925 1.51784,-7.294925 1.44125,-7.368589 -0.0437,-0.04209 -1.6769,-0.08307 -3.9147,-0.09824 -3.45879,-0.02345 -3.85205,-0.01362 -3.96479,0.09912 -0.0891,0.08913 -0.31004,1.176629 -0.76753,3.77856 -0.35332,2.009375 -0.62546,3.697532 -0.60476,3.751458 0.0573,0.149191 0.26941,0.158437 3.94047,0.171728 2.36235,0.0086 3.47195,-0.01405 3.60218,-0.07339 z m 3.36024,-9.12441 c 0.17689,-0.09558 1.38554,-1.077415 2.68587,-2.181862 1.30033,-1.104447 2.45467,-2.082176 2.56521,-2.172729 0.17308,-0.141801 0.18657,-0.181985 0.0972,-0.289628 -0.0908,-0.109361 -0.35775,-0.124984 -2.13594,-0.124984 -1.11773,0 -2.11877,0.0329 -2.22453,0.07312 -0.10577,0.04021 -1.16903,0.80483 -2.3628,1.699149 -1.19377,0.894318 -2.21563,1.626033 -2.2708,1.626033 -0.0552,0 -0.44139,-0.66904 -0.85825,-1.486755 -0.41686,-0.817716 -0.84646,-1.582333 -0.95467,-1.699149 l -0.19673,-0.212394 h -3.81106 c -3.31244,0 -3.81686,0.01512 -3.85541,0.115584 -0.0663,0.172806 2.66879,4.435077 2.98623,4.653619 l 0.25241,0.173776 h 4.88079 4.88079 z`;

const logo_negro = `m 34.719569,122.77173 c -0.02832,-0.0283 -0.05636,-0.76687 -0.06231,-1.64123 -0.0059,-0.87435 -0.03202,-2.31959 -0.05793,-3.21165 l -0.0471,-1.62191 -4.827129,-0.0386 -4.827129,-0.0386 -0.02016,-3.22453 -0.02016,-3.22452 h -3.661454 c -2.0138,0 -3.716429,-0.0211 -3.783622,-0.0469 -0.08837,-0.0339 -0.122168,-0.15143 -0.122168,-0.42479 v -0.3779 h 4.162376 c 3.724296,0 4.167311,0.0129 4.209257,0.12217 0.02578,0.0672 0.04688,1.50953 0.04688,3.20521 v 3.08304 h 4.440959 4.440958 v -7.48618 c 0,-6.70265 0.0127,-7.49889 0.121368,-7.60756 0.148658,-0.14866 0.600415,-0.15949 0.71848,-0.0172 0.06262,0.0755 0.09181,3.07965 0.105999,10.90931 l 0.01958,10.80518 h 5.097448 5.097448 l 0.03928,-11.00586 c 0.0216,-6.05322 0.04767,-11.01639 0.05793,-11.029273 0.01026,-0.01288 41.803237,-0.01856 92.8733,-0.01262 69.45145,0.0081 92.99091,-0.0115 93.39526,-0.07768 2.0993,-0.343594 3.41381,-1.446943 4.09721,-3.439039 0.29601,-0.862865 0.4331,-0.981149 1.51613,-1.308156 1.92153,-0.580176 2.7039,-0.979184 3.40513,-1.736599 0.94939,-1.025456 1.06103,-2.278784 0.36695,-4.119802 -0.1206,-0.319869 -0.23031,-0.477498 -0.38975,-0.559947 -0.19128,-0.09892 -1.14236,-0.114752 -6.89104,-0.114752 -5.08413,0 -6.69116,-0.02203 -6.76182,-0.09268 -0.10263,-0.102626 -0.12357,-0.588733 -0.0316,-0.733401 0.0816,-0.12835 17.7874,-0.15406 18.86127,-0.02739 1.09894,0.129629 2.13138,0.357534 3.01845,0.666303 2.74238,0.954561 4.46344,2.583134 4.89811,4.634886 0.14518,0.685305 0.1441,1.05748 -0.005,1.792186 -0.34467,1.696331 -1.64329,3.187848 -3.64344,4.184616 -1.27194,0.633869 -2.1625,0.833066 -4.15209,0.928717 -1.44877,0.06965 -2.2652,0.173061 -3.32052,0.420601 -2.65963,0.62384 -6.17288,2.28263 -9.26863,4.37622 -1.79722,1.21542 -3.76018,2.82645 -4.15133,3.40706 -0.1956,0.29034 -0.2124,0.37479 -0.2124,1.06773 0,0.61489 -0.0223,0.76102 -0.12217,0.79933 -0.0672,0.0258 -41.18274,0.0469 -91.36789,0.0469 H 46.716593 v 6.28826 c 0,3.45855 -0.02109,6.34324 -0.04688,6.41043 -0.04219,0.10993 -0.640379,0.12217 -5.972765,0.12217 -3.25924,0 -5.94906,-0.0232 -5.977378,-0.0515 z M 230.28351,106.24989 c 2.11771,-1.83828 4.84792,-3.60467 7.70063,-4.98214 3.15285,-1.522401 5.67692,-2.226755 7.99633,-2.231425 2.64274,-0.0053 4.84214,-0.843896 6.27641,-2.393046 0.78909,-0.852284 1.13428,-1.687435 1.13428,-2.744216 0,-1.143956 -0.35713,-1.948219 -1.26896,-2.85766 -1.3327,-1.329208 -3.50988,-2.226406 -6.08076,-2.505827 -0.77269,-0.08398 -3.70951,-0.114462 -3.78469,-0.03928 -0.0232,0.02323 0.0801,0.414225 0.22967,0.868883 0.34301,1.042834 0.4268,2.18315 0.21416,2.914602 -0.49772,1.71211 -1.9322,2.86588 -4.47757,3.601354 -0.42227,0.122015 -0.8259,0.274447 -0.89694,0.338737 -0.071,0.06429 -0.2265,0.350403 -0.34548,0.635808 -0.3955,0.948765 -0.81089,1.577468 -1.49699,2.265733 -0.56342,0.565194 -0.77408,0.718215 -1.39717,1.014897 -0.40355,0.19214 -0.97702,0.41398 -1.27437,0.49297 -0.52559,0.13962 -3.12191,0.14361 -93.29874,0.14361 H 46.75521 v 2.58735 2.58734 l 91.28612,0.0193 c 72.91139,0.0155 91.29846,0.0388 91.3474,0.11585 0.0337,0.0531 0.0618,0.22105 0.0625,0.37326 10e-4,0.24438 0.0477,0.37974 0.13077,0.37974 0.0146,0 0.33032,-0.26365 0.70154,-0.58588 z m -61.74199,14.55375 c -0.1311,-0.16622 -0.18235,-0.57442 -0.0844,-0.67235 0.0487,-0.0487 0.1985,-0.0885 0.33294,-0.0885 0.35636,0 0.65147,-0.26042 0.65147,-0.5749 0,-0.14011 -0.27805,-0.99358 -0.61788,-1.89659 -0.33983,-0.90301 -0.61787,-1.68949 -0.61787,-1.74773 0,-0.0779 0.12209,-0.10589 0.46162,-0.10589 0.56376,0 0.56813,0.006 0.96757,1.23575 0.15863,0.4885 0.33237,0.93506 0.3861,0.99234 0.0798,0.0851 0.1641,-0.0951 0.46087,-0.9856 0.23953,-0.71872 0.41177,-1.11575 0.50588,-1.16612 0.0785,-0.042 0.30138,-0.0764 0.49533,-0.0764 0.32157,0 0.35263,0.0165 0.35263,0.18696 0,0.22657 -1.33314,3.89936 -1.56966,4.32439 -0.25994,0.46713 -0.51546,0.61529 -1.12005,0.64946 -0.37541,0.0212 -0.54538,1.5e-4 -0.60454,-0.0748 z m -64.73013,-0.0778 c -0.14785,-0.14784 -0.13762,-4.80027 0.0108,-4.92347 0.16682,-0.13845 0.64567,-0.12652 0.80771,0.0201 0.1346,0.12181 0.16428,0.12031 0.48329,-0.0244 1.22936,-0.55777 2.33592,0.43472 2.21158,1.98361 -0.10011,1.24731 -0.99646,1.97186 -1.98754,1.60663 -0.67085,-0.24721 -0.60974,-0.30389 -0.63439,0.5883 l -0.0221,0.79992 -0.38665,0.0227 c -0.234,0.0137 -0.42458,-0.0152 -0.48272,-0.0734 z m 2.24342,-2.31851 c 0.085,-0.11436 0.17021,-0.37972 0.19082,-0.59422 0.0822,-0.85587 -0.18398,-1.32308 -0.75392,-1.32308 -0.43186,0 -0.65995,0.23594 -0.73157,0.75676 -0.0772,0.56136 0.003,0.81678 0.35581,1.13569 0.37583,0.33954 0.69863,0.34808 0.93886,0.0249 z M 0.6215038,119.77715 c 0.0607801,-0.27058 2.0377002,-2.30748 5.563853,-5.73268 4.0747212,-3.95805 18.6916862,-18.098016 22.4584652,-21.725567 1.253123,-1.206806 2.347916,-2.308618 2.432873,-2.448474 l 0.154468,-0.254282 -0.328244,-0.609925 c -0.180535,-0.335459 -0.328245,-0.649061 -0.328245,-0.696894 0,-0.06324 0.992162,-0.08697 3.635942,-0.08697 h 3.635942 l 0.209075,0.212394 c 0.243047,0.246906 4.274081,7.079988 4.287936,7.26856 0.0085,0.115396 -0.313879,0.128376 -3.64238,0.146667 -3.029164,0.01664 -3.687484,0.0014 -3.861704,-0.08936 -0.150814,-0.07858 -0.425156,-0.497932 -0.97313,-1.487513 C 33.446646,93.51516 33.050528,92.834492 32.986092,92.760514 32.876456,92.63464 32.846121,92.646845 32.513454,92.950672 32.08846,93.338824 15.12727,109.8112 9.231367,115.56178 c -2.2872999,2.23092 -4.2678114,4.11705 -4.4011359,4.19138 -0.2133939,0.11899 -0.4812748,0.13516 -2.2380539,0.13516 -1.69662223,0 -1.9919035,-0.0166 -1.9706734,-0.11117 z m 50.2091312,-0.27942 c -0.710175,-0.13969 -1.258969,-0.53774 -1.60653,-1.16524 -0.221029,-0.39904 -0.229107,-0.44905 -0.229107,-1.41768 0,-0.94425 0.01293,-1.03037 0.217097,-1.44615 0.398906,-0.81232 1.087285,-1.21842 2.065354,-1.21842 0.872251,0 1.550273,0.34013 1.850281,0.9282 0.260441,0.5105 0.192012,0.62468 -0.436735,0.72879 -0.302742,0.0501 -0.331821,0.0377 -0.533973,-0.22729 -0.530753,-0.69585 -1.377933,-0.6681 -1.919182,0.0629 -0.141276,0.1908 -0.161566,0.32658 -0.161566,1.08127 0,0.97894 0.102467,1.25715 0.583434,1.58411 0.213823,0.14535 0.338757,0.17416 0.635521,0.14651 0.419636,-0.0391 0.679474,-0.2363 0.914065,-0.69377 0.16847,-0.32852 0.208624,-0.33766 0.719342,-0.16364 0.360297,0.12277 0.368677,0.13274 0.327033,0.38934 -0.151727,0.93501 -1.337548,1.62503 -2.425034,1.4111 z m 167.434145,2.4e-4 c -0.68638,-0.13831 -1.33892,-0.67214 -1.6471,-1.34745 -0.14623,-0.32043 -0.17609,-0.51764 -0.17547,-1.15851 0.001,-0.98673 0.15397,-1.51088 0.5834,-1.99874 0.51058,-0.58006 0.81604,-0.70445 1.72985,-0.70445 0.84962,0 1.18332,0.11542 1.59852,0.55287 0.22809,0.24032 0.47708,0.76673 0.41227,0.8716 -0.0225,0.0363 -0.21002,0.10666 -0.4168,0.15626 -0.36713,0.0881 -0.38207,0.0846 -0.63741,-0.14894 -0.32602,-0.29814 -0.82294,-0.54356 -1.10065,-0.54356 -0.29937,0 -0.62525,0.18801 -0.83399,0.48115 -0.15469,0.21724 -0.18314,0.36435 -0.20736,1.0721 -0.0238,0.69433 -0.004,0.87428 0.12735,1.1717 0.18179,0.41097 0.42543,0.59329 0.87304,0.65333 0.43338,0.0581 0.74414,-0.11814 1.06065,-0.60161 0.1377,-0.21033 0.27743,-0.38242 0.31053,-0.38242 0.0331,0 0.24027,0.0535 0.46037,0.11884 0.45149,0.13408 0.47761,0.20527 0.2551,0.69511 -0.36565,0.80497 -1.43992,1.30466 -2.3923,1.11275 z m -163.111223,-0.099 c -0.377111,-0.13676 -0.76997,-0.48178 -0.963827,-0.84646 -0.246168,-0.46308 -0.24786,-1.49644 -0.0032,-1.95631 0.191494,-0.35993 0.558804,-0.69748 0.926793,-0.85169 0.30326,-0.12708 1.062787,-0.13577 1.419786,-0.0162 0.939228,0.31446 1.448146,1.3176 1.187227,2.34016 -0.151055,0.592 -0.43421,0.95157 -0.961727,1.22125 -0.45982,0.23507 -1.132019,0.28085 -1.605047,0.10929 z m 1.20991,-0.9452 c 0.477129,-0.40147 0.499086,-1.25587 0.04398,-1.71097 -0.591783,-0.59175 -1.349581,-0.12659 -1.349581,0.82845 0,0.91304 0.703888,1.38886 1.305596,0.88255 z m 9.246493,0.93483 c -0.680046,-0.2424 -1.092793,-0.93175 -1.088151,-1.81738 0.0032,-0.61635 0.131993,-1.00947 0.448846,-1.37035 0.474418,-0.54033 1.35243,-0.71994 2.025339,-0.41431 0.61008,0.27709 1.019791,1.04857 0.947794,1.78466 l -0.02644,0.27032 -1.119894,0.0386 -1.119894,0.0386 -0.02282,0.19563 c -0.02815,0.24135 0.243488,0.51658 0.57534,0.58295 0.192035,0.0384 0.287025,0.003 0.508501,-0.1919 0.270875,-0.23783 0.516233,-0.29038 0.889142,-0.19045 0.397292,0.10647 0.04302,0.76946 -0.55675,1.0419 -0.371797,0.16888 -1.035747,0.18329 -1.461005,0.0317 z m 1.264723,-2.36306 c 0,-0.42451 -0.382239,-0.67706 -0.810703,-0.53565 -0.1395,0.046 -0.286546,0.16679 -0.336432,0.27627 -0.177035,0.38856 -0.138673,0.41892 0.529262,0.41892 0.572938,0 0.617873,-0.0116 0.617873,-0.15954 z m 5.522235,2.38222 c -0.382092,-0.13547 -0.64397,-0.35887 -0.868582,-0.74097 -0.19212,-0.32681 -0.212695,-0.43339 -0.212695,-1.1016 0,-0.68804 0.01629,-0.76612 0.232892,-1.11647 0.327341,-0.52946 0.869694,-0.80836 1.57162,-0.8082 0.604967,1.5e-4 0.946913,0.14772 1.252397,0.54052 0.325016,0.41791 0.354141,0.60217 0.109842,0.69504 -0.382192,0.14532 -0.64017,0.0925 -0.942873,-0.19302 -0.304797,-0.28749 -0.443107,-0.32179 -0.744282,-0.18457 -0.272234,0.12404 -0.359702,0.38325 -0.359702,1.06598 0,0.48527 0.03009,0.64207 0.153248,0.79864 0.240939,0.30631 0.508702,0.3334 0.863693,0.0874 0.166486,-0.11537 0.331465,-0.26116 0.366615,-0.32398 0.04781,-0.0854 0.154978,-0.10394 0.425274,-0.0735 0.198746,0.0224 0.381188,0.0606 0.405424,0.0848 0.09312,0.0931 -0.06712,0.59839 -0.26397,0.83233 -0.293551,0.34886 -0.739184,0.5294 -1.293794,0.52413 -0.254873,-0.002 -0.567671,-0.0414 -0.695107,-0.0866 z m 5.295299,-0.0468 c -0.728773,-0.39085 -0.712848,-1.59857 0.02514,-1.90692 0.142026,-0.0593 0.558325,-0.18316 0.925118,-0.27515 0.731707,-0.18352 0.817569,-0.28875 0.488134,-0.59824 -0.234637,-0.22043 -0.479893,-0.21234 -0.762138,0.0252 -0.321965,0.27092 -1.067536,0.25113 -1.066903,-0.0283 7.72e-4,-0.21904 0.292045,-0.61546 0.556247,-0.75635 0.363618,-0.19389 1.69155,-0.193 2.056203,10e-4 0.402729,0.21468 0.45833,0.45333 0.488389,2.09626 l 0.02685,1.46744 -0.26947,0.0256 c -0.148205,0.0141 -0.392357,-0.015 -0.542554,-0.0645 -0.220241,-0.0727 -0.364545,-0.0664 -0.745718,0.0323 -0.610945,0.15831 -0.85658,0.15443 -1.179302,-0.0186 z m 1.34337,-0.67919 c 0.2577,-0.0989 0.467792,-0.79755 0.275564,-0.91635 -0.126695,-0.0783 -0.686789,0.11036 -0.851042,0.28667 -0.213452,0.22911 -0.193696,0.41991 0.05761,0.55624 0.238097,0.12917 0.336331,0.1431 0.517869,0.0734 z m 6.934399,0.69266 c -1.027314,-0.5064 -1.285484,-2.4264 -0.442914,-3.29396 0.363285,-0.37406 0.778944,-0.48562 1.348275,-0.36187 0.783887,0.1704 0.731561,0.21217 0.775298,-0.61886 l 0.03862,-0.73372 0.372863,-0.0238 c 0.208648,-0.0133 0.421242,0.0164 0.482713,0.0674 0.09056,0.0752 0.10985,0.50218 0.10985,2.43103 0,1.28692 -0.02109,2.39484 -0.04688,2.46203 -0.06874,0.17913 -0.767822,0.17077 -0.869208,-0.0104 -0.06925,-0.12373 -0.106783,-0.12111 -0.563785,0.0394 -0.575803,0.20224 -0.860758,0.21236 -1.204828,0.0427 z m 1.398794,-0.95399 c 0.38227,-0.4543 0.331349,-1.56159 -0.08434,-1.83396 -0.290323,-0.19022 -0.683498,-0.16321 -0.909184,0.0625 -0.355609,0.35561 -0.353353,1.4631 0.0037,1.82016 0.27761,0.27761 0.734164,0.25516 0.989824,-0.0487 z m 3.001385,0.99446 c -0.404946,-0.11678 -0.839813,-0.61025 -0.988496,-1.12171 -0.39092,-1.34471 0.385931,-2.65281 1.575436,-2.65281 1.056601,0 1.735527,0.65714 1.746803,1.69076 l 0.0056,0.51041 -1.1576,0.0386 c -0.978355,0.0326 -1.161253,0.0577 -1.181171,0.16176 -0.02608,0.13623 0.540337,0.68781 0.706297,0.68781 0.05767,0 0.240036,-0.094 0.405263,-0.2088 0.237912,-0.16538 0.379412,-0.20605 0.680254,-0.19554 0.208926,0.007 0.408823,0.0422 0.444228,0.0776 0.125459,0.12546 -0.367225,0.76081 -0.723854,0.93345 -0.369456,0.17886 -1.043347,0.21379 -1.512729,0.0784 z m 1.316091,-2.27502 c 0.02485,-0.0249 0.0095,-0.14755 -0.03412,-0.27267 -0.2197,-0.63024 -1.221063,-0.50042 -1.221063,0.15831 0,0.14766 0.04507,0.15954 0.604998,0.15954 0.332755,0 0.625333,-0.0203 0.650187,-0.0452 z m 17.132794,2.15778 c -1.29915,-0.64739 -1.30947,-2.76834 -0.0168,-3.44153 0.33369,-0.17377 0.51402,-0.21542 0.92681,-0.21405 1.11005,0.004 1.83147,0.68314 1.92194,1.81016 0.11998,1.49475 -1.46417,2.52703 -2.83199,1.84542 z m 1.30923,-0.76231 c 0.30322,-0.1568 0.46088,-0.48662 0.46088,-0.96412 0,-0.47749 -0.15766,-0.80732 -0.46088,-0.96412 -0.48022,-0.24833 -0.91096,-0.0825 -1.11587,0.42964 -0.39368,0.98391 0.30268,1.91912 1.11587,1.4986 z m 5.46373,0.84634 c -0.33789,-0.18336 -0.37983,-0.35107 -0.37875,-1.51451 10e-4,-1.06743 -0.002,-1.08679 -0.1989,-1.26921 -0.22877,-0.21202 -0.4487,-0.24005 -0.51561,-0.0657 -0.0346,0.0902 -0.11051,0.10741 -0.30906,0.0702 -0.63184,-0.11854 -0.8201,0.26069 -0.8201,1.65197 0,1.1501 -0.0215,1.19204 -0.59257,1.15562 l -0.37286,-0.0238 -0.0207,-1.83431 -0.0207,-1.83431 h 0.36218 c 0.21781,0 0.41459,0.0474 0.49367,0.119 0.11904,0.10774 0.15841,0.10312 0.41595,-0.0488 0.24365,-0.14376 0.35448,-0.16066 0.77267,-0.11781 0.63211,0.0648 0.73875,0.0203 0.73875,-0.30817 0,-0.30432 0.16142,-0.4926 0.62515,-0.72917 0.40101,-0.20458 0.4533,-0.14439 0.45495,0.52357 0.001,0.46183 0.01,0.48311 0.21357,0.52778 0.41008,0.0898 0.41541,0.0958 0.39064,0.43841 -0.0217,0.30007 -0.0475,0.3366 -0.2941,0.41617 l -0.27031,0.0872 -0.0218,0.85135 -0.0218,0.85135 0.21486,0.16117 c 0.37197,0.27903 0.40487,0.31685 0.45727,0.52561 0.0394,0.15705 0.011,0.23646 -0.12348,0.34538 -0.21604,0.17492 -0.87378,0.18666 -1.17897,0.021 z m 4.13984,0.0105 c -0.13321,-0.095 -0.24922,-0.10298 -0.61787,-0.0426 -0.66024,0.10812 -1.16274,0.092 -1.4292,-0.0458 -0.57102,-0.29528 -0.59651,-1.39211 -0.0408,-1.75621 0.11112,-0.0728 0.55611,-0.22762 0.98888,-0.34403 0.43277,-0.11641 0.7993,-0.24907 0.81451,-0.29479 0.0152,-0.0457 -0.0584,-0.17606 -0.16369,-0.28963 -0.24207,-0.2612 -0.53068,-0.26585 -0.8307,-0.0134 -0.26305,0.22134 -0.71599,0.26 -0.95589,0.0816 -0.14826,-0.11027 -0.1482,-0.11473 0.005,-0.40209 0.23308,-0.43846 0.56479,-0.59296 1.3541,-0.6307 0.54671,-0.0261 0.7319,-0.004 1.0145,0.12095 0.53305,0.23579 0.59292,0.42996 0.65401,2.12122 0.0302,0.83493 0.0224,1.44526 -0.0187,1.47065 -0.19646,0.12142 -0.6192,0.13497 -0.77371,0.0248 z m -0.61178,-0.71047 c 0.27169,-0.10426 0.4741,-0.83656 0.25447,-0.92065 -0.19426,-0.0744 -0.77665,0.15991 -0.93872,0.37761 l -0.16187,0.21743 0.2167,0.18679 c 0.21794,0.18786 0.39808,0.22759 0.62942,0.13882 z m 3.09215,0.67627 c -0.37885,-0.17211 -0.75939,-0.59197 -0.89596,-0.98854 -0.13108,-0.38062 -0.13108,-1.21591 0,-1.59654 0.24381,-0.70797 0.87625,-1.12806 1.70251,-1.13088 0.61869,-0.002 1.06748,0.19888 1.34805,0.60373 0.25411,0.36669 0.25508,0.53661 0.004,0.63223 -0.35713,0.13578 -0.65546,0.0911 -0.82426,-0.12353 -0.35769,-0.45473 -0.96394,-0.36591 -1.18964,0.17428 -0.16323,0.39064 -0.11109,1.11167 0.10097,1.39651 0.3276,0.44003 0.85431,0.42529 1.12379,-0.0315 0.15805,-0.26787 0.1748,-0.2753 0.5411,-0.2401 0.20791,0.02 0.41264,0.0709 0.45498,0.11328 0.20363,0.20364 -0.35585,1.03034 -0.83192,1.22925 -0.36264,0.15152 -1.15923,0.13165 -1.53321,-0.0382 z m 6.02492,0.0329 c -0.38625,-0.14033 -0.90614,-0.69942 -1.02773,-1.10524 -0.11704,-0.39065 -0.11819,-1.03447 -0.003,-1.42051 0.21229,-0.70858 0.93786,-1.22481 1.72147,-1.22481 0.59646,0 0.98449,0.12515 1.34511,0.43383 0.67293,0.576 0.8385,1.76309 0.35498,2.54516 -0.34624,0.56002 -0.83805,0.83668 -1.53421,0.86304 -0.33678,0.0128 -0.6673,-0.0225 -0.8571,-0.0915 z m 1.26698,-0.93716 c 0.47713,-0.40147 0.49909,-1.25586 0.044,-1.71097 -0.68874,-0.68873 -1.63591,0.15124 -1.35344,1.20026 0.10715,0.39792 0.46494,0.70944 0.81482,0.70944 0.16497,0 0.34389,-0.0719 0.49463,-0.19873 z m 7.14608,0.90211 c -0.66362,-0.3014 -1.00077,-0.98483 -0.94786,-1.92134 0.0593,-1.04926 0.63279,-1.71413 1.53484,-1.77938 0.59874,-0.0433 1.05657,0.12649 1.41712,0.52556 0.32436,0.35903 0.4544,0.7531 0.42062,1.27465 l -0.025,0.38617 -1.11989,0.0386 c -1.05701,0.0365 -1.12117,0.0475 -1.14264,0.19761 -0.0348,0.24341 0.26549,0.57473 0.52094,0.57473 0.24307,0 0.73994,-0.18785 0.81406,-0.30777 0.1113,-0.18008 0.88892,-0.026 0.88892,0.1761 0,0.16969 -0.51494,0.71974 -0.80077,0.85538 -0.36422,0.17283 -1.15782,0.16249 -1.56033,-0.0203 z m 1.43429,-2.32099 c 0,-0.0826 -0.0824,-0.246 -0.1832,-0.36314 -0.25041,-0.29112 -0.69959,-0.28715 -0.95383,0.008 -0.0968,0.1125 -0.17595,0.27212 -0.17595,0.35471 0,0.13695 0.0578,0.15016 0.65649,0.15016 0.59872,0 0.65649,-0.0132 0.65649,-0.15016 z m 2.4181,2.34031 c -0.39556,-0.14013 -0.89296,-0.66209 -0.85878,-0.90117 0.0196,-0.13716 0.0935,-0.1776 0.40554,-0.22202 0.36033,-0.0513 0.39797,-0.0395 0.67602,0.2117 0.3407,0.3078 0.77714,0.36128 1.06252,0.13019 0.27389,-0.22178 0.13247,-0.38574 -0.48727,-0.56493 -1.33996,-0.38743 -1.52504,-0.5253 -1.57281,-1.17157 -0.0229,-0.31051 0.007,-0.46426 0.12535,-0.65333 0.258,-0.41064 0.55708,-0.51861 1.43654,-0.51861 0.84598,0 1.14844,0.0988 1.37874,0.45027 0.21482,0.32785 0.16598,0.49232 -0.17334,0.58369 -0.32579,0.0877 -0.4868,0.0532 -0.77172,-0.16539 -0.36695,-0.28154 -1.19766,-0.1094 -0.94444,0.19571 0.0481,0.0579 0.37382,0.18522 0.72387,0.28288 0.84359,0.23533 1.19034,0.41604 1.37293,0.71549 0.3596,0.58976 0.0405,1.31846 -0.71573,1.63443 -0.36004,0.15043 -1.22286,0.14661 -1.65742,-0.007 z m 5.18945,0.0704 c -0.085,-0.0212 -0.17803,-0.076 -0.20683,-0.12176 -0.0288,-0.0457 0.20579,-0.45571 0.52133,-0.91102 0.31553,-0.45532 0.57369,-0.85132 0.57369,-0.88 0,-0.0287 -0.24927,-0.41504 -0.55393,-0.85858 -0.61299,-0.89238 -0.61733,-0.98263 -0.0472,-0.98194 0.42468,5.4e-4 0.78925,0.19187 1.00751,0.52885 0.0951,0.14681 0.20896,0.26735 0.25306,0.26788 0.0441,5.4e-4 0.20967,-0.15394 0.36792,-0.34326 0.18517,-0.22152 0.38692,-0.3716 0.56601,-0.42105 0.2933,-0.081 0.69628,-0.0366 0.77141,0.0849 0.0245,0.0396 -0.18502,0.40877 -0.4656,0.82029 -0.28057,0.41153 -0.50987,0.79942 -0.50955,0.86199 0,0.0626 0.247,0.47248 0.54817,0.91093 0.30117,0.43844 0.52984,0.84341 0.50815,0.89992 -0.051,0.13293 -0.41837,0.18558 -0.73048,0.1047 -0.143,-0.037 -0.41674,-0.24213 -0.6572,-0.49237 l -0.4121,-0.42887 -0.29663,0.362 c -0.46081,0.56235 -0.7736,0.71331 -1.23773,0.59735 z m 4.84346,-0.0267 c -0.60633,-0.18421 -1.09761,-0.99455 -1.09761,-1.81046 0,-1.55322 1.27158,-2.42422 2.55803,-1.75217 0.64304,0.33593 1.05056,1.17442 0.88717,1.82542 l -0.0498,0.19856 h -1.15704 c -1.08172,0 -1.15704,0.009 -1.15704,0.14548 0,0.16108 0.55772,0.70409 0.72317,0.70409 0.0577,0 0.24003,-0.0934 0.40526,-0.20758 0.39545,-0.27326 1.05954,-0.30943 1.09529,-0.0597 0.0335,0.23419 -0.28939,0.65684 -0.64042,0.83822 -0.35062,0.18117 -1.15888,0.24209 -1.56697,0.1181 z m 1.29665,-2.34598 c 0,-0.45639 -0.50574,-0.76201 -0.91272,-0.55155 -0.23531,0.12168 -0.32302,0.26169 -0.32302,0.51562 0,0.1337 0.0603,0.14815 0.61787,0.14815 0.48884,0 0.61787,-0.0234 0.61787,-0.11222 z m 7.07752,2.31611 c -0.6514,-0.23222 -1.05763,-0.85441 -1.1132,-1.70497 -0.0291,-0.44533 -0.004,-0.61668 0.1378,-0.94668 0.31117,-0.72331 0.89814,-1.09808 1.71535,-1.09522 1.01154,0.004 1.73175,0.58186 1.91267,1.53587 0.23123,1.21926 -0.66827,2.32941 -1.88039,2.32074 -0.26065,-0.002 -0.60815,-0.0513 -0.77223,-0.10974 z m 1.25638,-0.93517 c 0.6801,-0.57227 0.34245,-1.96383 -0.4765,-1.96383 -0.55821,0 -0.86905,0.47662 -0.81333,1.24705 0.0301,0.41541 0.0653,0.50272 0.28083,0.69529 0.32093,0.28675 0.68455,0.29449 1.009,0.0215 z m 20.9199,0.88929 c -0.36392,-0.19214 -0.52273,-0.49698 -0.52273,-1.00339 0,-0.58003 0.28202,-0.8399 1.15851,-1.06752 0.86821,-0.22546 1.00404,-0.28799 1.00404,-0.46216 0,-0.18339 -0.12671,-0.28805 -0.42612,-0.35193 -0.17915,-0.0382 -0.29424,-0.005 -0.49772,0.14555 -0.25937,0.19136 -0.68074,0.25635 -0.96207,0.14839 -0.29763,-0.11421 -0.029,-0.68118 0.4446,-0.9384 0.35842,-0.19467 1.69443,-0.18707 2.02692,0.0115 0.41853,0.24998 0.44435,0.35147 0.50312,1.9778 0.0299,0.82834 0.0384,1.53213 0.0189,1.56399 -0.0676,0.11028 -0.66881,0.0596 -0.8101,-0.0682 -0.12939,-0.11708 -0.16694,-0.11431 -0.52242,0.0386 -0.47985,0.20642 -1.03067,0.20867 -1.41496,0.006 z m 1.49626,-0.84406 c 0.17919,-0.17918 0.22531,-0.28701 0.20646,-0.48271 -0.0209,-0.21698 -0.0519,-0.25022 -0.22314,-0.2393 -0.8801,0.0562 -1.27225,0.52492 -0.69948,0.83613 0.30462,0.16551 0.46154,0.14051 0.71616,-0.11412 z m 2.74151,0.88994 c -0.35478,-0.12648 -0.69735,-0.43656 -0.82634,-0.74799 -0.11186,-0.27005 -0.0948,-0.29143 0.3039,-0.38102 0.35436,-0.0796 0.59675,-0.0113 0.81343,0.22924 0.11065,0.12283 0.23835,0.16333 0.51502,0.16333 0.46143,0 0.61222,-0.0568 0.61222,-0.23051 0,-0.1985 -0.12859,-0.27191 -0.73373,-0.41891 -1.13645,-0.27607 -1.56174,-0.65674 -1.48586,-1.32998 0.0711,-0.63065 0.66325,-1.03163 1.5457,-1.04667 0.64887,-0.0111 0.99299,0.11407 1.32528,0.48187 0.30055,0.33269 0.32408,0.40076 0.17887,0.51774 -0.24088,0.19404 -0.58556,0.18697 -0.93744,-0.0192 -0.31217,-0.18295 -0.37675,-0.19452 -0.66007,-0.11823 -0.17272,0.0465 -0.31403,0.11514 -0.31403,0.15252 0,0.12131 0.48859,0.3656 1.08128,0.54062 0.33944,0.10024 0.66738,0.25443 0.79213,0.37243 0.55577,0.52575 0.34188,1.41275 -0.43089,1.78684 -0.39629,0.19184 -1.30701,0.21639 -1.77947,0.048 z m 21.83646,0.0291 c -0.62846,-0.18216 -1.08887,-1.13257 -1.00918,-2.08318 0.0911,-1.08668 0.60317,-1.65924 1.47742,-1.65196 0.28136,0.002 0.56517,0.0551 0.70996,0.13208 0.13267,0.0705 0.26301,0.10639 0.28963,0.0798 0.0266,-0.0266 0.0484,-0.33556 0.0484,-0.68651 0,-0.74516 0.0833,-0.88084 0.54064,-0.88084 0.54874,0 0.54064,-0.0386 0.54064,2.57741 0,1.71288 -0.0247,2.35936 -0.0927,2.42736 -0.13232,0.13231 -0.68189,0.1146 -0.83838,-0.027 -0.11981,-0.10843 -0.1765,-0.10479 -0.60221,0.0386 -0.50627,0.17055 -0.68828,0.18325 -1.06425,0.0743 z m 1.11268,-0.92032 c 0.29904,-0.18233 0.40371,-0.41919 0.40313,-0.91221 -9.3e-4,-0.76002 -0.26757,-1.17279 -0.75766,-1.17279 -0.2515,0 -0.53739,0.29362 -0.6676,0.68564 -0.1718,0.51724 -0.0688,0.96401 0.30051,1.30314 0.31954,0.29344 0.38404,0.30204 0.72162,0.0962 z m 3.24511,0.93187 c -0.35165,-0.11247 -0.66797,-0.38325 -0.89109,-0.76282 -0.18965,-0.32261 -0.21269,-0.43732 -0.21269,-1.05855 0,-0.5955 0.0287,-0.7525 0.1973,-1.08057 0.11969,-0.23284 0.32739,-0.47526 0.52799,-0.61624 0.29794,-0.20941 0.38926,-0.23241 0.92258,-0.23241 1.02344,0 1.55986,0.44836 1.73088,1.44673 0.12744,0.74403 0.1249,0.74566 -1.20367,0.77167 -0.89963,0.0176 -1.09581,0.0419 -1.11419,0.13771 -0.0363,0.1895 0.38184,0.61378 0.6564,0.66597 0.21329,0.0406 0.28413,0.0108 0.48429,-0.20349 0.2141,-0.22919 0.26508,-0.24753 0.58714,-0.21123 0.19398,0.0219 0.39199,0.0791 0.44003,0.12709 0.13244,0.13245 -0.13904,0.57722 -0.50869,0.83338 -0.2584,0.17908 -0.40113,0.21768 -0.85851,0.23223 -0.30171,0.01 -0.64272,-0.0127 -0.75777,-0.0495 z m 1.2494,-2.41831 c -0.007,-0.52768 -0.81593,-0.77389 -1.11924,-0.34085 -0.0627,0.0896 -0.11405,0.24199 -0.11405,0.33873 0,0.16839 0.0264,0.1759 0.61787,0.1759 0.59,0 0.61777,-0.008 0.61542,-0.17378 z M 58.552234,119.3356 c -0.115342,-0.11534 -0.139748,-3.50459 -0.02574,-3.57505 0.03867,-0.0239 0.217298,-0.0492 0.396944,-0.0563 0.236406,-0.009 0.354844,0.0258 0.42878,0.1269 0.09804,0.13408 0.117613,0.13305 0.486258,-0.0255 0.595359,-0.25612 0.94499,-0.22214 1.534093,0.14908 0.157928,0.0995 0.210586,0.0898 0.552015,-0.10215 0.627596,-0.35279 1.466791,-0.22851 1.783504,0.26412 0.154098,0.23968 0.21838,3.02226 0.07385,3.19641 -0.114816,0.13834 -0.718964,0.14943 -0.82971,0.0152 -0.04447,-0.0539 -0.0913,-0.63043 -0.105996,-1.30503 -0.02305,-1.05753 -0.04472,-1.22877 -0.173467,-1.37091 -0.266944,-0.29468 -0.682672,-0.16656 -0.863454,0.26611 -0.07571,0.1812 -0.109309,0.57812 -0.109309,1.29131 0,0.6979 -0.02987,1.05956 -0.09268,1.12238 -0.05098,0.051 -0.252556,0.0927 -0.447958,0.0927 -0.195402,0 -0.396983,-0.0417 -0.447957,-0.0927 -0.06422,-0.0642 -0.09268,-0.46544 -0.09268,-1.30666 0,-0.66769 -0.02212,-1.27162 -0.04915,-1.34207 -0.132773,-0.34601 -0.876993,-0.25074 -0.997663,0.12771 -0.0317,0.0994 -0.0785,0.71953 -0.10398,1.37795 l -0.04633,1.19713 -0.386649,0.0227 c -0.233996,0.0137 -0.424579,-0.0152 -0.482713,-0.0734 z m 10.212227,-0.005 c -0.02156,-0.0562 -0.02983,-0.88338 -0.01837,-1.83819 l 0.02083,-1.73602 0.336138,-0.0241 c 0.227995,-0.0164 0.380316,0.0158 0.473453,0.10013 0.126687,0.11465 0.162037,0.11137 0.456955,-0.0423 0.253212,-0.13197 0.391585,-0.15582 0.66575,-0.1147 0.311709,0.0467 0.345993,0.0725 0.344974,0.25956 -0.0022,0.40654 -0.162964,0.58778 -0.573309,0.64647 -0.65296,0.0934 -0.693716,0.18118 -0.738535,1.59063 l -0.03862,1.21439 -0.44503,0.0232 c -0.315108,0.0164 -0.456477,-0.007 -0.484235,-0.079 z m 6.778262,0.0298 c -0.07557,-0.048 -0.09327,-0.46791 -0.07723,-1.83312 l 0.02079,-1.77091 0.417481,-0.0238 c 0.281688,-0.016 0.438311,0.009 0.481523,0.0772 0.03523,0.0555 0.06459,0.83707 0.06524,1.73671 0.001,1.3851 -0.01742,1.6543 -0.120184,1.75707 -0.12756,0.12756 -0.620159,0.16307 -0.787618,0.0568 z m 5.870793,-0.0247 c -0.150359,-0.15036 -0.137345,-4.80051 0.01379,-4.92594 0.06147,-0.051 0.274065,-0.0807 0.482713,-0.0674 l 0.372863,0.0238 v 2.51011 2.51011 l -0.386649,0.0227 c -0.233996,0.0137 -0.424579,-0.0152 -0.482713,-0.0734 z m 14.159135,-0.0321 c -0.104992,-0.10499 -0.121366,-0.43713 -0.121366,-2.46203 0,-1.92954 0.01929,-2.35668 0.10985,-2.43183 0.06147,-0.051 0.274066,-0.0807 0.482713,-0.0674 l 0.372863,0.0238 0.02041,2.46625 c 0.0159,1.92164 -0.0012,2.47993 -0.07723,2.52823 -0.167134,0.10609 -0.65981,0.0704 -0.787239,-0.057 z m 1.904546,0.0568 c -0.07557,-0.048 -0.09327,-0.46698 -0.07723,-1.82826 l 0.02079,-1.76604 0.270257,-0.07 c 0.207984,-0.0539 0.326453,-0.0397 0.514094,0.0613 0.226782,0.12213 0.278421,0.12264 0.738712,0.007 0.647554,-0.1624 0.690712,-0.15947 1.16113,0.0789 l 0.40067,0.20303 0.36119,-0.20303 c 0.66714,-0.37502 1.52793,-0.19858 1.79695,0.36836 0.10799,0.22756 0.12488,0.49914 0.10718,1.72231 l -0.021,1.45215 h -0.4634 -0.4634 l -0.0386,-1.19713 c -0.03,-0.92959 -0.0681,-1.25103 -0.17069,-1.43832 -0.14606,-0.26675 -0.3288,-0.34664 -0.58017,-0.25366 -0.3076,0.11379 -0.36708,0.35503 -0.40765,1.65337 l -0.0386,1.23574 -0.41175,0.0236 c -0.591633,0.0339 -0.648763,-0.0382 -0.595525,-0.7509 0.02407,-0.3221 0.01725,-0.91545 -0.01512,-1.31855 -0.05653,-0.70372 -0.06756,-0.73707 -0.277038,-0.83724 -0.167961,-0.0803 -0.266203,-0.0844 -0.426927,-0.0179 -0.384556,0.15929 -0.432982,0.32967 -0.462323,1.62659 -0.01796,0.79405 -0.05712,1.2162 -0.116322,1.25387 -0.119767,0.0762 -0.682487,0.0724 -0.805142,-0.005 z m 27.959733,-0.0247 c -0.0707,-0.0707 -0.0961,-0.53834 -0.0961,-1.77031 0,-1.90086 -0.01,-1.87121 0.59256,-1.8328 l 0.37286,0.0238 v 1.815 1.815 l -0.38665,0.0227 c -0.23399,0.0137 -0.42457,-0.0152 -0.48271,-0.0734 z m 6.33219,0.0247 c -0.0756,-0.048 -0.0933,-0.46726 -0.0772,-1.82971 l 0.0208,-1.76749 0.29661,-0.0616 c 0.22307,-0.0463 0.35044,-0.0298 0.51376,0.0667 0.18708,0.11051 0.27881,0.11589 0.66239,0.0389 0.63624,-0.12778 1.20072,-0.1132 1.41449,0.0365 0.33633,0.23557 0.39519,0.53627 0.39519,2.01868 0,0.96821 -0.0275,1.40477 -0.0927,1.46992 -0.051,0.051 -0.23517,0.0927 -0.40934,0.0927 -0.17416,0 -0.35836,-0.0417 -0.40934,-0.0927 -0.0636,-0.0636 -0.0928,-0.44573 -0.093,-1.21643 0,-0.98402 -0.0193,-1.15497 -0.15334,-1.37477 -0.12278,-0.20137 -0.20333,-0.25101 -0.40731,-0.25101 -0.60597,0 -0.75099,0.35234 -0.75161,1.82605 0,0.85411 -0.0198,1.02252 -0.12261,1.06197 -0.17445,0.0669 -0.67104,0.0558 -0.78681,-0.0177 z m 22.00933,-0.0281 c -0.0664,-0.0664 -0.0927,-0.56638 -0.0927,-1.76094 0,-1.19455 0.0263,-1.69457 0.0927,-1.76094 0.14805,-0.14805 0.63698,-0.11339 0.7903,0.056 0.1325,0.14642 0.13998,0.14583 0.48687,-0.0386 0.43307,-0.23026 0.93429,-0.24235 1.39417,-0.0336 0.51691,0.23461 0.56444,0.42364 0.53943,2.14561 l -0.021,1.44655 -0.37287,0.0238 c -0.58142,0.0371 -0.59239,0.0126 -0.5937,-1.32692 -0.001,-1.27785 -0.0559,-1.4972 -0.40161,-1.61188 -0.29077,-0.0964 -0.60694,0.0688 -0.77495,0.40499 -0.10944,0.219 -0.13506,0.47732 -0.13516,1.36256 0,1.21068 0.0109,1.18608 -0.53163,1.18608 -0.15794,0 -0.32888,-0.0417 -0.37985,-0.0927 z m 8.5922,-0.006 c -0.0207,-0.0541 -0.0283,-0.8795 -0.0169,-1.83431 l 0.0208,-1.73602 0.35432,-0.023 c 0.24767,-0.0161 0.38418,0.013 0.45355,0.0965 0.12965,0.15622 0.21784,0.15093 0.58234,-0.0349 0.61001,-0.311 1.51797,-0.11355 1.77646,0.38632 0.0976,0.18879 0.11533,0.49865 0.0981,1.7177 l -0.021,1.48736 -0.37286,0.0238 c -0.58143,0.0371 -0.5924,0.0126 -0.5937,-1.32692 -7.7e-4,-0.77273 -0.0335,-1.23167 -0.0965,-1.35534 -0.13611,-0.26674 -0.44303,-0.34935 -0.778,-0.2094 -0.36215,0.15132 -0.43632,0.43719 -0.43687,1.68374 0,0.53813 -0.0215,1.03339 -0.0473,1.10058 -0.0598,0.15576 -0.8639,0.17657 -0.92249,0.0239 z m 12.12575,0 c -0.0207,-0.0541 -0.0283,-0.8795 -0.0169,-1.83431 l 0.0208,-1.73602 0.33614,-0.0241 c 0.23413,-0.0168 0.38006,0.0156 0.48087,0.10684 0.1365,0.12354 0.16761,0.12114 0.54733,-0.0422 0.48751,-0.20972 1.01121,-0.18544 1.36021,0.0631 0.2924,0.2082 0.36044,0.20788 0.65677,-0.003 0.36376,-0.25902 1.02118,-0.28285 1.36147,-0.0494 0.54345,0.3729 0.56406,0.44112 0.60705,2.0096 0.0447,1.63126 0.0442,1.63257 -0.57464,1.59309 l -0.37286,-0.0238 -0.0386,-1.20071 c -0.0316,-0.98376 -0.0639,-1.23919 -0.17828,-1.41367 -0.0768,-0.11713 -0.18663,-0.23099 -0.24403,-0.25302 -0.14164,-0.0543 -0.55864,0.16983 -0.65668,0.35302 -0.0437,0.0817 -0.0795,0.63497 -0.0795,1.22943 0,1.22894 -0.0386,1.32357 -0.53983,1.32357 -0.56011,0 -0.54145,0.047 -0.54145,-1.36337 0,-1.25795 -0.002,-1.27142 -0.19697,-1.46658 -0.22487,-0.22488 -0.50264,-0.20449 -0.76845,0.0564 -0.13895,0.13638 -0.15712,0.27362 -0.18081,1.36604 -0.0147,0.6787 -0.0615,1.25701 -0.10599,1.31097 -0.10645,0.12899 -0.82604,0.12756 -0.87566,-0.002 z m 16.93019,-0.01 c -0.50695,-0.18857 -0.88121,-0.65328 -1.01112,-1.25547 -0.0631,-0.29264 -0.0294,-0.31775 0.51215,-0.3814 0.41752,-0.0491 0.42318,-0.047 0.52199,0.19154 0.0549,0.13263 0.21846,0.34525 0.36337,0.47249 0.21775,0.19119 0.33072,0.23135 0.65081,0.23135 0.46734,0 0.82285,-0.1685 0.92557,-0.43869 0.16533,-0.43487 -0.0215,-0.58644 -1.11265,-0.90278 -0.37283,-0.10809 -0.82223,-0.27622 -0.99869,-0.37364 -0.79618,-0.43955 -0.96047,-1.41847 -0.35399,-2.10922 0.65064,-0.74102 2.72252,-0.6252 3.18194,0.17787 0.19823,0.34649 0.28394,0.75611 0.17999,0.86006 -0.20645,0.20645 -0.87851,0.0224 -1.20287,-0.32939 -0.46521,-0.50457 -1.39816,-0.40283 -1.39816,0.15246 0,0.24488 0.2061,0.35928 1.17511,0.65231 1.24767,0.37729 1.63105,0.76623 1.63316,1.65686 0.001,0.56565 -0.23429,1.04161 -0.63972,1.29219 -0.23038,0.14238 -0.40724,0.17045 -1.20007,0.19045 -0.66629,0.0168 -1.01404,-0.008 -1.22682,-0.087 z m 4.0097,-0.0133 c -0.15172,-0.15172 -0.15929,-0.67782 -0.0115,-0.80046 0.0615,-0.051 0.27406,-0.0807 0.48271,-0.0674 l 0.37286,0.0238 0.0238,0.41747 c 0.016,0.28169 -0.009,0.43831 -0.0772,0.48153 -0.17001,0.10783 -0.66201,0.0736 -0.79059,-0.055 z m 1.42332,0.0134 c 0,-0.24917 1.79259,-4.72451 1.9444,-4.85435 0.19692,-0.16842 0.81318,-0.18118 1.04107,-0.0216 0.18496,0.12955 2.07602,4.77734 1.99627,4.90638 -0.0627,0.10139 -0.77902,0.10007 -0.96934,-0.002 -0.0814,-0.0436 -0.23665,-0.26648 -0.34491,-0.49531 -0.23285,-0.49219 -0.42077,-0.58394 -1.196,-0.58394 -0.79181,0 -0.94169,0.0797 -1.20433,0.64051 l -0.2245,0.47938 -0.52133,0.0228 c -0.42041,0.0184 -0.52133,5.4e-4 -0.52133,-0.0922 z m 2.97715,-2.0605 c 0.0529,-0.0857 -0.31238,-1.18922 -0.45347,-1.3699 -0.0649,-0.0831 -0.0903,-0.0816 -0.14065,0.008 -0.1572,0.28091 -0.45938,1.23726 -0.42184,1.33508 0.051,0.13289 0.93593,0.15593 1.01596,0.0265 z m 2.67638,2.07576 c -0.051,-0.051 -0.0927,-0.23518 -0.0927,-0.40934 0,-0.39838 0.10364,-0.50202 0.50202,-0.50202 0.39838,0 0.50202,0.10364 0.50202,0.50202 0,0.39838 -0.10364,0.50202 -0.50202,0.50202 -0.17416,0 -0.35836,-0.0417 -0.40934,-0.0927 z m 19.24897,-0.01 c -0.0233,-0.0607 -0.0316,-0.27978 -0.0184,-0.48678 l 0.0239,-0.37636 h 0.42479 0.42479 v 0.46341 0.4634 l -0.40635,0.0234 c -0.29736,0.0171 -0.4177,-0.006 -0.44871,-0.087 z m 3.35361,0.0151 c -0.17409,-0.0638 -0.26222,-0.22725 -0.59022,-1.09449 -0.63812,-1.68722 -1.32908,-3.65805 -1.32908,-3.79095 0,-0.1019 0.0905,-0.12483 0.49257,-0.12483 0.3082,0 0.52354,0.0373 0.57532,0.0997 0.0639,0.077 1.1719,3.17399 1.1719,3.27565 0,0.0126 0.0453,0.0229 0.10063,0.0229 0.0624,0 0.27306,-0.53524 0.55472,-1.40952 0.46948,-1.45731 0.61826,-1.83262 0.76495,-1.92967 0.15027,-0.0994 0.89823,-0.0678 0.93949,0.0397 0.0209,0.0543 -0.32788,1.12307 -0.77498,2.37494 -0.87584,2.45239 -0.9742,2.62945 -1.45396,2.61759 -0.13568,-0.003 -0.33879,-0.0398 -0.45134,-0.0811 z m 2.67065,-0.0151 c -0.0233,-0.0607 -0.0316,-0.27978 -0.0185,-0.48678 l 0.0239,-0.37636 h 0.42479 0.42478 v 0.46341 0.4634 l -0.40634,0.0234 c -0.29736,0.0171 -0.4177,-0.006 -0.44871,-0.087 z m -152.307388,-4.1744 c -0.02258,-0.0589 -0.03018,-0.2587 -0.01688,-0.44409 l 0.02418,-0.33708 0.372862,-0.0238 c 0.447858,-0.0286 0.592563,0.0723 0.592563,0.4131 0,0.44773 -0.05257,0.49888 -0.51271,0.49888 -0.285774,0 -0.432001,-0.034 -0.460014,-0.10702 z m 49.910138,-0.0116 c -0.0859,-0.22376 -0.0512,-0.63238 0.0616,-0.72599 0.0615,-0.051 0.27406,-0.0807 0.48271,-0.0674 l 0.37286,0.0238 v 0.42479 0.42478 l -0.43446,0.0229 c -0.34424,0.0181 -0.44448,-0.003 -0.48271,-0.10286 z m 3.27281,-0.0282 c 0,-0.26687 0.20434,-0.68271 0.38226,-0.77794 0.19982,-0.10693 0.8692,-0.0736 0.90826,0.0452 0.0155,0.0472 -0.12078,0.24961 -0.3029,0.44973 -0.26858,0.29511 -0.39313,0.37199 -0.65937,0.40699 -0.29834,0.0392 -0.32825,0.0279 -0.32825,-0.12396 z M 144.9197,98.833072 c -5.01009,-0.515626 -9.05387,-2.250341 -11.54308,-4.951789 -1.31135,-1.423147 -2.05392,-3.026121 -2.2125,-4.776049 l -0.0499,-0.550787 0.25096,-0.05019 c 0.13803,-0.02761 1.37369,-0.05019 2.7459,-0.05019 2.16514,0 2.51098,-0.01604 2.61631,-0.121368 0.091,-0.09105 0.12136,-0.283279 0.12136,-0.769623 0,-0.561866 -0.0199,-0.658911 -0.14939,-0.728208 -0.0944,-0.0505 -1.09239,-0.07995 -2.70933,-0.07995 h -2.55993 l 0.0498,-0.25101 c 0.0767,-0.386453 0.69984,-1.646944 1.09028,-2.205471 1.06288,-1.520464 2.57441,-2.76701 4.6261,-3.815092 2.24198,-1.145298 4.32375,-1.727037 7.38995,-2.065088 1.72108,-0.18975 2.50573,-0.197822 4.08779,-0.04205 4.21488,0.415001 7.34036,1.478507 9.91646,3.37427 0.85104,0.626281 2.34553,2.17053 2.78044,2.873015 0.38206,0.617117 0.88412,1.747668 0.88651,1.996267 0.001,0.126242 -0.18197,0.135159 -2.77641,0.135159 -3.20744,0 -2.93761,-0.07804 -2.93761,0.849575 0,0.929994 -0.2937,0.849575 3.1027,0.849575 h 2.94279 l -0.0534,0.657701 c -0.10178,1.254318 -0.60183,2.630994 -1.36257,3.751235 -0.45903,0.675954 -1.44628,1.689035 -2.26229,2.321481 -2.42856,1.882245 -5.24032,2.981598 -8.97078,3.507429 -0.8138,0.11471 -4.31945,0.213285 -5.02022,0.141163 z m 3.30892,-2.895823 c 0.10351,-0.04716 0.22405,-0.16445 0.26788,-0.260638 0.15944,-0.349925 1.51784,-7.294925 1.44125,-7.368589 -0.0437,-0.04209 -1.6769,-0.08307 -3.9147,-0.09824 -3.45879,-0.02345 -3.85205,-0.01362 -3.96479,0.09912 -0.0891,0.08913 -0.31004,1.176629 -0.76753,3.77856 -0.35332,2.009375 -0.62546,3.697532 -0.60476,3.751458 0.0573,0.149191 0.26941,0.158437 3.94047,0.171728 2.36235,0.0086 3.47195,-0.01405 3.60218,-0.07339 z m 3.36024,-9.12441 c 0.17689,-0.09558 1.38554,-1.077415 2.68587,-2.181862 1.30033,-1.104447 2.45467,-2.082176 2.56521,-2.172729 0.17308,-0.141801 0.18657,-0.181985 0.0972,-0.289628 -0.0908,-0.109361 -0.35775,-0.124984 -2.13594,-0.124984 -1.11773,0 -2.11877,0.0329 -2.22453,0.07312 -0.10577,0.04021 -1.16903,0.80483 -2.3628,1.699149 -1.19377,0.894318 -2.21563,1.626033 -2.2708,1.626033 -0.0552,0 -0.44139,-0.66904 -0.85825,-1.486755 -0.41686,-0.817716 -0.84646,-1.582333 -0.95467,-1.699149 l -0.19673,-0.212394 h -3.81106 c -3.31244,0 -3.81686,0.01512 -3.85541,0.115584 -0.0663,0.172806 2.66879,4.435077 2.98623,4.653619 l 0.25241,0.173776 h 4.88079 4.88079 z m -59.883426,9.054799 c -2.690279,-0.04004 -3.144238,-0.06402 -3.51415,-0.185625 -1.392376,-0.457729 -2.170432,-1.321901 -2.516232,-2.79475 -0.186304,-0.793512 -0.114237,-2.457678 0.146938,-3.393109 0.276289,-0.989548 0.340401,-1.105377 0.663556,-1.198802 0.177438,-0.0513 1.442169,-0.07185 3.520738,-0.05721 l 3.243831,0.02284 -0.0063,0.347554 c -0.0034,0.191154 -0.03347,0.921016 -0.06675,1.621915 -0.05758,1.212386 -0.05207,1.296899 0.113272,1.737766 0.113526,0.302714 0.28867,0.574858 0.505072,0.784819 0.444528,0.431288 0.829208,0.510663 2.312295,0.477124 1.032959,-0.02336 1.196178,-0.04572 1.506064,-0.206363 1.0451,-0.54176 2.067224,-2.073702 2.610932,-3.91324 l 0.22829,-0.772341 2.10871,-0.02058 c 1.15981,-0.01132 2.13775,0.0085 2.17323,0.04393 0.092,0.09198 -0.33386,1.717681 -0.67416,2.573725 -0.52144,1.311672 -1.18492,2.306373 -2.1143,3.169791 -0.71264,0.662062 -1.76479,1.317435 -2.459529,1.532018 -1.045031,0.322778 -1.22531,0.328118 -7.781579,0.230536 z m 74.350146,0.01017 c -0.0833,-0.05278 0.0568,-0.78628 0.71726,-3.756639 0.4514,-2.030076 0.83889,-3.720417 0.86107,-3.756311 0.0222,-0.0359 1.01253,-0.06526 2.20076,-0.06526 1.84209,0 2.16692,0.01695 2.20455,0.11501 0.0243,0.06325 -0.0105,0.367363 -0.0773,0.675798 -0.80198,3.70244 -1.39528,6.320903 -1.47634,6.515593 -0.0799,0.192031 -0.15882,0.249251 -0.39808,0.288777 -0.44503,0.07352 -3.91213,0.05893 -4.03188,-0.01696 z m 21.01461,0.01681 c -0.0531,-0.02143 -0.0965,-0.09926 -0.0965,-0.172965 0,-0.0737 0.22334,-1.104779 0.49633,-2.291277 1.04762,-4.553407 1.12523,-4.853359 1.29261,-4.995619 0.14647,-0.12449 0.44149,-0.13516 3.73729,-0.13516 2.21294,0 3.59583,0.02841 3.62428,0.07445 0.0253,0.04095 -0.007,0.280562 -0.0727,0.532477 -0.2202,0.849803 -0.33474,0.783287 1.34877,0.783287 1.67601,0 1.60233,0.03901 1.31298,-0.695106 -0.296,-0.750931 -0.45676,-0.695107 2.00176,-0.695107 1.18593,0 2.21081,0.02094 2.2775,0.04653 0.15175,0.05823 0.23224,0.334673 1.24312,4.269566 0.47574,1.851835 0.79238,3.224926 0.75281,3.264494 -0.0376,0.03756 -0.94848,0.05899 -2.02425,0.04763 l -1.95598,-0.02066 -0.1492,-0.199919 c -0.0821,-0.109955 -0.38926,-0.959579 -0.68266,-1.888053 -0.29339,-0.928473 -0.57753,-1.729582 -0.63142,-1.780242 -0.0671,-0.06312 -0.70964,-0.108928 -2.0419,-0.145563 -2.25423,-0.06199 -2.18347,-0.08329 -2.34244,0.705111 -0.25942,1.286644 -0.76583,3.218422 -0.8592,3.277562 -0.11013,0.06976 -7.0601,0.0876 -7.23118,0.01857 z m 20.10737,-0.01442 c -0.0625,-0.101077 0.72678,-2.270549 0.88747,-2.43946 0.13803,-0.14509 0.31395,-0.149546 6.11138,-0.154804 l 5.96927,-0.0054 0.37053,-0.170719 c 0.49142,-0.226421 0.7336,-0.424799 1.03347,-0.846571 0.43126,-0.606593 0.5192,-1.615641 0.17112,-1.963716 -0.14093,-0.140935 -0.35794,-0.146362 -5.91954,-0.147995 -5.45299,-0.0016 -5.79071,-0.0096 -6.08825,-0.144766 -0.52513,-0.238501 -0.84843,-0.820841 -0.79006,-1.423102 l 0.0238,-0.245437 8.47961,-0.01965 c 9.64229,-0.02234 8.81046,-0.0816 9.14612,0.651575 1.12152,2.449716 -1.65309,6.128602 -5.16848,6.852963 -0.51746,0.106625 -1.48394,0.122666 -7.3906,0.122666 -3.73742,0 -6.81354,-0.02951 -6.83583,-0.06557 z M 48.492976,95.815175 C 47.737658,95.688737 47.040049,95.346179 46.502438,94.837734 45.793236,94.167 45.442424,93.383409 45.334373,92.228682 c -0.119558,-1.277633 0.233409,-3.645319 0.583511,-3.914217 0.121405,-0.09324 1.451785,-0.103321 9.09072,-0.06884 5.46753,0.02468 8.97693,0.06882 9.021595,0.113487 0.100636,0.100638 -0.161497,1.482882 -0.316699,1.669946 -0.117473,0.141588 -0.283812,0.144726 -5.315286,0.100274 l -5.194022,-0.04589 -0.205836,0.17705 c -0.199017,0.17119 -0.20596,0.204943 -0.209722,1.01962 -0.0041,0.888007 0.107031,1.266088 0.468155,1.592655 0.407494,0.368503 0.426084,0.369808 5.269579,0.369808 2.57693,0 4.573168,0.02984 4.597203,0.06872 0.02336,0.0378 -0.04375,0.458502 -0.149116,0.934904 -0.301228,1.361896 -0.326638,1.433502 -0.543951,1.532516 -0.145625,0.06635 -1.967036,0.08707 -6.970792,0.0793 -3.725508,-0.0058 -6.860539,-0.02506 -6.966736,-0.04284 z m 16.017395,-0.05724 c -0.05159,-0.13446 1.489698,-6.950497 1.636288,-7.236128 0.05718,-0.111418 0.183555,-0.223897 0.280839,-0.249956 0.09728,-0.02606 1.020771,-0.04785 2.052217,-0.04843 1.548295,-8.73e-4 1.88268,0.01805 1.917374,0.108472 0.0507,0.132128 -1.574617,7.302558 -1.686444,7.440102 -0.123336,0.151702 -4.141824,0.138254 -4.200274,-0.01406 z m 10.860059,0.01292 c -0.132449,-0.06544 -0.695007,-0.93216 -1.791406,-2.759979 -2.423891,-4.04089 -2.709803,-4.543504 -2.659362,-4.674953 0.04056,-0.105691 0.464146,-0.116767 3.714032,-0.09712 l 3.668247,0.02218 0.208934,0.209001 c 0.114916,0.114951 0.371001,0.495477 0.569076,0.845617 0.198074,0.350138 0.395979,0.648563 0.439786,0.663167 0.04381,0.0146 0.15765,-0.289097 0.252972,-0.674888 0.276266,-1.118077 0.09021,-1.038888 2.504276,-1.065811 1.636366,-0.01825 2.062559,-0.0024 2.093398,0.078 0.03663,0.09545 -1.469524,7.350094 -1.55452,7.487623 -0.06818,0.110322 -7.219532,0.07878 -7.445433,-0.03283 z m 29.52782,-0.02733 c -0.0427,-0.111241 1.44271,-6.837342 1.60554,-7.270152 l 0.0654,-0.173777 h 2.08267 c 1.14547,0 2.10045,0.02876 2.12217,0.0639 0.0433,0.06999 -1.52828,7.049906 -1.65064,7.331259 l -0.0756,0.173777 h -2.05078 c -1.81844,0 -2.05621,-0.01416 -2.09876,-0.125009 z m 10.82698,0.03911 c -0.19967,-0.09752 -0.14478,-0.0104 -2.45939,-3.903666 -1.08987,-1.833192 -1.98157,-3.388493 -1.98157,-3.456224 0,-0.110619 0.34771,-0.124724 3.41761,-0.138638 3.95795,-0.01794 3.9875,-0.01692 4.16516,0.143856 0.074,0.06697 0.31566,0.448703 0.53703,0.848291 0.22136,0.399586 0.43995,0.714379 0.48576,0.699539 0.0458,-0.01484 0.17016,-0.354611 0.27636,-0.755047 0.10619,-0.400435 0.2212,-0.771508 0.25556,-0.824606 0.0475,-0.07336 0.57027,-0.09654 2.17731,-0.09654 1.16315,0 2.13019,0.02607 2.14898,0.05793 0.0306,0.05182 -1.41093,6.977881 -1.53105,7.356348 -0.0482,0.151948 -0.11306,0.154572 -3.69319,0.149437 -2.20353,-0.0032 -3.70517,-0.03505 -3.79857,-0.08067 z m 64.99237,-0.04806 c 0,-0.20601 1.3876,-7.061332 1.4699,-7.261204 l 0.0716,-0.173777 h 2.16663 c 1.95313,0 2.17152,0.01272 2.21615,0.129049 0.0272,0.07098 -0.31342,1.765299 -0.75703,3.76516 l -0.80656,3.636112 -2.18028,0.02051 c -2.04001,0.01919 -2.18029,0.01174 -2.18037,-0.115851 z m -6.40231,-4.739599 c -0.89647,-1.363614 -1.62994,-2.527917 -1.62994,-2.58734 0,-0.09131 0.68695,-0.108042 4.4364,-0.108042 2.66732,0 4.45419,0.02878 4.48101,0.07218 0.0544,0.08801 -5.40079,5.102499 -5.55093,5.102499 -0.0586,0 -0.84007,-1.115684 -1.73654,-2.4793 z M 30.767759,86.859629 c -0.424787,-0.01495 -0.848793,-0.04485 -0.942235,-0.06645 -0.127464,-0.02946 -0.457482,-0.545466 -1.321429,-2.06616 -1.366794,-2.40579 -1.431299,-2.528323 -1.365575,-2.594021 0.02792,-0.02791 1.697784,-0.05075 3.710802,-0.05075 h 3.660033 l 0.169987,0.170004 c 0.09349,0.0935 0.522185,0.910252 0.95265,1.815 0.430465,0.904748 0.820093,1.644997 0.865839,1.644997 0.04575,0 0.982158,-0.760288 2.080915,-1.689529 1.098756,-0.92924 2.115807,-1.739904 2.260111,-1.801475 0.318413,-0.13586 4.143931,-0.247904 4.358797,-0.127663 0.117473,0.06575 0.108915,0.09435 -0.08249,0.275618 -0.464864,0.440233 -5.023219,4.100192 -5.343468,4.29033 l -0.341381,0.202687 -3.94511,0.01229 c -2.16981,0.0068 -4.292663,6.3e-5 -4.71745,-0.01489 z m 15.846058,-0.04699 c -0.120747,-0.08829 -0.09211,-0.162653 0.328068,-0.851806 1.211709,-1.987377 2.43366,-3.068083 4.178717,-3.695712 l 0.500354,-0.179957 6.75798,-0.02413 c 3.716889,-0.01327 6.83618,-0.0046 6.931757,0.01932 0.09699,0.02425 0.173777,0.102838 0.173777,0.177856 0,0.25289 -0.473407,2.295393 -0.549953,2.37276 -0.04951,0.05005 -1.427401,0.06916 -3.914562,0.05431 -4.379535,-0.02616 -4.724161,0.0035 -5.642033,0.485844 -0.513954,0.270074 -1.133271,0.831411 -1.528795,1.385669 -0.142157,0.199209 -0.226118,0.233821 -0.692944,0.285662 -0.292153,0.03244 -1.853934,0.06077 -3.470628,0.06295 -2.238035,0.003 -2.971009,-0.01912 -3.071738,-0.09277 z m 40.427197,0.02796 c -0.249791,-0.162188 0.866442,-1.743873 1.968279,-2.789018 0.959486,-0.910116 1.750294,-1.382015 2.94271,-1.755991 l 0.680239,-0.213341 h 4.17064 c 3.746208,0 4.221728,0.01389 4.672658,0.136456 1.95806,0.532224 3.21121,2.097126 3.26826,4.081335 l 0.0142,0.493486 h -2.08532 -2.08532 l -0.0958,-0.484436 c -0.1728,-0.873311 -0.558917,-1.391486 -1.161605,-1.558867 -0.37226,-0.103389 -1.921985,-0.102443 -2.563035,0.0016 -0.900364,0.146079 -1.462319,0.54923 -2.483323,1.781556 l -0.279556,0.337419 -3.427679,0.01986 c -1.951565,0.0113 -3.474019,-0.01023 -3.535288,-0.05002 z m 80.975436,-0.0024 c -0.0467,-0.07553 0.8376,-4.246549 0.96391,-4.546598 l 0.0744,-0.176782 3.45651,0.02231 3.45651,0.02231 0.43147,0.202339 c 0.2373,0.111286 0.56247,0.333338 0.72257,0.493448 0.27125,0.271246 0.81543,1.261534 0.81543,1.483896 0,0.205824 0.19328,0.07421 1.08646,-0.73987 0.96445,-0.879038 1.54154,-1.231816 2.27322,-1.389644 0.52392,-0.113012 0.67293,-0.116886 3.91963,-0.101893 2.68874,0.01242 2.83836,0.02052 2.83836,0.153706 0,0.07733 -0.20854,1.091475 -0.46341,2.253656 -0.25487,1.162182 -0.4634,2.121712 -0.4634,2.132289 0,0.01058 -0.0546,0.07385 -0.12137,0.140599 -0.10901,0.109007 -1.08002,0.121368 -9.53385,0.121368 -5.6544,0 -9.43004,-0.0284 -9.45645,-0.07114 z m 21.06704,-0.05359 c -0.0456,-0.11874 0.8302,-4.125639 0.98135,-4.490007 l 0.0721,-0.173776 h 5.06297 c 5.58114,0 5.37196,-0.01725 5.89184,0.485925 0.52404,0.507203 0.89491,1.346049 1.32658,3.000548 0.16807,0.644168 0.28739,1.200649 0.26515,1.236626 -0.0222,0.03598 -1.03854,0.06541 -2.25847,0.06541 -1.84199,0 -2.24596,-0.01955 -2.38268,-0.115313 -0.0905,-0.06342 -0.29429,-0.428127 -0.45276,-0.810457 -0.3853,-0.929574 -0.452,-0.974257 -0.6127,-0.410472 -0.0702,0.246428 -0.16633,0.580744 -0.21352,0.742926 -0.0472,0.162181 -0.17116,0.362024 -0.2755,0.444095 -0.18129,0.142602 -0.34866,0.149221 -3.77309,0.149221 -3.22734,0 -3.58815,-0.01239 -3.63126,-0.124728 z m 20.28804,-0.03231 c 0,-0.08637 0.0916,-0.338346 0.20365,-0.559947 0.93537,-1.850609 2.72966,-3.340641 4.6361,-3.849955 0.58578,-0.156493 0.81809,-0.162976 7.22116,-0.201526 3.63875,-0.02191 6.74066,-0.01643 6.89314,0.01218 0.18709,0.0351 0.27723,0.09407 0.27723,0.181357 0,0.254757 -0.47581,2.090878 -0.57811,2.230882 -0.0985,0.134823 -0.33443,0.145552 -4.18479,0.190303 -3.36286,0.03909 -4.1917,0.07003 -4.71335,0.17595 -1.12436,0.228307 -1.62464,0.543507 -2.14887,1.353877 -0.18804,0.290687 -0.39783,0.549985 -0.4662,0.576219 -0.0684,0.02623 -1.70283,0.0477 -3.63213,0.0477 -3.47547,0 -3.50783,-0.0014 -3.50783,-0.157035 z m -142.830259,0.02188 c -0.03408,-0.05878 0.974424,-4.547765 1.035415,-4.608762 0.01826,-0.01825 1.676806,-0.04172 3.685672,-0.05215 3.564815,-0.0185 3.65619,-0.01524 3.807229,0.135794 0.212564,0.212564 2.544971,4.436303 2.494699,4.517639 -0.04984,0.08065 -10.976281,0.08807 -11.023015,0.0075 z m 13.902062,0.0012 c -0.01934,-0.03253 0.213621,-1.08442 0.517692,-2.337542 l 0.552857,-2.278405 2.066273,-0.02057 c 1.612779,-0.01606 2.073689,8.96e-4 2.100041,0.07723 0.01856,0.05379 -0.182327,1.105713 -0.446421,2.337596 l -0.480164,2.239787 -2.137561,0.02052 c -1.175657,0.01129 -2.153378,-0.0061 -2.172717,-0.03862 z m 26.485637,-0.0069 c -0.0411,-0.06647 0.81139,-3.922808 0.94273,-4.264676 0.16679,-0.434099 0.0517,-0.421613 3.88566,-0.421613 3.43857,0 3.54289,0.0044 3.68481,0.154468 0.1891,0.199992 2.48423,4.346117 2.48423,4.487742 0,0.09108 -0.84496,0.107684 -5.47906,0.107684 -3.01348,0 -5.49675,-0.02862 -5.51837,-0.0636 z m 13.89775,-0.0071 c -0.024,-0.03888 0.19603,-1.053156 0.48901,-2.25395 0.38516,-1.578578 0.57121,-2.211426 0.67177,-2.28495 0.10631,-0.07774 0.59836,-0.101689 2.08921,-0.101689 1.07258,0 1.96472,0.02607 1.98253,0.05792 0.0264,0.04731 -0.71343,3.698745 -0.90042,4.443786 l -0.0526,0.209566 h -2.1179 c -1.19789,0 -2.13689,-0.03071 -2.1616,-0.07069 z`;
