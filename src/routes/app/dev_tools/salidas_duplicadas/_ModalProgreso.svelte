<script>
  import { createEventDispatcher, onMount } from "svelte";

  export let progreso;
  const dispatch = createEventDispatcher();
  let dialogo;

  onMount(() => {
    dialogo.showModal();
  });
</script>

<dialog bind:this={dialogo} on:cancel|preventDefault aria-labelledby="titulo-progreso">
  <div class="interior">
    <p class="etiqueta">CORRECCIÓN DE INVENTARIO · FOLIO #{progreso.folio}</p>
    <h2 id="titulo-progreso">{progreso.enCurso ? "Corrigiendo productos" : "Resultado de la corrección"}</h2>
    <p class="descripcion">Cada producto se cuenta después de confirmar su ajuste y su snaplog.</p>

    <div class="contador" aria-live="polite">
      <strong>{progreso.completados}</strong><span> / {progreso.total} productos confirmados</span>
    </div>
    <progress max={progreso.total} value={progreso.completados} aria-label="Productos corregidos" />

    {#if progreso.enCurso}
      <p class="estado" role="status">
        {#if progreso.actual}
          Procesando: <strong>{progreso.actual}</strong>
        {:else}
          {progreso.etapa}
        {/if}
      </p>
      <p class="ayuda">No cierres ni recargues esta página mientras continúa el proceso.</p>
    {:else if progreso.error}
      <div class="aviso error" role="alert">
        <strong>El proceso se detuvo{progreso.fallido ? ` en ${progreso.fallido}` : ""}.</strong>
        <p>{progreso.error}</p>
        <p>Consulta el estado del pedido antes de volver a intentar. El producto interrumpido podría tener una auditoría pendiente.</p>
      </div>
    {:else}
      <p class="aviso exito" role="status">La corrección y el snaplog de cada producto fueron confirmados.</p>
    {/if}

    {#if !progreso.enCurso}
      <button type="button" on:click={() => dispatch("close")}>Cerrar y revisar el pedido</button>
    {/if}
  </div>
</dialog>

<style>
  dialog { width: min(520px, calc(100% - 32px)); max-height: calc(100% - 32px); padding: 0; border: 0; border-radius: 6px; color: #233942; box-shadow: 0 16px 50px #122c2a66; }
  dialog::backdrop { background: #102a2ac2; }
  .interior { padding: 28px; border-top: 5px solid #19795e; }
  p, h2 { margin: 0; }
  .etiqueta { color: #397361; font-size: 11px; font-weight: bold; letter-spacing: .12em; }
  h2 { margin: 8px 0; font-size: 24px; }
  .descripcion, .ayuda { color: #607679; font-size: 13px; line-height: 1.5; }
  .contador { margin: 26px 0 8px; color: #52686b; }
  .contador strong { font-size: 30px; color: #16785c; }
  progress { display: block; width: 100%; height: 12px; accent-color: #19795e; }
  .estado { margin: 20px 0 8px; overflow-wrap: anywhere; }
  .aviso { margin-top: 20px; padding: 14px; line-height: 1.5; }
  .aviso p { margin-top: 8px; }
  .error { background: #ffe6e3; color: #8e271b; }
  .exito { background: #dcefe5; color: #14583e; }
  button { margin-top: 20px; border: 0; border-radius: 3px; padding: 11px 18px; background: #16785c; color: white; font-weight: bold; cursor: pointer; }
  @media (max-width: 650px) { .interior { padding: 20px; } }
</style>
