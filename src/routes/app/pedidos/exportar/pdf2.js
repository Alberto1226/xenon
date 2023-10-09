import fs from 'fs';
import { Pedido } from '../../../../models/pedido';
import { text } from 'd3';
import { formato_precio } from '../../../stores';
import { NumeroALetras } from "./NumeroALetras.js";
import * as accesos from "../../accesos";

export async function get(req, res, next) {
  if (accesos.esta_logueado(req) === false) {
    res.send({ ok: false, mensaje: "sesion expirada" })
    return;
  }

  const options = {
    day: "numeric",
    month: "numeric",
    year: "numeric"
  };

  var id = req.query.id;
  if (!id) return res.send('Consulta no se pudo realizar')
  fs.writeFile('README.md', 'Hello World', (err) => {
    // If there is any error in writing to the file, return
    if (err) {
      console.error(err)
      return
    }

    // Log this message if the file was written to successfully
    //console.log('wrote to file successfully')
  })
  fs.readFile('src/routes/app/pedidos/exportar/_test.html', 'utf8', (err, data) => {
    if (err) {
      console.log(err)
      res.send("error ");
      return;
    }
    productos_en_pedido(id).then((respuesta) => {
      let texto = data.replace('_contenido', respuesta.productos);
      texto = texto.replace("_xenon", texto_head_xenon());
      texto = texto.replace("_hsbc", texto_head_hsbc());
      texto = texto.replace("_bajio", texto_head_bajio());
      texto = texto.replace("_banamex", texto_head_banamex());
      texto = texto.replace('_cliente_nombre', texto_head_cliente_nombre(respuesta.cliente));
      texto = texto.replace('_cliente_domicilio', texto_head_cliente_domicilio(respuesta.cliente));
      //texto = texto.replace('_cliente_domicilio2',texto_head_cliente_domicilio2(respuesta.cliente));
      //texto = texto.replace('_cliente_domicilio3',texto_head_cliente_domicilio3(respuesta.cliente));
      texto = texto.replace('_cliente_correo', texto_head_cliente_correo(respuesta.cliente));
      // console.log(respuesta.fecha)
      //console.log(respuesta)
      texto = texto.replace('_folio_fecha', folio_fecha_hora(respuesta.folio, respuesta.fecha.toLocaleDateString('es-MX', options), respuesta.fecha.toLocaleTimeString('es-MX')));
      //etexto = texto.replace("_client4",texto_head_xenon())
      res.send(texto);
    })


  })

}


function texto_head_xenon() {
  return `Comercial de Importaciones Xenon Y Más SA de CV  <br>
  RFC CIX120105CTA <br> Carretera a Amealco KM 0+218 lote 17, Col. Barrio de la Cruz, <br>
  San Juan del Río, Querétaro  <br>
  C.P.76807 Teléfono: 01 800 161 61 59   <br>E-mail: xenonymas@yahoo.com.mx  `;
}


function texto_head_hsbc() {
  return `BBVA <br>
  Cuenta: 011 666 50 39<br>
  CLABE: 012 68 00 01 16 66 50 390`;
}


function texto_head_bajio() {
  return `BAJIO <br>
  Cuenta: 00 97 44 08 70 201<br>
  CLABE: 03 068 59 00 00 102 10 94`;
}


function texto_head_banamex() {
  return `BANAMEX (Sucursal: 7010) <br>
  Cuenta: 16 67 578<br>
  CLABE: 002 68 57 01 01 66 75 785 `;
}


function texto_head_cliente(cliente) {
  return `Cliente: <b>${cliente.nombre}</b> <br>
  Domicilio: <b>${cliente.direccion}</b> <br>
  Email:<b> ${cliente.correo}</b>`;
}

function texto_head_cliente_nombre(cliente) {
  return `Cliente: <b>${cliente.nombre}</b> <br>`;
}

function texto_head_cliente_domicilio(cliente) {
  return `Domicilio: <b>${cliente.direccion}</b><br>`;
}
function texto_head_footer_total(footer, final, unidades) {
  ///   Notas de pedido
  console.log(footer)
  let notas = ""
  if (footer.notas != "") {
    const texto_limitado = footer.notas.substring(0, 567);
    notas = `Notas:` + texto_limitado
  }

  return `<div class="grid-container-footer ${final ? 'final' : ''}">
  <div class="descuento">Descuento: ${formato_precio(footer.descuento)} % - Unidades en pedido: ${unidades}</div>
  <div class="letras">${NumeroALetras(
    footer.total_pedido,
    footer.moneda
  )}</div>
  <div class="Texto_inferior texto-centrado ">La paquetería corre a cuenta y riesgo del cliente</div>
  <div>${notas}</div>
  <div class="total texto-derecha ">Total: $ ${formato_precio(footer.total_pedido)}</div>
  <div class="moneda  texto-derecha">${footer.moneda}</div>
  <div class="margen2 "></div>
</div>`;
}

function texto_head_cliente_domicilio2(cliente) {
  return `${cliente.direccion.substring(50, 100)}`;
}
function texto_head_cliente_domicilio3(cliente) {
  return `${cliente.direccion.substring(100, 150)}</b> <br>`;
}

function texto_head_cliente_correo(cliente) {
  return `email: <b>${cliente.correo}</b>`;
}



function sumar_cantidades_unidades(lista) {
  var total_dinero = 0;
  if (lista == undefined) {
    total_dinero = 0;
    return;
  }
  if (lista == 0) {
    total_dinero = 0;
    return;
  }
  total_dinero = lista.reduce(
    (a, b) => +a + b.cantidad,
    0
  );
  return total_dinero;
}

async function productos_en_pedido(id) {
  return new Promise(async (resolve, reject) => {
    const carrito = await consultar_carrito(id)
    if (carrito.lista.length === 0) {
      resolve({ productos: "sin productos", cliente: carrito.cliente, fecha: carrito.fecha, folio: carrito.folio });
      return
    }
    let lista = await separar_productos(carrito.lista, carrito.tipo_de_cambio);
    // lista = lista.concat(lista)
    //lista = lista.concat(lista)
    const texto = await concatenar_aun_solo_texto(lista, carrito);
    resolve({ productos: texto, cliente: carrito.cliente, fecha: carrito.fecha, folio: carrito.folio });
  })
}


async function concatenar_aun_solo_texto(array_textos, carrito) {
  return new Promise((resolve, reject) => {
    //console.log(array_textos.length+ " largo")
    var numero_pags = Math.floor((array_textos.length - 30 + 40 - 1) / (40)) + 1;
    if (array_textos.length <= 30) numero_pags = 1;
    var texto = '<div class="pagina-despues">' + pagina(1, numero_pags) + header_columnasproductos_primer_pagina;
    var contador = 0;
    var pag = 1;
    var primer_pag = true;
    var unidades = sumar_cantidades_unidades(carrito.lista)
    for (let i = 0; i < array_textos.length; i++) {
      const element = array_textos[i];
      contador++
      if ((contador === 30 && primer_pag) || (contador === 40)) {
        primer_pag = false;
        pag++;
        texto += texto_head_footer_total(carrito, false, unidades) + '</div><div class="page">' + pagina(pag, numero_pags) + header_columnasproductos
        //if(pag == numero_pags)texto+=texto_head_footer_total(carrito,false,unidades)+'</div><div class="page a4">'+pagina(pag,numero_pags)+header_columnasproductos
        contador = 0;
      }
      texto += element;
      if (i + 1 === array_textos.length) {
        resolve(texto + texto_head_footer_total(carrito, true, unidades) + '</div>');
      }
    }
  })
}


function pagina(pagina, paginas) {
  return ` <div class="texto-derecha"> pag: ${pagina} de ${paginas}</div>`
}

var header_columnasproductos = `<div class="grid-container-row padding-especial padding-borde">
<div class="index"></div>
<div class="cantidad"  style="margin: 0 0 0 -25px;">Cantidad </div>
<div class="unidad">Unidad </div>
<div class="marca">Marca </div>
<div class="codigo">Código</div>
<div class="descripcion">Descripción </div>
<div class="precio">Precio U.</div>
<div class="importe">Importe</div>
</div>`;

var header_columnasproductos_primer_pagina = `<div class="grid-container-row padding-borde ">
<div class="index"></div>
<div class="cantidad" style="margin: 0 0 0 -25px;">Cantidad </div>
<div class="unidad">Unidad </div>
<div class="marca">Marca </div>
<div class="codigo">Código</div>
<div class="descripcion">Descripción </div>
<div class="precio">Precio U.</div>
<div class="importe">Importe</div>
</div>`;


function folio_fecha_hora(folio, fecha, hora) {
  return `<div  ">
    <table>
     <tr>
     <td class="folio">Folio: </td>
     <td>${folio}</td>
     </tr>
     <tr>
     <td class="fecha">Fecha: </td>
     <td class="fecha"> ${fecha}</td>
     </tr>
     <tr>
     <td class="fecha"> Hora: </td>
       <td class="fecha">${hora}</td>
     </tr>
    </table>
   </div>`;
}


async function consultar_carrito(id) {
  return new Promise(async (resolve, reject) => {
    Pedido.findById(id)
      .then((resultado) => {
        resolve(resultado)
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      })
  })
}





async function separar_productos(lista, tipo_cambio) {
  return new Promise(async (resolve, reject) => {
    try {
      var array_textos = [];
      for (let i = 0; i < lista.length; i++) {
        const element = lista[i];
        const texto_registro = await row_en_texto(element, i, tipo_cambio);
        array_textos.push(texto_registro);
        if (i + 1 === lista.length) {
          resolve(array_textos)
        }
      }
    } catch (err) {
      console.log(err);
      reject(err);
    }

  })
}





async function row_en_texto(registro, i, tipo_cambio) {
  return new Promise(async (resolve, reject) => {
    try {

      var texto = `<div class="grid-container-row">
      <div class="index indice_row">${i + 1}) </div>
      <div class="cantidad">${registro.cantidad} </div>
      <div class="unidad">${registro.producto.unidad} </div>
      <div class="marca">${registro.producto.marca} </div>
      <div class="codigo">${registro.producto.codigo} </div>
      <div class="descripcion">${registro.producto.nombre} ${tipo_cambio == 1 ? "" : " X " + tipo_cambio} </div>
      <div class="precio">${formato_precio(+registro.producto.precio * tipo_cambio)}</div>
      <div class="importe">${formato_precio(+registro.producto.precio * registro.cantidad / tipo_cambio)}</div>
    </div>  `;
      return resolve(texto)
    } catch (err) {
      reject(err);
    }
  })
}
