<script>
  import { formato_precio } from "./../../stores";
  import Row from "./cambiar_descuento_pedido/_row.svelte" ;
  var descuentoNuevo = 0;
  var descuentoAnterior = 0;
  var resumenOriginal = [];
  var resumenPrevio = [];
  var resumenPosterior = [];
  // resultados de conteo de exito en aplicacion
  var exito = false;
  var contador = 0;
  // detalles de pedido , folio ,...
  var detalles;
  export var item;
  import { onMount } from "svelte";
  onMount(() => {
    //console.log(item)
    const body = JSON.parse(item.body);
    detalles = body.detalles;
    //console.log(detalles)
    descuentoNuevo = body.descuentoNuevo;
    descuentoAnterior = body.descuentoAnterior;
    //console.log("------------")
    //console.log(body.resumenOriginal)
    resumenOriginal = body.resumenOriginal?body.resumenOriginal:[];
    resumenPrevio = body.resumenPrevio;
    resumenPosterior = body.resumenPosterior;
    exito = body.autocheck ? body.autocheck.exito : "dato faltante";
    contador = body.autocheck ? body.autocheck.contador : "dato faltante";
  });
</script>

<style>
  .longhand {
    display: flex;
    border-bottom: gray solid 1px;
    padding: 5px 0px;
  }
  .cols10 {
    padding: 5px 0px;
    width: 10%;
  }
  .cols20 {
    padding: 5px 0px;
    width: 20%;
  }
  .cols50 {
    width: 50%;
  }

</style>

<!-- pedidos/cambiar_descuento_de_pedido -->
folio =
<b>{detalles ? detalles.folio : '--'}</b>
<br />exito
descuento anterior =
<b>{descuentoAnterior}</b>
%
<br />
descuento nuevo =
<b>{descuentoNuevo}</b>
%
<br />


<!-- header -->

<div class="longhand">
  <div class="cols10">
    <span class="indice_rows">#</span>

  </div>
  <div class="cols20">Producto</div>

  <div class="cols20">p. anterior</div>

  <div class="cols20">p. original</div>

  <div class="cols20">p. final ({descuentoNuevo} % )</div>

  <div class="cols20"></div>
</div>

<!-- cuerpo de row -->

{#each resumenOriginal as registro, i}
  
  <Row bind:registro {resumenPosterior} {i} {descuentoNuevo} {resumenPrevio} />
    
{/each}

<br>

<div class="longhand">
  
  <div class="cols50">
    contador=
    {#if contador === resumenOriginal.length}
      {contador + ' correctos, de ' + resumenOriginal.length}
      <i class="material-icons vertical-alineado">done</i>
    {:else}
      {contador + ' de ' + resumenOriginal.length}
      <i class="material-icons vertical-alineado">close</i>
    {/if}
  </div>

  <div class="cols50">
    exito=
    {#if exito}
      <i class="material-icons vertical-alineado">done</i>
    {:else}
      <i class="material-icons vertical-alineado">close</i>
    {/if}
  </div>

</div>