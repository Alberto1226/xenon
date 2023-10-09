<script>
  import { onMount } from "svelte";
  import { logo_negro, logo_rojo, formato_precio } from "./../../stores";
  import { NumeroALetras } from "./NumeroALetras.js";
  import { Button } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import { createEventDispatcher } from "svelte";
  export var pedido;
  const dispatch = createEventDispatcher();
  onMount(() => {
    procesando = true;
  });
  var url = "";
  let procesando = false;
  let blob_steam_cargado = false;
  let pdfkit_cargado = false;
  let factor_cambio = 1;
  if (pedido.moneda != "Pesos Mexicanos") factor_cambio = pedido.tipo_de_cambio;
  const options = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  };

  $: if (blob_steam_cargado && pdfkit_cargado) {
    crear_el_pdf();
  }

  function crear_el_pdf() {
    const doc = new PDFDocument();
    const stream = doc.pipe(blobStream());
    //   Comienza a redactar el pdf a partir de aqui **------
    const fecha = new Date(pedido.fecha).toLocaleDateString("es-MX", options);
    var buffers = [];
    const total_productos = pedido.lista.length;
    const residuo_paginas = total_productos % 24 > 0 ? 1 : 0;
    const total_paginas = total_productos / 24 + +residuo_paginas;
    let columnas = [0, 40, 80, 140, 220, 330, 380];
    let columnas_lista = [-40, 0, 40, 120, 190, 350, 400];
    let y = 0;
    let espacio_vertical_header = 15;
    let margen_izq = 50;
    //    Logo negro
    doc.translate(50, -50).path(logo_negro).fill("black", "even-odd");
    //   LOGO ROJO
    doc.fill("red", "even-odd");
    doc.translate(0, 46).path(logo_rojo).fill("red", "even-odd");

    y = 50;
    //   Folio
    doc.fill("red", "even-odd").fontSize(10).text("Folio #", 400, y);
    doc.fill("gray", "even-odd").fontSize(10).text(pedido.folio, 450, y);
    y += +espacio_vertical_header;
    //    FEcha
    doc
      .fill("green", "even-odd")
      .font("Times-Roman", 7)
      .text(`Fecha: ${fecha}  `, 400, y);
    ///    HORA
    y += +espacio_vertical_header;

    doc
      .fill("green", "even-odd")
      .font("Times-Roman", 7)
      .text(
        `Hora: ${new Date(pedido.fecha).toLocaleTimeString("es-MX")}  `,
        400,
        y
      );
    doc.fill("gray", "even-odd");

    y = 100;
    //     Datos de Xenon  *****
    doc
      .fill("gray", "even-odd")
      .font("Times-Roman", 7)
      .text("Comercial de Importaciones Xenon Y Más SA de CV   ", 0, y);

    y += +espacio_vertical_header;
    doc
      .text("RFC CIX120105CTA  ", 0, y)
      .fill("gray", "even-odd")
      .font("Times-Roman", 7);

    y += +espacio_vertical_header;
    doc
      .text("Ignacio López Rayón #111 Centro, Queretaro   ", 0, y)
      .fill("gray", "even-odd")
      .font("Times-Roman", 7);

    y += +espacio_vertical_header;
    doc
      .text("C.P.76800 Teléfono: 01 800 161 61 59   ", 0, y)
      .fill("gray", "even-odd")
      .font("Times-Roman", 7);

    y += +espacio_vertical_header;
    doc
      .text("E-mail: xenonymas@yahoo.com.mx   ", 0, y)
      .fill("gray", "even-odd")
      .font("Times-Roman", 7);

    y = 100;
    // Datos de cliente   *****
    doc
      .fill("gray", "even-odd")
      .font("Times-Roman", 7)
      .text(`Cliente ${pedido.cliente.nombre} `, 300, y);

    y += +espacio_vertical_header;
    doc
      .text(`Domicilio: ${pedido.cliente.direccion.substring(0, 45)} `, 300, y)
      .fill("gray", "even-odd")
      .restore();

    y += +espacio_vertical_header;
    // Direccion de cliente
    doc
      .text(` ${pedido.cliente.direccion.substring(46, 90)} `, 300, y)
      .fill("gray", "even-odd");

    y += +espacio_vertical_header;
    doc
      .text(` ${pedido.cliente.direccion.substring(91, 135)} `, 300, y)
      .fill("gray", "even-odd");

    y += +espacio_vertical_header;
    // Correo de cliente
    doc
      .text(`E-mail: ${pedido.cliente.correo}   `, 300, y)
      .fill("gray", "even-odd");

    //-------------------------------

    //  FOOTER
    y += +espacio_vertical_header;
    doc.text("Datos bancarios", columnas[4], y);
    y += +espacio_vertical_header;
    doc.text("BBVA", columnas[0], y);
    doc.text("BAJIO", columnas[4], y);
    doc.text("BANAMEX", columnas[5], y);

    y += +espacio_vertical_header;

    doc.text("CUENTA: 011 66 50 39", columnas[0], y);
    doc.text("CUENTA: 00 97 44 08 70 201", columnas[4], y);
    doc.text("CUENTA: 16 67 578", columnas[5], y);

    y += +espacio_vertical_header;

    doc.text("CLABE: 012 68 00 01 16 66 50 390", columnas[0], y);
    doc.text("CLABE: 03 068 59 00 00 102 10 94", columnas[4], y);
    doc.text("CLABE: 002 68 57 01 01 66 75 785", columnas[5], y);

    y += +espacio_vertical_header;
    doc.text("SUCURSAL: 7010", margen_izq + columnas[5], y);
    // `**Favor de verificar los colores cotizados, son sugerencias ya que la tonalidad que pide no la hay. Pido confirmar si lo requiere así o lo quitamos de la cotización.  En caso de no confirmar o no hacerme mención alguna se da por entendido que acepta esa tonalidad.
    //  **La paquetería corre a cuenta y riesgo del cliente.`
    doc.text(
      `**La paquetería corre a cuenta y riesgo del cliente.`,
      margen_izq + columnas[0],
      680
    );

    ///   Notas de pedido
    if (pedido.notas != "") {
      const texto_limitado = pedido.notas.substring(0, 567);
      doc.text(`Notas:` + texto_limitado, columnas[0], 690);
    }

    ///   TOTALES SOLO SI es de 1 pagina   --*-*-*-*-

    ///  Caja de primer pagina  ***
    doc.fill("gray", "even-odd");
    doc.lineWidth(1);
    doc.lineJoin("round").rect(-10, 90, 530, 160).stroke();
    doc.fill("black", "even-odd");
    ///   Lineas ***

    if (total_productos <= 24) {
      doc.text("Total ", margen_izq + columnas_lista[4] + 100, 650);
      doc.text(
        "Descuento del " + formato_precio(pedido.descuento) + " %",
        margen_izq + columnas_lista[0],
        650
      );
      doc.text(pedido.moneda, margen_izq + columnas[5], 660);
      if (pedido.moneda != "Pesos Mexicanos") {
        doc.text("Tipo de cambio:", margen_izq + columnas[5], 670);
        doc.text(
          formato_precio(pedido.tipo_de_cambio) + " Pesos Mexicanos",
          margen_izq + columnas[5],
          680
        );
      }
      doc.text(
        "$ " + formato_precio(pedido.total_pedido / factor_cambio),
        margen_izq + columnas_lista[5],
        650
      );

      doc.text(
        NumeroALetras(pedido.total_pedido, pedido.moneda),
        margen_izq + columnas[0] - 50,
        670
      );

      ///  Caja de total primer pagina  ***
      doc.fill("gray", "even-odd");
      doc.lineWidth(1);
      doc.lineJoin("round").rect(-10, 640, 530, 110).stroke();
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
      doc.text(`folio ${pedido.folio} ${fecha}`).fill("black", "even-odd");
      y = 110;
      margen_izq = 100;

      doc.text("Cantidad", margen_izq + columnas_lista[0], y);
      doc.text("Unidad", margen_izq + columnas_lista[1], y);
      //  doc.text("Nombre", columnas_lista[2], y);
      doc.text("Marca", margen_izq + columnas_lista[2], y);
      doc.text("Código", margen_izq + columnas_lista[3], y);
      doc.text("Descripción", margen_izq + columnas_lista[4], y);
      doc.text("P. Unitario", margen_izq + columnas_lista[5], y);
      doc.text("Importe", margen_izq + columnas_lista[6], y);
      ///  si es la ultima poner total , para mas de una pagina

      if (total_paginas <= pagina_actual + 1) {
        doc.text("Total  ", margen_izq + columnas_lista[4] + 100, 630);
        doc.text(
          "Descuento del " + formato_precio(pedido.descuento) + " %",
          margen_izq + columnas_lista[0],
          630
        );
        doc.text(pedido.moneda, margen_izq + columnas_lista[5], 640);

        doc.text(
          NumeroALetras(pedido.total_pedido / factor_cambio, pedido.moneda),
          margen_izq + columnas_lista[0] - 10,
          650
        );

        doc.text(
          "$ " + formato_precio(pedido.total_pedido / factor_cambio),
          margen_izq + columnas_lista[5],
          630
        );

        ///  Caja de total en otras paginas   ***
        doc.fill("gray", "even-odd");
        doc.lineWidth(1);
        doc.lineJoin("round").rect(40, 615, 530, 100).stroke();
        doc.fill("black", "even-odd");
      }

      doc.fill("black", "even-odd");
      doc.font("Times-Roman", 7);
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
      ///   Notas de pedido
      if (pedido.notas != "") {
        const texto_limitado = pedido.notas.substring(0, 567);
        doc.text(`Notas:` + texto_limitado, columnas[0], 690);
      }

      ///   Notas de pedido
      if (pedido.notas != "") {
        doc.text(`Notas:` + pedido.notas, margen_izq + columnas[0], 730);
      }
    });
    //  Header de tabla
    // Paginas

    let lista = pedido.lista;
    let espaciado_vertical = 20;
    let pagina_actual = 1;
    y = 280;
    doc.text("Cantidad", margen_izq + columnas_lista[0], y);
    doc.text("Unidad", margen_izq + columnas_lista[1], y);
    //  doc.text("Nombre", columnas_lista[2], y);
    doc.text("Marca", margen_izq + columnas_lista[2], y);
    doc.text("Código", margen_izq + columnas_lista[3], y);
    doc.text("Descripción", margen_izq + columnas_lista[4], y);
    doc.text("P. Unitario", margen_izq + columnas_lista[5], y);
    doc.text("Importe", margen_izq + columnas_lista[6], y);
    //   PRODUCTOS Lista

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
      //let precio_descuento =item.producto.precio-(item.producto.precio*pedido.descuento/100);
      doc.fill("gray", "even-odd").font("Times-Roman", 7).restore();
      doc
        .text(+index + 1 + ") ", margen_izq + columnas_lista[0] - 20, y)
        .font("Times-Roman", 7)
        .fill("black", "even-odd")
        .restore();
      doc.font("Times-Roman", 7);
      doc
        .text(item.cantidad, margen_izq + columnas_lista[0], y)
        .fill("black", "even-odd")
        .font("Times-Roman", 7)
        .restore();

      doc
        .text(item.producto.unidad, margen_izq + columnas_lista[1], y)
        .fill("gray", "even-odd")
        .font("Times-Roman", 7)
        .restore();

      doc.fill("black", "even-odd").font("Times-Roman", 7).restore();

      doc
        .text(item.producto.marca, margen_izq + columnas_lista[2], y)
        .fill("gray", "even-odd")
        .restore();

      doc
        .text(item.producto.codigo, margen_izq + columnas_lista[3], y)
        .fill("gray", "even-odd")
        .font("Times-Roman", 7)
        .restore();

      doc
        .text(item.producto.nombre, margen_izq + columnas_lista[4], y)
        .fill("gray", "even-odd")
        .font("Times-Roman", 7)
        .restore();
      doc
        .text(
          "$ " + formato_precio(item.producto.precio / factor_cambio),
          margen_izq + columnas_lista[5],
          y
        )
        .fill("black", "even-odd")
        .font("Times-Roman", 7)
        .restore();

      doc
        .text(
          "$ " +
            formato_precio(
              (item.producto.precio * item.cantidad) / factor_cambio
            ),
          margen_izq + columnas_lista[6],
          y
        )
        .fill("black", "even-odd")
        .font("Times-Roman", 7)
        .restore();
    }
    //-------------------------------

    //  Termina el pdf   **--------
    doc.end();

    stream.on("finish", () => {
      procesando = false;
      const blob = stream.toBlob("application/pdf");

      url = stream.toBlobURL("application/pdf");

      //iframe.src =url;
    });
  }
</script>

<svelte:head>
  <script src="./js/blob-stream.js">
    {
      blob_steam_cargado = true;
    }
  </script>
  <script src="./js/pdfkit.standalone.js">
    {
      pdfkit_cargado = true;
    }
  </script>
</svelte:head>
<div class="centrado" style="background-color:#f7a259;">
  <Button
    raised
    color="darkorange"
    on:click={() => {
      //console.log('asdas')
      dispatch("mostrar_lista");
    }}
  >
    <i class="material-icons">arrow_left</i>
    Ver lista
  </Button>
</div>
{#if procesando}
  <!-- content here -->
  <div class="centrado" style="padding-top:150px;">procesando...</div>
{:else}
  <iframe id="iframe_pdf" title="pdf" src={url} frameborder="0" />
{/if}

<style>
  iframe {
    width: 100%;
    height: calc(100vh - 80px);
  }
</style>
