<script>

</script>

<style>
  .grid-container {
    border-bottom: 1px solid #c1b9b9;
    padding-bottom: 7px;
    font-weight: 600;
    color: #8a8a8a;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis";
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
</style>

<div class="grid-container ">
  <div class="uno" title="Usuario con el que se hace login">Sistema</div>
  <div class="dos">Nombre</div>
  <div class="tres">Correo</div>
  <div class="cuatro">Rol</div>
  <div class="cinco">Comisión</div>
  <div class="seis">Acciones</div>
</div>
