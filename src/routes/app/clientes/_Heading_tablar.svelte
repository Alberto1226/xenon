<script>

</script>

<style>
  
  .grid-container {
    border-bottom: 1px solid
#c1b9b9;
padding-bottom: 7px;
    font-weight: 600;
color:
#8a8a8a;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr  ;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis siete ocho   ";
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;

    width: 13vw;
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



</style>

<div class="grid-container ">
  <div class="uno">
Alias
  </div>
  <div class="dos centrado">Nombre</div>
  <div class="tres centrado">Teléfono</div>
  <div class="cuatro centrado">Fecha nacimiento</div>
  <div class="cinco centrado">Perfil</div>
  <div class="seis centrado">Región</div>
  <div class="siete centrado">Plataforma</div>
  <div class="ocho centrado" >Acciones
  </div>
 
</div>