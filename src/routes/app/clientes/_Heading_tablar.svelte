<script>

</script>

<style>
  .grid-container {
    border-bottom: 1px solid #c1b9b9;
    padding: 8px 8px 12px 8px;
    font-weight: 600;
    color: #8a8a8a;
    display: grid;
    grid-template-columns: 1.2fr 2fr 1.2fr 1.3fr 0.8fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco ocho";
    align-items: center;
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;
  }

  .tres {
    grid-area: tres;
    text-align: center;
  }

  .cuatro {
    grid-area: cuatro;
    text-align: center;
  }

  .cinco {
    grid-area: cinco;
    text-align: center;
  }

  .ocho {
    grid-area: ocho;
    text-align: center;
  }
</style>

<div class="grid-container">
  <div class="uno">Alias</div>
  <div class="dos">Nombre</div>
  <div class="tres centrado">Teléfono</div>
  <div class="cuatro centrado">RFC</div>
  <div class="cinco centrado">Descuento</div>
  <div class="ocho centrado">Acciones</div>
</div>