<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import ModalMovimientos from "./_ModalMovimientos.svelte";
  import ModalProgreso from "./_ModalProgreso.svelte";
  import progresoCorreccion from "./_progreso";

  export let pedido; // { folio, cliente, total_productos, total_elegibles, total_corregidos, ... }

  const dispatch = createEventDispatcher();
  let dialogo;
  let cargando = false;
  let error = "";
  let mensaje = "";
  let resultado = null;
  let seleccion = [];
  let ocupado = false;
  let filtroSoloDuplicados = true;
  let productoMovimientos = null;
  let progreso = null;

  onMount(() => {
    if (dialogo && typeof dialogo.showModal === "function") {
      dialogo.showModal();
    }
    cargarDetallePedido();
  });

  async function solicitar(accion, productos = [], productoId = null) {
    const respuesta = await fetch("/app/dev_tools/salidas_duplicadas/operaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, folio: pedido.folio, productos, producto_id: productoId })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo completar la operación.");
    return datos;
  }

  async function cargarDetallePedido() {
    cargando = true;
    error = "";
    try {
      resultado = await solicitar("consultar");
    } catch (e) {
      error = e.message;
    } finally {
      cargando = false;
    }
  }

  $: todosProductos = resultado && Array.isArray(resultado.items) ? resultado.items : [];
  $: productosDuplicados = todosProductos.filter(item => (item.salidas && item.salidas.length >= 2) || item.correccion || item.elegible);
  $: productosAMostrar = filtroSoloDuplicados ? productosDuplicados : todosProductos;
  $: productosElegibles = productosAMostrar.filter(item => item.elegible);
  $: seleccionadosElegibles = productosElegibles.filter(item => seleccion.includes(item.producto_id));
  $: todosSeleccionados = productosElegibles.length > 0 && seleccionadosElegibles.length === productosElegibles.length;

  function seleccionarTodos(evento) {
    seleccion = evento.currentTarget.checked ? productosElegibles.map(item => item.producto_id) : [];
  }

  function fecha(valor) {
    if (!valor || isNaN(new Date(valor).getTime())) return "Sin fecha";
    return new Date(valor).toLocaleString("es-MX");
  }

  async function corregir(elegidos) {
    const detalle = elegidos.map(item => `${item.nombre}: +${item.cantidad}`).join("\n");
    if (!window.confirm(`Se reincorporará una sola salida duplicada por producto del folio #${pedido.folio}:\n\n${detalle}\n\nConfirma que revisaste las salidas y que corresponden a descuentos duplicados.`)) return;
    ocupado = true;
    error = "";
    mensaje = "";
    seleccion = [];
    progreso = { folio: pedido.folio, total: elegidos.length, completados: 0, actual: null, etapa: "Preparando corrección…", enCurso: true, error: "" };
    try {
      const avance = await progresoCorreccion.procesar(elegidos, async item => {
        const producto = {
          id: item.producto_id,
          cantidad: item.cantidad,
          stock: item.stock,
          salidas: item.salidas.map(salida => salida.id)
        };
        const datos = await solicitar("corregir", [producto]);
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
        mensaje = `Se corrigieron ${avance.completados} producto(s) exitosamente.`;
        dispatch("actualizado", { folio: pedido.folio, completados: avance.completados });
      }
    } catch (e) {
      progreso = { ...progreso, error: "No se pudo confirmar la operación: " + e.message };
    } finally {
      progreso = { ...progreso, actual: null, etapa: "Actualizando estado del pedido…" };
      try {
        resultado = await solicitar("consultar");
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
    try {
      const datos = await solicitar("recuperar_auditoria", [], item.producto_id);
      mensaje = datos.mensaje;
      dispatch("actualizado", { folio: pedido.folio });
    } catch (e) {
      error = "No se pudo recuperar el snaplog: " + e.message;
    } finally {
      try {
        resultado = await solicitar("consultar");
      } catch (e) {
        error = (error ? error + " " : "") + "No se pudo actualizar: " + e.message;
      }
      ocupado = false;
    }
  }

  function verMovimientos(item) {
    productoMovimientos = {
      producto_id: item.producto_id,
      nombre: item.nombre || item.producto_nombre,
      codigo: item.codigo || item.producto_codigo
    };
  }
</script>

<dialog bind:this={dialogo} on:close={() => dispatch("close")} aria-labelledby="titulo-modal-pedido">
  <div class="cabecera">
    <div>
      <p class="etiqueta">AUDITORÍA Y CORRECCIÓN POR PEDIDO</p>
      <h2 id="titulo-modal-pedido">Pedido #{pedido.folio} — <span class="cliente-nombre">{resultado ? (resultado.cliente || "Cliente sin nombre") : pedido.cliente}</span></h2>
      <p class="subtitulo">
        {#if cargando}
          Consultando productos y snaplogs…
        {:else if resultado}
          {todosProductos.length} productos en el pedido · {productosDuplicados.length} con salidas duplicadas · {productosElegibles.length} listo(s) para corregir
        {:else}
          Folio #{pedido.folio}
        {/if}
      </p>
    </div>
    <button class="cerrar" type="button" on:click={() => dialogo.close()} aria-label="Cerrar modal">×</button>
  </div>

  <div class="cuerpo">
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if mensaje}<p class="exito" role="status">{mensaje}</p>{/if}

    {#if cargando}
      <div class="cargando-box">
        <div class="spinner"></div>
        <p>Cargando detalle de productos y validando salidas duplicadas…</p>
      </div>
    {:else if resultado}
      <!-- Barra de herramientas y filtros del modal -->
      <div class="barra-herramientas">
        <div class="filtro-toggle">
          <label class="toggle-label">
            <input type="checkbox" bind:checked={filtroSoloDuplicados} />
            Mostrar solo productos con duplicidad ({productosDuplicados.length})
          </label>
        </div>

        <div class="acciones-lote">
          {#if productosElegibles.length > 0}
            <label class="seleccionar-todos">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                indeterminate={seleccionadosElegibles.length > 0 && !todosSeleccionados}
                on:change={seleccionarTodos}
                disabled={ocupado}
              />
              Seleccionar todos los elegibles ({productosElegibles.length})
            </label>
            <button
              type="button"
              class="btn-corregir-lote"
              on:click={() => corregir(seleccionadosElegibles)}
              disabled={ocupado || !seleccionadosElegibles.length}
            >
              Corregir seleccionados ({seleccionadosElegibles.length})
            </button>
          {:else}
            <div class="completado-box">
              <span class="sin-pendientes">✓ Corrección de existencias completada</span>
              <a
                href="/app/dev_tools/salidas_duplicadas/pdf?folio={pedido.folio}"
                target="_blank"
                class="btn-pdf-modal"
                title="Descargar PDF para entregar al personal y corroborar existencias físicas"
              >
                📄 PDF Corroboración Física
              </a>
            </div>
          {/if}
        </div>
      </div>

      <!-- Lista de Productos -->
      {#if productosAMostrar.length === 0}
        <div class="vacio">
          <p>No se encontraron productos que coincidan con el filtro.</p>
        </div>
      {:else}
        <div class="lista-productos">
          {#each productosAMostrar as item, idx}
            <article class="tarjeta-producto {item.elegible ? 'elegible' : ''} {item.correccion ? 'ya-corregido' : ''}">
              <div class="fila-principal">
                <label class="chk-container">
                  <input
                    type="checkbox"
                    value={item.producto_id}
                    bind:group={seleccion}
                    disabled={!item.elegible || ocupado}
                  />
                  <span class="num-item">{idx + 1}</span>
                </label>

                <div class="info-producto">
                  <h4 class="nombre-producto">{item.nombre}</h4>
                  <div class="detalles-producto">
                    <span class="codigo-txt">{item.codigo || "Sin código"}</span>
                    <span class="separador">·</span>
                    <span>Pedido: <strong>{item.cantidad}</strong></span>
                    <span class="separador">·</span>
                    <span>Stock actual: <strong>{item.stock == null ? "—" : item.stock}</strong></span>
                  </div>
                </div>

                <div class="estado-insignia">
                  {#if item.correccion}
                    <span class="badge badge-corregido">YA CORREGIDO</span>
                  {:else if item.elegible}
                    <span class="badge badge-elegible">LISTO PARA CORREGIR</span>
                  {:else}
                    <span class="badge badge-no-corregible">NO CORREGIBLE</span>
                  {/if}
                </div>

                <div class="botones-accion">
                  <button
                    type="button"
                    class="btn-movimientos"
                    on:click={() => verMovimientos(item)}
                    disabled={!item.producto_id || ocupado}
                    title="Ver historial de snaplogs del producto"
                  >
                    Ver movimientos
                  </button>

                  <button
                    type="button"
                    class="btn-corregir-unitario"
                    on:click={() => corregir([item])}
                    disabled={!item.elegible || ocupado}
                  >
                    Corregir +{item.cantidad}
                  </button>
                </div>
              </div>

              <!-- Motivo o Diagnóstico -->
              {#if item.motivo}
                <p class="motivo-txt">{item.motivo}</p>
              {/if}

              <!-- Auditoría Pendiente -->
              {#if item.correccion && item.correccion.auditoria_pendiente}
                <div class="auditoria-alerta" role="alert">
                  <span>⚠️ El inventario ya fue devuelto, pero el snaplog no se confirmó.</span>
                  <button type="button" class="btn-recuperar" on:click={() => recuperarAuditoria(item)} disabled={ocupado}>
                    Recuperar snaplog
                  </button>
                </div>
              {/if}

              <!-- Salidas Detectadas -->
              {#if item.salidas && item.salidas.length > 0}
                <div class="caja-salidas">
                  <p class="salidas-titulo">Salidas registradas para este pedido ({item.salidas.length}):</p>
                  <div class="salidas-grid">
                    {#each item.salidas as s}
                      <div class="salida-item">
                        <span class="salida-fecha">{fecha(s.fecha)}</span>
                        <strong class="salida-cant">−{s.cantidad}</strong>
                        <span class="salida-stock">Stock: {s.antes} → {s.despues}</span>
                        <small class="salida-id">ID: {s.id}</small>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <div class="pie">
    {#if productosElegibles.length === 0 && productosDuplicados.length > 0}
      <a
        href="/app/dev_tools/salidas_duplicadas/pdf?folio={pedido.folio}"
        target="_blank"
        class="btn-pdf-modal"
        title="Descargar PDF para entregar a almacén y corroborar existencias físicas"
      >
        📄 Descargar PDF de Corroboración Física
      </a>
    {/if}
    <button type="button" class="btn-cerrar-pie" on:click={() => dialogo.close()}>
      Cerrar
    </button>
  </div>
</dialog>

<!-- Modal de Movimientos de un producto (se monta en top-layer encima) -->
{#if productoMovimientos}
  <ModalMovimientos
    producto={productoMovimientos}
    folio={pedido.folio}
    on:close={() => productoMovimientos = null}
  />
{/if}

<!-- Modal de Progreso de Corrección -->
{#if progreso}
  <ModalProgreso
    {progreso}
    on:close={() => progreso = null}
  />
{/if}

<style>
  dialog {
    width: min(1150px, calc(100% - 32px));
    max-height: calc(100% - 32px);
    padding: 0;
    border: 0;
    border-radius: 6px;
    color: #233942;
    box-shadow: 0 16px 50px rgba(18, 44, 42, 0.45);
    background: #fbfdfd;
  }
  dialog::backdrop {
    background: rgba(16, 42, 42, 0.78);
  }

  .cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 22px 26px;
    background: white;
    border-bottom: 3px solid #16785c;
  }
  .etiqueta {
    color: #16785c;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: .12em;
    margin: 0;
  }
  h2 {
    font-size: 22px;
    margin: 4px 0 2px;
    color: #233942;
  }
  .cliente-nombre {
    color: #435b60;
    font-weight: normal;
  }
  .subtitulo {
    color: #607679;
    font-size: 13px;
    margin: 4px 0 0;
  }
  .cerrar {
    font-size: 26px;
    background: none;
    border: 0;
    cursor: pointer;
    color: #7b9195;
    padding: 0 8px;
    line-height: 1;
  }
  .cerrar:hover {
    color: #233942;
  }

  .cuerpo {
    padding: 20px 26px;
    overflow-y: auto;
    max-height: calc(85vh - 160px);
  }

  .cargando-box {
    text-align: center;
    padding: 50px 20px;
    color: #16785c;
    font-weight: bold;
  }
  .spinner {
    width: 32px;
    height: 32px;
    margin: 0 auto 14px;
    border: 3px solid #d5dfe0;
    border-top-color: #16785c;
    border-radius: 50%;
    animation: girar .8s linear infinite;
  }
  @keyframes girar {
    to { transform: rotate(360deg); }
  }

  .error {
    background: #ffe6e3;
    color: #8e271b;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 14px;
    border-left: 4px solid #8e271b;
  }
  .exito {
    background: #dcefe5;
    color: #14583e;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 14px;
    border-left: 4px solid #14583e;
  }

  .barra-herramientas {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 14px 18px;
    border: 1px solid #d5dfe0;
    border-radius: 4px;
    margin-bottom: 18px;
    gap: 16px;
    flex-wrap: wrap;
  }
  .toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    color: #314a4f;
  }
  .toggle-label input {
    accent-color: #16785c;
    width: 16px;
    height: 16px;
  }

  .acciones-lote {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .seleccionar-todos {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
  }
  .seleccionar-todos input {
    accent-color: #16785c;
    width: 16px;
    height: 16px;
  }
  .btn-corregir-lote {
    background: #16785c;
    color: white;
    border: 0;
    padding: 8px 16px;
    border-radius: 3px;
    font-weight: bold;
    cursor: pointer;
    font-size: 13px;
  }
  .btn-corregir-lote:disabled {
    opacity: .45;
    cursor: not-allowed;
  }
  .sin-pendientes {
    color: #2b7754;
    font-size: 13px;
    font-weight: bold;
  }

  .lista-productos {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .tarjeta-producto {
    background: white;
    border: 1px solid #d5dfe0;
    border-radius: 4px;
    padding: 16px 20px;
    transition: border-color .2s;
  }
  .tarjeta-producto.elegible {
    border-left: 4px solid #c38313;
  }
  .tarjeta-producto.ya-corregido {
    border-left: 4px solid #14583e;
    background: #fcfdfd;
  }

  .fila-principal {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .chk-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .chk-container input {
    accent-color: #16785c;
    width: 18px;
    height: 18px;
  }
  .num-item {
    font-size: 12px;
    color: #7b9195;
    min-width: 20px;
  }

  .info-producto {
    flex: 1;
    min-width: 250px;
  }
  .nombre-producto {
    margin: 0 0 3px;
    font-size: 14px;
    color: #233942;
  }
  .detalles-producto {
    font-size: 12px;
    color: #5c7477;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .codigo-txt {
    font-weight: bold;
    color: #3b5054;
  }
  .separador {
    color: #a8bec1;
  }

  .estado-insignia {
    min-width: 130px;
    text-align: center;
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: .04em;
  }
  .badge-corregido {
    background: #dcefe5;
    color: #14583e;
  }
  .badge-elegible {
    background: #fff3d7;
    color: #825300;
  }
  .badge-no-corregible {
    background: #eef2f3;
    color: #607679;
  }

  .botones-accion {
    display: flex;
    gap: 8px;
  }
  .btn-movimientos {
    background: white;
    border: 1px solid #16785c;
    color: #16785c;
    padding: 7px 12px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
  }
  .btn-movimientos:hover:not(:disabled) {
    background: #ebf5f2;
  }
  .btn-corregir-unitario {
    background: #16785c;
    border: 1px solid #16785c;
    color: white;
    padding: 7px 12px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
  }
  .btn-corregir-unitario:disabled, .btn-movimientos:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .motivo-txt {
    margin: 8px 0 0 42px;
    font-size: 12px;
    color: #607679;
  }

  .auditoria-alerta {
    margin: 10px 0 0 42px;
    background: #ffe6e3;
    border: 1px solid #e2887f;
    border-radius: 3px;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #8e271b;
  }
  .btn-recuperar {
    background: #aa382c;
    color: white;
    border: 0;
    padding: 4px 10px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
  }

  .caja-salidas {
    margin: 10px 0 0 42px;
    padding: 10px 14px;
    background: #f4f8f7;
    border-radius: 4px;
    border: 1px solid #e1ece9;
  }
  .salidas-titulo {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: bold;
    color: #425e58;
    text-transform: uppercase;
  }
  .salidas-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .salida-item {
    background: white;
    border: 1px solid #d5dfe0;
    padding: 6px 10px;
    border-radius: 3px;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .salida-fecha {
    color: #607679;
  }
  .salida-cant {
    color: #aa382c;
    font-size: 13px;
  }
  .salida-stock {
    color: #486165;
  }
  .salida-id {
    color: #92a4a7;
    font-family: monospace;
    font-size: 10px;
  }

  .vacio {
    text-align: center;
    padding: 40px;
    color: #7b9195;
  }

  .completado-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .btn-pdf-modal {
    background: #14583e;
    color: white;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 3px;
    font-size: 13px;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background .2s;
  }
  .btn-pdf-modal:hover {
    background: #0f412e;
    color: white;
  }

  .pie {
    padding: 14px 26px;
    border-top: 1px solid #d5dfe0;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .btn-cerrar-pie {
    background: #eef2f3;
    border: 1px solid #c8d3d5;
    color: #4a6165;
    padding: 8px 18px;
    border-radius: 3px;
    font-weight: bold;
    cursor: pointer;
  }

  @media (max-width: 700px) {
    .cabecera, .cuerpo, .pie { padding: 14px; }
    .motivo-txt, .auditoria-alerta, .caja-salidas { margin-left: 0; }
    .fila-principal { flex-direction: column; align-items: flex-start; }
    .botones-accion { width: 100%; justify-content: flex-end; }
  }
</style>

