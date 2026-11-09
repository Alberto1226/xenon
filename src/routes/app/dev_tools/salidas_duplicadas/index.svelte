<script>
  import { usuario_db } from "../../../stores";
  import ModalMovimientos from "./_ModalMovimientos.svelte";
  import ModalProgreso from "./_ModalProgreso.svelte";
  import ModalProductosPedido from "./_ModalProductosPedido.svelte";
  import progresoCorreccion from "./_progreso";
  import { onMount } from "svelte";

  let pestanaActiva = "consulta"; // 'consulta' o 'analisis'
  let folio = "";
  let resultado = null;
  let seleccion = [];
  let ocupado = false;
  let mensaje = "";
  let error = "";
  let productoMovimientos = null;
  let progreso = null;

  // Variables para la pestaña de Análisis de los últimos 6 meses
  let reporteAnalisis = null;
  let mesesAnalisis = 6;
  let cargandoAnalisis = false;
  let errorAnalisis = "";
  let filtroEstadoAnalisis = "todos"; // 'todos', 'pendiente', 'corregido', 'auditoria_pendiente'
  let pedidoSeleccionadoParaModal = null;

  onMount(() => {
    function advertirSalida(evento) {
      if (progreso && progreso.enCurso) {
        evento.preventDefault();
        evento.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", advertirSalida);
    return () => window.removeEventListener("beforeunload", advertirSalida);
  });

  $: productosElegibles = resultado ? resultado.items.filter(item => item.elegible) : [];
  $: seleccionadosElegibles = productosElegibles.filter(item => seleccion.includes(item.producto_id));
  $: todosSeleccionados = productosElegibles.length > 0 && seleccionadosElegibles.length === productosElegibles.length;

  // Filtrado de pedidos en el análisis
  $: pedidosTotales = reporteAnalisis && Array.isArray(reporteAnalisis.pedidos) ? reporteAnalisis.pedidos : [];
  $: pedidosFiltrados = pedidosTotales.filter(pedido => {
    if (filtroEstadoAnalisis === "todos") return true;
    if (filtroEstadoAnalisis === "pendiente") return pedido.total_elegibles > 0;
    if (filtroEstadoAnalisis === "corregido") return pedido.estado === "corregido";
    if (filtroEstadoAnalisis === "auditoria_pendiente") return pedido.total_pendientes_auditoria > 0;
    return pedido.estado === filtroEstadoAnalisis;
  });

  async function solicitar(accion, productos = [], folioSolicitud = folio, productoId = null, extra = {}) {
    const respuesta = await fetch("/app/dev_tools/salidas_duplicadas/operaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, folio: folioSolicitud, productos, producto_id: productoId, ...extra })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo completar la operación.");
    return datos;
  }

  async function consultar() {
    ocupado = true;
    error = "";
    mensaje = "";
    resultado = null;
    seleccion = [];
    try {
      resultado = await solicitar("consultar");
    } catch (e) {
      error = e.message;
    } finally {
      ocupado = false;
    }
  }

  function irAConsultarFolio(folioDestino) {
    folio = folioDestino;
    pestanaActiva = "consulta";
    consultar();
  }

  async function escanearUltimosMeses() {
    cargandoAnalisis = true;
    errorAnalisis = "";
    reporteAnalisis = null;
    try {
      const res = await solicitar("escanear_ultimos_meses", [], 1, null, { meses: mesesAnalisis });
      reporteAnalisis = res.reporte;
    } catch (e) {
      errorAnalisis = e.message;
    } finally {
      cargandoAnalisis = false;
    }
  }

  async function corregir(elegidos) {
    const detalle = elegidos.map(item => `${item.nombre}: +${item.cantidad}`).join("\n");
    if (!window.confirm(`Se reincorporará una sola salida duplicada por producto del folio ${resultado.folio}:\n\n${detalle}\n\nConfirma que revisaste las salidas y que corresponden a descuentos duplicados.`)) return;
    ocupado = true;
    error = "";
    mensaje = "";
    const folioCorregido = resultado.folio;
    resultado = null;
    seleccion = [];
    progreso = { folio: folioCorregido, total: elegidos.length, completados: 0, actual: null, etapa: "Preparando corrección…", enCurso: true, error: "" };
    try {
      const avance = await progresoCorreccion.procesar(elegidos, async item => {
        const producto = {
          id: item.producto_id, cantidad: item.cantidad, stock: item.stock,
          salidas: item.salidas.map(salida => salida.id)
        };
        const datos = await solicitar("corregir", [producto], folioCorregido);
        if (!Array.isArray(datos.corregidos) || datos.corregidos.length !== 1 ||
            datos.corregidos[0].producto_id !== item.producto_id || datos.corregidos[0].cantidad !== item.cantidad) {
          throw new Error("La respuesta no confirma la corrección de este producto.");
        }
      }, actual => {
        progreso = { ...progreso, ...actual, etapa: "Preparando el siguiente producto…" };
      });
      if (avance.error) {
        progreso = { ...progreso, fallido: avance.fallido, error: avance.error.message || String(avance.error) };
      } else {
        mensaje = `Se corrigieron ${avance.completados} producto(s).`;
      }
    } catch (e) {
      progreso = { ...progreso, error: "No se pudo confirmar la operación: " + e.message };
    } finally {
      progreso = { ...progreso, actual: null, etapa: "Actualizando el estado del pedido…" };
      try {
        resultado = await solicitar("consultar", [], folioCorregido);
      } catch (e) {
        progreso = { ...progreso, error: (progreso.error ? progreso.error + " " : "") + "No se pudo actualizar el estado del pedido: " + e.message };
      }
      progreso = { ...progreso, enCurso: false };
      ocupado = false;
    }
  }

  async function recuperarAuditoria(item) {
    ocupado = true;
    error = "";
    mensaje = "";
    const folioActual = resultado.folio;
    try {
      const datos = await solicitar("recuperar_auditoria", [], folioActual, item.producto_id);
      mensaje = datos.mensaje;
    } catch (e) {
      error = "No se pudo recuperar el snaplog. No se modificaron existencias: " + e.message;
    } finally {
      try {
        resultado = await solicitar("consultar", [], folioActual);
        seleccion = seleccion.filter(id => resultado.items.some(item => item.producto_id === id && item.elegible));
      } catch (e) {
        resultado = null;
        seleccion = [];
        error = (error ? error + " " : "") + "No se pudo actualizar el estado: " + e.message;
      }
      ocupado = false;
    }
  }

  function fecha(valor) {
    return valor ? new Date(valor).toLocaleString("es-MX") : "Sin fecha";
  }

  function corregirSeleccionados() {
    if (seleccionadosElegibles.length) corregir(seleccionadosElegibles);
  }

  function seleccionarTodos(evento) {
    seleccion = evento.currentTarget.checked ? productosElegibles.map(item => item.producto_id) : [];
  }
</script>

{#if $usuario_db && $usuario_db.usuario === "isotech_Xenonymas" && $usuario_db.rol === "administrador"}
  <main class="herramienta" class:con-seleccion={seleccion.length > 0}>
    <header>
      <div>
        <p class="etiqueta">DEV TOOLS / INVENTARIO</p>
        <h1>Salidas duplicadas</h1>
        <p>Herramienta de auditoría y reincorporación controlada de existencias por salidas indebidas.</p>
      </div>
      <span class="insignia">CORRECCIÓN CONTROLADA</span>
    </header>

    <!-- Barra de Pestañas de Navegación -->
    <div class="nav-tabs">
      <div
        class="nav-tab {pestanaActiva === 'consulta' ? 'active' : ''}"
        on:click={() => pestanaActiva = 'consulta'}
      >
        <span class="icono-tab">search</span>
        Consulta por Folio
      </div>
      <div
        class="nav-tab {pestanaActiva === 'analisis' ? 'active' : ''}"
        on:click={() => {
          pestanaActiva = 'analisis';
          if (!reporteAnalisis && !cargandoAnalisis) escanearUltimosMeses();
        }}
      >
        <span class="icono-tab">analytics</span>
        Análisis Global (Últimos 6 meses)
        {#if reporteAnalisis && reporteAnalisis.total_elegibles > 0}
          <span class="badge-alerta">{reporteAnalisis.total_elegibles}</span>
        {/if}
      </div>
    </div>

    <!-- PESTAÑA 1: CONSULTA POR FOLIO INDIVIDUAL -->
    {#if pestanaActiva === "consulta"}
      <form class="consulta" on:submit|preventDefault={consultar}>
        <label for="folio">Folio del pedido</label>
        <div class="busqueda">
          <input id="folio" type="number" min="1" step="1" required bind:value={folio} disabled={ocupado} placeholder="Ej. 12456" />
          <button type="submit" disabled={ocupado}>Consultar movimientos</button>
        </div>
      </form>

      <div class="aviso">
        <strong>Revisa antes de corregir.</strong> Dos registros similares no prueban por sí solos que ambos descuentos sean indebidos. Solo se habilitan productos con dos salidas verificables; los casos ambiguos requieren revisión manual. La corrección no modifica folios ni apartados.
      </div>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}

      {#if resultado}
        <section class="resultado">
          <div class="cabecera-resultado">
            <div><p class="etiqueta">PEDIDO</p><h2>#{resultado.folio} <span>{resultado.cliente || "Cliente sin nombre"}</span></h2></div>
            <div class="resumen-acciones">
              {#if resultado.items.some(item => item.correccion)}
                <a
                  href="/app/dev_tools/salidas_duplicadas/pdf?folio={resultado.folio}"
                  target="_blank"
                  class="btn-pdf-tabla"
                  title="Descargar PDF de Corroboración Física para Almacén"
                >
                  📄 PDF Corroboración
                </a>
              {/if}
              <label class="seleccionar-todos">
                <input type="checkbox" checked={todosSeleccionados} indeterminate={seleccionadosElegibles.length > 0 && !todosSeleccionados} on:change={seleccionarTodos} disabled={ocupado || !productosElegibles.length} />
                Seleccionar todos los corregibles
              </label>
              <span>{resultado.items.length} productos · {seleccionadosElegibles.length} seleccionado(s)</span>
              <button type="button" on:click={corregirSeleccionados} disabled={ocupado || !seleccionadosElegibles.length}>Corregir seleccionados</button>
            </div>
          </div>
          {#each resultado.items as item, indice}
            <article class="producto">
              <div class="producto-principal">
                <label class="seleccion">
                  <input type="checkbox" value={item.producto_id} bind:group={seleccion} disabled={!item.elegible || ocupado} aria-label={"Seleccionar " + item.nombre} />
                  <span class="numero">{indice + 1}</span>
                </label>
                <div class="nombre"><strong>{item.nombre}</strong><small>{item.codigo || "Sin código"} · Pedido: {item.cantidad} · Existencia actual: {item.stock == null ? "No disponible" : item.stock}</small></div>
                <button type="button" class="ver-movimientos" on:click={() => productoMovimientos = item} disabled={!item.producto_id || !/^[a-f\d]{24}$/i.test(item.producto_id) || ocupado}>Ver movimientos</button>
                <button type="button" class="corregir-uno" on:click={() => corregir([item])} disabled={!item.elegible || ocupado} aria-label={"Corregir salida duplicada de " + item.nombre}>Corregir +{item.cantidad}</button>
                <span class:elegible={item.elegible} class="estado">{item.elegible ? "Revisar" : "No corregible"}</span>
              </div>
              <p class="motivo">{item.motivo}</p>
              {#if item.correccion && item.correccion.auditoria_pendiente}
                <div class="auditoria-pendiente" role="alert">
                  <span>El inventario ya fue ajustado, pero falta confirmar su snaplog. No vuelvas a corregirlo.</span>
                  <button type="button" on:click={() => recuperarAuditoria(item)} disabled={ocupado}>Recuperar snaplog</button>
                </div>
              {/if}
              {#if item.salidas.length}
                <div class="movimientos">
                  {#each item.salidas as salida}
                    <div><span>{fecha(salida.fecha)}</span><strong>−{salida.cantidad}</strong><span>Existencia: {salida.antes} → {salida.despues}</span><small>ID: {salida.id}</small></div>
                  {/each}
                </div>
              {:else}
                <p class="motivo">No se encontraron salidas para este producto y folio.</p>
              {/if}
            </article>
          {/each}
        </section>
        {#if seleccion.length}
          <div class="acciones-flotantes" role="region" aria-label="Corrección de productos seleccionados">
            <span aria-live="polite"><strong>{seleccion.length}</strong> producto(s) seleccionado(s)</span>
            <button type="button" on:click={corregirSeleccionados} disabled={ocupado}>Corregir seleccionados</button>
          </div>
        {/if}
      {/if}

    <!-- PESTAÑA 2: ANÁLISIS AUTOMATIZADO DE LOS ÚLTIMOS 6 MESES -->
    {:else if pestanaActiva === "analisis"}
      <section class="analisis-seccion">
        <div class="panel-control-analisis">
          <div>
            <h3>Escaneo de Auditoría de Snaplogs</h3>
            <p class="subtexto">Audita de forma automática todas las salidas registradas en los últimos {mesesAnalisis} meses para detectar folios con duplicidad.</p>
          </div>
          <div class="acciones-escaneo">
            <select bind:value={mesesAnalisis} disabled={cargandoAnalisis} class="select-meses">
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Último año (12 meses)</option>
            </select>
            <button type="button" on:click={escanearUltimosMeses} disabled={cargandoAnalisis}>
              {cargandoAnalisis ? "Escaneando base de datos…" : "Volver a escanear"}
            </button>
          </div>
        </div>

        {#if errorAnalisis}
          <p class="error" role="alert">{errorAnalisis}</p>
        {/if}

        {#if cargandoAnalisis}
          <div class="cargando-box">
            <div class="spinner"></div>
            <p>Analizando registros de auditoría y cruzando productos con folios…</p>
            <small>Esto puede tomar unos segundos dependiendo de la cantidad de movimientos.</small>
          </div>
        {:else if reporteAnalisis}
          <!-- KPIs Resumen del Escaneo -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <span class="kpi-numero">{reporteAnalisis.total_folios}</span>
              <span class="kpi-titulo">Folios con salidas duplicadas</span>
            </div>
            <div class="kpi-card alerta">
              <span class="kpi-numero">{reporteAnalisis.total_elegibles}</span>
              <span class="kpi-titulo">Productos listos para corrección</span>
            </div>
            <div class="kpi-card exito">
              <span class="kpi-numero">{reporteAnalisis.total_corregidos}</span>
              <span class="kpi-titulo">Productos ya corregidos</span>
            </div>
            <div class="kpi-card advertencia">
              <span class="kpi-numero">{reporteAnalisis.total_pendientes_auditoria}</span>
              <span class="kpi-titulo">Auditorías pendientes de snaplog</span>
            </div>
          </div>

          <!-- Filtro de pedidos -->
          <div class="filtros-tabla">
            <label>
              Filtrar pedidos:
              <select bind:value={filtroEstadoAnalisis}>
                <option value="todos">Todos los pedidos ({pedidosTotales.length})</option>
                <option value="pendiente">Pendientes de corrección ({pedidosTotales.filter(p => p.total_elegibles > 0).length})</option>
                <option value="corregido">Completamente corregidos ({pedidosTotales.filter(p => p.estado === 'corregido').length})</option>
                <option value="auditoria_pendiente">Auditoría pendiente ({pedidosTotales.filter(p => p.total_pendientes_auditoria > 0).length})</option>
              </select>
            </label>
            <span class="subtexto">Mostrando {pedidosFiltrados.length} de {pedidosTotales.length} pedido(s)</span>
          </div>

          <!-- Tabla de Resultados de Pedidos -->
          {#if pedidosFiltrados.length === 0}
            <div class="sin-casos">
              <p>No se encontraron pedidos que coincidan con el filtro seleccionado.</p>
            </div>
          {:else}
            <div class="tabla-contenedor">
              <table class="tabla-casos">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Cliente</th>
                    <th>Productos con duplicidad</th>
                    <th>Estado del pedido</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {#each pedidosFiltrados as p}
                    <tr class="fila-caso estado-{p.estado}">
                      <td><strong>#{p.folio}</strong></td>
                      <td>
                        <strong class="cliente-nombre-tabla">{p.cliente}</strong>
                      </td>
                      <td>
                        <div class="resumen-duplicados">
                          <span class="badge-total-prods">{p.total_productos} producto(s)</span>
                          <div class="desglose-linea">
                            {#if p.total_elegibles > 0}
                              <span class="tag-sub tag-elegible">{p.total_elegibles} listo(s) para corregir</span>
                            {/if}
                            {#if p.total_corregidos > 0}
                              <span class="tag-sub tag-corregido">{p.total_corregidos} ya corregido(s)</span>
                            {/if}
                            {#if p.total_pendientes_auditoria > 0}
                              <span class="tag-sub tag-auditoria">{p.total_pendientes_auditoria} snaplog pendiente</span>
                            {/if}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="etiqueta-estado {p.estado}">
                          {p.estado_etiqueta || p.estado.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <div class="acciones-pedido-grid">
                          <button
                            type="button"
                            class="btn-abrir-modal-pedido"
                            on:click={() => pedidoSeleccionadoParaModal = p}
                          >
                            Ver productos y corregir
                          </button>
                          {#if p.total_corregidos > 0}
                            <a
                              href="/app/dev_tools/salidas_duplicadas/pdf?folio={p.folio}"
                              target="_blank"
                              class="btn-pdf-tabla"
                              title="Descargar PDF de Corroboración de Existencias Físicas"
                            >
                              📄 PDF Corroboración
                            </a>
                          {/if}
                          <button
                            type="button"
                            class="btn-ir-folio"
                            on:click={() => irAConsultarFolio(p.folio)}
                            title="Ver en la pestaña Consulta por Folio"
                          >
                            Consultar folio
                          </button>
                        </div>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}
      </section>
    {/if}
  </main>

  <!-- Modal de Gestión y Corrección de Productos del Pedido -->
  {#if pedidoSeleccionadoParaModal}
    <ModalProductosPedido
      pedido={pedidoSeleccionadoParaModal}
      on:close={() => pedidoSeleccionadoParaModal = null}
      on:actualizado={() => escanearUltimosMeses()}
    />
  {/if}

  {#if productoMovimientos && resultado}
    <ModalMovimientos producto={productoMovimientos} folio={resultado.folio} on:close={() => productoMovimientos = null} />
  {/if}
  {#if progreso}
    <ModalProgreso {progreso} on:close={() => progreso = null} />
  {/if}
{:else}
  <p class="error">Acceso restringido al usuario autorizado.</p>
{/if}

<style>
  .herramienta { max-width: 1200px; margin: 30px auto; padding: 0 24px 60px; color: #233942; }
  .herramienta.con-seleccion { padding-bottom: 120px; }
  header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 3px solid #19795e; padding-bottom: 20px; }
  h1, h2, h3, p { margin: 0; } h1 { font-size: 30px; margin: 4px 0 8px; } h2 { font-size: 23px; } h2 span { font-size: 16px; font-weight: normal; margin-left: 12px; }
  .etiqueta { font-size: 11px; font-weight: bold; letter-spacing: .12em; color: #397361; }
  .insignia { color: #19795e; background: #dcece5; padding: 8px 12px; font-size: 11px; font-weight: bold; letter-spacing: .06em; }
  
  /* Pestañas de Navegación */
  .nav-tabs { display: flex; gap: 10px; margin: 24px 0 16px; border-bottom: 2px solid #d5dfe0; }
  .nav-tab { display: flex; align-items: center; gap: 8px; padding: 12px 20px; font-weight: bold; font-size: 14px; cursor: pointer; color: #52686b; border-bottom: 3px solid transparent; transition: all 0.2s; }
  .nav-tab:hover { color: #16785c; }
  .nav-tab.active { color: #16785c; border-bottom-color: #16785c; background: #f0f5f4; border-radius: 4px 4px 0 0; }
  .icono-tab { font-family: 'Material Icons'; font-size: 18px; }
  .badge-alerta { background: #aa382c; color: white; border-radius: 12px; padding: 2px 8px; font-size: 11px; margin-left: 4px; }

  .consulta { background: white; padding: 20px; margin-top: 10px; border: 1px solid #d5dfe0; }
  label { font-weight: bold; } .busqueda { display: flex; gap: 10px; margin-top: 8px; }
  input[type=number], input[type=text] { width: 220px; padding: 10px; border: 1px solid #abbcbf; border-radius: 3px; }
  button { border: 0; padding: 11px 18px; border-radius: 3px; background: #16785c; color: white; font-weight: bold; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .aviso { margin: 18px 0; padding: 14px 18px; background: #fff3d7; border-left: 4px solid #c38313; line-height: 1.5; }
  .error, .exito { padding: 14px; margin: 12px 0; } .error { background: #ffe6e3; color: #8e271b; } .exito { background: #dcefe5; color: #14583e; }
  .resultado { border: 1px solid #d5dfe0; background: white; }
  .cabecera-resultado { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #d5dfe0; }
  .producto { padding: 17px 20px; border-bottom: 1px solid #e0e7e8; } .producto-principal { display: flex; align-items: center; gap: 14px; }
  .seleccion { display: flex; gap: 10px; align-items: center; } .seleccion input { width: 18px; height: 18px; accent-color: #19795e; }
  .numero { color: #899b9e; font-size: 12px; } .nombre { flex: 1; } .nombre small { display: block; color: #607679; margin-top: 4px; }
  .estado { background: #eceff0; padding: 5px 9px; font-size: 12px; } .estado.elegible { background: #e0f2e7; color: #17653f; }
  button.ver-movimientos { background: white; border: 1px solid #9dbbb0; color: #17684f; padding: 8px 11px; }
  button.corregir-uno { padding: 9px 11px; }
  .motivo { color: #52686b; margin: 10px 0 0 47px; font-size: 13px; }
  .auditoria-pendiente { margin: 12px 0 0 47px; padding: 12px; background: #fff3d7; color: #694500; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .movimientos { display: flex; gap: 10px; margin: 12px 0 0 47px; flex-wrap: wrap; }
  .movimientos div { background: #f0f5f4; padding: 10px 12px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; font-size: 13px; }
  .movimientos strong { color: #aa382c; } .movimientos small { color: #687b7e; }
  .resumen-acciones { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .seleccionar-todos { display: flex; gap: 8px; align-items: center; font-size: 13px; }
  .seleccionar-todos input { width: 18px; height: 18px; accent-color: #19795e; }
  .acciones-flotantes { position: fixed; z-index: 20; left: 50%; bottom: 18px; transform: translateX(-50%); width: min(520px, calc(100% - 32px)); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #e7f2ed; border: 1px solid #9dbbb0; border-radius: 5px; box-shadow: 0 4px 18px #23394244; }

  /* Estilos Sección de Análisis */
  .analisis-seccion { background: white; border: 1px solid #d5dfe0; padding: 24px; border-radius: 4px; }
  .panel-control-analisis { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0e7e8; padding-bottom: 16px; margin-bottom: 20px; }
  .subtexto { color: #607679; font-size: 13px; margin-top: 4px; }
  .acciones-escaneo { display: flex; gap: 10px; align-items: center; }
  .select-meses { padding: 10px; border: 1px solid #abbcbf; border-radius: 3px; font-weight: bold; }
  .cargando-box { text-align: center; padding: 40px 20px; }
  .cargando-box p { font-weight: bold; margin: 12px 0 4px; color: #16785c; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .kpi-card { background: #f0f5f4; border-left: 4px solid #16785c; padding: 16px; border-radius: 3px; display: flex; flex-direction: column; }
  .kpi-card.alerta { background: #ffe6e3; border-left-color: #aa382c; }
  .kpi-card.exito { background: #dcefe5; border-left-color: #14583e; }
  .kpi-card.advertencia { background: #fff3d7; border-left-color: #c38313; }
  .kpi-numero { font-size: 28px; font-weight: bold; color: #233942; }
  .kpi-titulo { font-size: 12px; color: #52686b; font-weight: bold; margin-top: 4px; }
  .filtros-tabla { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 13px; }
  .filtros-tabla select { padding: 6px 10px; border: 1px solid #abbcbf; border-radius: 3px; margin-left: 8px; }
  .tabla-contenedor { overflow-x: auto; border: 1px solid #e0e7e8; }
  .tabla-casos { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tabla-casos th { background: #e8f0ed; padding: 10px 12px; text-align: left; }
  .tabla-casos td { padding: 12px; border-bottom: 1px solid #e0e7e8; vertical-align: top; }
  .tabla-casos td small { display: block; color: #607679; margin-top: 2px; }
  .badge-salidas { background: #ffe6e3; color: #8e271b; font-weight: bold; padding: 3px 7px; border-radius: 3px; }
  .badge-total-prods { background: #feebe8; color: #9c271b; font-weight: bold; padding: 3px 8px; border-radius: 3px; font-size: 12px; display: inline-block; }
  .resumen-duplicados { display: flex; flex-direction: column; gap: 4px; }
  .desglose-linea { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; margin-top: 2px; }
  .tag-sub { padding: 1px 6px; border-radius: 3px; }
  .tag-elegible { background: #fff3d7; color: #825300; font-weight: bold; }
  .tag-corregido { background: #dcefe5; color: #14583e; }
  .tag-auditoria { background: #ffe6e3; color: #8e271b; font-weight: bold; }
  .cliente-nombre-tabla { font-size: 14px; color: #233942; }

  .etiqueta-estado { font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 3px; text-transform: uppercase; display: inline-block; }
  .etiqueta-estado.pendiente { background: #fff3d7; color: #825300; border: 1px solid #ebd39b; }
  .etiqueta-estado.parcial { background: #fff8e8; color: #916800; border: 1px solid #dcc287; }
  .etiqueta-estado.completado { background: #dcefe5; color: #14583e; border: 1px solid #a8d5be; }
  .etiqueta-estado.elegible_revision { background: #fff3d7; color: #825300; }
  .etiqueta-estado.corregido { background: #dcefe5; color: #14583e; }
  .etiqueta-estado.auditoria_pendiente { background: #ffe6e3; color: #8e271b; }
  .etiqueta-estado.anomalia_grave { background: #8e271b; color: white; }
  .etiqueta-estado.cancelado { background: #e0e7e8; color: #52686b; }
  
  .acciones-pedido-grid { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .btn-abrir-modal-pedido { background: #16785c; color: white; border: 0; padding: 7px 14px; font-size: 12px; font-weight: bold; border-radius: 3px; cursor: pointer; white-space: nowrap; }
  .btn-abrir-modal-pedido:hover { background: #125e48; }
  .btn-pdf-tabla { background: #14583e; color: white; text-decoration: none; padding: 6px 12px; font-size: 12px; font-weight: bold; border-radius: 3px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; transition: background .2s; }
  .btn-pdf-tabla:hover { background: #0e3f2c; color: white; }
  .btn-ir-folio { background: white; border: 1px solid #abbcbf; color: #40575b; padding: 6px 12px; font-size: 12px; border-radius: 3px; white-space: nowrap; cursor: pointer; }
  .btn-ir-folio:hover { border-color: #16785c; color: #16785c; }
  .sin-casos { text-align: center; padding: 30px; color: #607679; }

  @media (max-width: 650px) {
    header, .cabecera-resultado, .panel-control-analisis { flex-direction: column; align-items: flex-start; gap: 12px; }
    .busqueda, .acciones-escaneo { flex-wrap: wrap; }
    .producto-principal { flex-wrap: wrap; }
    .motivo, .movimientos { margin-left: 0; }
    .acciones-flotantes { bottom: 8px; padding: 10px; }
  }
</style>
