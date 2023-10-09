<script>
  import { formato_precio } from "./../../../stores";

  export var lista = [];
  export let ubicacion;
</script>

<style>
  .contenedor_lista {
    height: 177px;
    overflow-y: auto;
    background-color: #222d32;
    color: white;
    border-radius: 5px;
    width: 500px;
    padding: 14px;
  }
  .row {
    cursor: pointer;
    height: 33px;
    border-radius: 5px;
    padding-top: 7px;
    padding-left: 4px;
    border-bottom: 1px solid #313131;
  }
  .row:hover {
    background-color: rgb(44, 14, 71);
  }


  .grid-container {
    display: grid;
    grid-template-columns: 1fr ifr ;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos ";
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;
    font-size: .9em;
    font-weight: 200;
  }

</style>

<div class="titulo_lista">
  Lista Totales ventas por cliente en :
  <b>{ubicacion}</b>
  ({lista.length})
</div>
<div class="contenedor_lista">

  {#each lista as item, i}
    <!-- content here -->

    <div class="row">
      <div class="grid-container">
        <div class="uno">
          <span class="indice_row">{i + 1})</span>
          {item._id}
        </div>
        <div class="dos">$ {formato_precio(item.total_ventas_cliente)}  ({item.count} pedidos)</div>
      </div>
    </div>
  {:else}
    <!-- empty list -->
    <div>No se encontraron ventas.</div>
  {/each}
</div>
