<script>

</script>

<style>
  .grid-container {
    border-bottom: 1px solid #c1b9b9;
    padding-bottom: 7px;
    font-weight: 600;
    color: #8a8a8a;
    display: grid;
    grid-template-columns: 0.5fr 0px 1fr 1fr 200px 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro seis siete ocho nueve";
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;
  }

  .tres {
    grid-area: tres;
  }

  .cuatro {
    grid-area: cuatro;
  }

  .cinco {
    grid-area: cinco;
  }

  .seis {
    grid-area: seis;
  }

  .siete {
    grid-area: siete;
  }

  .ocho {
    grid-area: ocho;
  }

  .nueve {
    grid-area: nueve;
  }
</style>

<div class="grid-container ">
  <div class="uno centrado">Folio</div>
  <div class="dos "></div>
  <div class="tres centrado">Fecha <i class="material-icons vertical-alineado">event</i></div>
  <div class="cuatro centrado">Descuento <br>Total en pesos </div>
  <!-- <div class="cinco centrado">Total en pesos</div> -->
  <div class="seis centrado">Cliente <i class="material-icons vertical-alineado">person</i></div>
  <div class="siete centrado">Agente</div>
  <div class="ocho centrado">Status</div>
  <div class="nueve centrado">Acciones</div>
</div>
