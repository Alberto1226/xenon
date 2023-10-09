<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import {
    ui,
    pedidos,
    postData,
    usuario_db,
    editar_store,
    paginas_actuales,
  } from "./../../../stores";
  import Nuevo from "./../nuevo/nuevo.svelte";
  import Row from "./Row.svelte";
  import { onMount } from "svelte";
  import Paginacion from "./../../componentes/paginacion/index.svelte";

  import Row_cancelados from "./Row_cancelados.svelte";
  import Row_enviados from "./Row_enviados.svelte";
  import Heading from "./Heading_tablar.svelte";
  import Heading_enviados from "./Heading_tabla_enviados.svelte";
  import Heading_pendientes from "./Heading_tablapendientes.svelte";
  import Agente_de_ventas from "./Agente_ventas.svelte";
  export var cargando = true;
  export var buscando = "";
  export var pagina_actual = 1;
  export var url_consulta = "app/pedidos/lista_de_pedidos";
  export var ejecutar_consulta = false;
  export var viendo = "Pendientes";

  onMount(() => {
    //console.log($pedidos.lista);
    lista = $pedidos.lista;
  });
  var ancho_side_panel = 250;
  var limite_lista = 10;
  var indice_inicio = 0;
  var indice_final = 6;
  var agente;
  let coincidencias = 0;
  var lista = [];
  let http_ocupado = false;
  var viendo_carritos_reservados = false;
  var aviso_folios_faltan_visible = false;

  var ha_cambiado_pagina_actual = false;

  $: if (ha_cambiado_pagina_actual == true) {
    ha_cambiado_pagina_actual = false;
    cargar_pagina();
  }

  $: indice_final = indice_inicio + limite_lista;
  $: if (ejecutar_consulta) {
    //console.log("sasdasd");
    setTimeout(() => {
      ejecutar_consulta = false;
      obtener_pedidos();
    }, 100);
  }
  var total_paginas = 0; //Math.floor(lista.length / limite_lista);

  var texto_buscado = ""; // ayuda para aminorar carga

  $: if (buscando.length === 0) {
    obtener_pedidos();
  }

  $: if (buscando.length > 0) {
    obtener_pedidos();
  }

  function cargar_pagina() {
    // $productos.pagina_actual++;
    $paginas_actuales.pedidos = $pedidos.pagina_actual;

    console.log($pedidos.pagina_actual);
    obtener_pedidos();
  }

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
    lista = [];
    $pedidos.lista = [];
    $editar_store.pedido = null;
    http_ocupado = true;

    postData(url_consulta, { buscando, pagina_actual })
      .then((res) => {
        http_ocupado = false;
        if (res.ok) {
          //console.log(res);
          $pedidos.lista = res.lista;
          $pedidos.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $pedidos = $pedidos;
          lista = $pedidos.lista;
          $pedidos.total_registros = res.numero_total;
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
        cargando = false;
      });
  }
</script>

<div class="contenedor_ventana" style="overflow-y: auto;">
  {#if http_ocupado}
    <!-- HTTP OCUPADO -->
    <div class="centrado">cargando...</div>
  {:else}
    <!-- HTTP LIBRE -->
    {#if $pedidos.lista.length === 0}
      <!-- SIN RESULTADOS -->
      No existen pedidos.
    {:else}
      <!-- SI HAY RESULTADOS -->

      {#if viendo === "Pendientes"}
        <!-- content here -->
        <Heading_enviados />
      {:else if viendo == "Enviados"}
        <Heading_pendientes />
      {:else}
        <!-- else content here -->
        <Heading />
      {/if}

      {#if viendo === "Pendientes"}
        <!-- content here -->
        {#each lista as pedido, i (pedido._id)}
          <!-- REGISTRO -->
          <Row
            {pedido}
            indice={i}
            on:pedidos_seleccioando
            on:editar_pedido
            on:ver_un_pdf
            on:recargar_lista={obtener_pedidos}
          />
        {/each}
      {:else if viendo === "Enviados"}
        <!-- else content here -->
        {#each lista as pedido, i (pedido._id)}
          <!-- REGISTRO -->
          <Row_enviados
            indice={i}
            {pedido}
            on:pedidos_seleccioando
            on:editar_pedido
            on:ver_un_pdf
            on:recargar_lista={obtener_pedidos}
          />
        {/each}
      {:else if viendo === "Cancelados"}
        <!-- else content here -->
        {#each lista as pedido, i (pedido._id)}
          <!-- REGISTRO -->
          <Row_cancelados
            indice={i}
            {pedido}
            on:pedidos_seleccioando
            on:editar_pedido
            on:ver_un_pdf
            on:recargar_lista={obtener_pedidos}
          />
        {/each}
      {/if}
    {/if}
  {/if}
</div>

<div style="width: 100%; position: absolute;bottom: 30px;">
  <table style="width:100%;">
    <tr>
      <td>
        <div class="centrado " style="width: fit-content;margin: 0 auto;">
          <Paginacion
            bind:total_paginas
            bind:ha_cambiado_pagina_actual
            bind:pagina_actual
          />
          <!-- 
          <Button
            disabled={pagina_actual == 1 || http_ocupado}
            on:click={anterior}>
            <i class="material-icons">keyboard_arrow_left</i>
          </Button>
          {pagina_actual} / {total_paginas}
          <Button
            disabled={pagina_actual == total_paginas || http_ocupado}
            on:click={siguiente}>
            <i class="material-icons">keyboard_arrow_right</i>
          </Button> -->
        </div>
      </td>

      <td class="paginado_cometarios">
        Pedidos : {$pedidos.total_registros}
        <br />
        {#if buscando != ""}
          <!-- content here -->
          Coincidencias {coincidencias}
        {/if}
      </td>
    </tr>
  </table>
</div>

<style>
</style>
