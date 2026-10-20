<script>
  import { onMount } from "svelte";
  import { postData, mensajes_app } from "./../../../stores";
  import Paginacion from "./../../componentes/paginacion/index.svelte";
  import PrepararFacturaModal from "../../pedidos/_listas/PrepararFacturaModal.svelte";
  import ModalPublicoGeneral from "./_ModalPublicoGeneral.svelte";

  const MESES = [
    { id: 1, nombre: "Enero" },
    { id: 2, nombre: "Febrero" },
    { id: 3, nombre: "Marzo" },
    { id: 4, nombre: "Abril" },
    { id: 5, nombre: "Mayo" },
    { id: 6, nombre: "Junio" },
    { id: 7, nombre: "Julio" },
    { id: 8, nombre: "Agosto" },
    { id: 9, nombre: "Septiembre" },
    { id: 10, nombre: "Octubre" },
    { id: 11, nombre: "Noviembre" },
    { id: 12, nombre: "Diciembre" }
  ];

  const fechaHoy = new Date();
  const anioActual = fechaHoy.getFullYear();
  const mesActual = fechaHoy.getMonth() + 1; // 1-12

  const ANIOS = [];
  for (let a = anioActual + 1; a >= 2023; a--) {
    ANIOS.push(a);
  }

  let pedidos = [];
  let cargando = false;
  let pagina_actual = 1;
  let total_paginas = 1;
  let total_registros = 0;
  let ha_cambiado_pagina_actual = false;
  let visible_modal = false;
  let modal_pg_visible = false;
  let pedido_seleccionado = null;
  let temporizador;

  // Filtros
  let buscar = "";
  let filtro_mes = mesActual; // Por defecto: mes en curso
  let filtro_anio = anioActual; // Por defecto: año en curso
  let filtro_status = "Todos"; // Todos, Enviado, Entregado
  let filtro_preparacion = "Todos"; // Todos, pendiente, sin_preparar
  let resumen = { total_monto: 0, enviados: 0, entregados: 0 };

  $: if (ha_cambiado_pagina_actual) {
    ha_cambiado_pagina_actual = false;
    cargar();
  }

  onMount(cargar);

  function avisar(tipo, mensaje) {
    $mensajes_app.push({ tipo, mensaje });
    $mensajes_app = $mensajes_app;
  }

  async function cargar() {
    cargando = true;
    try {
      const payload = {
        buscar: buscar.trim(),
        pagina: pagina_actual,
        mes: filtro_mes,
        anio: filtro_anio,
        status: filtro_status,
        preparacion: filtro_preparacion
      };
      const respuesta = await postData("/app/facturacion/pedidos_pendientes", payload);
      if (!respuesta.ok) throw new Error(respuesta.mensaje || "Error al consultar pedidos.");
      pedidos = respuesta.pedidos || [];
      total_paginas = respuesta.paginas || 1;
      total_registros = respuesta.total || 0;
      if (respuesta.resumen) resumen = respuesta.resumen;
    } catch (err) {
      avisar("error", err.message || "Error al consultar los pedidos pendientes.");
    } finally {
      cargando = false;
    }
  }

  function al_buscar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      pagina_actual = 1;
      cargar();
    }, 350);
  }

  function aplicar_filtros() {
    pagina_actual = 1;
    cargar();
  }

  function limpiar_filtros() {
    buscar = "";
    filtro_mes = mesActual;
    filtro_anio = anioActual;
    filtro_status = "Todos";
    filtro_preparacion = "Todos";
    pagina_actual = 1;
    cargar();
  }

  function ver_todo_el_historial() {
    buscar = "";
    filtro_mes = "Todos";
    filtro_anio = "Todos";
    filtro_status = "Todos";
    filtro_preparacion = "Todos";
    pagina_actual = 1;
    cargar();
  }

  function facturar(pedido) {
    pedido_seleccionado = pedido;
    visible_modal = true;
  }

  $: if (!visible_modal && pedido_seleccionado) {
    pedido_seleccionado = null;
    cargar();
  }

  function dinero(valor) {
    return Number(valor || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }

  function fecha_legible(fecha) {
    if (!fecha) return "—";
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-MX");
  }
</script>

<svelte:head>
  <title>Emitir Factura PPD - Xenon</title>
</svelte:head>

<div class="contenedor">
  <!-- Encabezado Principal -->
  <header class="encabezado">
    <div class="titulo-area">
      <div class="icono-badge">
        <i class="material-icons">post_add</i>
      </div>
      <div>
        <h1>Emitir Factura PPD</h1>
        <p>Pedidos enviados sin factura. Las ventas de contado (PUE) se facturan desde Pedidos → Preparar factura.</p>
      </div>
    </div>
    <div class="header-acciones">
      <button class="btn-publico-general" on:click={() => modal_pg_visible = true} title="Facturar ventas seleccionadas a Público en General">
        <i class="material-icons">groups</i>
        Facturar a Público en General
      </button>
      <button class="btn-secundario btn-sm" on:click={cargar} disabled={cargando}>
        <i class="material-icons">refresh</i>
        Actualizar
      </button>
    </div>
  </header>

  <!-- Métricas Rápidas del Período -->
  <div class="metricas-grid">
    <div class="metrica-card">
      <span class="metrica-label">Pedidos Por Facturar</span>
      <span class="metrica-valor">{total_registros}</span>
      <span class="metrica-subtexto">
        {#if filtro_mes !== "Todos" && filtro_anio !== "Todos"}
          {(MESES.find(m => m.id === Number(filtro_mes)) || {}).nombre || "Mes"} {filtro_anio}
        {:else if filtro_anio !== "Todos"}
          Año {filtro_anio}
        {:else}
          Histórico general
        {/if}
      </span>
    </div>
    <div class="metrica-card">
      <span class="metrica-label">Enviados</span>
      <span class="metrica-valor text-azul">{resumen.enviados}</span>
    </div>
    <div class="metrica-card">
      <span class="metrica-label">Entregados</span>
      <span class="metrica-valor text-verde">{resumen.entregados}</span>
    </div>
    <div class="metrica-card">
      <span class="metrica-label">Monto Total Pedidos</span>
      <span class="metrica-valor text-morado">{dinero(resumen.total_monto)}</span>
    </div>
  </div>

  <!-- Tarjeta de Filtros de Búsqueda (Replica exacta de la referencia de CUCC / Xenon) -->
  <div class="card card-filtros-principal mb-4">
    <div class="filtros-header">
      <div class="icono-filtro-naranja">
        <i class="material-icons">filter_alt</i>
      </div>
      <h2 class="titulo-filtros">FILTROS DE BÚSQUEDA</h2>
    </div>

    <!-- Selectores Principales: AÑO y MES destacados + ESTATUS y PREPARACIÓN -->
    <div class="grid-filtros-periodo">
      <!-- Selector AÑO -->
      <div class="campo-periodo">
        <label for="select-filtro-anio">AÑO</label>
        <div class="select-wrapper">
          <select id="select-filtro-anio" bind:value={filtro_anio} on:change={aplicar_filtros}>
            <option value="Todos">Todos los años</option>
            {#each ANIOS as a}
              <option value={a}>{a}</option>
            {/each}
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>

      <!-- Selector MES (Destacado con borde suave) -->
      <div class="campo-periodo">
        <label for="select-filtro-mes">MES</label>
        <div class="select-wrapper select-destacado">
          <select id="select-filtro-mes" bind:value={filtro_mes} on:change={aplicar_filtros}>
            <option value="Todos">Todos los meses</option>
            {#each MESES as m}
              <option value={m.id}>{m.nombre}</option>
            {/each}
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>

      <!-- Selector ESTATUS PEDIDO -->
      <div class="campo-periodo">
        <label for="select-filtro-status">ESTATUS PEDIDO</label>
        <div class="select-wrapper">
          <select id="select-filtro-status" bind:value={filtro_status} on:change={aplicar_filtros}>
            <option value="Todos">Todos (Enviado / Entregado)</option>
            <option value="Enviado">Enviado</option>
            <option value="Entregado">Entregado</option>
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>

      <!-- Selector PREPARACIÓN -->
      <div class="campo-periodo">
        <label for="select-filtro-preparacion">PREPARACIÓN</label>
        <div class="select-wrapper">
          <select id="select-filtro-preparacion" bind:value={filtro_preparacion} on:change={aplicar_filtros}>
            <option value="Todos">Todas las preparaciones</option>
            <option value="pendiente">Pendiente (PPD)</option>
            <option value="sin_preparar">Sin preparar</option>
          </select>
          <i class="material-icons chevron-naranja">expand_more</i>
        </div>
      </div>
    </div>

    <!-- Fila Inferior: Buscador Rápido y Botones de Período -->
    <div class="fila-busqueda-avanzada mt-3">
      <div class="buscador-caja flex-1">
        <i class="material-icons icono-buscar">search</i>
        <input
          type="text"
          class="input-buscar"
          placeholder="Buscar rápido por folio de pedido (ej. 29466) o cliente..."
          bind:value={buscar}
          on:input={al_buscar}
        />
        {#if buscar}
          <button class="btn-limpiar-busqueda" on:click={() => { buscar = ""; aplicar_filtros(); }}>
            <i class="material-icons">close</i>
          </button>
        {/if}
      </div>

      <button class="btn-secundario btn-sm" on:click={limpiar_filtros} title="Restablecer filtros al mes en curso">
        <i class="material-icons">replay</i>
        Mes en Curso
      </button>

      {#if filtro_mes !== "Todos" || filtro_anio !== "Todos" || filtro_status !== "Todos" || filtro_preparacion !== "Todos" || buscar}
        <button class="btn-secundario btn-sm" on:click={ver_todo_el_historial} title="Consultar todo el historial sin filtro de período">
          <i class="material-icons">all_inclusive</i>
          Ver Todo el Historial
        </button>
      {/if}
    </div>
  </div>

  <!-- Tabla de Pedidos Pendientes de Facturar -->
  <div class="card">
    {#if cargando}
      <div class="caja-vacia">
        <i class="material-icons icono-girando">sync</i>
        <p>Consultando pedidos pendientes...</p>
      </div>
    {:else if pedidos.length === 0}
      <div class="caja-vacia">
        <i class="material-icons icono-vacio">inbox</i>
        <p>No hay pedidos pendientes de facturar para los criterios indicados.</p>
        <button class="btn-secundario btn-sm mt-2" on:click={ver_todo_el_historial}>Ver todos los pedidos sin filtro de período</button>
      </div>
    {:else}
      <div class="tabla-scroll">
        <table class="tabla-pedidos">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha Pedido</th>
              <th>Cliente</th>
              <th>Estatus</th>
              <th class="der">Total</th>
              <th>Preparación</th>
              <th class="der">Acción</th>
            </tr>
          </thead>
          <tbody>
            {#each pedidos as pedido (pedido._id)}
              <tr>
                <td>
                  <span class="folio-tag">#{pedido.folio}</span>
                </td>
                <td>{fecha_legible(pedido.fecha)}</td>
                <td>
                  <span class="cliente-nombre font-bold">{pedido.cliente && pedido.cliente.nombre ? pedido.cliente.nombre : "—"}</span>
                </td>
                <td>
                  <span class="badge-estatus" class:enviado={pedido.status === "Enviado"} class:entregado={pedido.status === "Entregado"}>
                    {pedido.status}
                  </span>
                </td>
                <td class="der font-mono font-bold">{dinero(pedido.total_pedido)}</td>
                <td>
                  {#if pedido.preparacion_factura && pedido.preparacion_factura.estado}
                    <span class="badge-prep">{pedido.preparacion_factura.estado} ({pedido.preparacion_factura.tipo || "PPD"})</span>
                  {:else}
                    <span class="text-gris">—</span>
                  {/if}
                </td>
                <td class="der">
                  <button class="btn-facturar-ppd" on:click={() => facturar(pedido)}>
                    <i class="material-icons">receipt</i>
                    Facturar PPD
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-4">
        <Paginacion bind:total_paginas bind:ha_cambiado_pagina_actual bind:pagina_actual />
      </div>
    {/if}
  </div>
</div>

<PrepararFacturaModal bind:visible={visible_modal} pedido={pedido_seleccionado} tipo="PPD" />

<ModalPublicoGeneral
  bind:visible={modal_pg_visible}
  filtro_mes={filtro_mes}
  filtro_anio={filtro_anio}
  filtro_status={filtro_status}
  filtro_preparacion={filtro_preparacion}
  onExito={cargar}
/>

<style>
  .contenedor {
    padding: 24px;
    max-width: 1300px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
  }

  /* Encabezado */
  .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    padding: 22px 28px;
    border-radius: 14px;
    margin-bottom: 20px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  }
  .titulo-area { display: flex; align-items: center; gap: 16px; }
  .icono-badge {
    background: rgba(56, 189, 248, 0.18);
    color: #38bdf8;
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icono-badge i { font-size: 30px; }
  h1 { margin: 0; font-size: 23px; font-weight: 700; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .header-acciones { display: flex; gap: 10px; }

  /* Métricas Rápidas */
  .metricas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
  }
  .metrica-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }
  .metrica-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.03em; }
  .metrica-valor { font-size: 20px; font-weight: 800; color: #0f172a; font-family: monospace; }
  .metrica-subtexto { font-size: 11px; color: #0284c7; font-weight: 600; }
  .text-azul { color: #0284c7; }
  .text-verde { color: #16a34a; }
  .text-morado { color: #8b5cf6; }

  /* Card General */
  .card {
    background: #ffffff;
    border-radius: 14px;
    padding: 22px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
  }
  .mb-4 { margin-bottom: 20px; }
  .mt-2 { margin-top: 10px; }
  .mt-3 { margin-top: 14px; }
  .mt-4 { margin-top: 20px; }
  .flex-1 { flex: 1; }

  /* Tarjeta de Filtros de Búsqueda (Diseño Referencia CUCC / Xenon) */
  .card-filtros-principal {
    background: #ffffff;
    border-radius: 16px;
    padding: 22px 24px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  }

  .filtros-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }

  .icono-filtro-naranja {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #fff7ed;
    border: 1px solid #ffedd5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ea580c;
  }
  .icono-filtro-naranja i {
    font-size: 26px;
  }

  .titulo-filtros {
    margin: 0;
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: #0f172a;
    text-transform: uppercase;
  }

  .grid-filtros-periodo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    align-items: flex-end;
  }

  .campo-periodo {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .campo-periodo label {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .select-wrapper select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 20px;
    padding: 13px 44px 13px 22px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  }

  .select-wrapper select:hover {
    border-color: #cbd5e1;
    background: #ffffff;
  }

  .select-wrapper select:focus {
    border-color: #0d9488;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
  }

  /* Borde turquesa suave y fondo idéntico a la imagen de referencia para MES */
  .select-wrapper.select-destacado select {
    border: 2px solid #99f6e4;
    background: #f0fdfa;
  }
  .select-wrapper.select-destacado select:hover,
  .select-wrapper.select-destacado select:focus {
    border-color: #14b8a6;
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.18);
  }

  .chevron-naranja {
    position: absolute;
    right: 16px;
    color: #ea580c;
    pointer-events: none;
    font-size: 26px;
    font-weight: 700;
  }

  /* Fila de búsqueda inferior */
  .fila-busqueda-avanzada {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .buscador-caja {
    position: relative;
    min-width: 280px;
  }
  .icono-buscar {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 20px;
  }
  .input-buscar {
    width: 100%;
    padding: 10px 38px 10px 40px;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    font-size: 13px;
    box-sizing: border-box;
    transition: all 0.2s;
  }
  .input-buscar:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
  }
  .btn-limpiar-busqueda {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 2px;
    display: flex;
  }

  /* Botones */
    .btn-publico-general {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
    color: #ffffff;
    border: none;
    border-radius: 9px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(234, 88, 12, 0.35);
    transition: all 0.2s ease;
  }
  .btn-publico-general:hover {
    background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.45);
    transform: translateY(-1px);
  }
  .btn-publico-general:active {
    transform: translateY(0);
  }
  .btn-publico-general i {
    font-size: 18px;
  }

  .btn-secundario {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-secundario:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }

  .btn-facturar-ppd {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-facturar-ppd:hover { background: #0369a1; }
  .btn-facturar-ppd i { font-size: 16px; }

  /* Tabla */
  .tabla-scroll {
    overflow-x: auto;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }
  .tabla-pedidos {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .tabla-pedidos th {
    background: #f8fafc;
    padding: 12px 14px;
    font-weight: 700;
    color: #475569;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 2px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
  }
  .tabla-pedidos td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .tabla-pedidos tr:hover { background: #f8fafc; }
  .der { text-align: right; }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 700; }
  .text-gris { color: #94a3b8; }

  .folio-tag {
    font-weight: 800;
    color: #0f172a;
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 6px;
  }

  .badge-estatus {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    background: #f1f5f9;
    color: #475569;
  }
  .badge-estatus.enviado { background: #e0f2fe; color: #0369a1; }
  .badge-estatus.entregado { background: #dcfce7; color: #15803d; }

  .badge-prep {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: #fef3c7;
    color: #b45309;
  }

  .caja-vacia {
    text-align: center;
    padding: 48px 20px;
    color: #64748b;
  }
  .icono-vacio { font-size: 48px; color: #cbd5e1; margin-bottom: 8px; }
  .icono-girando {
    font-size: 36px;
    color: #0284c7;
    animation: girar 1s linear infinite;
    display: inline-block;
  }
  @keyframes girar {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
