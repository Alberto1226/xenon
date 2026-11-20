<script>
  import { createEventDispatcher, onMount, onDestroy } from "svelte";

  export let producto;
  export let folio;

  const dispatch = createEventDispatcher();
  const nombres = {
    "1": "Inyección de existencias",
    "1b": "Ingreso de existencias",
    "1c": "Corrección de salida duplicada",
    "2": "Descuento de inventario",
    "3": "Sobreescritura de inventario",
    "4a": "Agregar a pedido",
    "4b": "Cambio de cantidad",
    "4c": "Borrar de pedido",
    "4d": "Borrado de pedido completo",
    "5": "Borrado de folios"
  };
  let dialogo;
  let movimientos = [];
  let pagina = 1;
  let hayMas = false;
  let cargando = false;
  let error = "";
  let activo = true;
  let solicitud = 0;

  onMount(() => {
    dialogo.showModal();
    cargar(1);
  });
  onDestroy(() => { activo = false; });

  async function cargar(nuevaPagina) {
    const actual = ++solicitud;
    cargando = true;
    error = "";
    try {
      const respuesta = await fetch("/app/dev_tools/salidas_duplicadas/operaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "movimientos", folio, producto_id: producto.producto_id, pagina: nuevaPagina })
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudieron consultar los movimientos.");
      if (!activo || actual !== solicitud) return;
      movimientos = datos.movimientos;
      hayMas = datos.hay_mas;
      pagina = nuevaPagina;
    } catch (e) {
      if (activo && actual === solicitud) error = e.message;
    } finally {
      if (activo && actual === solicitud) cargando = false;
    }
  }

  function fecha(valor) {
    if (!valor || isNaN(new Date(valor).getTime())) return "Sin fecha";
    return new Date(valor).toLocaleString("es-MX");
  }

  function valor(objeto, campo) {
    return objeto && objeto[campo] != null ? objeto[campo] : "—";
  }
</script>

<dialog bind:this={dialogo} on:close={() => dispatch("close")} aria-labelledby="titulo-movimientos">
  <div class="cabecera">
    <div>
      <p class="etiqueta">HISTORIAL DE INVENTARIO</p>
      <h2 id="titulo-movimientos">{producto.nombre}</h2>
      <p>{producto.codigo || "Sin código"} · Todos los movimientos del producto</p>
    </div>
    <button class="cerrar" type="button" on:click={() => dialogo.close()} aria-label="Cerrar movimientos">×</button>
  </div>
  <div class="cuerpo">
    <p class="leyenda">Se resaltan los movimientos del pedido #{folio}. Se muestran también movimientos de otros pedidos.</p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if cargando}
      <p class="vacio" role="status">Cargando movimientos…</p>
    {:else if !movimientos.length && !error}
      <p class="vacio">Este producto no tiene movimientos registrados.</p>
    {:else if movimientos.length}
      <div class="tabla-contenedor">
        <table>
          <thead><tr><th>Acción y fecha</th><th>Pedido y usuario</th><th>Cantidad<br />anterior → actual</th><th>Existencias<br />antes → después</th><th>Apartados<br />antes → después</th></tr></thead>
          <tbody>
            {#each movimientos as movimiento (movimiento._id)}
              <tr class:destacado={movimiento.pedido && String(movimiento.pedido.folio) === String(folio)}>
                <td><strong>{nombres[movimiento.accion] || `Acción ${movimiento.accion || "sin definir"}`}</strong><small>{fecha(movimiento.fecha)}</small><small>ID: {movimiento._id}</small></td>
                <td>
                  {#if movimiento.pedido && movimiento.pedido.folio}#{movimiento.pedido.folio}{:else}—{/if}
                  <small>{movimiento.pedido && movimiento.pedido.cliente && movimiento.pedido.cliente.nombre || "Sin cliente"}</small>
                  <small>{movimiento.usuario && movimiento.usuario.nombre || "Sin usuario"}</small>
                </td>
                <td>{valor(movimiento, "cantidad_anterior")} → <strong>{valor(movimiento, "cantidad")}</strong></td>
                <td>{valor(movimiento.inventario_antes, "existencias")} → <strong>{valor(movimiento.inventario_despues, "existencias")}</strong></td>
                <td>{valor(movimiento.inventario_antes, "apartados")} → <strong>{valor(movimiento.inventario_despues, "apartados")}</strong></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
  <div class="pie">
    <span>Página {pagina}</span>
    <div>
      <button type="button" class="secundario" disabled={cargando || pagina <= 1} on:click={() => cargar(pagina - 1)}>Anterior</button>
      <button type="button" class="secundario" disabled={cargando || !hayMas} on:click={() => cargar(pagina + 1)}>Siguiente</button>
    </div>
  </div>
</dialog>

<style>
  dialog { width: min(1050px, calc(100% - 32px)); max-height: calc(100% - 32px); padding: 0; border: 0; border-radius: 6px; color: #233942; box-shadow: 0 16px 50px #122c2a66; }
  dialog::backdrop { background: #102a2ac2; }
  .cabecera { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px; border-bottom: 3px solid #19795e; }
  h2, p { margin: 0; } h2 { font-size: 22px; margin: 4px 0; } .cabecera p:last-child { color: #607679; font-size: 13px; }
  .etiqueta { color: #397361; font-size: 11px; font-weight: bold; letter-spacing: .12em; }
  button { cursor: pointer; border: 1px solid #acc4bc; border-radius: 3px; background: white; color: #17684f; font-weight: bold; padding: 9px 14px; }
  button:disabled { opacity: .45; cursor: not-allowed; } .cerrar { font-size: 25px; padding: 0 10px; height: 38px; }
  .cuerpo { padding: 18px 24px; } .leyenda { color: #52686b; font-size: 13px; margin-bottom: 16px; }
  .tabla-contenedor { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: 13px; } th { background: #e8f0ed; text-align: left; padding: 10px; white-space: nowrap; }
  td { padding: 11px 10px; border-bottom: 1px solid #e0e7e8; vertical-align: top; } tr.destacado { background: #fff4d8; } td small { display: block; color: #607679; margin-top: 4px; overflow-wrap: anywhere; }
  .vacio { padding: 24px 0; } .error { background: #ffe6e3; color: #8e271b; padding: 12px; margin-bottom: 12px; }
  .pie { border-top: 1px solid #d5dfe0; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; gap: 12px; } .pie div { display: flex; gap: 8px; }
  @media (max-width: 650px) { .cabecera, .cuerpo, .pie { padding-left: 14px; padding-right: 14px; } }
</style>
