<script>
  import { onMount } from "svelte";
  import { postData, mensajes_app } from "./../../../stores";
  import Paginacion from "./../../componentes/paginacion/index.svelte";
  import PrepararFacturaModal from "../../pedidos/_listas/PrepararFacturaModal.svelte";

  let pedidos = [];
  let buscar = "";
  let cargando = false;
  let pagina_actual = 1;
  let total_paginas = 1;
  let ha_cambiado_pagina_actual = false;
  let visible_modal = false;
  let pedido_seleccionado = null;
  let temporizador;

  $: if (ha_cambiado_pagina_actual) {
    ha_cambiado_pagina_actual = false;
    cargar();
  }

  onMount(cargar);

  async function cargar() {
    cargando = true;
    try {
      const respuesta = await postData("/app/facturacion/pedidos_pendientes", { buscar, pagina: pagina_actual });
      if (!respuesta.ok) throw new Error(respuesta.mensaje);
      pedidos = respuesta.pedidos;
      total_paginas = respuesta.paginas;
    } catch (err) {
      $mensajes_app.push({ tipo: "error", mensaje: err.message || "Error al consultar los pedidos." });
      $mensajes_app = $mensajes_app;
    }
    cargando = false;
  }

  function al_buscar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      pagina_actual = 1;
      cargar();
    }, 350);
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
</script>

<svelte:head>
  <title>Emitir Factura - Xenon</title>
</svelte:head>

<div class="contenedor">
  <header class="encabezado">
    <div class="titulo">
      <i class="material-icons icono">post_add</i>
      <div>
        <h1>Emitir factura PPD</h1>
        <p>Pedidos enviados sin factura. Las ventas de contado (PUE) se facturan desde Pedidos → Preparar factura.</p>
      </div>
    </div>
  </header>

  <div class="card">
    <input class="buscador" type="search" placeholder="Buscar por folio o cliente" bind:value={buscar} on:input={al_buscar} />

    {#if cargando}
      <p class="vacio">Cargando...</p>
    {:else if pedidos.length === 0}
      <p class="vacio">No hay pedidos pendientes de facturar.</p>
    {:else}
      <table>
        <thead>
          <tr><th>Folio</th><th>Cliente</th><th>Estatus</th><th class="der">Total</th><th>Preparación</th><th></th></tr>
        </thead>
        <tbody>
          {#each pedidos as pedido (pedido._id)}
            <tr>
              <td>{pedido.folio}</td>
              <td>{pedido.cliente && pedido.cliente.nombre}</td>
              <td>{pedido.status}</td>
              <td class="der">{dinero(pedido.total_pedido)}</td>
              <td>{pedido.preparacion_factura && pedido.preparacion_factura.estado ? pedido.preparacion_factura.estado + " (" + (pedido.preparacion_factura.tipo || "PUE") + ")" : "—"}</td>
              <td class="der"><button on:click={() => facturar(pedido)}>Facturar PPD</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
      <Paginacion bind:total_paginas bind:ha_cambiado_pagina_actual bind:pagina_actual />
    {/if}
  </div>
</div>

<PrepararFacturaModal bind:visible={visible_modal} pedido={pedido_seleccionado} tipo="PPD" />

<style>
  .contenedor { padding: 24px; max-width: 1200px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .encabezado { display: flex; align-items: center; background: #1e293b; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 24px; }
  .titulo { display: flex; align-items: center; gap: 16px; }
  .icono { font-size: 36px; color: #38bdf8; }
  h1 { margin: 0; font-size: 22px; font-weight: 700; }
  p { margin: 4px 0 0 0; font-size: 13px; color: #94a3b8; }
  .card { background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; }
  .buscador { width: 100%; max-width: 360px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  .der { text-align: right; }
  .vacio { color: #64748b; text-align: center; padding: 24px; }
  button { background: #1d4ed8; color: #fff; border: 0; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
</style>
