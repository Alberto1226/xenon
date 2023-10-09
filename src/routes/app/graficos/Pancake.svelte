<script>
  import * as Pancake from "@sveltejs/pancake";
  import * as d3 from "d3-hierarchy";
  import { tweened } from "svelte/motion";
  import * as eases from "svelte/easing";
  import { fade } from "svelte/transition";
  import * as yootils from "yootils";
  import Treemap from "./Treemap.svelte";
  import data from "./data.js";
  import { onMount } from "svelte";
  import { mensajes_app, postData, formato_precio } from "./../../stores";
  import { Datefield, Button, Dialog } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import { scale } from "svelte/transition";
  import Cargando from "./../componentes/Cargando.svelte";
  import Desde_Hasta from './Desde_Hasta.svelte';

  let desde = new Date();
  desde.setMonth(desde.getMonth() - 1);
  let hasta = new Date();
  let ultima_fecha_de_consulta = null;
  let ejecutar = false;
  let http_ocupado = false;
  let data_obtenida;
  let format = "D.MM.YYYY";
  let viendo_productos = false;
  let viendo_producto = false;
  let producto = false;
  let resumen_producto = "";
  let existe_respuesta_a_mostrar = false;

  onMount(() => {
    //obtenerPancake();
    desde = new Date();
    desde.setMonth(desde.getMonth() - 2);
    hasta = new Date();
    //console.log("arranco grpah");
    obtenerPancake();
  });

  function obtenerPancake() {
    http_ocupado = true;

    // resultado_ventas.lista_pedidos = [];
    postData("app/pedidos/consultas/pancake_productos", {
      desde,
      hasta
    })
      .then(respuesta => {
        ultima_fecha_de_consulta = {
          desde: JSON.parse(JSON.stringify(desde)),
          hasta: JSON.parse(JSON.stringify(hasta))
        };
        //console.log(respuesta);
        http_ocupado = false;
        //  Checar si se logro guardar el cliente
        existe_respuesta_a_mostrar = respuesta.ok;
        if (respuesta.ok) {
            data_obtenida = respuesta;
            hacerpan();
            
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta.resumen
          });
          $mensajes_app = $mensajes_app;
        }
        ////console.log(respuesta);
      })
      .catch(err => {
        http_ocupado = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo obtener el estudio."
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function hacerpan(params) {
    treemap = d3.treemap();

    hierarchy = d3
      .hierarchy(data_obtenida)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    root = treemap(hierarchy);

    selected = root;

    return;
    breadcrumbs = node => {
      let crumbs = [];
      while (node) {
        crumbs.unshift(node.data_obtenida.name);
        node = node.parent;
      }

      return crumbs.join("/");
    };

    let extents = tweened(undefined, {
      easing: eases.cubicOut,
      duration: 600
    });

    let is_visible = (a, b) => {
      while (b) {
        if (a.parent === b) return true;
        b = b.parent;
      }

      return false;
    };
  }

  let treemap = d3.treemap();

  let hierarchy = d3
    .hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  let root = treemap(hierarchy);

  let selected = root;

  let select = node => {
    while (node.parent && node.parent !== selected) {
      node = node.parent;
    }
    if (node && node.children) selected = node;
    if (node.height == 1) {
      viendo_productos = true;
    } else viendo_productos = false;
    if (node.height == 0) {
      producto = node.data;
      //console.log(producto)
      resumen_producto = `
       <img
      class="imagen_perfil_producto"
      src="${producto.imagen}"
      alt="Foto" />
      <div class="indice_row centrado"> (${producto.id})</div>
      <table style="width:100%;">
      <tr>
        <td>
          ${producto.name}
        </td>

        <td style="text-align:right">
          $ ${formato_precio(producto.precio)}
        </td>
      </tr>
      <tr>
        <td>
         Unidades vendidas <br> <span class="indice_row"> (${
           producto.unidad
         })</span>
        </td>

        <td style="text-align:right">
          <b> ${producto.unidades_vendidas}<b>
        </td>
      </tr>
      </table>

      <hr>
      <div class="indice_row centrado">  venta total</div>
      <div class="centrado">  $  <span class="titulo_formulario">${formato_precio(
        producto.value
      )} </span> </div>
      `;
      // visible = true;
      viendo_producto = true;
    } else {
      resumen_producto = "";
      viendo_producto = false;
    }

    //   console.log(selected.height)
  };

  let breadcrumbs = node => {
    let crumbs = [];
    while (node) {
      crumbs.unshift(node.data.name);
      node = node.parent;
    }

    return crumbs.join("/");
  };

  let extents = tweened(undefined, {
    easing: eases.cubicOut,
    duration: 600
  });

  let is_visible = (a, b) => {
    while (b) {
      if (a.parent === b) return true;
      b = b.parent;
    }

    return false;
  };

  $: $extents = {
    x1: selected.x0,
    x2: selected.x1,
    y1: selected.y1,
    y2: selected.y0
  };

  function color(letra) {
    switch (letra) {
      case "S":
        return "#ff5252";
        break;
      case "I":
        return "#40f";
        break;
      default:
        return "#571371";
        break;
    }
  }

  function cambio_fecha(evt) {
    setTimeout(() => {
      const mismo_desde =
        desde.getTime() == new Date(ultima_fecha_de_consulta.desde).getTime();
      const mismo_hasta =
        hasta.getTime() == new Date(ultima_fecha_de_consulta.hasta).getTime();

      if (mismo_hasta && mismo_desde) return;
      obtenerPancake();
    }, 200);
  }
</script>

<style>
  .breadcrumbs {
    width: 100%;
    padding: 0.3rem 0.4rem;
    background-color: transparent;
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    border: none;
    cursor: pointer;
    outline: none;
  }

  .breadcrumbs:disabled {
    cursor: default;
  }

  .chart {
    width: calc(100% - 20px);
    height: calc(100% - 195px);
    padding: 0;
    margin: 0 0px 0px 12px;
    overflow: hidden;
  }
  .node2 {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: white;
    overflow: hidden;
    pointer-events: all;
  }

  .node2:not(.leaf) {
    cursor: pointer;
  }

  .node {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: white;
    overflow: hidden;
    pointer-events: all;
  }

  .node:not(.leaf) {
    cursor: pointer;
  }

  .contents {
    width: 100%;
    height: 100%;
    padding: 0.3rem 0.4rem;
    border: 1px solid white;
    background-color: rgb(34, 45, 48);
    color: white;
    border-radius: 4px;
    box-sizing: border-box;
    box-shadow: inset -2px 1px 11px 0px #b7b7b7;
  }

  .node:not(.leaf) .contents {
    background-color: hsl(144, 72%, 26%);
  }

  .node2:not(.leaf) .contents {
    background-color: hsl(283, 71%, 26%);
  }

  .categoria {
    background-color: hsl(147, 71%, 26%);
  }

  strong,
  span {
    display: block;
    font-size: 12px;
    white-space: nowrap;
    line-height: 1;
  }
  .imagen_perfil_producto {
    height: 200px;
    margin: 0 auto;
  }
</style>

<div class="centrado">
  <table>
    <tr>
      <td>
        <Button
          on:click={() => {
            goto('app/graficos/');
          }}>
          <i class="material-icons">arrow_left</i>
          Regresar
        </Button>
      </td>
      <td class="titulo_formulario">
        Ventas de todos los productos entre fechas
      </td>
      <td>
       <Desde_Hasta bind:desde bind:hasta on:cambio_fecha={cambio_fecha}/>
      </td>
      <td />
    </tr>
  </table>
</div>

{#if http_ocupado}
  <!--CARGANDO-->
  <Cargando />
{:else}
  <!-- YA cargo-->

  {#if existe_respuesta_a_mostrar}
    <!-- SI HAY RESULTADOS -->
    <!-- BARRA EXPLORACION -->
    <div class="centrado" style="margin-left:20px;">
      <table>
        <tr>
          <td>
            <Button
              title="Subir un nivel"
              color={selected.parent ? 'black' : 'gray'}
              raised
              disabled={!selected.parent}
              on:click={() => {
                selected = selected.parent;
              }}>
              <i class="material-icons">arrow_upward</i>
            </Button>
          </td>
          <td>
            <button
              class="breadcrumbs"
              disabled={!selected.parent}
              on:click={() => {
                selected = selected.parent;
                if (selected.height == 0) {
                  viendo_productos = true;
                } else viendo_productos = false;
              }}>
              {breadcrumbs(selected)}
            </button>
          </td>
          <td>
            {#if viendo_productos}
              <!-- content here -->
              Nivel de productos
            {/if}
          </td>
        </tr>
      </table>
    </div>
    <!-- GRAFICO -->
    <div class="chart">
      <Pancake.Chart
        x1={$extents.x1}
        x2={$extents.x2}
        y1={$extents.y1}
        y2={$extents.y2}>
        <Treemap {root} let:node>
          {#if is_visible(node, selected)}
            <div
              transition:fade={{ duration: 400 }}
              class={'node'}
              class:leaf={!node.children}
              class:categoria={node.id_cat_padre === null}
              on:click={() => select(node)}>
              <div class="contents">
                <strong>{node.data.name}</strong>
                <span>$ {yootils.commas(node.value)}</span>
              </div>
            </div>
          {/if}
        </Treemap>
      </Pancake.Chart>
    </div>
  {:else}
    <!-- NO EXISTEN RESULTADOS -->
    <div class="centrado titulo_formulario" style="">
      No se encontró algún producto vendido en el periodo
    </div>
  {/if}
{/if}

<Dialog width="450" bind:visible={viendo_producto}>
  <div class="centrado titulo_formulario">{selected.data.name}</div>

  {@html resumen_producto}
  <div slot="actions" class="actions center" />

  <div slot="footer" class="footer" />
</Dialog>
