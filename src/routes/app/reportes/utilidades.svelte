<script>
  import { onMount } from "svelte";
  import { postData, mensaje_error } from "../../stores";
  import { fade } from "svelte/transition";

  let loading = false;

  // Filter values
  let fechaInicio = "";
  let fechaFin = "";
  let idPedimento = "";

  // List of pedimentos for filtering
  let listPedimentos = [];

  // Report results
  let resumen = {
    totalVendidoMXN: 0,
    totalCostoMXN: 0,
    utilidadBrutaMXN: 0,
    margenUtilidad: 0
  };
  let desglose = [];

  onMount(async () => {
    await cargarPedimentos();
    await generarReporte();
  });

  async function cargarPedimentos() {
    try {
      // Traer todos los pedimentos (límite alto de 100 para filtro)
      const res = await postData("app/pedimentos/lista", {
        pagina_actual: 1,
        limite: 100
      });
      if (res.ok) {
        // Filtrar solo los arribados para reportar utilidades reales
        listPedimentos = res.lista.filter(p => p.status === 'arribado');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function generarReporte() {
    loading = true;
    try {
      const res = await postData("app/reportes/utilidades", {
        fecha_inicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
        id_pedimento: idPedimento || null
      });

      if (res.ok) {
        resumen = res.resumen;
        desglose = res.desglose.map(item => ({
          ...item,
          itemMargen: item.ventas_totales_mxn > 0 ? (item.utilidad_mxn / item.ventas_totales_mxn) * 100 : 0
        }));
      } else {
        mensaje_error(res.mensaje || "Error al generar el reporte de utilidades.");
      }
    } catch (err) {
      console.error(err);
      mensaje_error("Error de comunicación con el servidor.");
    } finally {
      loading = false;
    }
  }

  function limpiarFiltros() {
    fechaInicio = "";
    fechaFin = "";
    idPedimento = "";
    generarReporte();
  }

  function formatMoney(amount) {
    if (amount === undefined || amount === null) return "$0.00";
    return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
</script>

<svelte:head>
  <title>Reporte de Utilidades - Admin</title>
</svelte:head>

<!-- Overlay y loader de carga -->
{#if loading}
  <div class="overlay" transition:fade={{ duration: 150 }}></div>
  <div class="loader-container" transition:fade={{ duration: 150 }}>
    <div class="spinner"></div>
    <div class="cargando-texto">Calculando utilidades...</div>
  </div>
{/if}

<div class="vista-utilidades">
  <!-- Cabecera -->
  <div class="header-reporte mb-4">
    <div class="titulo-area">
      <i class="material-icons icon-main">analytics</i>
      <div>
        <h2>Reporte Financiero de Utilidades y Márgenes</h2>
        <p class="subtitulo">Visualiza los ingresos netos, costos fiscales de importación y utilidades brutas generadas en ventas.</p>
      </div>
    </div>
  </div>

  <!-- Filtros -->
  <div class="card card-filtros mb-4">
    <div class="filter-row">
      <div class="filter-group">
        <label for="fecha-ini" class="form-label font-bold text-small">Fecha de Inicio (Entrega):</label>
        <input 
          id="fecha-ini"
          type="date" 
          class="form-control" 
          bind:value={fechaInicio}
        />
      </div>
      <div class="filter-group">
        <label for="fecha-fin" class="form-label font-bold text-small">Fecha de Fin (Entrega):</label>
        <input 
          id="fecha-fin"
          type="date" 
          class="form-control" 
          bind:value={fechaFin}
        />
      </div>
      <div class="filter-group fg-large">
        <label for="select-ped" class="form-label font-bold text-small">Filtrar por Pedimento SAT:</label>
        <select 
          id="select-ped"
          class="form-select custom-select" 
          bind:value={idPedimento}
        >
          <option value="">-- Todos los Pedimentos --</option>
          {#each listPedimentos as ped}
            <option value={ped._id}>{ped.numero_pedimento} ({new Date(ped.fecha_pedimento).getFullYear()})</option>
          {/each}
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-secondary" on:click={limpiarFiltros}>
          Limpiar
        </button>
        <button class="btn btn-masivo" on:click={generarReporte}>
          <i class="material-icons vertical-align-middle">search</i> Filtrar
        </button>
      </div>
    </div>
  </div>

  <!-- Tarjetas KPI -->
  <div class="grid-kpis mb-4">
    <!-- Ventas -->
    <div class="kpi-card card-ventas">
      <div class="kpi-icon"><i class="material-icons">monetization_on</i></div>
      <div class="kpi-info">
        <div class="kpi-label">Ingresos por Ventas</div>
        <div class="kpi-value">{formatMoney(resumen.totalVendidoMXN)}</div>
      </div>
    </div>

    <!-- Costo de lo Vendido -->
    <div class="kpi-card card-costos">
      <div class="kpi-icon"><i class="material-icons">shopping_bag</i></div>
      <div class="kpi-info">
        <div class="kpi-label">Costo de lo Vendido (Fiscal)</div>
        <div class="kpi-value">{formatMoney(resumen.totalCostoMXN)}</div>
      </div>
    </div>

    <!-- Utilidad Bruta -->
    <div class="kpi-card card-utilidad">
      <div class="kpi-icon"><i class="material-icons">trending_up</i></div>
      <div class="kpi-info">
        <div class="kpi-label">Utilidad Bruta</div>
        <div class="kpi-value">{formatMoney(resumen.utilidadBrutaMXN)}</div>
      </div>
    </div>

    <!-- Margen de Utilidad -->
    <div class="kpi-card card-margen">
      <div class="kpi-icon"><i class="material-icons">percent</i></div>
      <div class="kpi-info">
        <div class="kpi-label">Margen de Ganancia</div>
        <div class="kpi-value">{resumen.margenUtilidad.toFixed(2)}%</div>
      </div>
    </div>
  </div>

  <!-- Desglose por Producto -->
  <div class="contenedor_ventana">
    <h3 class="font-bold text-dark border-bottom pb-2 p-3 mb-0">Desglose de Utilidades por Producto</h3>
    {#if desglose.length === 0}
      <div class="centrado py-5 text-muted">
        <i class="material-icons empty-icon">analytics</i>
        <p class="mt-2 text-large">No se encontraron ventas para los filtros seleccionados.</p>
      </div>
    {:else}
      <div class="table-responsive">
        <table class="table table-custom align-middle">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant. Vendida</th>
              <th>Pedimento Lote</th>
              <th>Ventas Totales (MXN)</th>
              <th>Costo Importación (MXN)</th>
              <th>Utilidad Bruta (MXN)</th>
              <th>Margen Neto</th>
            </tr>
          </thead>
          <tbody>
            {#each desglose as item}
              <tr>
                <td>
                  <div class="font-bold text-dark">{item.nombre}</div>
                  <div class="text-muted text-small">{item.codigo || 'S/C'}</div>
                </td>
                <td><strong>{item.cantidad_vendida}</strong> pza(s)</td>
                <td>
                  <span class="badge bg-lote">{item.pedimento}</span>
                </td>
                <td>{formatMoney(item.ventas_totales_mxn)}</td>
                <td>{formatMoney(item.costos_totales_mxn)}</td>
                <td>
                  <span class="utilidad-monto" class:negativo={item.utilidad_mxn < 0}>
                    {formatMoney(item.utilidad_mxn)}
                  </span>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <span class="margen-pct" class:text-danger={item.itemMargen < 0} class:text-success={item.itemMargen >= 20}>
                      {item.itemMargen.toFixed(1)}%
                    </span>
                    <div class="progress-bar-container">
                      <div 
                        class="progress-bar-fill" 
                        class:bg-danger={item.itemMargen < 0}
                        class:bg-success={item.itemMargen >= 20}
                        style="width: {Math.max(0, Math.min(100, item.itemMargen))}%"
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .vista-utilidades {
    padding: 24px;
    font-family: inherit;
    color: #2c3e50;
    max-height: calc(100vh - 42px);
    overflow-y: auto;
  }

  .header-reporte {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .titulo-area {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .icon-main {
    font-size: 42px;
    color: #1a5276;
    background: #ebf5fb;
    padding: 8px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(26, 82, 118, 0.1);
  }

  .header-reporte h2 {
    margin: 0;
    font-size: 1.6em;
    font-weight: 700;
    color: #1a5276;
  }

  .subtitulo {
    margin: 4px 0 0 0;
    font-size: 0.9em;
    color: #7f8c8d;
  }

  .card-filtros {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    max-width: 1200px;
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
  }

  .filter-group {
    flex: 1;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-group label {
    margin-bottom: 0;
  }

  .fg-large {
    flex: 1.5;
    min-width: 250px;
  }

  .filter-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 2px;
  }

  .font-bold {
    font-weight: 600;
  }

  .text-small {
    font-size: 0.85em;
  }

  .form-control, .form-select {
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.95em;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  .custom-select {
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
  }

  .btn {
    border-radius: 8px;
    font-weight: 500;
    padding: 10px 20px;
    font-size: 0.9em;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .btn-secondary {
    background-color: #f1f5f9;
    color: #475569;
  }

  .btn-secondary:hover {
    background-color: #e2e8f0;
  }

  .btn-masivo {
    background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(26, 82, 118, 0.2);
  }

  .btn-masivo:hover {
    box-shadow: 0 6px 16px rgba(26, 82, 118, 0.3);
    transform: translateY(-1px);
  }

  /* Grid KPIs */
  .grid-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  @media (max-width: 1200px) {
    .grid-kpis {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 576px) {
    .grid-kpis {
      grid-template-columns: 1fr;
    }
  }

  .kpi-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: transform 0.2s;
  }

  .kpi-card:hover {
    transform: translateY(-2px);
  }

  .kpi-icon {
    font-size: 32px;
    padding: 12px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-ventas .kpi-icon {
    background-color: #e8f8f5;
    color: #16a085;
  }

  .card-costos .kpi-icon {
    background-color: #fef9c3;
    color: #ca8a04;
  }

  .card-utilidad .kpi-icon {
    background-color: #ebf5fb;
    color: #2980b9;
  }

  .card-margen .kpi-icon {
    background-color: #f3e8ff;
    color: #7e22ce;
  }

  .kpi-label {
    font-size: 0.85em;
    color: #64748b;
    font-weight: 500;
  }

  .kpi-value {
    font-size: 1.35em;
    font-weight: 700;
    color: #1e293b;
    margin-top: 2px;
  }

  /* Tabla de Resultados */
  .contenedor_ventana {
    background: white;
    margin: 0;
    max-height: calc(100vh - 420px) !important;
    padding: 0;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
    overflow-y: auto;
  }

  .table-custom {
    margin: 0;
    width: 100%;
    border-collapse: collapse;
  }

  .table-custom th {
    background-color: #f8fafc;
    color: #475569;
    font-weight: 600;
    font-size: 0.9em;
    padding: 16px 20px;
    border-bottom: 1.5px solid #e2e8f0;
  }

  .table-custom td {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .badge-lote {
    background-color: #f1f5f9;
    color: #475569;
    font-weight: 500;
    font-size: 0.8em;
    padding: 4px 8px;
    border-radius: 6px;
  }

  .utilidad-monto {
    font-weight: 700;
    color: #27ae60;
  }

  .utilidad-monto.negativo {
    color: #c0392b;
  }

  .margen-pct {
    font-weight: 600;
    min-width: 48px;
    text-align: right;
  }

  .progress-bar-container {
    width: 60px;
    height: 8px;
    background-color: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background-color: #3498db;
    border-radius: 4px;
  }

  .bg-danger {
    background-color: #e74c3c !important;
  }

  .bg-success {
    background-color: #2ecc71 !important;
  }

  .text-danger {
    color: #e74c3c !important;
  }

  .text-success {
    color: #2ecc71 !important;
  }

  /* Loader */
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 999;
  }

  .loader-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background: white;
    padding: 30px 40px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f1f5f9;
    border-top: 4px solid #2980b9;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .cargando-texto {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.95em;
  }

  .empty-icon {
    font-size: 56px !important;
    color: #cbd5e1;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .vertical-align-middle {
    vertical-align: middle;
  }
</style>
