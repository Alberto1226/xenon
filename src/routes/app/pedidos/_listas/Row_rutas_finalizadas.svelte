<script>
  import { formato_precio, convertir_a_fecha_humana } from "./../../../stores";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import Modal_detalle_ruta_finalizada from "./Modal_detalle_ruta_finalizada.svelte";

  export let ruta_finalizada = {};
  export let indice = 0;

  let visible_modal_detalle = false;
  let es_par = (indice + 1) % 2 === 0;

  function abrirDetalle() {
    visible_modal_detalle = true;
  }
</script>

<Modal_detalle_ruta_finalizada
  bind:visible={visible_modal_detalle}
  ruta={ruta_finalizada}
/>

<div class="grid-container row no_select" class:back_par={es_par}>
  <!-- Col 1: Folio y Ruta -->
  <div class="uno centrado no_select">
    <i style="vertical-align:middle; color: #1b5e20;" class="material-icons">task_alt</i>
    <span class="folio">{ruta_finalizada.folio_salida || 'SALIDA'}</span>
  </div>

  <div class="dos no_select" />

  <!-- Col 3: Fecha -->
  <div class="tres no_select">
    <span class="fecha" title="Fecha de finalización de la ruta">
      {convertir_a_fecha_humana(ruta_finalizada.fecha_finalizacion)}
    </span>
    <br />
    <span class="indice_row" title="Ruta asignada">
      Ruta: {ruta_finalizada.nombre_ruta || 'Ruta'}
    </span>
  </div>

  <!-- Col 5: Totales -->
  <div class="cinco centrado no_select">
    <span class="total-vendido" title="Total Vendido en la Ruta">
      $ {formato_precio(ruta_finalizada.totales_financieros ? ruta_finalizada.totales_financieros.total_vendido : 0)}
    </span>
    <br />
    <span class="indice_row" title="Total Cargado Estimado">
      Cargado: $ {formato_precio(ruta_finalizada.totales_financieros ? ruta_finalizada.totales_financieros.total_cargado_estimado : 0)}
    </span>
  </div>

  <!-- Col 6: Nombre Ruta / Info -->
  <div class="seis">
    <div class="sobresaltar no_select">
      <span style="font-weight: bold; color: #19825c;">
        <i class="material-icons vertical-alineado" style="font-size: 14px;">alt_route</i>
        {ruta_finalizada.nombre_ruta || 'Ruta'}
      </span>
      <br />
      <div class="indice_row">
        {ruta_finalizada.pedidos_generados ? ruta_finalizada.pedidos_generados.length : 0} ventas registradas
      </div>
    </div>
  </div>

  <!-- Col 7: Agente -->
  <div class="siete no_select centrado">
    {ruta_finalizada.agente ? ruta_finalizada.agente.nombre : 'Sin Agente'}
    <br />
    <div class="indice_row no_select">
      {ruta_finalizada.agente ? ruta_finalizada.agente.correo : ''}
    </div>
  </div>

  <!-- Col 8: Estatus -->
  <div class="ocho centrado">
    <div class="pill pill_finalizada no_select">
      Finalizada
      <i class="material-icons" style="font-size: 16px; margin-left: 4px;">check_circle</i>
    </div>
  </div>

  <!-- Col 9: Acciones -->
  <div class="nueve centrado">
    <ButtonGroup>
      <Button
        icon
        dense
        color="#1976d2"
        on:click={abrirDetalle}
        title="Ver ventas, productos y folios asignados a clientes"
      >
        <i class="material-icons">assignment_turned_in</i>
      </Button>
    </ButtonGroup>
  </div>
</div>

<style>
  .row {
    height: 76px;
    overflow: hidden;
    padding: 8px;
    border-bottom: 1px solid #e1e1e1;
  }
  .row:hover {
    background-color: rgb(194, 194, 194);
  }
  .grid-container {
    padding: 34px 4px;
    display: grid;
    grid-template-columns: 0.5fr 0px 1fr 1fr 200px 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cinco seis siete ocho nueve";
  }

  .uno { grid-area: uno; margin: auto 0; }
  .dos { grid-area: dos; margin: auto 0; }
  .tres { grid-area: tres; margin: auto 0; padding-left: 10px; }
  .cinco { grid-area: cinco; margin: auto 0; }
  .seis { grid-area: seis; margin: auto auto; }
  .siete { grid-area: siete; margin: auto 0; }
  .ocho { grid-area: ocho; margin: auto 0; }
  .nueve { grid-area: nueve; margin: auto 0; text-align: center; }

  .folio {
    color: #1b5e20;
    font-weight: 800;
    font-size: 1.1em;
  }

  .fecha {
    color: #2b78fe;
  }

  .total-vendido {
    font-weight: 700;
    color: #2e7d32;
    font-size: 1.05em;
  }

  .sobresaltar {
    background: #e0e0e0;
    color: #969696;
    font-weight: 500;
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    margin: 9px;
  }

  .pill {
    padding: 4px 12px;
    border-radius: 50px;
    border: solid 1px #dedede;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .pill_finalizada {
    background: #e8f5e9;
    color: #1b5e20;
    border-color: #a5d6a7;
  }

  .back_par {
    background: #e6e6e6;
  }
</style>
