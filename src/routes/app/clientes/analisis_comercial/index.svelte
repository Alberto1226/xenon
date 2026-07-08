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

  // Filtros
  let anio_filtro = new Date().getFullYear();
  let periodicidad = { desde: "", hasta: "" };
  let aplicar_rango_fechas = false;

  // Datos del Análisis
  let datos_cliente = null;
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
    pagina_tabla * items_por_pagina
  );

  // Variables reactivas para compatibilidad con compilador Svelte antiguo (evita usar @const)
  $: estilo_insignia = metricas ? obtener_estilos_insignia(metricas.estado_comercial) : null;
  $: maxTotalAnual = compras_por_anio.length > 0 ? Math.max(...compras_por_anio.map(c => c.total), 1) : 1;
  $: maxMesTotal = compras_por_mes.length > 0 ? Math.max(...compras_por_mes.map(m => m.total), 1) : 1;
  $: puntosMensuales = compras_por_mes.length > 0 ? compras_por_mes.map((m, i) => {
    const x = 40 + i * (340 / (compras_por_mes.length - 1 || 1));
    const y = 170 - (m.total / maxMesTotal) * 130;
    return `${x},${y}`;
  }).join(" ") : "";

  onMount(() => {
    if ($cliente_selecto && $cliente_selecto._id) {
      buscando_cliente = $cliente_selecto.nombre;
      seleccionar_cliente($cliente_selecto);
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
        pagina_actual: 1
      })
        .then(res => {
          if (res.ok) {
            lista_clientes_encontrados = res.lista;
            mostrar_desplegable = lista_clientes_encontrados.length > 0;
          }
        })
        .catch(err => console.error("Error buscando clientes:", err));
    }, 300);
  }

  function seleccionar_cliente(cliente) {
    $cliente_selecto = cliente;
    buscando_cliente = cliente.nombre;
    mostrar_desplegable = false;
    cargar_analisis_comercial();
  }

  function cargar_analisis_comercial() {
    if (!$cliente_selecto || !$cliente_selecto._id) return;

    cargando = true;
    let payload = { cliente_id: $cliente_selecto._id };

    if (aplicar_rango_fechas && periodicidad.desde && periodicidad.hasta) {
      payload.periodicidad = {
        desde: new Date(periodicidad.desde + "T00:00:00"),
        hasta: new Date(periodicidad.hasta + "T23:59:59")
      };
    }

    postData("app/clientes/analisis_comercial/obtener_analisis", payload)
      .then(res => {
        cargando = false;
        if (res.ok) {
          datos_cliente = res.cliente;
          metricas = res.metricas;
          compras_por_anio = res.compras_por_anio;
          compras_por_mes = res.compras_por_mes;
          pedidos = res.pedidos;
          pagina_tabla = 1;
        } else {
          alert(res.mensaje || "Error al obtener el análisis comercial.");
        }
      })
      .catch(err => {
        cargando = false;
        console.error("Error al cargar análisis:", err);
      });
  }

  function formato_moneda(valor) {
    if (valor === undefined || valor === null) return "$0.00";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN"
    }).format(valor);
  }

  function formato_fecha(fechaStr) {
    if (!fechaStr) return "-";
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  // Estilos de Insignias según el Estado Comercial
  function obtener_estilos_insignia(estado) {
    switch (estado) {
      case "Alto valor":
        return { bg: "#eab308", texto: "#000", etiqueta: "Alto Valor ✨", clase: "alto-valor" };
      case "En crecimiento":
        return { bg: "#22c55e", texto: "#fff", etiqueta: "En Crecimiento 📈", clase: "crecimiento" };
      case "En riesgo":
        return { bg: "#f97316", texto: "#fff", etiqueta: "En Riesgo ⚠️", clase: "riesgo" };
      case "Inactivo":
        return { bg: "#64748b", texto: "#fff", etiqueta: "Inactivo 😴", clase: "inactivo" };
      case "Cliente nuevo":
        return { bg: "#06b6d4", texto: "#fff", etiqueta: "Cliente Nuevo 🆕", clase: "nuevo" };
      case "Frecuente":
        return { bg: "#a855f7", texto: "#fff", etiqueta: "Frecuente 🔥", clase: "frecuente" };
      case "Recurrente":
        return { bg: "#3b82f6", texto: "#fff", etiqueta: "Recurrente 🔄", clase: "recurrente" };
      default:
        return { bg: "#64748b", texto: "#fff", etiqueta: "Regular", clase: "regular" };
    }
  }

  // Control del modal de detalle de compra
  let modal_detalle_abierto = false;
  let pedido_seleccionado = null;

  function ver_detalle_pedido(pedido) {
    pedido_seleccionado = pedido;
    modal_detalle_abierto = true;
  }

  function filtrar_por_anio_grafico(anio) {
    aplicar_rango_fechas = true;
    periodicidad.desde = `${anio}-01-01`;
    periodicidad.hasta = `${anio}-12-31`;
    cargar_analisis_comercial();
  }

  // Tooltip interactivo para gráfica de barras
  let tooltip_activo = false;
  let tooltip_contenido = { anio: "", total: 0, compras: 0 };
  let tooltip_posicion = { x: 0, y: 0 };

  function mostrar_tooltip(e, anioData) {
    tooltip_contenido = anioData;
    tooltip_activo = true;
    mover_tooltip(e);
  }

  function mover_tooltip(e) {
    tooltip_posicion = {
      x: e.clientX + 15,
      y: e.clientY - 75
    };
  }

  function ocultar_tooltip() {
    tooltip_activo = false;
  }

  // Tooltip interactivo para gráfica mensual (activo solo si se filtra por año/fechas)
  let tooltip_mes_activo = false;
  let tooltip_mes_contenido = { mesAnio: "", total: 0, compras: 0 };
  let tooltip_mes_posicion = { x: 0, y: 0 };

  function mostrar_tooltip_mes(e, mesData) {
    if (!aplicar_rango_fechas) return;
    tooltip_mes_contenido = mesData;
    tooltip_mes_activo = true;
    mover_tooltip_mes(e);
  }

  function mover_tooltip_mes(e) {
    tooltip_mes_posicion = {
      x: e.clientX + 15,
      y: e.clientY - 75
    };
  }

  function ocultar_tooltip_mes() {
    tooltip_mes_activo = false;
  }

  let exportando_pdf = false;

  function exportar_pdf() {
    if (!datos_cliente || !metricas) {
      alert("Espera a que el análisis termine de cargarse.");
      return;
    }

    if (window.pdfMake) {
      ejecutar_pdfmake();
      return;
    }

    exportando_pdf = true;

    // Inyectar pdfmake.min.js dinámicamente para no cargarlo en el bundler de Rollup
    const scriptPdfMake = document.createElement("script");
    scriptPdfMake.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/pdfmake.min.js";
    scriptPdfMake.onload = () => {
      // Inyectar las fuentes
      const scriptFonts = document.createElement("script");
      scriptFonts.src = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/vfs_fonts.js";
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
    const docDefinition = {
      content: [
        // Encabezado principal corporativo
        { text: 'XENÓN Y MÁS', style: 'headerCompany' },
        { text: 'ESTADO DE CUENTA ANUAL Y REPORTE COMERCIAL', style: 'headerReport' },
        { text: `Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}`, style: 'dateEmission' },
        
        // Ficha del Cliente
        { text: 'DATOS DE IDENTIFICACIÓN DEL CLIENTE', style: 'sectionTitle' },
        {
          table: {
            widths: ['35%', '65%'],
            body: [
              ['Razón Social / Nombre:', { text: datos_cliente.nombre, bold: true }],
              ['Alias comercial:', datos_cliente.alias || 'Sin alias registrado'],
              ['Correo electrónico:', datos_cliente.correo || 'Sin correo registrado'],
              ['Teléfono de contacto:', datos_cliente.telefono || 'Sin teléfono'],
              ['Descuento asignado:', `${datos_cliente.porcentaje_descuento}% de descuento`],
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 5, 0, 15]
        },

        // Resumen Comercial y Desempeño
        { text: 'RESUMEN ANALÍTICO DE CONSUMO', style: 'sectionTitle' },
        {
          table: {
            widths: ['50%', '50%'],
            body: [
              ['Total Histórico Comprado:', { text: formato_moneda(metricas.total_historico), bold: true, color: '#0369a1' }],
              ['Cantidad de Pedidos Entregados:', metricas.total_compras.toString()],
              ['Importe de Ticket Promedio:', formato_moneda(metricas.ticket_promedio)],
              ['Estado Comercial Calculado:', { text: metricas.estado_comercial, bold: true, color: '#15803d' }],
              ['Fecha de Primera Compra:', `${formato_fecha(metricas.primera_compra ? metricas.primera_compra.fecha : null)} (${formato_moneda(metricas.primera_compra ? metricas.primera_compra.total : 0)})`],
              ['Fecha de Última Compra:', `${formato_fecha(metricas.ultima_compra ? metricas.ultima_compra.fecha : null)} (${formato_moneda(metricas.ultima_compra ? metricas.ultima_compra.total : 0)})`],
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 5, 0, 15]
        },

        // Historial de Compras (Tabla de datos)
        { text: 'HISTORIAL DETALLADO DE COMPRAS (PEDIDOS ENTREGADOS)', style: 'sectionTitle' },
        {
          table: {
            headerRows: 1,
            widths: ['15%', '25%', '25%', '15%', '20%'],
            body: [
              [
                { text: 'Folio', style: 'tableHeader' },
                { text: 'Fecha de Pago', style: 'tableHeader' },
                { text: 'Total Surtido', style: 'tableHeader' },
                { text: 'Divisa', style: 'tableHeader' },
                { text: 'Registró', style: 'tableHeader' }
              ],
              ...pedidos.map(p => [
                { text: `#${p.folio}`, bold: true },
                formato_fecha(p.fecha),
                { text: formato_moneda(p.total_pedido), color: '#15803d', bold: true },
                p.metodo_pago,
                p.sucursal
              ])
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 5, 0, 10]
        }
      ],
      styles: {
        headerCompany: {
          fontSize: 22,
          bold: true,
          color: '#1e3a8a',
          alignment: 'center',
          margin: [0, 0, 0, 2]
        },
        headerReport: {
          fontSize: 13,
          bold: true,
          color: '#475569',
          alignment: 'center',
          margin: [0, 0, 0, 4]
        },
        dateEmission: {
          fontSize: 9,
          color: '#64748b',
          alignment: 'right',
          margin: [0, 0, 0, 15]
        },
        sectionTitle: {
          fontSize: 11,
          bold: true,
          color: '#1e293b',
          fillColor: '#f8fafc',
          margin: [0, 10, 0, 5]
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: '#1e293b'
        }
      },
      defaultStyle: {
        fontSize: 9
      }
    };

    window.pdfMake.createPdf(docDefinition).download(`Estado_Cuenta_${datos_cliente.nombre.replace(/\s+/g, '_')}.pdf`);
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
        placeholder="Buscar cliente..."
        autocomplete="off"
        bind:value={buscando_cliente}
        on:input={buscar_clientes_debounce}
        on:focus={() => { if(lista_clientes_encontrados.length > 0) mostrar_desplegable = true; }}
      />
      {#if buscando_cliente}
        <button class="btn-clear" on:click={() => { buscando_cliente = ""; $cliente_selecto = null; datos_cliente = null; }}>
          <i class="material-icons">close</i>
        </button>
      {/if}
      {#if mostrar_desplegable}
        <div class="desplegable-clientes" transition:slide>
          {#each lista_clientes_encontrados as c}
            <div class="opcion-cliente" on:click={() => seleccionar_cliente(c)}>
              <span class="nombre-c">{c.nombre}</span>
              <span class="correo-c">{c.correo || 'Sin correo'}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if cargando}
    <div class="pantalla-carga">
      <div class="spinner"></div>
      <p>Procesando estadísticas comerciales del cliente...</p>
    </div>
  {:else if datos_cliente}
    <!-- Ficha del Cliente e Indicador de Estado -->
    <div class="panel-cliente" transition:fade>
      <div class="ficha-datos">
        <div class="avatar-cliente">
          <i class="material-icons">account_circle</i>
        </div>
        <div class="info-texto">
          <h3>{datos_cliente.nombre}</h3>
          <p class="alias">{datos_cliente.alias ? `"${datos_cliente.alias}"` : 'Sin alias'}</p>
          <div class="tags-perfil">
            <span class="tag-descuento">Descuento: {datos_cliente.porcentaje_descuento}%</span>
          </div>
        </div>
      </div>

      <!-- Insignia del Estado Comercial -->
      {#if metricas && estilo_insignia}
        <div class="insignia-estado {estilo_insignia.clase}" style="background-color: {estilo_insignia.bg}; color: {estilo_insignia.texto};">
          <span class="etiqueta-estado">{estilo_insignia.etiqueta}</span>
          <span class="subtexto-estado">Estado Comercial</span>
        </div>
      {/if}
    </div>

    <!-- Filtros de Rango de Fechas -->
    <div class="filtros-periodo" transition:fade>
      <div class="opcion-filtro-check">
        <label>
          <input type="checkbox" bind:checked={aplicar_rango_fechas} on:change={cargar_analisis_comercial} />
          Filtrar por Rango de Fechas
        </label>
      </div>
      {#if aplicar_rango_fechas}
        <div class="fechas-inputs" transition:slide>
          <div class="fecha-group">
            <label>Desde:</label>
            <input type="date" bind:value={periodicidad.desde} on:change={cargar_analisis_comercial} />
          </div>
          <div class="fecha-group">
            <label>Hasta:</label>
            <input type="date" bind:value={periodicidad.hasta} on:change={cargar_analisis_comercial} />
          </div>
        </div>
      {/if}

      <!-- Acciones -->
      <div class="acciones-reporte">
        <Button raised color="primary" on:click={exportar_pdf} disabled={exportando_pdf}>
          <i class="material-icons">picture_as_pdf</i> {exportando_pdf ? 'Cargando exportador...' : 'Exportar a PDF'}
        </Button>
      </div>
    </div>

    <!-- KPIs de Consumo -->
    {#if metricas}
      <div class="grid-kpis" transition:fade>
        <div class="kpi-card">
          <span class="kpi-titulo">Total Histórico Vendido</span>
          <span class="kpi-valor total-dinero">{formato_moneda(metricas.total_historico)}</span>
          <span class="kpi-subtexto">Compras acumuladas entregadas</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Número de Compras</span>
          <span class="kpi-valor">{metricas.total_compras}</span>
          <span class="kpi-subtexto">Pedidos surtidos y concretados</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Ticket Promedio</span>
          <span class="kpi-valor">{formato_moneda(metricas.ticket_promedio)}</span>
          <span class="kpi-subtexto">Consumo promedio por pedido</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Primera Compra</span>
          <span class="kpi-valor fecha">{formato_fecha(metricas.primera_compra ? metricas.primera_compra.fecha : null)}</span>
          <span class="kpi-subtexto">Importe: {formato_moneda(metricas.primera_compra ? metricas.primera_compra.total : 0)}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-titulo">Última Compra</span>
          <span class="kpi-valor fecha">{formato_fecha(metricas.ultima_compra ? metricas.ultima_compra.fecha : null)}</span>
          <span class="kpi-subtexto">Importe: {formato_moneda(metricas.ultima_compra ? metricas.ultima_compra.total : 0)}</span>
        </div>
      </div>
    {/if}

    <!-- Gráficos de Ventas Comparativos (SVG Reactivos) -->
    <div class="grid-graficos" transition:fade>
      <!-- Gráfico Anual (Barras) -->
      <div class="grafico-card">
        <h4>Ventas Comparativas por Año</h4>
        <div class="svg-container">
          {#if compras_por_anio.length > 0}
            <svg viewBox="0 0 400 200" width="100%" height="100%">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="380" y2="20" stroke="#334155" stroke-dasharray="4" />
              <line x1="40" y1="85" x2="380" y2="85" stroke="#334155" stroke-dasharray="4" />
              <line x1="40" y1="150" x2="380" y2="150" stroke="#334155" stroke-dasharray="4" />
              <line x1="40" y1="170" x2="380" y2="170" stroke="#475569" stroke-width="1.5" />

              {#each compras_por_anio as anioData, i}
                <!-- Barra -->
                <rect
                  x={60 + i * (300 / compras_por_anio.length)}
                  y={170 - (anioData.total / maxTotalAnual) * 130}
                  width="30"
                  height={(anioData.total / maxTotalAnual) * 130}
                  fill="url(#gradient-barras)"
                  rx="4"
                  class="barra-animada"
                  on:click={() => filtrar_por_anio_grafico(anioData.anio)}
                  on:mouseenter={(e) => mostrar_tooltip(e, anioData)}
                  on:mousemove={(e) => mover_tooltip(e)}
                  on:mouseleave={ocultar_tooltip}
                  style="cursor: pointer;"
                />
                <!-- Valor encima de la barra -->
                <text x={60 + i * (300 / compras_por_anio.length) + 15} y={160 - (anioData.total / maxTotalAnual) * 130} text-anchor="middle" fill="#94a3b8" font-size="9" on:click={() => filtrar_por_anio_grafico(anioData.anio)} on:mouseenter={(e) => mostrar_tooltip(e, anioData)} on:mousemove={(e) => mover_tooltip(e)} on:mouseleave={ocultar_tooltip} style="cursor: pointer;">
                  {formato_moneda(anioData.total).split(".")[0]}
                </text>
                <!-- Nombre del Año abajo -->
                <text x={60 + i * (300 / compras_por_anio.length) + 15} y={185} text-anchor="middle" fill="#cbd5e1" font-size="10" font-weight="bold" on:click={() => filtrar_por_anio_grafico(anioData.anio)} on:mouseenter={(e) => mostrar_tooltip(e, anioData)} on:mousemove={(e) => mover_tooltip(e)} on:mouseleave={ocultar_tooltip} style="cursor: pointer;">
                  {anioData.anio}
                </text>
              {/each}

              <defs>
                <linearGradient id="gradient-barras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#1d4ed8" />
                </linearGradient>
              </defs>
            </svg>
          {:else}
            <p class="sin-datos">No hay datos anuales disponibles</p>
          {/if}
        </div>
      </div>

      <!-- Gráfico Mensual (Línea) -->
      <div class="grafico-card">
        <h4>Tendencia Mensual Histórica</h4>
        <div class="svg-container">
          {#if compras_por_mes.length > 0}
            <svg viewBox="0 0 400 200" width="100%" height="100%">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="380" y2="20" stroke="#334155" stroke-dasharray="4" />
              <line x1="40" y1="85" x2="380" y2="85" stroke="#334155" stroke-dasharray="4" />
              <line x1="40" y1="150" x2="380" y2="150" stroke="#334155" stroke-dasharray="4" />
              <line x1="40" y1="170" x2="380" y2="170" stroke="#475569" stroke-width="1.5" />

              <!-- Línea de trazado -->
              <polyline
                fill="none"
                stroke="#10b981"
                stroke-width="3"
                points={puntosMensuales}
              />

              <!-- Puntos y etiquetas -->
              {#each compras_por_mes as mesData, i}
                <circle
                  cx={40 + i * (340 / (compras_por_mes.length - 1 || 1))}
                  cy={170 - (mesData.total / maxMesTotal) * 130}
                  r="5"
                  fill="#34d399"
                  class="punto-grafico"
                  on:mouseenter={(e) => mostrar_tooltip_mes(e, mesData)}
                  on:mousemove={(e) => mover_tooltip_mes(e)}
                  on:mouseleave={ocultar_tooltip_mes}
                  style={aplicar_rango_fechas ? "cursor: pointer;" : ""}
                />
                
                <!-- Mostrar etiqueta abreviada abajo solo si caben -->
                {#if compras_por_mes.length <= 12 || i % 2 === 0}
                  <text x={40 + i * (340 / (compras_por_mes.length - 1 || 1))} y={185} text-anchor="middle" fill="#94a3b8" font-size="8">
                    {mesData.mesAnio.split(" ")[0].slice(0, 3)}
                  </text>
                {/if}
              {/each}
            </svg>
          {:else}
            <p class="sin-datos">No hay datos mensuales suficientes</p>
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
              <th>Fecha de Compra</th>
              <th>Importe Total</th>
              <th>Moneda</th>
              <th>Atendido por / Registró</th>
            </tr>
          </thead>
          <tbody>
            {#if pedidos_paginados.length > 0}
              {#each pedidos_paginados as p}
                <tr on:dblclick={() => ver_detalle_pedido(p)} class="fila-compra" title="Doble clic para ver productos">
                  <td class="folio">#{p.folio}</td>
                  <td>{formato_fecha(p.fecha)}</td>
                  <td class="total">{formato_moneda(p.total_pedido)}</td>
                  <td>{p.metodo_pago}</td>
                  <td>{p.sucursal}</td>
                </tr>
              {/each}
            {:else}
              <tr>
                <td colspan="5" class="centrado">No se encontraron compras en el periodo seleccionado</td>
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
          <button disabled={pagina_tabla === total_paginas_tabla} on:click={() => pagina_tabla++}>
            <i class="material-icons">keyboard_arrow_right</i>
          </button>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Estado Inicial sin Cliente Seleccionado -->
    <div class="panel-inicial" transition:fade>
      <i class="material-icons icono-inicial">analytics</i>
      <h3>Por favor, selecciona un cliente</h3>
      <p>Usa la barra de búsqueda superior para ingresar el nombre de un cliente y analizar su comportamiento comercial.</p>
    </div>
  {/if}

  <!-- Modal de Detalle de Productos del Pedido -->
  {#if modal_detalle_abierto && pedido_seleccionado}
    <div class="modal-overlay" transition:fade on:click={() => modal_detalle_abierto = false}>
      <div class="modal-box" transition:slide on:click|stopPropagation>
        <div class="modal-header">
          <h3>Detalle del Pedido - Folio #{pedido_seleccionado.folio}</h3>
          <button class="btn-close-modal" on:click={() => modal_detalle_abierto = false}>
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-body">
          <div class="pedido-info-resumen">
            <p><strong>Fecha de Compra:</strong> {formato_fecha(pedido_seleccionado.fecha)}</p>
            <p><strong>Total Surtido:</strong> <span class="total-pedido-resumen">{formato_moneda(pedido_seleccionado.total_pedido)}</span></p>
            <p><strong>Atendido por / Registró:</strong> {pedido_seleccionado.sucursal}</p>
            <p><strong>Método / Divisa:</strong> {pedido_seleccionado.metodo_pago}</p>
          </div>

          <h4>Productos Adquiridos</h4>
          <div class="table-responsive modal-tabla-productos">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción del Producto</th>
                  <th class="derecha">Cant.</th>
                  <th class="derecha">P. Unitario</th>
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
                      <td class="derecha total-prod">{formato_moneda(item.cantidad * item.precio)}</td>
                    </tr>
                  {/each}
                {:else}
                  <tr>
                    <td colspan="5" class="centrado">No se encontraron productos registrados en este pedido</td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <Button raised color="primary" on:click={() => modal_detalle_abierto = false}>Aceptar</Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tooltip flotante para barras de años -->
  {#if tooltip_activo}
    <div class="tooltip-grafico" style="left: {tooltip_posicion.x}px; top: {tooltip_posicion.y}px;" transition:fade>
      <div class="tooltip-anio">{tooltip_contenido.anio}</div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Total vendido:</span>
        <span class="tooltip-val total">{formato_moneda(tooltip_contenido.total)}</span>
      </div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Pedidos hechos:</span>
        <span class="tooltip-val">{tooltip_contenido.compras} pedidos</span>
      </div>
    </div>
  {/if}

  <!-- Tooltip flotante para meses (activo solo al filtrar por año/fechas) -->
  {#if tooltip_mes_activo && aplicar_rango_fechas}
    <div class="tooltip-grafico" style="left: {tooltip_mes_posicion.x}px; top: {tooltip_mes_posicion.y}px;" transition:fade>
      <div class="tooltip-anio">{tooltip_mes_contenido.mesAnio}</div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Total vendido:</span>
        <span class="tooltip-val total-mes">{formato_moneda(tooltip_mes_contenido.total)}</span>
      </div>
      <div class="tooltip-item">
        <span class="tooltip-lbl">Pedidos hechos:</span>
        <span class="tooltip-val">{tooltip_mes_contenido.compras} pedidos</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .modulo-analisis {
    background-color: #0b1320;
    color: #e2e8f0;
    padding: 24px;
    border-radius: 12px;
    min-height: 80vh;
    font-family: 'Outfit', sans-serif;
  }

  .row-cabecera {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .titulo-modulo h2 {
    font-size: 1.8em;
    font-weight: 700;
    color: #f8fafc;
    margin: 0;
  }

  .titulo-modulo p {
    color: #64748b;
    margin: 4px 0 0 0;
    font-size: 0.95em;
  }

  .buscador-container {
    position: relative;
    width: 320px;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 8px 14px;
    gap: 10px;
    transition: all 0.3s ease;
  }

  .buscador-container:focus-within {
    background: rgba(255, 255, 255, 0.1);
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .icono-buscar {
    color: #64748b;
    font-size: 1.2em;
    display: flex;
    align-items: center;
  }

  .buscador-container input {
    background: transparent !important;
    border: none !important;
    outline: none !important;
    color: #f8fafc !important;
    font-size: 0.9em;
    width: 100%;
    padding: 0 !important;
    margin: 0 !important;
    font-family: inherit;
  }

  .buscador-container input::placeholder {
    color: #64748b;
    opacity: 1;
  }

  .btn-clear {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .btn-clear:hover {
    color: #cbd5e1;
  }

  .desplegable-clientes {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    z-index: 100;
    max-height: 240px;
    overflow-y: auto;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
  }

  .opcion-cliente {
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
  }

  .opcion-cliente:hover {
    background: #1e293b;
  }

  .opcion-cliente .nombre-c {
    font-weight: 600;
    color: #f8fafc;
    font-size: 0.95em;
  }

  .opcion-cliente .correo-c {
    font-size: 0.8em;
    color: #64748b;
  }

  .btn-clear {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    margin-left: 8px;
    padding: 4px;
  }

  .btn-clear:hover {
    color: #cbd5e1;
  }

  .pantalla-carga {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
  }

  .spinner {
    border: 4px solid rgba(255, 255, 255, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #3b82f6;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .pantalla-carga p {
    margin-top: 16px;
    color: #94a3b8;
  }

  /* Panel del Cliente y Ficha */
  .panel-cliente {
    background: #111b27;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .ficha-datos {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .avatar-cliente i {
    font-size: 3.5em;
    color: #3b82f6;
  }

  .info-texto h3 {
    margin: 0;
    font-size: 1.4em;
    font-weight: 700;
    color: #f8fafc;
  }

  .info-texto .alias {
    margin: 2px 0 8px 0;
    font-style: italic;
    color: #94a3b8;
    font-size: 0.9em;
  }

  .tags-perfil {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tag-perfil {
    background: #1e293b;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8em;
    color: #cbd5e1;
    font-weight: 600;
  }

  .tag-descuento {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.8em;
    color: #60a5fa;
    font-weight: 600;
  }

  /* Insignias de Estado Comercial */
  .insignia-estado {
    padding: 12px 24px;
    border-radius: 10px;
    text-align: right;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    min-width: 160px;
  }

  .etiqueta-estado {
    font-size: 1.15em;
    font-weight: 800;
  }

  .subtexto-estado {
    font-size: 0.75em;
    opacity: 0.8;
    margin-top: 2px;
  }

  /* Animaciones especiales para las insignias */
  .alto-valor {
    box-shadow: 0 0 15px rgba(234, 179, 8, 0.4);
    animation: pulso 2s infinite alternate;
  }
  .crecimiento {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
  }
  .riesgo {
    box-shadow: 0 0 15px rgba(249, 115, 22, 0.4);
    animation: pulso-alerta 1.5s infinite alternate;
  }

  @keyframes pulso {
    0% { transform: scale(1); }
    100% { transform: scale(1.03); }
  }

  @keyframes pulso-alerta {
    0% { opacity: 0.85; }
    100% { opacity: 1; }
  }

  /* Filtros de Periodo */
  .filtros-periodo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #111b27;
    border: 1px solid #1e293b;
    padding: 14px 20px;
    border-radius: 10px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .opcion-filtro-check label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  .fechas-inputs {
    display: flex;
    gap: 16px;
  }

  .fecha-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fecha-group input {
    background: #0f172a;
    border: 1px solid #334155;
    color: #e2e8f0;
    padding: 6px 10px;
    border-radius: 6px;
    font-family: inherit;
  }

  /* Grid de KPIs */
  .grid-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .kpi-card {
    background: #111b27;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
  }

  .kpi-titulo {
    font-size: 0.8em;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .kpi-valor {
    font-size: 1.6em;
    font-weight: 700;
    color: #f8fafc;
    margin: 8px 0;
  }

  .kpi-valor.total-dinero {
    color: #38bdf8;
  }

  .kpi-valor.fecha {
    font-size: 1.3em;
    padding-top: 4px;
  }

  .kpi-subtexto {
    font-size: 0.75em;
    color: #64748b;
  }

  /* Grid de Gráficos */
  .grid-graficos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 768px) {
    .grid-graficos {
      grid-template-columns: 1fr;
    }
  }

  .grafico-card {
    background: #111b27;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
  }

  .grafico-card h4 {
    margin: 0 0 16px 0;
    font-size: 1.1em;
    font-weight: 700;
    color: #f8fafc;
  }

  .svg-container {
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .barra-animada {
    transition: height 0.5s ease-out, y 0.5s ease-out;
  }

  .barra-animada:hover {
    fill: #60a5fa;
    cursor: pointer;
  }

  .sin-datos {
    color: #64748b;
    font-style: italic;
  }

  /* Tabla de Compras */
  .tabla-compras {
    background: #111b27;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px;
  }

  .tabla-compras h4 {
    margin: 0 0 16px 0;
    font-size: 1.1em;
    font-weight: 700;
    color: #f8fafc;
  }

  .table-responsive {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.95em;
  }

  th {
    border-bottom: 2px solid #1e293b;
    padding: 12px;
    color: #94a3b8;
    font-weight: 600;
  }

  td {
    border-bottom: 1px solid #1e293b;
    padding: 12px;
    color: #cbd5e1;
  }

  tr:hover td {
    background: #1e293b;
  }

  td.folio {
    font-weight: 700;
    color: #38bdf8;
  }

  td.total {
    font-weight: 700;
    color: #10b981;
  }

  .paginador-tabla {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
  }

  .paginador-tabla button {
    background: #1e293b;
    border: none;
    color: #f8fafc;
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .paginador-tabla button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Panel Inicial */
  .panel-inicial {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px 0;
    text-align: center;
    background: #111b27;
    border: 1px dashed #334155;
    border-radius: 12px;
  }

  .icono-inicial {
    font-size: 4.5em;
    color: #475569;
    margin-bottom: 16px;
  }

  .panel-inicial h3 {
    margin: 0;
    font-weight: 700;
    color: #cbd5e1;
  }

  .panel-inicial p {
    color: #64748b;
    max-width: 400px;
    margin-top: 8px;
    font-size: 0.9em;
  }

  /* Estilos para el doble clic de fila */
  tr.fila-compra {
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  tr.fila-compra:hover td {
    background-color: #1e293b !important;
  }

  /* Estilos para el Modal de Detalle de Productos */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-box {
    background: #0b1320;
    border: 1px solid #1e293b;
    border-radius: 12px;
    width: 100%;
    max-width: 650px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    max-height: 85vh;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #1e293b;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25em;
    font-weight: 700;
    color: #f8fafc;
  }

  .btn-close-modal {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }

  .btn-close-modal:hover {
    background-color: #1e293b;
    color: #cbd5e1;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
  }

  .pedido-info-resumen {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    background: #111b27;
    border: 1px solid #1e293b;
    padding: 14px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .pedido-info-resumen p {
    margin: 0;
    font-size: 0.9em;
    color: #94a3b8;
  }

  .pedido-info-resumen p strong {
    color: #cbd5e1;
  }

  .total-pedido-resumen {
    color: #10b981;
    font-weight: 700;
  }

  .modal-body h4 {
    margin: 0 0 10px 0;
    font-size: 1em;
    color: #f8fafc;
    font-weight: 600;
  }

  .modal-tabla-productos {
    max-height: 300px;
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow-y: auto;
  }

  .modal-tabla-productos table {
    width: 100%;
    font-size: 0.88em;
  }

  .modal-tabla-productos th {
    background: #111b27;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .modal-tabla-productos td {
    padding: 10px 12px;
  }

  .modal-tabla-productos td.codigo-prod {
    font-weight: 700;
    color: #38bdf8;
  }

  .modal-tabla-productos td.cantidad-prod {
    font-weight: 600;
    color: #e2e8f0;
  }

  .modal-tabla-productos td.total-prod {
    font-weight: 700;
    color: #10b981;
  }

  .derecha {
    text-align: right;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 14px 20px;
    border-top: 1px solid #1e293b;
    background: #111b27;
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  /* Estilos para el Tooltip Flotante de Barras */
  .tooltip-grafico {
    position: fixed;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 14px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.6);
    z-index: 2000;
    pointer-events: none;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 170px;
  }

  .tooltip-anio {
    font-weight: 700;
    font-size: 0.95em;
    color: #f8fafc;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 4px;
    margin-bottom: 4px;
  }

  .tooltip-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82em;
    gap: 12px;
  }

  .tooltip-lbl {
    color: #64748b;
  }

  .tooltip-val {
    color: #cbd5e1;
    font-weight: 600;
  }

  .tooltip-val.total {
    color: #38bdf8;
    font-weight: 700;
  }

  .tooltip-val.total-mes {
    color: #10b981;
    font-weight: 700;
  }
</style>
