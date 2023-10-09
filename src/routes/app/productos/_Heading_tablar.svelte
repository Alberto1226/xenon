<script>
</script>

<div class="grid-container ">
  <div class="uno" />
  <div class="dos">Código</div>
  <div class="tres">Nombre</div>
  <div class="cuatro">Marca</div>
  <div class="cinco">Precio</div>
  <div class="seis">Categoría</div>
  <div class="siete">Existencia <br />Reservado <br /> Disponible</div>

  <div class="once">Acciones</div>
</div>

<style>
  .grid-container {
    border-bottom: 1px solid #c1b9b9;
    padding-bottom: 7px;
    font-weight: 600;
    color: #8a8a8a;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis siete once";
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

  .once {
    grid-area: once;
  }
</style>
