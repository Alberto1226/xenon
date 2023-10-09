<script>
  import { formato_precio } from "./../../stores";
  var folio = 0;
  //export var lista = [];
  export var item;
  import { onMount } from "svelte";
  var folio;
  var detalles = [];
  
  onMount(() => {
   
    const body = JSON.parse(item.body);

    folio = body.folio;
    detalles = body.detalles;

   
  });
</script>

<style>
.head{
  text-align: center;
  padding: 5px 0px;
}
  .longhand {
    display: flex;
    border-bottom: gray solid 1px;
    padding: 5px 0px;
    width: 58vw;
  }
  

  .cols5 {
    width: 5%; border-right: 1px dashed;
  }
  .cols10 {
    width: 10%;    border-right: 1px dashed;
  }
  .cols15 {
    width: 15%;    border-right: 1px dashed;
  }
  .cols20 {
    width: 20%;
  }
  .cols50 {
    width: 50%;
  }
  .no_aplica {
    color: brown;
    font-weight: 600;
  }
  .verde {
    color: green;
  }
  .rojo {
    color: red;
  }
</style>

<!-- pedidos/cambiar_descuento_de_pedido -->
<h3>
  folio =
  <b>{folio ? folio : '--'}</b>
</h3>
<br />

<!-- header -->
lista ({detalles.length})
<div class="longhand">
  <div class="cols5">
    <span class="indice_rows head">#</span>

  </div>

  <div class="cols5 head">Id</div>
  <div class="cols15 head">Producto</div>

  <div class="cols10 head">
    Cantidad en pedido
    <i
      class="material-icons vertical-alineado"
      title="Cantidad de producto en el pedido">
      info
    </i>
  </div>
  <div class="cols10 head">
  
  Reservados pre
  <i
      class="material-icons vertical-alineado"
      title="Reservados antes de hacer el desucento de inventario, incluyen la
      cantidad del producto en este pedido">
      info
    </i>
  </div>

  <div class="cols10 head">
   Reservados despues
  </div>



  <div class="cols5 head">Status <i class="material-icons vertical-alineado" title="Éxito o error en la acción">info</i></div>


  <div class="cols10 head">
  existencias
    <br />
    previas
  </div>
  <div
    class="cols10 head"
    title="Reservados despues de hacer el descuento en inventario">
    
    existencias
    <br />
    posteriores
     
  </div>
  <div class="cols5 head">Status <i class="material-icons vertical-alineado" title="Éxito o error en la acción">info</i></div>
</div>

<br />

{#each detalles as item, i}
  <div class="longhand">
    <!-- content here -->
    <div class="cols5">{i + 1})</div>
    <div class="cols5 centrado">
      <i class="material-icons " title={item.id}>info</i>

    </div>
    <div class="cols15">{item.producto}</div>

    <div class="cols10 centrado">X {item.cantidad_producto}</div>

    <div class="cols10 centrado">{item.total_reservado_antes}</div>

    <div class="cols10 centrado">{item.total_reservado_finalizando}</div>

    <div class="cols5 centrado">
    
    
    
    {#if Math.abs(item.total_reservado_finalizando - item.total_reservado_antes)===item.cantidad_producto}
      <i class="material-icons vertical-alineado">done</i>
    {:else}
      <i class="material-icons vertical-alineado">close</i>
    {/if}
    </div>

    <div class="cols10 centrado">{item.existencias_previas}</div>

    <div class="cols10 centrado">{item.existencias_finalizando}</div>


    <div class="cols5  centrado">
    
    
    {#if Math.abs(item.existencias_previas - item.existencias_finalizando)===item.cantidad_producto}
      <i class="material-icons vertical-alineado">done</i>
    {:else}
      <i class="material-icons vertical-alineado">close</i>
    {/if}
    </div>
  </div>
{:else}
  <!-- empty list -->
  no se encontraron detalles de el proceso
{/each}
