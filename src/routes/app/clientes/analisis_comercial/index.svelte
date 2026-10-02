<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { onMount } from "svelte";
  import { fade, slide } from "svelte/transition";
  import { postData, cliente_selecto } from "./../../../stores";
  import { goto } from "@sapper/app";

  let cargando = false;
  let buscando_cliente = "";
  let lista_clientes_encontrados = [];
  let mostrar_desplegable = false;
  let timeout_busqueda;

  // Selección multi-cliente
  let clientes_seleccionados = [];

  // Filtros
  let anio_filtro = new Date().getFullYear();
  let periodicidad = { desde: "", hasta: "" };
  let aplicar_rango_fechas = false;

  // Datos del Análisis
  let datos_cliente = null;
  let datos_clientes = [];
  let metricas = null;
  let compras_por_anio = [];
  let compras_por_mes = [];
  let pedidos = [];

  // Paginación tabla
  let pagina_tabla = 1;
  const items_por_pagina = 10;
  $: total_paginas_tabla = Math.ceil(pedidos.length / items_por_pagina);
  $: pedidos_paginados = pedidos.slice(
    (pagina_tabla - 1) * items_por_pagina,
    pagina_tabla * items_por_pagina,
  );

  // Paleta de colores distintivos para clientes
  const paleta_colores_clientes = [
    { bg: "#2563eb", text: "#ffffff", border: "#1d4ed8", tag: "Azul" },
    { bg: "#059669", text: "#ffffff", border: "#047857", tag: "Esmeralda" },
    { bg: "#d97706", text: "#ffffff", border: "#b45309", tag: "Ámbar" },
    { bg: "#7c3aed", text: "#ffffff", border: "#6d28d9", tag: "Violeta" },
    { bg: "#db2777", text: "#ffffff", border: "#be185d", tag: "Rosa" },
    { bg: "#0891b2", text: "#ffffff", border: "#0e7490", tag: "Cian" },
    { bg: "#65a30d", text: "#ffffff", border: "#4d7c0f", tag: "Lima" }
  ];

  function obtener_color_cliente(id) {
    if (!id || clientes_seleccionados.length === 0) return paleta_colores_clientes[0];
    const idx = clientes_seleccionados.findIndex(c => String(c._id) === String(id));
    if (idx === -1) return paleta_colores_clientes[0];
    return paleta_colores_clientes[idx % paleta_colores_clientes.length];
  }

  // Variables reactivas
  $: estilo_insignia = metricas
    ? obtener_estilos_insignia(metricas.estado_comercial)
    : null;
  $: maxTotalAnual =
    compras_por_anio.length > 0
      ? Math.max(...compras_por_anio.map((c) => c.total), 1)
      : 1;
  $: maxMesTotal =
    compras_por_mes.length > 0
      ? Math.max(...compras_por_mes.map((m) => m.total), 1)
      : 1;
  $: puntosMensuales =
    compras_por_mes.length > 0
      ? compras_por_mes
          .map((m, i) => {
            const x = 40 + i * (340 / (compras_por_mes.length - 1 || 1));
            const y = 170 - (m.total / maxMesTotal) * 130;
            return `${x},${y}`;
          })
          .join(" ")
      : "";

  onMount(() => {
    if ($cliente_selecto && $cliente_selecto._id) {
      agregar_cliente($cliente_selecto);
    }
  });

  // Buscador de Clientes
  function buscar_clientes_debounce() {
    clearTimeout(timeout_busqueda);
    if (buscando_cliente.trim().length === 0) {
      lista_clientes_encontrados = [];
      mostrar_desplegable = false;
      return;
    }

    timeout_busqueda = setTimeout(() => {
      postData("app/clientes/lista_de_clientes", {
        buscando: buscando_cliente,
        pagina_actual: 1,
      })
        .then((res) => {
          if (res.ok) {
            // Filtrar clientes ya seleccionados
            lista_clientes_encontrados = (res.lista || []).filter(
              c => !clientes_seleccionados.some(sel => String(sel._id) === String(c._id))
            );
            mostrar_desplegable = lista_clientes_encontrados.length > 0;
          }
        })
        .catch((err) => console.error("Error buscando clientes:", err));
    }, 300);
  }

  function agregar_cliente(cliente) {
    if (!clientes_seleccionados.some(c => String(c._id) === String(cliente._id))) {
      clientes_seleccionados = [...clientes_seleccionados, cliente];
    }
    $cliente_selecto = cliente;
    buscando_cliente = "";
    mostrar_desplegable = false;
    cargar_analisis_comercial();
  }

  function remover_cliente(id) {
    clientes_seleccionados = clientes_seleccionados.filter(c => String(c._id) !== String(id));
    if (clientes_seleccionados.length === 0) {
      datos_cliente = null;
      datos_clientes = [];
      metricas = null;
      pedidos = [];
      compras_por_anio = [];
      compras_por_mes = [];
    } else {
      cargar_analisis_comercial();
    }
  }

  function cargar_analisis_comercial() {
    if (clientes_seleccionados.length === 0) return;

    cargando = true;
    let payload = {
      clientes_ids: clientes_seleccionados.map(c => c._id)
    };

    if (aplicar_rango_fechas && periodicidad.desde && periodicidad.hasta) {
      payload.periodicidad = {
        desde: new Date(periodicidad.desde + "T00:00:00"),
        hasta: new Date(periodicidad.hasta + "T23:59:59"),
      };
    }

    postData("app/clientes/analisis_comercial/obtener_analisis", payload)
      .then((res) => {
        cargando = false;
        if (res.ok) {
          datos_cliente = res.cliente;
          datos_clientes = res.clientes || [res.cliente];
          metricas = res.metricas;
          compras_por_anio = res.compras_por_anio;
          compras_por_mes = res.compras_por_mes;
          pedidos = res.pedidos;
          pagina_tabla = 1;
        } else {
          alert(res.mensaje || "Error al obtener el análisis comercial.");
        }
      })
      .catch((err) => {
        cargando = false;
        console.error("Error al cargar análisis:", err);
      });
  }

  function formato_moneda(valor) {
    if (valor === undefined || valor === null) return "$0.00";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(valor);
  }

  function formato_fecha(f) {
    if (!f) return "N/A";
    const fecha = new Date(f);
    return fecha.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function obtener_estilos_insignia(estado) {
    switch (estado) {
      case "Alto valor":
        return {
          bg: "#eab308",
          texto: "#000",
          etiqueta: "Alto Valor ✨",
          clase: "alto-valor",
        };
      case "En crecimiento":
        return {
          bg: "#22c55e",
          texto: "#fff",
          etiqueta: "En Crecimiento 📈",
          clase: "crecimiento",
        };
      case "En riesgo":
        return {
          bg: "#f97316",
          texto: "#fff",
          etiqueta: "En Riesgo ⚠️",
          clase: "riesgo",
        };
      case "Inactivo":
        return {
          bg: "#64748b",
          texto: "#fff",
          etiqueta: "Inactivo 😴",
          clase: "inactivo",
        };
      case "Cliente nuevo":
        return {
          bg: "#06b6d4",
          texto: "#fff",
          etiqueta: "Cliente Nuevo 🆕",
          clase: "nuevo",
        };
      case "Frecuente":
        return {
          bg: "#a855f7",
          texto: "#fff",
          etiqueta: "Frecuente 🔥",
          clase: "frecuente",
        };
      case "Recurrente":
        return {
          bg: "#3b82f6",
          texto: "#fff",
          etiqueta: "Recurrente 🔄",
          clase: "recurrente",
        };
      default:
        return {
          bg: "#64748b",
          texto: "#fff",
          etiqueta: "Regular",
          clase: "regular",
        };
    }
  }

  // Interacción Gráficos
  let tooltip_activo = false;
  let tooltip_contenido = { anio: "", total: 0, compras: 0 };
  let tooltip_posicion = { x: 0, y: 0 };

  function mostrar_tooltip(e, anioData) {
    tooltip_contenido = anioData;
    tooltip_posicion = {
      x: e.clientX + 15,
      y: e.clientY - 75,
    };
    tooltip_activo = true;
  }

  function mover_tooltip(e) {
    tooltip_posicion = {
      x: e.clientX + 15,
      y: e.clientY - 75,
    };
  }

  function ocultar_tooltip() {
    tooltip_activo = false;
  }

  let tooltip_mes_activo = false;
  let tooltip_mes_contenido = { mesAnio: "", total: 0, compras: 0 };
  let tooltip_mes_posicion = { x: 0, y: 0 };

  function mostrar_tooltip_mes(e, mesData) {
    tooltip_mes_contenido = mesData;
    tooltip_mes_posicion = {
      x: e.clientX + 15,
      y: e.clientY - 75,
    };
    tooltip_mes_activo = true;
  }

  function mover_tooltip_mes(e) {
    tooltip_mes_posicion = {
      x: e.clientX + 15,
      y: e.clientY - 75,
    };
  }

  function ocultar_tooltip_mes() {
    tooltip_mes_activo = false;
  }

  function filtrar_por_anio_grafico(anio) {
    periodicidad = {
      desde: `${anio}-01-01`,
      hasta: `${anio}-12-31`,
    };
    aplicar_rango_fechas = true;
    cargar_analisis_comercial();
  }

  // Modal de Detalle de Pedido
  let modal_detalle_abierto = false;
  let pedido_seleccionado = null;

  function ver_detalle_pedido(p) {
    pedido_seleccionado = p;
    modal_detalle_abierto = true;
  }

  // Exportar a PDF con pdfMake dinámico
  let exportando_pdf = false;

  function exportar_pdf() {
    if (!datos_cliente) return;
    exportando_pdf = true;

    if (window.pdfMake) {
      ejecutar_pdfmake();
      exportando_pdf = false;
      return;
    }

    const scriptPdfMake = document.createElement("script");
    scriptPdfMake.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/pdfmake.min.js";
    scriptPdfMake.onload = () => {
      const scriptFonts = document.createElement("script");
      scriptFonts.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/vfs_fonts.js";
      scriptFonts.onload = () => {
        window.pdfMake.vfs = window.pdfMake.vfs || window.pdfMake.vfs;
        exportando_pdf = false;
        ejecutar_pdfmake();
      };
      scriptFonts.onerror = () => {
        exportando_pdf = false;
        alert("Error al cargar las fuentes del PDF.");
      };
      document.body.appendChild(scriptFonts);
    };
    scriptPdfMake.onerror = () => {
      exportando_pdf = false;
      alert("Error al cargar la librería de exportación PDF.");
    };
    document.body.appendChild(scriptPdfMake);
  }

  function ejecutar_pdfmake() {
    const esMulticliente = clientes_seleccionados.length > 1;

    const docDefinition = {
      content: [
        // Encabezado principal corporativo
        { text: "XENON Y MAS", style: "headerCompany" },
        {
          text: esMulticliente
            ? `ESTADO DE CUENTA Y REPORTE COMERCIAL CONSOLIDADO (${clientes_seleccionados.length} CLIENTES)`
            : "ESTADO DE CUENTA ANUAL Y REPORTE COMERCIAL",
          style: "headerReport",
        },
        {
          text: `Fecha de emisión: ${new Date().toLocaleDateString("es-MX")}`,
          style: "dateEmission",
        },

        // Ficha del / de los Clientes
        {
          text: esMulticliente
            ? `CLIENTES INCLUIDOS EN EL ANÁLISIS (${clientes_seleccionados.length})`
            : "DATOS DE IDENTIFICACIÓN DEL CLIENTE",
          style: "sectionTitle",
        },
        esMulticliente
          ? {
              table: {
                widths: ["35%", "35%", "15%", "15%"],
                body: [
                  [
                    { text: "Razón Social / Nombre", style: "tableHeader" },
                    { text: "Correo electrónico", style: "tableHeader" },
                    { text: "Teléfono", style: "tableHeader" },
                    { text: "Descuento", style: "tableHeader" },
                  ],
                  ...datos_clientes.map((c) => [
                    { text: c.nombre, bold: true },
                    c.correo || "Sin correo",
                    c.telefono || "Sin teléfono",
                    `${c.porcentaje_descuento}%`,
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
              margin: [0, 5, 0, 15],
            }
          : {
              table: {
                widths: ["35%", "65%"],
                body: [
                  [
                    "Razón Social / Nombre:",
                    { text: datos_cliente.nombre, bold: true },
                  ],
                  [
                    "Correo electrónico:",
                    datos_cliente.correo || "Sin correo registrado",
                  ],
                  [
                    "Teléfono de contacto:",
                    datos_cliente.telefono || "Sin teléfono",
                  ],
                  [
                    "Descuento asignado:",
                    `${datos_cliente.porcentaje_descuento}% de descuento`,
                  ],
                ],
              },
              layout: "lightHorizontalLines",
              margin: [0, 5, 0, 15],
            },

        // Resumen Comercial y Desempeño
        { text: "RESUMEN ANALÍTICO DE CONSUMO CONSOLIDADO", style: "sectionTitle" },
        {
          table: {
            widths: ["50%", "50%"],
            body: [
              [
                "Total Histórico Comprado:",
                {
                  text: formato_moneda(metricas.total_historico),
                  bold: true,
                  color: "#0369a1",
                },
              ],
              [
                "Cantidad de Pedidos Entregados:",
                metricas.total_compras.toString(),
              ],
              [
                "Importe de Ticket Promedio:",
                formato_moneda(metricas.ticket_promedio),
              ],
              [
                "Estado Comercial Calculado:",
                {
                  text: metricas.estado_comercial,
                  bold: true,
                  color: "#15803d",
                },
              ],
              [
                "Fecha de Primera Compra:",
                `${formato_fecha(metricas.primera_compra ? metricas.primera_compra.fecha : null)} (${formato_moneda(metricas.primera_compra ? metricas.primera_compra.total : 0)})`,
              ],
              [
                "Fecha de Última Compra:",
                `${formato_fecha(metricas.ultima_compra ? metricas.ultima_compra.fecha : null)} (${formato_moneda(metricas.ultima_compra ? metricas.ultima_compra.total : 0)})`,
              ],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 5, 0, 15],
        },

        // Historial de Compras (Tabla de datos)
        {
          text: "HISTORIAL DETALLADO DE COMPRAS (PEDIDOS ENTREGADOS)",
          style: "sectionTitle",
        },
        {
          table: {
            headerRows: 1,
            widths: ["12%", "28%", "20%", "18%", "10%", "12%"],
            body: [
              [
                { text: "Folio", style: "tableHeader" },
                { text: "Cliente", style: "tableHeader" },
                { text: "Fecha", style: "tableHeader" },
                { text: "Total Surtido", style: "tableHeader" },
                { text: "Divisa", style: "tableHeader" },
                { text: "Registró", style: "tableHeader" },
              ],
              ...pedidos.map((p) => [
                { text: `#${p.folio}`, bold: true },
                { text: p.cliente_nombre || "Cliente", color: "#1e40af", bold: true },
                formato_fecha(p.fecha),
                {
                  text: formato_moneda(p.total_pedido),
                  color: "#15803d",
                  bold: true,
                },
                p.metodo_pago,
                p.sucursal,
              ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 5, 0, 10],
        },
      ],
      styles: {
        headerCompany: {
          fontSize: 18,
          bold: true,
          color: "#1e3a8a",
          alignment: "center",
          margin: [0, 0, 0, 2],
        },
        headerReport: {
          fontSize: 12,
          bold: true,
          color: "#475569",
          alignment: "center",
          margin: [0, 0, 0, 4],
        },
        dateEmission: {
          fontSize: 9,
          color: "#64748b",
          alignment: "right",
          margin: [0, 0, 0, 15],
        },
        sectionTitle: {
          fontSize: 11,
          bold: true,
          color: "#1e293b",
          fillColor: "#f8fafc",
          margin: [0, 10, 0, 5],
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: "#1e293b",
        },
      },
      defaultStyle: {
        fontSize: 9,
      },
    };

    const nombreArchivo = esMulticliente
      ? `Estado_Cuenta_Consolidado_${clientes_seleccionados.length}_Clientes.pdf`
      : `Estado_Cuenta_${datos_cliente.nombre.replace(/\s+/g, "_")}.pdf`;

    window.pdfMake
      .createPdf(docDefinition)
      .download(nombreArchivo);
  }
</script>

<svelte:head>
  <title>Análisis Comercial | Xenón</title>
</svelte:head>

<div class="modulo-analisis">
  <!-- Cabecera y Selector de Cliente -->
  <div class="row-cabecera">
    <div class="titulo-modulo">
      <h2>Análisis Comercial y Estado de Cuenta</h2>
      <p>Comportamiento de consumo, rotación y fidelización de clientes</p>
    </div>

    <!-- Buscador Autocompletable -->
    <div class="buscador-container">
      <i class="material-icons icono-buscar">search</i>
      <input
        type="text"
        placeholder="Buscar y agregar clientes al análisis..."
        autocomplete="off"
        bind:value={buscando_cliente}
        on:input={buscar_clientes_debounce}
        on:focus={() => {
          if (lista_clientes_encontrados.length > 0) mostrar_desplegable = true;
        }}
      />
      {#if buscando_cliente}
        <button
          class="btn-clear"
          on:click={() => {
            buscando_cliente = "";
          }}
        >
          <i class="material-icons">close</i>
        </button>
      {/if}
      {#if mostrar_desplegable}
        <div class="desplegable-clientes" transition:slide>
          {#each lista_clientes_encontrados as c}
            <div class="opcion-cliente" on:click={() => agregar_cliente(c)}>
              <span class="nombre-c">{c.nombre}</span>
              <span class="correo-c">{c.correo || "Sin correo"}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Barra de Clientes Seleccionados -->
  {#if clientes_seleccionados.length > 0}
    <div class="bar-clientes-seleccionados" transition:slide>
      <div class="chips-container">
        <span class="lbl-seleccionados">
          <i class="material-icons" style="vertical-align: middle; font-size: 1.1em; color: #3b82f6;">group</i>
          Clientes en análisis ({clientes_seleccionados.length}):
        </span>
        {#each clientes_seleccionados as c}
          <div
            class="chip-cliente"
            style="background-color: {obtener_color_cliente(c._id).bg}; color: {obtener_color_cliente(c._id).text}; border: 1px solid {obtener_color_cliente(c._id).border};"
          >
            <i class="material-icons avatar-chip">person</i>
            <span class="nombre-chip">{c.nombre}</span>
            <button
              class="btn-quitar-chip"
              title="Remover cliente del análisis"
              on:click={() => remover_cliente(c._id)}
            >
              <i class="material-icons">close</i>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if cargando}
    <div class="pantalla-carga">
      <div class="spinner"></div>
      <p>Procesando estadísticas comerciales de los clientes seleccionados...</p>
    </div>
  {:else if datos_cliente && clientes_seleccionados.length > 0}
    <!-- Ficha del o los Clientes e Indicador de Estado -->
    <div class="panel-cliente" transition:fade>
      {#if clientes_seleccionados.length === 1}
        <!-- Vista de 1 Cliente -->
        <div class="ficha-datos">
          <div class="avatar-cliente" style="background-color: {obtener_color_cliente(clientes_seleccionados[0]._id).bg};">
            <i class="material-icons" style="color: #fff;">account_circle</i>
          </div>
          <div class="info-texto">
            <h3>{datos_cliente.nombre}</h3>
            <p class="alias">
              {datos_cliente.alias ? `"${datos_cliente.alias}"` : "Sin alias"}
            </p>
            <div class="tags-perfil">
              <span class="tag-descuento">Descuento: {datos_cliente.porcentaje_descuento}%</span>
              {#if datos_cliente.correo}
                <span class="tag-correo">{datos_cliente.correo}</span>
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <!-- Vista Multi-Cliente -->
        <div class="ficha-datos multi-clientes">
          <div class="avatar-cliente multi" style="background-color: #1e3a8a;">
            <i class="material-icons" style="color: #fff;">domain</i>
          </div>
          <div class="info-texto">
            <h3>Análisis Consolidado ({clientes_seleccionados.length} Clientes)</h3>
            <div class="lista-nombres-multi">
              {#each datos_clientes as cli}
                <span class="badge-mini-cliente" style="background-color: {obtener_color_cliente(cli._id).bg}; color: {obtener_color_cliente(cli._id).text};">
                  <i class="material-icons" style="font-size: 12px;">person</i>
                  {cli.nombre} ({cli.porcentaje_descuento}%)
                </span>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Insignia del Estado Comercial -->
      {#if metricas && estilo_insignia}
        <div
          class="insignia-estado {estilo_insignia.clase}"
          style="background-color: {estilo_insignia.bg}; color: {estilo_insignia.texto};"
        >
          <span class="etiqueta-estado">{estilo_insignia.etiqueta}</span>
          <span class="subtexto-estado">Estado Comercial</span>
        </div>
      {/if}
    </div>

    <!-- Filtros de Rango de Fechas -->
    <div class="filtros-periodo" transition:fade>
      <div class="opcion-filtro-check">
        <label>
          <input
            type="checkbox"
            bind:checked={aplicar_rango_fechas}
            on:change={cargar_analisis_comercial}
          />
          Filtrar por Rango de Fechas
        </label>
      </div>

      {#if aplicar_rango_fechas}
        <div class="fechas-inputs" transition:slide>
          <div class="fecha-group">
            <label>Desde:</label>
            <input
              type="date"
              bind:value={periodicidad.desde}
              on:change={cargar_analisis_comercial}
            />
          </div>
          <div class="fecha-group">
            <label>Hasta:</label>
            <input
              type="date"
              bind:value={periodicidad.hasta}
              on:change={cargar_analisis_comercial}
            />
          </div>
        </div>
      {/if}

      <!-- Acciones -->
      <div class="acciones-reporte">
        <Button
          raised
          color="primary"
          on:click={exportar_pdf}
          disabled={exportando_pdf}
        >
          <i class="material-icons">picture_as_pdf</i>
          {exportando_pdf ? "Cargando exportador..." : "Exportar a PDF"}
        </Button>
      </div>
    </div>

    <!-- Métricas Clave (KPIs) -->
    {#if metricas}
      <div class="grid-kpis" transition:fade>
        <div class="kpi-card">
          <span class="kpi-titulo">Total Histórico Vendido</span>
          <span class="kpi-valor total-dinero"
            >{formato_moneda(metricas.total_historico)}</span
          >
          <span class="kpi-subtexto">Compras acumuladas entregadas</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Número de Compras</span>
          <span class="kpi-valor">{metricas.total_compras}</span>
          <span class="kpi-subtexto">Pedidos surtidos y concretados</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Ticket Promedio</span>
          <span class="kpi-valor"
            >{formato_moneda(metricas.ticket_promedio)}</span
          >
          <span class="kpi-subtexto">Consumo promedio por pedido</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Primera Compra</span>
          <span class="kpi-valor fecha"
            >{formato_fecha(
              metricas.primera_compra ? metricas.primera_compra.fecha : null,
            )}</span
          >
          <span class="kpi-subtexto"
            >Importe: {formato_moneda(
              metricas.primera_compra ? metricas.primera_compra.total : 0,
            )}</span
          >
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Última Compra</span>
          <span class="kpi-valor fecha"
            >{formato_fecha(
              metricas.ultima_compra ? metricas.ultima_compra.fecha : null,
            )}</span
          >
          <span class="kpi-subtexto"
            >Importe: {formato_moneda(
              metricas.ultima_compra ? metricas.ultima_compra.total : 0,
            )}</span
          >
        </div>
      </div>
    {/if}

    <!-- Gráficos de Tendencias -->
    <div class="grid-graficos" transition:fade>
      <!-- Gráfico 1: Ventas por Año -->
      <div class="card-grafico">
        <div class="header-grafico">
          <h4>Ventas Comparativas por Año</h4>
        </div>
        <div class="contenedor-svg">
          {#if compras_por_anio.length > 0}
            <svg viewBox="0 0 400 200" width="100%" height="100%">
              <!-- Grid lines -->
              <line
                x1="40"
                y1="20"
                x2="380"
                y2="20"
                stroke="#334155"
                stroke-dasharray="4"
              />
              <line
                x1="40"
                y1="85"
                x2="380"
                y2="85"
                stroke="#334155"
                stroke-dasharray="4"
              />
              <line
                x1="40"
                y1="150"
                x2="380"
                y2="150"
                stroke="#334155"
                stroke-dasharray="4"
              />
              <line
                x1="40"
                y1="170"
                x2="380"
                y2="170"
                stroke="#475569"
                stroke-width="1.5"
              />

              {#each compras_por_anio as anioData, i}
                <!-- Barra -->
                <rect
                  x={60 + i * (300 / compras_por_anio.length)}
                  y={170 - (anioData.total / maxTotalAnual) * 130}
                  width={Math.min(30, 200 / compras_por_anio.length)}
                  height={(anioData.total / maxTotalAnual) * 130}
                  rx="4"
                  fill="url(#gradient-barras)"
                  class="barra-animada"
                  on:click={() => filtrar_por_anio_grafico(anioData.anio)}
                  on:mouseenter={(e) => mostrar_tooltip(e, anioData)}
                  on:mousemove={(e) => mover_tooltip(e)}
                  on:mouseleave={ocultar_tooltip}
                  style="cursor: pointer;"
                />
                <!-- Valor encima de la barra -->
                <text
                  x={60 + i * (300 / compras_por_anio.length) + 15}
                  y={160 - (anioData.total / maxTotalAnual) * 130}
                  text-anchor="middle"
                  fill="#94a3b8"
                  font-size="9"
                  on:click={() => filtrar_por_anio_grafico(anioData.anio)}
                  on:mouseenter={(e) => mostrar_tooltip(e, anioData)}
                  on:mousemove={(e) => mover_tooltip(e)}
                  on:mouseleave={ocultar_tooltip}
                  style="cursor: pointer;"
                >
                  {formato_moneda(anioData.total).split(".")[0]}
                </text>
                <!-- Nombre del Año abajo -->
                <text
                  x={60 + i * (300 / compras_por_anio.length) + 15}
                  y={185}
                  text-anchor="middle"
                  fill="#cbd5e1"
                  font-size="10"
                  font-weight="bold"
                  on:click={() => filtrar_por_anio_grafico(anioData.anio)}
                  on:mouseenter={(e) => mostrar_tooltip(e, anioData)}
                  on:mousemove={(e) => mover_tooltip(e)}
                  on:mouseleave={ocultar_tooltip}
                  style="cursor: pointer;"
                >
                  {anioData.anio}
                </text>
              {/each}

              <defs>
                <linearGradient
                  id="gradient-barras"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
          {:else}
            <p class="sin-datos-grafico">Sin datos históricos anuales</p>
          {/if}
        </div>
      </div>

      <!-- Gráfico 2: Tendencia Mensual -->
      <div class="card-grafico">
        <div class="header-grafico">
          <h4>Tendencia Mensual Histórica</h4>
        </div>
        <div class="contenedor-svg">
          {#if compras_por_mes.length > 0}
            <svg viewBox="0 0 400 200" width="100%" height="100%">
              <!-- Grid lines -->
              <line
                x1="40"
                y1="20"
                x2="380"
                y2="20"
                stroke="#334155"
                stroke-dasharray="4"
              />
              <line
                x1="40"
                y1="85"
                x2="380"
                y2="85"
                stroke="#334155"
                stroke-dasharray="4"
              />
              <line
                x1="40"
                y1="150"
                x2="380"
                y2="150"
                stroke="#334155"
                stroke-dasharray="4"
              />
              <line
                x1="40"
                y1="170"
                x2="380"
                y2="170"
                stroke="#475569"
                stroke-width="1.5"
              />

              <!-- Línea de trazado -->
              <polyline
                fill="none"
                stroke="#10b981"
                stroke-width="2.5"
                points={puntosMensuales}
              />

              {#each compras_por_mes as mesData, i}
                <!-- Puntos de la curva -->
                <circle
                  cx={40 + i * (340 / (compras_por_mes.length - 1 || 1))}
                  cy={170 - (mesData.total / maxMesTotal) * 130}
                  r="4"
                  fill="#10b981"
                  stroke="#022c22"
                  stroke-width="1.5"
                  on:mouseenter={(e) => mostrar_tooltip_mes(e, mesData)}
                  on:mousemove={(e) => mover_tooltip_mes(e)}
                  on:mouseleave={ocultar_tooltip_mes}
                  style={aplicar_rango_fechas ? "cursor: pointer;" : ""}
                />

                <!-- Mostrar etiqueta abreviada abajo solo si caben -->
                {#if compras_por_mes.length <= 12 || i % 2 === 0}
                  <text
                    x={40 + i * (340 / (compras_por_mes.length - 1 || 1))}
                    y={185}
                    text-anchor="middle"
                    fill="#94a3b8"
                    font-size="8"
                  >
                    {mesData.mesAnio.split(" ")[0].slice(0, 3)}
                  </text>
                {/if}
              {/each}
            </svg>
          {:else}
            <p class="sin-datos-grafico">Sin datos de compras mensuales</p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Tabla de Historial de Compras -->
    <div class="tabla-compras" transition:fade>
      <h4>Historial de Compras Realizadas</h4>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente / Empresa</th>
              <th>Fecha de Compra</th>
              <th>Importe Total</th>
              <th>Moneda</th>
              <th>Atendido por / Registró</th>
            </tr>
          </thead>
          <tbody>
            {#if pedidos_paginados.length > 0}
              {#each pedidos_paginados as p}
                <tr
                  on:dblclick={() => ver_detalle_pedido(p)}
                  class="fila-compra"
                  title="Doble clic para ver productos"
                >
                  <td class="folio">#{p.folio}</td>
                  <td>
                    <span
                      class="badge-cliente-tabla"
                      style="background-color: {obtener_color_cliente(p.cliente_id).bg}; color: {obtener_color_cliente(p.cliente_id).text}; border: 1px solid {obtener_color_cliente(p.cliente_id).border};"
                    >
                      <i class="material-icons" style="font-size: 11px; vertical-align: middle; margin-right: 3px;">person</i>
                      {p.cliente_nombre || 'Cliente'}
                    </span>
                  </td>
                  <td>{formato_fecha(p.fecha)}</td>
                  <td class="total">{formato_moneda(p.total_pedido)}</td>
                  <td>{p.metodo_pago}</td>
                  <td>{p.sucursal}</td>
                </tr>
              {/each}
            {:else}
              <tr>
                <td colspan="6" class="centrado"
                  >No se encontraron compras en el periodo seleccionado</td
                >
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Paginación de la Tabla -->
      {#if total_paginas_tabla > 1}
        <div class="paginador-tabla">
          <button disabled={pagina_tabla === 1} on:click={() => pagina_tabla--}>
            <i class="material-icons">keyboard_arrow_left</i>
          </button>
          <span>Página {pagina_tabla} de {total_paginas_tabla}</span>
          <button
            disabled={pagina_tabla === total_paginas_tabla}
            on:click={() => pagina_tabla++}
          >
            <i class="material-icons">keyboard_arrow_right</i>
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Panel Inicial Sin Cliente Seleccionado -->
    <div class="panel-inicial" transition:fade>
      <i class="material-icons icono-inicial">analytics</i>
      <h3>Selecciona uno o varios clientes</h3>
      <p>
        Usa la barra de búsqueda superior para encontrar y agregar clientes al análisis consolidado. Puedes agregar múltiples cuentas para analizarlas juntas.
      </p>
    </div>
  {/if}

  <!-- Modal Detalle del Pedido -->
  {#if modal_detalle_abierto && pedido_seleccionado}
    <div
      class="modal-overlay"
      transition:fade
      on:click={() => (modal_detalle_abierto = false)}
    >
      <div class="modal-box" transition:slide on:click|stopPropagation>
        <div class="modal-header">
          <h3>Detalle del Pedido - Folio #{pedido_seleccionado.folio}</h3>
          <button
            class="btn-close-modal"
            on:click={() => (modal_detalle_abierto = false)}
          >
            <i class="material-icons">close</i>
          </button>
        </div>

        <div class="modal-body">
          <div class="pedido-info-resumen">
            <p>
              <strong>Cliente / Cuenta:</strong>
              <span
                class="badge-cliente-tabla"
                style="background-color: {obtener_color_cliente(pedido_seleccionado.cliente_id).bg}; color: {obtener_color_cliente(pedido_seleccionado.cliente_id).text};"
              >
                {pedido_seleccionado.cliente_nombre || 'Cliente'}
              </span>
            </p>
            <p>
              <strong>Fecha de Compra:</strong>
              {formato_fecha(pedido_seleccionado.fecha)}
            </p>
            <p>
              <strong>Total Surtido:</strong>
              <span class="total-pedido-resumen"
                >{formato_moneda(pedido_seleccionado.total_pedido)}</span
              >
            </p>
            <p>
              <strong>Atendido por / Registró:</strong>
              {pedido_seleccionado.sucursal}
            </p>
            <p>
              <strong>Método / Divisa:</strong>
              {pedido_seleccionado.metodo_pago}
            </p>
          </div>

          <h4>Productos Adquiridos</h4>
          <div class="table-responsive">
            <table class="tabla-modal-productos">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th class="derecha">Cantidad</th>
                  <th class="derecha">Precio Unit.</th>
                  <th class="derecha">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {#if pedido_seleccionado.lista && pedido_seleccionado.lista.length > 0}
                  {#each pedido_seleccionado.lista as item}
                    <tr>
                      <td class="codigo-prod">{item.codigo}</td>
                      <td>{item.nombre}</td>
                      <td class="derecha cantidad-prod">{item.cantidad}</td>
                      <td class="derecha">{formato_moneda(item.precio)}</td>
                      <td class="derecha total-prod"
                        >{formato_moneda(item.cantidad * item.precio)}</td
                      >
                    </tr>
                  {/each}
                {:else}
                  <tr>
                    <td colspan="5" class="centrado"
                      >No se encontraron productos registrados en este pedido</td
                    >
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <Button
            raised
            color="primary"
            on:click={() => (modal_detalle_abierto = false)}>Aceptar</Button
          >
        </div>
      </div>
    </div>
  {/if}

  <!-- Tooltip flotante para barras de años -->
  {#if tooltip_activo}
    <div
      class="tooltip-grafico"
      style="left: {tooltip_posicion.x}px; top: {tooltip_posicion.y}px;"
      transition:fade
    >
      <div class="tooltip-anio">{tooltip_contenido.anio}</div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Total vendido:</span>
        <span class="tooltip-val total"
          >{formato_moneda(tooltip_contenido.total)}</span
        >
      </div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Pedidos hechos:</span>
        <span class="tooltip-val">{tooltip_contenido.compras}</span>
      </div>
    </div>
  {/if}

  <!-- Tooltip flotante para meses -->
  {#if tooltip_mes_activo && aplicar_rango_fechas}
    <div
      class="tooltip-grafico"
      style="left: {tooltip_mes_posicion.x}px; top: {tooltip_mes_posicion.y}px;"
      transition:fade
    >
      <div class="tooltip-anio">{tooltip_mes_contenido.mesAnio}</div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Total vendido:</span>
        <span class="tooltip-val total-mes"
          >{formato_moneda(tooltip_mes_contenido.total)}</span
        >
      </div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Pedidos hechos:</span>
        <span class="tooltip-val">{tooltip_mes_contenido.compras}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .modulo-analisis {
    background-color: #0f172a;
    color: #f8fafc;
    padding: 24px;
    border-radius: 12px;
    min-height: 80vh;
    font-family: "Outfit", sans-serif;
  }

  .row-cabecera {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .titulo-modulo h2 {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0;
    color: #f8fafc;
  }

  .titulo-modulo p {
    font-size: 0.85rem;
    color: #94a3b8;
    margin: 4px 0 0 0;
  }

  .buscador-container {
    position: relative;
    width: 380px;
  }

  .icono-buscar {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
  }

  .buscador-container input {
    width: 100%;
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 36px 10px 40px;
    color: #f8fafc;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s;
  }

  .buscador-container input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .btn-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
  }

  .btn-clear:hover {
    color: #f8fafc;
  }

  .desplegable-clientes {
    position: absolute;
    top: 105%;
    left: 0;
    right: 0;
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    max-height: 220px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  }

  .opcion-cliente {
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid #334155;
    display: flex;
    flex-direction: column;
  }

  .opcion-cliente:last-child {
    border-bottom: none;
  }

  .opcion-cliente:hover {
    background-color: #334155;
  }

  .nombre-c {
    font-weight: 600;
    font-size: 0.9rem;
    color: #f8fafc;
  }

  .correo-c {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  /* Barra de Chips de Clientes Seleccionados */
  .bar-clientes-seleccionados {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 10px 16px;
    margin-bottom: 20px;
  }

  .chips-container {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .lbl-seleccionados {
    font-size: 0.85rem;
    font-weight: 600;
    color: #cbd5e1;
    margin-right: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .chip-cliente {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 16px;
    font-size: 0.82rem;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .avatar-chip {
    font-size: 14px;
  }

  .btn-quitar-chip {
    background: rgba(0, 0, 0, 0.2);
    border: none;
    border-radius: 50%;
    color: inherit;
    cursor: pointer;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: 2px;
    transition: background 0.2s;
  }

  .btn-quitar-chip:hover {
    background: rgba(0, 0, 0, 0.4);
  }

  .btn-quitar-chip i {
    font-size: 12px;
  }

  .badge-cliente-tabla {
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  /* Ficha de Cliente */
  .panel-cliente {
    background-color: #1e293b;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .ficha-datos {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .ficha-datos.multi-clientes {
    gap: 12px;
  }

  .avatar-cliente {
    width: 56px;
    height: 56px;
    background-color: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .avatar-cliente i {
    font-size: 36px;
    color: #ffffff;
  }

  .info-texto h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
  }

  .info-texto .alias {
    margin: 2px 0 6px 0;
    font-size: 0.85rem;
    color: #94a3b8;
    font-style: italic;
  }

  .tags-perfil {
    display: flex;
    gap: 8px;
  }

  .tag-descuento, .tag-correo {
    background-color: #0369a1;
    color: #e0f2fe;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .lista-nombres-multi {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .badge-mini-cliente {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.78rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  .insignia-estado {
    padding: 10px 20px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .etiqueta-estado {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .subtexto-estado {
    font-size: 0.7rem;
    opacity: 0.85;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Filtros de Periodo */
  .filtros-periodo {
    background-color: #1e293b;
    border-radius: 10px;
    padding: 14px 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }

  .opcion-filtro-check label {
    font-size: 0.9rem;
    color: #e2e8f0;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fechas-inputs {
    display: flex;
    gap: 16px;
  }

  .fecha-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .fecha-group input {
    background-color: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 6px 10px;
    color: #f8fafc;
    outline: none;
  }

  /* Grid KPIs */
  .grid-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .kpi-card {
    background-color: #1e293b;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    border-left: 4px solid #3b82f6;
  }

  .kpi-titulo {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .kpi-valor {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f8fafc;
    margin: 6px 0 2px 0;
  }

  .kpi-valor.total-dinero {
    color: #38bdf8;
  }

  .kpi-valor.fecha {
    font-size: 1rem;
  }

  .kpi-subtexto {
    font-size: 0.72rem;
    color: #64748b;
  }

  /* Grid Gráficos */
  .grid-graficos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .card-grafico {
    background-color: #1e293b;
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
  }

  .header-grafico h4 {
    margin: 0 0 16px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .contenedor-svg {
    height: 200px;
    position: relative;
  }

  .sin-datos-grafico {
    text-align: center;
    color: #64748b;
    line-height: 200px;
    font-size: 0.9rem;
    margin: 0;
  }

  .barra-animada {
    transition: height 0.5s ease-out, y 0.5s ease-out;
  }

  .barra-animada:hover {
    fill: #60a5fa;
  }

  /* Tabla de Compras */
  .tabla-compras {
    background-color: #1e293b;
    border-radius: 12px;
    padding: 20px;
  }

  .tabla-compras h4 {
    margin: 0 0 16px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .table-responsive {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  th {
    background-color: #0f172a;
    color: #94a3b8;
    text-align: left;
    padding: 12px 14px;
    font-weight: 600;
    border-bottom: 1px solid #334155;
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid #334155;
    color: #cbd5e1;
  }

  .fila-compra:hover {
    background-color: #334155;
    cursor: pointer;
  }

  .folio {
    font-weight: 700;
    color: #38bdf8;
  }

  .total {
    font-weight: 700;
    color: #4ade80;
  }

  .paginador-tabla {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .paginador-tabla button {
    background-color: #0f172a;
    border: 1px solid #334155;
    color: #f8fafc;
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
  }

  .paginador-tabla button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Panel Inicial */
  .panel-inicial {
    text-align: center;
    padding: 60px 20px;
    background-color: #1e293b;
    border-radius: 12px;
    color: #94a3b8;
  }

  .icono-inicial {
    font-size: 64px;
    color: #475569;
    margin-bottom: 12px;
  }

  .panel-inicial h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #f8fafc;
  }

  .panel-inicial p {
    font-size: 0.9rem;
    max-width: 460px;
    margin: 8px auto 0 auto;
  }

  .pantalla-carga {
    text-align: center;
    padding: 60px 20px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #334155;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .pantalla-carga p {
    color: #94a3b8;
    font-size: 0.9rem;
  }

  /* Modal de Detalle */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-box {
    background-color: #1e293b;
    border-radius: 12px;
    width: 90%;
    max-width: 650px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #f8fafc;
  }

  .btn-close-modal {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
  }

  .btn-close-modal:hover {
    color: #f8fafc;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
  }

  .pedido-info-resumen {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 16px;
    background-color: #0f172a;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 0.85rem;
  }

  .pedido-info-resumen p {
    margin: 0;
  }

  .total-pedido-resumen {
    color: #4ade80;
    font-weight: 700;
  }

  .modal-body h4 {
    margin: 0 0 12px 0;
    font-size: 0.95rem;
    color: #e2e8f0;
  }

  .tabla-modal-productos th {
    background-color: #0f172a;
    font-size: 0.8rem;
  }

  .tabla-modal-productos td {
    font-size: 0.82rem;
  }

  .codigo-prod {
    font-family: monospace;
    color: #94a3b8;
  }

  .cantidad-prod {
    font-weight: 700;
  }

  .total-prod {
    font-weight: 700;
    color: #38bdf8;
  }

  .modal-footer {
    padding: 14px 20px;
    border-top: 1px solid #334155;
    text-align: right;
  }

  /* Tooltip Flotante */
  .tooltip-grafico {
    position: fixed;
    background-color: #0f172a;
    border: 1px solid #3b82f6;
    border-radius: 8px;
    padding: 8px 12px;
    pointer-events: none;
    z-index: 2000;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
  }

  .tooltip-anio {
    font-weight: 700;
    font-size: 0.85rem;
    color: #f8fafc;
    margin-bottom: 4px;
  }

  .tooltip-item {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 0.78rem;
  }

  .tooltip-lbl {
    color: #94a3b8;
  }

  .tooltip-val {
    font-weight: 600;
    color: #f8fafc;
  }

  .tooltip-val.total, .tooltip-val.total-mes {
    color: #38bdf8;
  }

  .centrado {
    text-align: center;
  }

  .derecha {
    text-align: right;
  }
</style>
