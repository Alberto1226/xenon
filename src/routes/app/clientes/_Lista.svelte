<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import {
    ui,
    clientes,
    postData,
    usuario_db,
    paginas_actuales,
  } from "./../../stores";
  import Descargar from "./_Boton_Descargar.svelte";

  import Paginacion from "./../componentes/paginacion/index.svelte";

  import Row from "./_Row.svelte";
  import Heading from "./_Heading_tablar.svelte";
  import { onMount } from "svelte";
  export var buscando = "";
  export var pagina_actual = 1;

  var ancho_side_panel = 250;
  var limite_lista = 10;
  let lista_completa_para_descarga = [];
  var indice_inicio = 0;
  var indice_final = 6;
  let http_ultima_actividad_fecha = Date.now();
  var lista = [];
  let http_ocupado = false;
  var viendo_carritos_reservados = false;
  $: indice_final = indice_inicio + limite_lista;
  var total_paginas = Math.floor($clientes.total_registros / limite_lista);
  let diferencia = 1000;
  var texto_buscado = ""; // ayuda para aminorar carga
  let coincidencias = 0;
  let total_registros = 0;
  let ha_cambiado_pagina_actual = false;
  $: if (buscando.length == 0) {
    obtener_clientes_por_pagina();
  }
  $: if (buscando.length > 0) {
    obtener_clientes_por_pagina();
  }

  $: if (ha_cambiado_pagina_actual == true) {
    ha_cambiado_pagina_actual = false;
    cargar_pagina();
  }

  onMount(() => {
    if ($clientes.lista.length > 0) {
      lista = $clientes.lista;
      return;
    }
    obtener_clientes_por_pagina();
  });

  function cargar_pagina() {
    // $productos.pagina_actual++;
    $paginas_actuales.clientes = $clientes.pagina_actual;

    console.log($clientes.pagina_actual);
    obtener_clientes_por_pagina();
  }

  function obtener_clientes_por_pagina() {
    if (http_ocupado) return;
    http_ocupado = true;
    //console.log("post a lista clientes");
    lista = [];
    postData("app/clientes/lista_de_clientes", {
      buscando: buscando,
      pagina_actual: $clientes.pagina_actual,
    })
      .then((res) => {
        setTimeout(() => {
          http_ocupado = false;
        }, 200);
        //console.log(res);
        if (res.ok) {
          $clientes.lista = res.lista;
          $clientes.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $clientes = $clientes;
          lista = $clientes.lista;
          $clientes.total_registros = res.numero_total;

          total_paginas = res.paginas;
          if (buscando === "") {
            total_registros = res.numero_total;
            //$clientes.total_registros = res.numero_total;
          } else {
            coincidencias = res.coincidencias;
          }
        }
      })
      .catch((err) => {
        console.log(err);

        http_ocupado = false;
      });
  }

  function siguiente(params) {
    if (pagina_actual < total_paginas) {
      pagina_actual++;

      obtener_clientes_por_pagina();
    }
  }

  function anterior(params) {
    if (pagina_actual > 1) {
      pagina_actual--;

      indice_inicio -= limite_lista;
      if (indice_inicio <= 0) indice_inicio = 0;
    }

    obtener_clientes_por_pagina();
  }

  function filtrar_nuevo_arreglo() {
    var lista_previa = $clientes.lista;
    var lista_temp = lista_previa.filter((elemento) =>
      incluye_busqueda(elemento)
    );
    //lista_filtrada = lista_temp;
    lista = lista_temp;
  }

  function refrescar_lista() {
    //console.log('asdas');

    obtener_clientes_por_pagina();
  }

  function arreglar_direccion(direccion_param) {
    let direccion = direccion_param.calle;
    direccion += ", #" + direccion_param.numero_exterior;
    direccion +=
      direccion_param.numero_interior == ""
        ? ""
        : ", Interior: " + direccion_param.numero_interior;
    direccion += ", Colonia :" + direccion_param.colonia;
    direccion += ", CP: " + direccion_param.cp;
    direccion += ", Localidad: " + direccion_param.localidad;
    direccion += ", Municipio: " + direccion_param.municipio;
    direccion += ", Estado: " + direccion_param.estado;
    return direccion;
  }
</script>

<div
  class="contenedor_ventana"
  style="overflow-y: auto;"
  in:fly={{ x: -10, duration: 500 }}
>
  {#if http_ocupado}
    <!-- HTTP OCUPADO -->
    <div class="centrado">cargando...</div>
  {:else}
    <!-- HTTP LIBRE -->
    {#if $clientes.lista.length === 0}
      <!-- SIN RESULTADOS -->
      No existen resultados.
    {:else}
      <!-- SI HAY RESULTADOS -->
      <Heading />
      {#each lista as cliente, i (cliente._id)}
        <!-- REGISTRO -->
        <Row
          {cliente}
          on:cliente_seleccioando
          on:editar_cliente
          on:refrescar_lista={refrescar_lista}
        />
      {/each}
    {/if}
  {/if}
</div>

<div style="width: 100%; position: absolute;bottom: 30px;">
  <table style="width:100%;">
    <tr>
      <td style="width:20vw;">
        {#if $usuario_db.rol == "administrador"}
          <!-- content here -->
          <Descargar bind:lista_completa_para_descarga bind:http_ocupado />
        {/if}
      </td>
      <td>
        <div class="centrado " style="width:fit-content;">
          <Paginacion
            bind:total_paginas={$clientes.paginas}
            bind:ha_cambiado_pagina_actual
            bind:pagina_actual={$clientes.pagina_actual}
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
        Clientes : {total_registros}
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
  .paginado_cometarios {
    color: gray;
    font-weight: 600;
    font-size: 0.8em;
  }
</style>
