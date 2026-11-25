<script>
  import { onMount } from "svelte";
  import { postData, mensaje_error, mensaje_bueno } from "../../stores";
  import { goto } from "@sapper/app";

  let filtroCategoria = "todos"; // 'todos' | 'inventario' | 'ventas'

  // --- Estado del Modal de Reporte de Inventario ---
  let showModalInventario = false;
  let loadingPreview = false;
  let descargandoExcel = false;
  let descargandoPdf = false;

  // Parámetros de consulta
  let fechaInicio = "";
  let fechaFin = "";
  let incluirInactivos = false;
  let buscarFiltro = "";

  // Datos devueltos para el preview
  let kpis = {
    total_productos: 0,
    total_entradas: 0,
    total_salidas: 0,
    total_existencias: 0,
    total_valor_inventario: 0
  };
  let muestra = [];

  // --- Estado del Modal de Reporte de Pedimentos SAT ---
  let showModalPedimentos = false;
  let loadingPreviewPedimentos = false;
  let descargandoExcelPedimentos = false;
  let descargandoPdfPedimentos = false;

  let fechaInicioPed = "";
  let fechaFinPed = "";
  let estatusPed = "todos"; // 'todos' | 'arribado' | 'transito'
  let buscarPed = "";

  let kpisPed = {
    total_pedimentos: 0,
    total_partidas: 0,
    total_piezas: 0,
    total_valor_comercial_usd: 0,
    total_valor_aduana_mxn: 0,
    total_impuestos_deducibles: 0,
    total_gastos_indirectos_netos: 0,
    total_devoluciones: 0,
    total_costo_fiscal: 0
  };
  let muestraPed = [];

  onMount(() => {
    establecerRangoEsteMes();
  });

  // --- Funciones de Rango de Fechas ---
  function establecerHoy() {
    const hoy = new Date();
    const str = hoy.toISOString().slice(0, 10);
    fechaInicio = str;
    fechaFin = str;
    cargarPreview();
  }

  function establecerUltimos7Dias() {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    fechaInicio = inicio.toISOString().slice(0, 10);
    fechaFin = fin.toISOString().slice(0, 10);
    cargarPreview();
  }

  function establecerRangoEsteMes() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    fechaInicio = inicio.toISOString().slice(0, 10);
    fechaFin = ahora.toISOString().slice(0, 10);
  }

  function establecerMesAnterior() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    fechaInicio = inicio.toISOString().slice(0, 10);
    fechaFin = fin.toISOString().slice(0, 10);
    cargarPreview();
  }

  function establecerAnoEnCurso() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), 0, 1);
    fechaInicio = inicio.toISOString().slice(0, 10);
    fechaFin = ahora.toISOString().slice(0, 10);
    cargarPreview();
  }

  function abrirModalInventario() {
    showModalInventario = true;
    if (!fechaInicio || !fechaFin) {
      establecerRangoEsteMes();
    }
    cargarPreview();
  }

  function cerrarModalInventario() {
    showModalInventario = false;
  }

  async function cargarPreview() {
    loadingPreview = true;
    try {
      const res = await postData("app/reportes/inventario/preview", {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        incluir_inactivos: incluirInactivos,
        buscar: buscarFiltro
      });

      if (res && res.ok) {
        kpis = res.kpis || kpis;
        muestra = res.muestra || [];
      } else {
        mensaje_error((res && res.mensaje) ? res.mensaje : "Error al consultar la muestra del reporte.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de conexión al cargar la vista previa.");
    } finally {
      loadingPreview = false;
    }
  }

  // --- Funciones de Descarga ---
  async function descargarArchivo(tipo) {
    if (tipo === "excel") descargandoExcel = true;
    if (tipo === "pdf") descargandoPdf = true;

    try {
      const endpoint = tipo === "excel" 
        ? "/app/reportes/inventario/excel" 
        : "/app/reportes/inventario/pdf";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          incluir_inactivos: incluirInactivos,
          buscar: buscarFiltro
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Respuesta no satisfactoria del servidor");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = tipo === "excel" ? "xlsx" : "pdf";
      a.download = `Reporte_Inventario_${fechaInicio}_al_${fechaFin}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      mensaje_bueno(`Reporte ${tipo.toUpperCase()} descargado con éxito.`);
    } catch (err) {
      console.error(err);
      mensaje_error(`No se pudo descargar el reporte en formato ${tipo.toUpperCase()}.`);
    } finally {
      if (tipo === "excel") descargandoExcel = false;
      if (tipo === "pdf") descargandoPdf = false;
    }
  }

  // --- Funciones del Modal de Pedimentos SAT ---
  function abrirModalPedimentos() {
    showModalPedimentos = true;
    if (!fechaInicioPed || !fechaFinPed) {
      establecerRangoAnoEnCursoPed();
    } else {
      cargarPreviewPedimentos();
    }
  }

  function cerrarModalPedimentos() {
    showModalPedimentos = false;
  }

  function establecerHoyPed() {
    const hoy = new Date();
    fechaInicioPed = hoy.toISOString().slice(0, 10);
    fechaFinPed = hoy.toISOString().slice(0, 10);
    cargarPreviewPedimentos();
  }

  function establecerUltimos7DiasPed() {
    const fin = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    fechaInicioPed = inicio.toISOString().slice(0, 10);
    fechaFinPed = fin.toISOString().slice(0, 10);
    cargarPreviewPedimentos();
  }

  function establecerRangoEsteMesPed() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    fechaInicioPed = inicio.toISOString().slice(0, 10);
    fechaFinPed = ahora.toISOString().slice(0, 10);
    cargarPreviewPedimentos();
  }

  function establecerMesAnteriorPed() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    fechaInicioPed = inicio.toISOString().slice(0, 10);
    fechaFinPed = fin.toISOString().slice(0, 10);
    cargarPreviewPedimentos();
  }

  function establecerRangoAnoEnCursoPed() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), 0, 1);
    fechaInicioPed = inicio.toISOString().slice(0, 10);
    fechaFinPed = ahora.toISOString().slice(0, 10);
    cargarPreviewPedimentos();
  }

  async function cargarPreviewPedimentos() {
    loadingPreviewPedimentos = true;
    try {
      const res = await postData("app/reportes/pedimentos/preview", {
        fecha_inicio: fechaInicioPed,
        fecha_fin: fechaFinPed,
        estatus: estatusPed,
        buscar: buscarPed
      });

      if (res && res.ok) {
        kpisPed = res.kpis || kpisPed;
        muestraPed = res.muestra || [];
      } else {
        mensaje_error((res && res.mensaje) ? res.mensaje : "Error al consultar la muestra de pedimentos.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de conexión al cargar la vista previa de pedimentos.");
    } finally {
      loadingPreviewPedimentos = false;
    }
  }

  async function descargarArchivoPedimentos(tipo) {
    if (tipo === "excel") descargandoExcelPedimentos = true;
    if (tipo === "pdf") descargandoPdfPedimentos = true;

    try {
      const endpoint = tipo === "excel" 
        ? "/app/reportes/pedimentos/excel" 
        : "/app/reportes/pedimentos/pdf";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fecha_inicio: fechaInicioPed,
          fecha_fin: fechaFinPed,
          estatus: estatusPed,
          buscar: buscarPed
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Respuesta no satisfactoria del servidor");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = tipo === "excel" ? "xlsx" : "pdf";
      a.download = `Reporte_Costeo_Pedimentos_SAT_${fechaInicioPed}_al_${fechaFinPed}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      mensaje_bueno(`Reporte de Pedimentos ${tipo.toUpperCase()} descargado con éxito.`);
    } catch (err) {
      console.error(err);
      mensaje_error(`No se pudo descargar el reporte de pedimentos en formato ${tipo.toUpperCase()}.`);
    } finally {
      if (tipo === "excel") descargandoExcelPedimentos = false;
      if (tipo === "pdf") descargandoPdfPedimentos = false;
    }
  }

  function formatMoney(num) {
    return Number(num || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function formatNum(num) {
    return Number(num || 0).toLocaleString("es-MX");
  }
</script>

<svelte:head>
  <title>Centro de Reportes - Xenon ERP</title>
</svelte:head>

<div class="reportes-container">
  <!-- Encabezado de la Sección -->
  <div class="reportes-header">
    <div class="d-flex align-items-center gap-3">
      <div class="header-icon-box">
        <i class="material-icons">assessment</i>
      </div>
      <div>
        <h2 class="m-0 font-bold text-dark">Centro de Reportes y Exportaciones</h2>
        <p class="text-secondary m-0 text-small">
          Genera y descarga informes oficiales de almacén, movimientos, utilidades y trazabilidad en Excel o PDF.
        </p>
      </div>
    </div>

    <!-- Pestañas de filtrado de Cards -->
    <div class="filtro-pills">
      <button 
        class="pill-btn {filtroCategoria === 'todos' ? 'activo' : ''}" 
        on:click={() => (filtroCategoria = 'todos')}
      >
        Todos
      </button>
      <button 
        class="pill-btn {filtroCategoria === 'inventario' ? 'activo' : ''}" 
        on:click={() => (filtroCategoria = 'inventario')}
      >
        Inventario & Almacén
      </button>
      <button 
        class="pill-btn {filtroCategoria === 'ventas' ? 'activo' : ''}" 
        on:click={() => (filtroCategoria = 'ventas')}
      >
        Ventas & Finanzas
      </button>
    </div>
  </div>

  <!-- Cuadrícula de Cards de Reportes -->
  <div class="cards-grid">
    <!-- Card 1: Inventario (Entradas, Salidas y Existencias) -->
    {#if filtroCategoria === 'todos' || filtroCategoria === 'inventario'}
      <div class="reporte-card destacado">
        <div class="card-top">
          <div class="card-icon-circle green">
            <i class="material-icons">inventory_2</i>
          </div>
          <span class="badge-tag green">Almacén & Existencias</span>
        </div>
        
        <h4 class="card-title">Kardex y Movimientos de Inventario</h4>
        <p class="card-desc">
          Entradas (inyecciones), salidas (descuentos de pedidos) y existencias actuales por producto en un rango de fechas. Incluye precio de venta y valorización.
        </p>

        <div class="card-formats">
          <span class="format-badge xlsx"><i class="material-icons inline-icon">table_view</i> Excel (.xlsx)</span>
          <span class="format-badge pdf"><i class="material-icons inline-icon">picture_as_pdf</i> PDF (.pdf)</span>
        </div>

        <div class="card-footer-action">
          <button class="btn btn-primary-custom w-100" on:click={abrirModalInventario}>
            <i class="material-icons me-1">tune</i> Configurar y Exportar
          </button>
        </div>
      </div>
    {/if}

    <!-- Card 2: Utilidades y Rentabilidad -->
    {#if filtroCategoria === 'todos' || filtroCategoria === 'ventas'}
      <div class="reporte-card">
        <div class="card-top">
          <div class="card-icon-circle blue">
            <i class="material-icons">trending_up</i>
          </div>
          <span class="badge-tag blue">Finanzas & Margen</span>
        </div>
        
        <h4 class="card-title">Utilidades y Rentabilidad por Pedimento</h4>
        <p class="card-desc">
          Análisis de margen bruto comercial comparando el precio de venta real contra los costos fiscales unitarios prorrateados del pedimento.
        </p>

        <div class="card-formats">
          <span class="format-badge web"><i class="material-icons inline-icon">dashboard</i> Interactivo en Pantalla</span>
        </div>

        <div class="card-footer-action">
          <button class="btn btn-outline-primary w-100" on:click={() => goto("/app/reportes/utilidades")}>
            <i class="material-icons me-1">launch</i> Abrir Reporte
          </button>
        </div>
      </div>
    {/if}

    <!-- Card 3: Pedimentos y Costeo Fiscal -->
    {#if filtroCategoria === 'todos' || filtroCategoria === 'inventario'}
      <div class="reporte-card">
        <div class="card-top">
          <div class="card-icon-circle purple">
            <i class="material-icons">sailing</i>
          </div>
          <span class="badge-tag purple">Comercio Exterior</span>
        </div>
        
        <h4 class="card-title">Historial y Costeo de Pedimentos SAT</h4>
        <p class="card-desc">
          Reporte fiscal consolidado de pedimentos arribados, desglose de impuestos aduanales (DTA, PRV, IGI) y valuación de inventario PEPS.
        </p>

        <div class="card-formats">
          <span class="format-badge xlsx"><i class="material-icons inline-icon">table_view</i> Excel (.xlsx)</span>
          <span class="format-badge pdf"><i class="material-icons inline-icon">picture_as_pdf</i> PDF (.pdf)</span>
        </div>

        <div class="card-footer-action">
          <button class="btn btn-primary-custom w-100" on:click={abrirModalPedimentos}>
            <i class="material-icons me-1">tune</i> Configurar y Exportar
          </button>
        </div>
      </div>
    {/if}

    <!-- Card 4: Ventas por Agente / Cliente (Próximamente) -->
    {#if filtroCategoria === 'todos' || filtroCategoria === 'ventas'}
      <div class="reporte-card disabled">
        <div class="card-top">
          <div class="card-icon-circle amber">
            <i class="material-icons">people</i>
          </div>
          <span class="badge-tag amber">Comercial</span>
        </div>
        
        <h4 class="card-title">Ventas y Comisiones por Agente</h4>
        <p class="card-desc">
          Desempeño del equipo de ventas, pedidos entregados, cobrados y cálculo de comisiones por período.
        </p>

        <div class="card-formats">
          <span class="format-badge muted">Próximamente</span>
        </div>

        <div class="card-footer-action">
          <button class="btn btn-secondary w-100" disabled>
            En preparación
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- ========================================================= -->
<!-- MODAL DE CONFIGURACIÓN Y PREVIEW: REPORTE DE INVENTARIO   -->
<!-- ========================================================= -->
{#if showModalInventario}
  <div class="modal-backdrop-custom" on:click={cerrarModalInventario}>
    <div class="modal-card-custom" on:click|stopPropagation>
      
      <!-- Modal Header -->
      <div class="modal-header-custom">
        <div class="d-flex align-items-center gap-2">
          <div class="modal-header-icon green">
            <i class="material-icons">inventory_2</i>
          </div>
          <div>
            <h3 class="m-0 font-bold text-dark">Reporte de Entradas, Salidas y Existencias</h3>
            <span class="text-secondary text-small">Kardex de almacén basado en snaplogs de auditoría</span>
          </div>
        </div>
        <button class="btn-close-custom" on:click={cerrarModalInventario} aria-label="Cerrar modal">&times;</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body-custom">
        
        <!-- SECCIÓN 1: PARÁMETROS -->
        <div class="filtro-panel">
          <div class="filtro-grid-fila">
            <div class="filtro-col">
              <label class="form-label font-bold text-small">Fecha Inicio:</label>
              <input 
                type="date" 
                class="form-control form-control-sm input-fecha" 
                bind:value={fechaInicio} 
                on:change={cargarPreview}
              />
            </div>
            <div class="filtro-col">
              <label class="form-label font-bold text-small">Fecha Fin:</label>
              <input 
                type="date" 
                class="form-control form-control-sm input-fecha" 
                bind:value={fechaFin} 
                on:change={cargarPreview}
              />
            </div>
            <div class="filtro-col flex-grow">
              <label class="form-label font-bold text-small">Buscar Producto (Opcional):</label>
              <div class="input-buscar-wrapper">
                <i class="material-icons text-muted search-icon">search</i>
                <input 
                  type="text" 
                  class="form-control form-control-sm input-con-icono" 
                  placeholder="Filtrar por SKU o descripción..." 
                  bind:value={buscarFiltro}
                  on:keydown={(e) => e.key === 'Enter' && cargarPreview()}
                />
                {#if buscarFiltro}
                  <button class="btn-clear-search" on:click={() => { buscarFiltro = ""; cargarPreview(); }}>&times;</button>
                {/if}
              </div>
            </div>
            <div class="filtro-col col-boton">
              <button class="btn btn-primary-custom w-100 btn-actualizar" on:click={cargarPreview} disabled={loadingPreview}>
                {#if loadingPreview}
                  <span class="spinner-border spinner-border-sm me-1"></span>
                {:else}
                  <i class="material-icons text-small me-1">refresh</i>
                {/if}
                Actualizar
              </button>
            </div>
          </div>

          <!-- Accesos rápidos y Checkbox de Inactivos -->
          <div class="filtro-sub-barra">
            <div class="quick-dates-group">
              <span class="text-muted text-small fw-bold">Rango rápido:</span>
              <button class="btn-quick-date" on:click={establecerHoy}>Hoy</button>
              <button class="btn-quick-date" on:click={establecerUltimos7Dias}>7 días</button>
              <button class="btn-quick-date" on:click={establecerRangoEsteMes}>Este Mes</button>
              <button class="btn-quick-date" on:click={establecerMesAnterior}>Mes Anterior</button>
              <button class="btn-quick-date" on:click={establecerAnoEnCurso}>Año en Curso</button>
            </div>

            <!-- Toggle de Productos Inactivos -->
            <label class="checkbox-inactivos-wrapper">
              <input 
                type="checkbox" 
                class="form-check-input-custom" 
                bind:checked={incluirInactivos} 
                on:change={cargarPreview}
              />
              <span class="text-small font-bold text-dark">
                Incluir productos desactivados (inactivos)
              </span>
            </label>
          </div>
        </div>

        <!-- SECCIÓN 2: CARDS KPI RESUMEN -->
        <div class="kpi-grid mb-3">
          <div class="kpi-card">
            <span class="kpi-label">Total Productos</span>
            <span class="kpi-val text-dark">{formatNum(kpis.total_productos)} SKU</span>
            <span class="kpi-sub">en el catálogo filtrado</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Piezas Ingresadas (Entradas)</span>
            <span class="kpi-val text-success">+{formatNum(kpis.total_entradas)}</span>
            <span class="kpi-sub">inyecciones de almacén</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Piezas Salidas (Descuentos)</span>
            <span class="kpi-val text-danger">-{formatNum(kpis.total_salidas)}</span>
            <span class="kpi-sub">descuentos por pedidos</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Existencia Actual Total</span>
            <span class="kpi-val text-primary">{formatNum(kpis.total_existencias)}</span>
            <span class="kpi-sub">piezas vivas en inventario</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Valor Total en Inventario</span>
            <span class="kpi-val text-amber">{formatMoney(kpis.total_valor_inventario)}</span>
            <span class="kpi-sub">a precio de venta</span>
          </div>
        </div>

        <!-- SECCIÓN 3: TABLA DE MUESTRA (5 REGISTROS) -->
        <div class="preview-box">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong class="text-dark">Vista previa de datos (5 registros muestra):</strong>
              <span class="text-muted text-small ms-1">Verifica las columnas antes de exportar el listado completo.</span>
            </div>
            <span class="badge bg-light text-dark border">
              Total a exportar: <strong>{formatNum(kpis.total_productos)}</strong> registros
            </span>
          </div>

          {#if loadingPreview}
            <div class="text-center p-4 text-muted">
              <div class="spinner-border text-primary mb-2" role="status"></div>
              <div>Consultando movimientos en snaplogs de auditoría...</div>
            </div>
          {:else if muestra.length === 0}
            <div class="text-center p-4 text-muted bg-light rounded border">
              No se encontraron productos con los criterios seleccionados.
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle m-0 preview-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 40px;">#</th>
                    <th style="width: 130px;">Código / SKU</th>
                    <th>Producto</th>
                    <th class="text-center" style="width: 90px;">Estado</th>
                    <th class="text-end" style="width: 100px;">Entradas (+)</th>
                    <th class="text-end" style="width: 100px;">Salidas (-)</th>
                    <th class="text-end" style="width: 110px;">Existencia</th>
                    <th class="text-end" style="width: 110px;">P. Venta</th>
                    <th class="text-end" style="width: 125px;">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {#each muestra as item}
                    <tr class={!item.activo ? 'fila-inactiva' : ''}>
                      <td class="text-center font-mono text-muted">{item.indice}</td>
                      <td class="font-mono font-bold text-dark">{item.codigo}</td>
                      <td>
                        <div class="font-bold">{item.nombre}</div>
                        <div class="text-muted text-small">{item.categoria}</div>
                      </td>
                      <td class="text-center">
                        {#if item.activo}
                          <span class="badge-status-activo">Activo</span>
                        {:else}
                          <span class="badge-status-inactivo">🚫 Inactivo</span>
                        {/if}
                      </td>
                      <td class="text-end font-mono">
                        {#if item.entradas > 0}
                          <strong class="text-success">+{formatNum(item.entradas)}</strong>
                        {:else}
                          <span class="text-muted">0</span>
                        {/if}
                      </td>
                      <td class="text-end font-mono">
                        {#if item.salidas > 0}
                          <strong class="text-danger">-{formatNum(item.salidas)}</strong>
                        {:else}
                          <span class="text-muted">0</span>
                        {/if}
                      </td>
                      <td class="text-end font-mono font-bold text-primary">
                        {formatNum(item.existencia)} {item.unidad}
                      </td>
                      <td class="text-end font-mono">
                        {formatMoney(item.precio)}
                      </td>
                      <td class="text-end font-mono font-bold text-dark">
                        {formatMoney(item.valorTotal)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <div class="mt-2 text-muted text-small d-flex justify-content-between align-items-center">
              <span>* Mostrando únicamente 5 productos de muestra para verificación visual rápida.</span>
              <span class="text-success font-bold">✓ El archivo descargado contendrá todos los {formatNum(kpis.total_productos)} productos.</span>
            </div>
          {/if}
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer-custom">
        <button class="btn btn-secondary-custom btn-cancelar-modal" on:click={cerrarModalInventario}>
          <i class="material-icons text-small me-1">close</i> Cancelar
        </button>

        <div class="acciones-descarga-grupo">
          <!-- Botón Excel -->
          <button 
            class="btn btn-export excel" 
            on:click={() => descargarArchivo("excel")}
            disabled={descargandoExcel || loadingPreview || kpis.total_productos === 0}
            title="Descargar listado completo en hoja de cálculo Excel"
          >
            {#if descargandoExcel}
              <span class="spinner-border spinner-border-sm me-1"></span>
              Generando Excel...
            {:else}
              <i class="material-icons me-1">table_view</i>
              Descargar Excel (.xlsx)
            {/if}
          </button>

          <!-- Botón PDF -->
          <button 
            class="btn btn-export pdf" 
            on:click={() => descargarArchivo("pdf")}
            disabled={descargandoPdf || loadingPreview || kpis.total_productos === 0}
            title="Descargar listado completo en documento PDF membretado"
          >
            {#if descargandoPdf}
              <span class="spinner-border spinner-border-sm me-1"></span>
              Generando PDF...
            {:else}
              <i class="material-icons me-1">picture_as_pdf</i>
              Descargar PDF (.pdf)
            {/if}
          </button>
        </div>
      </div>

    </div>
  </div>
{/if}

<!-- ========================================================= -->
<!-- MODAL DE CONFIGURACIÓN Y PREVIEW: PEDIMENTOS SAT          -->
<!-- ========================================================= -->
{#if showModalPedimentos}
  <div class="modal-backdrop-custom" on:click={cerrarModalPedimentos}>
    <div class="modal-card-custom" on:click|stopPropagation>
      
      <!-- Modal Header -->
      <div class="modal-header-custom">
        <div class="d-flex align-items-center gap-2">
          <div class="modal-header-icon purple">
            <i class="material-icons">sailing</i>
          </div>
          <div>
            <h3 class="m-0 font-bold text-dark">Historial y Costeo de Pedimentos SAT</h3>
            <span class="text-secondary text-small">Auditoría fiscal consolidada de cargamentos arribados, prorrateo y desglose de gastos</span>
          </div>
        </div>
        <button class="btn-close-custom" on:click={cerrarModalPedimentos} aria-label="Cerrar modal">&times;</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body-custom">
        
        <!-- SECCIÓN 1: PARÁMETROS -->
        <div class="filtro-panel">
          <div class="filtro-grid-fila">
            <div class="filtro-col">
              <label class="form-label font-bold text-small">Fecha Inicio:</label>
              <input 
                type="date" 
                class="form-control form-control-sm input-fecha" 
                bind:value={fechaInicioPed} 
                on:change={cargarPreviewPedimentos}
              />
            </div>
            <div class="filtro-col">
              <label class="form-label font-bold text-small">Fecha Fin:</label>
              <input 
                type="date" 
                class="form-control form-control-sm input-fecha" 
                bind:value={fechaFinPed} 
                on:change={cargarPreviewPedimentos}
              />
            </div>
            <div class="filtro-col" style="width: 140px;">
              <label class="form-label font-bold text-small">Estatus:</label>
              <select 
                class="form-control form-control-sm input-fecha" 
                bind:value={estatusPed} 
                on:change={cargarPreviewPedimentos}
              >
                <option value="todos">Todos</option>
                <option value="arribado">Arribados</option>
                <option value="transito">En Tránsito</option>
              </select>
            </div>
            <div class="filtro-col flex-grow">
              <label class="form-label font-bold text-small">Buscar Pedimento (Opcional):</label>
              <div class="input-buscar-wrapper">
                <i class="material-icons text-muted search-icon">search</i>
                <input 
                  type="text" 
                  class="form-control form-control-sm input-con-icono" 
                  placeholder="No. Pedimento, Proveedor, COVE o Patente..." 
                  bind:value={buscarPed}
                  on:keydown={(e) => e.key === 'Enter' && cargarPreviewPedimentos()}
                />
                {#if buscarPed}
                  <button class="btn-clear-search" on:click={() => { buscarPed = ""; cargarPreviewPedimentos(); }}>&times;</button>
                {/if}
              </div>
            </div>
            <div class="filtro-col col-boton">
              <button class="btn btn-primary-custom w-100 btn-actualizar" on:click={cargarPreviewPedimentos} disabled={loadingPreviewPedimentos}>
                {#if loadingPreviewPedimentos}
                  <span class="spinner-border spinner-border-sm me-1"></span>
                {:else}
                  <i class="material-icons text-small me-1">refresh</i>
                {/if}
                Actualizar
              </button>
            </div>
          </div>

          <!-- Accesos rápidos de fecha -->
          <div class="filtro-sub-barra">
            <div class="quick-dates-group">
              <span class="text-muted text-small fw-bold">Rango rápido:</span>
              <button class="btn-quick-date" on:click={establecerHoyPed}>Hoy</button>
              <button class="btn-quick-date" on:click={establecerUltimos7DiasPed}>7 días</button>
              <button class="btn-quick-date" on:click={establecerRangoEsteMesPed}>Este Mes</button>
              <button class="btn-quick-date" on:click={establecerMesAnteriorPed}>Mes Anterior</button>
              <button class="btn-quick-date" on:click={establecerRangoAnoEnCursoPed}>Año en Curso</button>
            </div>
            <span class="text-muted text-small">
              Valuación fiscal obligatoria: <strong>PEPS (Art. 41 LISR)</strong>
            </span>
          </div>
        </div>

        <!-- SECCIÓN 2: CARDS KPI RESUMEN -->
        <div class="kpi-grid mb-3">
          <div class="kpi-card">
            <span class="kpi-label">Total Pedimentos</span>
            <span class="kpi-val text-dark">{formatNum(kpisPed.total_pedimentos)} Ped</span>
            <span class="kpi-sub">en el período filtrado</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Piezas Importadas</span>
            <span class="kpi-val text-primary">{formatNum(kpisPed.total_piezas)} pza</span>
            <span class="kpi-sub">{formatNum(kpisPed.total_partidas)} partidas totales</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Valor Aduana (MXN)</span>
            <span class="kpi-val text-dark">{formatMoney(kpisPed.total_valor_aduana_mxn)}</span>
            <span class="kpi-sub">comercial: {formatMoney(kpisPed.total_valor_comercial_usd)} USD</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Gastos Indirectos Netos</span>
            <span class="kpi-val text-amber">{formatMoney(kpisPed.total_gastos_indirectos_netos)}</span>
            <span class="kpi-sub">inc. fletes, seguros y agente</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Costo Fiscal Consolidado</span>
            <span class="kpi-val text-success">{formatMoney(kpisPed.total_costo_fiscal)}</span>
            <span class="kpi-sub">aduana + indirectos netos</span>
          </div>
        </div>

        <!-- SECCIÓN 3: TABLA DE MUESTRA (5 REGISTROS) -->
        <div class="preview-box">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <strong class="text-dark">Vista previa de datos (5 pedimentos muestra):</strong>
              <span class="text-muted text-small ms-1">Verifica la información general antes de exportar el listado completo.</span>
            </div>
            <span class="badge bg-light text-dark border">
              Total a exportar: <strong>{formatNum(kpisPed.total_pedimentos)}</strong> pedimento(s)
            </span>
          </div>

          {#if loadingPreviewPedimentos}
            <div class="text-center p-4 text-muted">
              <div class="spinner-border text-primary mb-2" role="status"></div>
              <div>Consultando historial de pedimentos e indirectos...</div>
            </div>
          {:else if muestraPed.length === 0}
            <div class="text-center p-4 text-muted bg-light rounded border">
              No se encontraron pedimentos con los criterios de búsqueda seleccionados.
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-sm table-bordered align-middle m-0 preview-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 35px;">#</th>
                    <th style="width: 170px;">No. Pedimento</th>
                    <th class="text-center" style="width: 50px;">Clave</th>
                    <th class="text-center" style="width: 90px;">Fecha</th>
                    <th>Proveedor</th>
                    <th class="text-end" style="width: 90px;">T.C.</th>
                    <th class="text-end" style="width: 120px;">Valor Aduana</th>
                    <th class="text-end" style="width: 125px;">Gastos Indirectos</th>
                    <th class="text-end" style="width: 130px;">Costo Fiscal Total</th>
                    <th class="text-center" style="width: 90px;">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {#each muestraPed as item}
                    <tr>
                      <td class="text-center font-mono text-muted">{item.indice}</td>
                      <td class="font-mono font-bold text-dark">{item.numero_pedimento}</td>
                      <td class="text-center"><span class="badge-tag blue">{item.clave_pedimento}</span></td>
                      <td class="text-center font-mono text-small">
                        {item.fecha_pedimento ? new Date(item.fecha_pedimento).toLocaleDateString('es-MX') : 'N/A'}
                      </td>
                      <td>
                        <div class="font-bold">{item.proveedor_nombre}</div>
                        <div class="text-muted text-small">{item.total_partidas} partida(s) | {formatNum(item.total_piezas)} piezas</div>
                      </td>
                      <td class="text-end font-mono font-bold">{item.tipo_cambio.toFixed(4)}</td>
                      <td class="text-end font-mono">{formatMoney(item.valor_aduana_mxn)}</td>
                      <td class="text-end font-mono text-amber font-bold">{formatMoney(item.total_indirectos_netos)}</td>
                      <td class="text-end font-mono text-success font-bold">{formatMoney(item.costo_fiscal_total)}</td>
                      <td class="text-center">
                        {#if item.status === 'arribado'}
                          <span class="badge-status-activo">Arribado</span>
                        {:else}
                          <span class="badge-status-inactivo">En Tránsito</span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <div class="mt-2 text-muted text-small d-flex justify-content-between align-items-center">
              <span>* Mostrando los 5 pedimentos más recientes para verificación rápida.</span>
              <span class="text-success font-bold">✓ El reporte descargado incluirá todas las partidas, facturas y devoluciones registradas.</span>
            </div>
          {/if}
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="modal-footer-custom">
        <button class="btn btn-secondary-custom btn-cancelar-modal" on:click={cerrarModalPedimentos}>
          <i class="material-icons text-small me-1">close</i> Cancelar
        </button>

        <div class="acciones-descarga-grupo">
          <!-- Botón Excel -->
          <button 
            class="btn btn-export excel" 
            on:click={() => descargarArchivoPedimentos("excel")}
            disabled={descargandoExcelPedimentos || loadingPreviewPedimentos || kpisPed.total_pedimentos === 0}
            title="Descargar libro Excel multi-pestaña con pedimentos, partidas y bitácora de gastos"
          >
            {#if descargandoExcelPedimentos}
              <span class="spinner-border spinner-border-sm me-1"></span>
              Generando Excel...
            {:else}
              <i class="material-icons me-1">table_view</i>
              Descargar Excel (.xlsx)
            {/if}
          </button>

          <!-- Botón PDF -->
          <button 
            class="btn btn-export pdf" 
            on:click={() => descargarArchivoPedimentos("pdf")}
            disabled={descargandoPdfPedimentos || loadingPreviewPedimentos || kpisPed.total_pedimentos === 0}
            title="Descargar cédula fiscal completa de pedimentos en formato PDF membretado"
          >
            {#if descargandoPdfPedimentos}
              <span class="spinner-border spinner-border-sm me-1"></span>
              Generando PDF...
            {:else}
              <i class="material-icons me-1">picture_as_pdf</i>
              Descargar PDF (.pdf)
            {/if}
          </button>
        </div>
      </div>

    </div>
  </div>
{/if}

<style>
  .reportes-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  .reportes-header {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .header-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-icon-box i {
    font-size: 28px;
  }

  .filtro-pills {
    display: flex;
    gap: 8px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 8px;
  }
  .pill-btn {
    border: none;
    background: transparent;
    padding: 6px 14px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pill-btn:hover {
    color: #1e293b;
  }
  .pill-btn.activo {
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  /* Grid de Cards de Reportes */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .reporte-card {
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .reporte-card:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  }
  .reporte-card.destacado {
    border: 2px solid #10b981;
  }
  .reporte-card.disabled {
    opacity: 0.65;
    background: #f8fafc;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .card-icon-circle {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-icon-circle i {
    font-size: 24px;
  }
  .card-icon-circle.green { background: #ecfdf5; color: #059669; }
  .card-icon-circle.blue { background: #eff6ff; color: #2563eb; }
  .card-icon-circle.purple { background: #f5f3ff; color: #7c3aed; }
  .card-icon-circle.amber { background: #fffbeb; color: #d97706; }

  .badge-tag {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .badge-tag.green { background: #d1fae5; color: #065f46; }
  .badge-tag.blue { background: #dbeafe; color: #1e40af; }
  .badge-tag.purple { background: #ede9fe; color: #5b21b6; }
  .badge-tag.amber { background: #fef3c7; color: #92400e; }

  .card-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
  }
  .card-desc {
    font-size: 0.86rem;
    color: #64748b;
    line-height: 1.45;
    margin-bottom: 16px;
    flex-grow: 1;
  }

  .card-formats {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .format-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .format-badge.xlsx { background: #e0f2fe; color: #0369a1; }
  .format-badge.pdf { background: #fee2e2; color: #b91c1c; }
  .format-badge.web { background: #f3f4f6; color: #374151; }
  .format-badge.muted { background: #e2e8f0; color: #64748b; }

  .btn-primary-custom {
    background: #0284c7;
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary-custom:hover:not(:disabled) {
    background: #0369a1;
  }
  .btn-secondary-custom {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #cbd5e1;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
  }

  /* Modal Styles */
  .modal-backdrop-custom {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 16px;
  }
  .modal-card-custom {
    background: #ffffff;
    border-radius: 14px;
    width: 100%;
    max-width: 1120px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
  }
  .modal-header-custom {
    padding: 14px 20px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-header-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-header-icon.green { background: #ecfdf5; color: #059669; }
  .btn-close-custom {
    background: transparent;
    border: none;
    font-size: 1.6rem;
    color: #64748b;
    cursor: pointer;
    line-height: 1;
  }
  .btn-close-custom:hover {
    color: #0f172a;
  }

  .modal-body-custom {
    padding: 16px 20px;
    overflow-y: auto;
  }

  /* Filtros en Grid Horizontal Limpio */
  .filtro-panel {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 14px;
  }
  .filtro-grid-fila {
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }
  .filtro-col {
    display: flex;
    flex-direction: column;
    width: 165px;
    flex-shrink: 0;
  }
  .filtro-col.flex-grow {
    flex: 1 1 auto;
    width: auto;
    min-width: 220px;
  }
  .filtro-col.col-boton {
    width: 130px;
    flex-shrink: 0;
  }
  .input-fecha {
    height: 36px;
    padding: 6px 10px;
    font-size: 0.85rem;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
  }
  .input-buscar-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-con-icono {
    height: 36px;
    padding-left: 32px;
    padding-right: 28px;
    font-size: 0.85rem;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    width: 100%;
  }
  .search-icon {
    position: absolute;
    left: 8px;
    font-size: 18px;
    pointer-events: none;
  }
  .btn-clear-search {
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    font-size: 16px;
    color: #94a3b8;
    cursor: pointer;
  }
  .btn-actualizar {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
  }

  /* Barra inferior de filtros */
  .filtro-sub-barra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
  }
  .quick-dates-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .btn-quick-date {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    font-size: 0.76rem;
    font-weight: 600;
    color: #475569;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-quick-date:hover {
    background: #e2e8f0;
    color: #0f172a;
    border-color: #94a3b8;
  }
  .checkbox-inactivos-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    cursor: pointer;
    user-select: none;
  }
  .form-check-input-custom {
    width: 17px;
    height: 17px;
    cursor: pointer;
    accent-color: #0284c7;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  }
  .kpi-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .kpi-val {
    font-size: 1.18rem;
    font-weight: 800;
    font-family: monospace;
    line-height: 1.2;
  }
  .kpi-sub {
    font-size: 0.68rem;
    color: #94a3b8;
    margin-top: 3px;
  }
  .text-amber { color: #d97706; }

  /* Preview Table */
  .preview-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }
  .preview-table th {
    background: #f1f5f9;
    color: #334155;
    font-size: 0.76rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 6px 8px;
  }
  .preview-table td {
    padding: 6px 8px;
    font-size: 0.82rem;
  }
  .fila-inactiva {
    background: #f8fafc;
    opacity: 0.75;
  }
  .badge-status-activo {
    font-size: 0.68rem;
    font-weight: 700;
    background: #dcfce7;
    color: #15803d;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .badge-status-inactivo {
    font-size: 0.68rem;
    font-weight: 700;
    background: #fee2e2;
    color: #991b1b;
    padding: 2px 6px;
    border-radius: 4px;
  }

  /* Modal Footer y Botones de Descarga Horizontales */
  .modal-footer-custom {
    padding: 12px 20px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: center !important;
    gap: 12px;
  }
  .btn-cancelar-modal {
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #475569;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .btn-cancelar-modal:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .acciones-descarga-grupo {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 10px !important;
  }
  .btn-export {
    border: none;
    color: #ffffff;
    font-weight: 700;
    font-size: 0.86rem;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    transition: filter 0.15s, transform 0.15s;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
  .btn-export:hover:not(:disabled) {
    filter: brightness(0.93);
    transform: translateY(-1px);
  }
  .btn-export:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }
  .btn-export.excel {
    background: #10b981;
  }
  .btn-export.pdf {
    background: #ef4444;
  }

  @media (max-width: 900px) {
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .filtro-grid-fila {
      flex-direction: column;
      align-items: stretch;
    }
    .filtro-col {
      width: 100%;
    }
  }

  .inline-icon {
    font-size: 16px;
    vertical-align: middle;
  }
</style>
