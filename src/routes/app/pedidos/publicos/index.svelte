<script>
  import Dialogo_historicos from "./Dialogo_historicos.svelte";

  import {
    postData,
    pedidos_publicos,
    pedido_publico_selecto,
    detalle_pedido_publico_es_visible,
    usuario_db,
  } from "./../../../stores";
  import { onMount } from "svelte";
  import Row from "./lista_publica/row.svelte";
  import Detalle from "./lista_publica/detalle_de_pedido.svelte";
  import { fly } from "svelte/transition";
  import Barra_herramientas from "./buscador.svelte";
  import Cliente from "./Cliente.svelte";
  import Paginacion from "./../../componentes/paginacion/index.svelte";
  import { Button } from "svelte-mui/src";
  import { recargar_lista } from "./store";

  var lista = [];
  var http_ocupado = false;
  var total_paginas = 0;
  var coincidencias = 0;
  var buscando = "";
  var pagina_actual = 1;
  var buscar = false;
  var cliente = { nombre: "" };
  var cliente_tiene_carrito = false;
  var input1 = null;
  var ha_cambiado_pagina_actual = false;
  var visible_tipo_pedidos_visible = false;
  var viendo = "Pendientes";
  var obtener_carritos = false;

  onMount(() => {
    obtener_pedidos();
    console.log($usuario_db);
  });

  $: if (obtener_carritos == true) {
    obtener_carritos = false;
    obtener_pedidos();
  }

  $: if (buscar) {
    buscar = false;
    obtener_pedidos();
  }

  $: if (ha_cambiado_pagina_actual == true) {
    ha_cambiado_pagina_actual = false;
    obtener_pedidos();
  }

  $: if ($recargar_lista == true) {
    $recargar_lista = false;
    obtener_pedidos();
  }

  function obtener_pedidos() {
    lista = [];
    var url_consulta = "app/pedidos/lista_de_pedidos_publicos";
    if (viendo == "Historicos") {
      url_consulta = "app/pedidos/lista_de_pedidos_publicos_historicos";
    }
    $pedidos_publicos.lista = [];
    // $editar_store.pedido = null;
    http_ocupado = true;

    postData(url_consulta, { buscando, pagina_actual })
      .then((res) => {
        http_ocupado = false;
        if (res.ok) {
          console.log(res);
          $pedidos_publicos.lista = res.lista;
          $pedidos_publicos.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $pedidos_publicos = $pedidos_publicos;
          lista = $pedidos_publicos.lista;
          $pedidos_publicos.total_registros = res.numero_total;
          total_paginas = res.paginas;
          //total_paginas = Math.floor($pedidos.total_registros / limite_lista);
          if (buscando === "") {
            // total_registros = res.numero_total;
            // $pedidos.total_registros = res.numero_total;
          } else {
            coincidencias = res.coincidencias;
          }
        }
      })
      .catch((err) => {
        console.log(err);
        http_ocupado = false;
        //cargando = false;
      });
  }
</script>

<style>
  .lista {
    overflow-y: auto;
    height: calc(100vh - 255px);
    background: white;
    margin: 0 13px;
    border-radius: 10px;
  }
</style>

<svelte:head>
  <title>Pedidos públicos</title>
</svelte:head>

<!-- barra de herramientas , buscador , paginacion etc -->

<!-- lista para saber que clientes tienen pedidos  -->

{#if $detalle_pedido_publico_es_visible}
  <!-- Viendo Detalle  -->

  <div in:fly={{ duration: 200, x: 500 }} out:fly={{ duration: 200, x: 500 }}>
    <Detalle />
  </div>
{:else}
  <div in:fly={{ duration: 200, x: -500, delay: 200 }}>
    <Barra_herramientas
      bind:buscar
      bind:buscando
      bind:total_paginas
      bind:coincidencias
      bind:pagina_actual />
    <!-- Lista de Pedidos -->
    <div class="display-flex width-auto-centrado-horizontal">
      <h1 class="centrado ">
        Pedidos públicos
        {#if viendo == 'Pendientes'}
          <!-- content here -->
          <b>Pendientes</b>
        {:else}<b>Históricos</b>{/if}
      </h1>
      <Button
        on:click={() => {
          visible_tipo_pedidos_visible = true;
        }}
        icon>
        <i class="material-icons no_select">settings</i>
      </Button>
    </div>

    <Paginacion
      bind:total_paginas
      bind:pagina_actual
      bind:ha_cambiado_pagina_actual />
    <div class="lista">
      {#each lista as item, i}
        <!-- pedidos publicos -->
        <Row {...item} indice={i} {item} bind:pagina_actual bind:viendo />
      {:else}
        <!-- empty list -->
        <h2 class="centrado">
          {#if http_ocupado == true}Cargando{:else}Lista vacía{/if}
        </h2>
      {/each}
    </div>
  </div>
{/if}

<Dialogo_historicos
  bind:obtener_carritos
  bind:visible_tipo_pedidos_visible
  bind:viendo />
