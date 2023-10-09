<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import { ui, pedidos_historicos,postData } from "./../../../stores";
  import Nuevo from "./../nuevo/nuevo.svelte";
  import Row from "./Row_enviados.svelte";
  import Heading from "./Heading_tablar.svelte";
  import Agente_de_ventas from "./Agente_ventas.svelte";
  export var cargando = true;
  export var buscando = "";
  import { onMount } from "svelte";
  export var pagina_actual = 1;

  onMount(() => {
    //console.log($pedidos_historicos.lista);
    lista =$pedidos_historicos.lista;
    if(lista.length===0)obtener_pedidos();
  });
  var ancho_side_panel = 250;
  var limite_lista = 10;
  var indice_inicio = 0;
  var indice_final = 6;
  let http_ocupado = false;
  var viendo_carritos_reservados = false;
  $: indice_final = indice_inicio + limite_lista;
  var total_paginas = Math.floor($pedidos_historicos.lista.length / limite_lista);
  $: if(buscando.length){
    obtener_pedidos();
  }
 
  var agente;
  var lista=[];
  function siguiente(params) {
    if (pagina_actual < total_paginas) {
      pagina_actual++;
      obtener_pedidos();
    }
  }

  function anterior(params) {
    if (pagina_actual > 1) {
      pagina_actual--;

      obtener_pedidos();
    }
  }





  function obtener_pedidos(params) {
    http_ocupado = true;
    postData("app/pedidos/lista_de_pedidos_historicos",{buscando, pagina_actual})
      .then(res => {
        http_ocupado = false;
        if (res.ok) {
          //console.lo(res);
           $pedidos_historicos.lista = res.lista;
          $pedidos_historicos.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $pedidos_historicos = $pedidos_historicos;
          lista = $pedidos_historicos.lista;
          $pedidos_historicos.total_registros = res.numero_total;
     
            if (buscando === "")
            total_paginas = Math.round((res.numero_total -1)/ limite_lista);
          else total_paginas = Math.round((res.lista.length  -1 )/ limite_lista);
        }
      })
      .catch(err => {
        http_ocupado = false;
        console.log(err);
        cargando = false;
      });
  }
</script>

<style>

</style>

<div
  class="contenedor_ventana"
  style="overflow-y: auto;"
  in:fly={{ x: -10, duration: 500 }}>

 {#if http_ocupado}
    <!-- HTTP OCUPADO -->
    <div class="centrado">cargando...</div>
  {:else}
    <!-- HTTP LIBRE -->
    {#if $pedidos_historicos.lista.length === 0}
      <!-- SIN RESULTADOS -->
      No existen pedidos.
    {:else}
      <!-- SI HAY RESULTADOS -->
      <Heading />
      {#each lista as pedido, i (pedido._id)}
        <!-- REGISTRO -->
        <Row
          {pedido}
          on:pedidos_seleccioando
          on:editar_pedido
          on:ver_un_pdf
          on:recargar_lista={obtener_pedidos} />
      {/each}
    {/if}
  {/if}

</div>

<div style="width: 100%; position: absolute;bottom: 43px;">
  <div class="centrado " style="width: 200px;margin: 0 auto;">

    <Button on:click={anterior}>
      <i class="material-icons">keyboard_arrow_left</i>
    </Button>
    {pagina_actual} / {total_paginas}
    <Button disabled={pagina_actual == total_paginas} on:click={siguiente}>
      <i class="material-icons">keyboard_arrow_right</i>
    </Button>

  </div>

</div>
