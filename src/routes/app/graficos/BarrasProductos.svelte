<script>
  import { scaleLinear } from "d3-scale";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { mensajes_app, postData, formato_precio } from "./../../stores";
  import { Datefield, Button, Dialog, Icon } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import Cargando from "./../componentes/Cargando.svelte";
  import Desde_Hasta from './Desde_Hasta.svelte';
  //  import Lista_Infinita_productos  from "./Lista_infinita_productos.svelte";

  let desde = new Date();
  desde.setMonth(desde.getMonth() - 1);
  let hasta = new Date();
  let ultima_fecha_de_consulta = null;
  let http_ocupado = false;
  let intervalos_horizontales = 10;
  let pagina_actual = 1;
  let total_paginas = 0;
  let total_registros = 0;
  let cantidad_por_step = 10; // cantidad de prodcutos por step
  let ordenado = false; //  true descendente;
  let viendo_producto = false;
  let producto = null;
  let resumen_producto = "";
  let http_prods_sin_venta_ocupado = false;
  let existen_resultados_a_mostrar = false;
  let lista_productos_sin_venta = []; //  productos que no se vendieton en el periodo
  let consulta_no_vendidos_fue_realizada = false;

  onMount(() => {
    desde = new Date();
    desde.setMonth(desde.getMonth() - 1);
    hasta = new Date();
    obtenerPancake();
  });

  function obtenerPancake() {
    http_ocupado = true;

    // resultado_ventas.lista_pedidos = [];
    postData("app/pedidos/consultas/pancake_barras_productos", {
      desde,
      hasta,
      pagina_actual,
      step: cantidad_por_step,
      orden: ordenado ? -1 : 1
    })
      .then(respuesta => {
        http_ocupado = false;
        // guardar en que momento se hizo la ultiam consulta

        ultima_fecha_de_consulta = {
          desde: JSON.parse(JSON.stringify(desde)),
          hasta: JSON.parse(JSON.stringify(hasta))
        };
        //  Checar si se logro guardar el cliente
        existen_resultados_a_mostrar = respuesta.ok;
        if (respuesta.ok) {
          consulta_no_vendidos_fue_realizada = false;
          if (respuesta.children.length == 0) return;
          total_paginas = Math.round(
            (respuesta.cantidad_de_registros_en_db + cantidad_por_step - 1) /
              cantidad_por_step
          );
          ///  ayudar a seleccionar total de paginas correcta
          if (respuesta.cantidad_de_registros_en_db <= cantidad_por_step)
            total_paginas = 1;
          total_registros = respuesta.cantidad_de_registros_en_db;
          yTicks = [];
          let intervalo;
          if (ordenado) {
            intervalo =
              respuesta.children[0].ventas_totales /
              (intervalos_horizontales - 1);
          } else {
            intervalo =
              respuesta.children[respuesta.children.length - 1].ventas_totales /
              (intervalos_horizontales - 1);
          }
          for (let i = 1; i < intervalos_horizontales; i++) {
            yTicks.push(intervalo * i);
            if (i + 1 === intervalos_horizontales) {
              points = respuesta.children;
              points = points.map(function(item) {
                return {
                  nombre_producto: item.name,
                  total_ventas_periodo: parseFloat(item.ventas_totales),
                  unidades_vendidas: item.unidades_vendidas,
                  img: item.imagen,
                  precio: item.precio,
                  unidad: item.unidad,
                  id: item.id
                };
              });
            }
          }
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

  function obtenerListaSinComsumir() {
    if (http_prods_sin_venta_ocupado) return;
    http_prods_sin_venta_ocupado = true;
    lista_productos_sin_venta = [];
    consulta_no_vendidos_fue_realizada = false;
    // resultado_ventas.lista_pedidos = [];
    postData("app/pedidos/consultas/pancake_barras_productos_sin_ventas", {
      desde,
      hasta,
      pagina_actual,
      step: cantidad_por_step
    })
      .then(respuesta => {
        //console.log(respuesta);
        consulta_no_vendidos_fue_realizada = true;
        http_prods_sin_venta_ocupado = false;
        //return;
        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          lista_productos_sin_venta = respuesta.productos_sin_venta;
        } else {
          http_prods_sin_venta_ocupado = false;
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta.resumen
          });
          $mensajes_app = $mensajes_app;
        }
        ////console.log(respuesta);
      })
      .catch(err => {
        http_prods_sin_venta_ocupado = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo obtener el estudio."
        });
        $mensajes_app = $mensajes_app;
      });
  }

  let points = [
    { nombre_producto: "Producto 1", total_ventas_periodo: 16.7 },
    { nombre_producto: "Producto 1", total_ventas_periodo: 14.6 },
    { nombre_producto: "Producto 1", total_ventas_periodo: 14.4 },
    { nombre_producto: "Producto 1", total_ventas_periodo: 14 },
    { nombre_producto: "Producto 1", total_ventas_periodo: 13 },
    { nombre_producto: "Producto 1", total_ventas_periodo: 12.4 }
  ];

  const xTicks = [1990, 1995, 2000, 2005, 2010, 2015];
  let yTicks = [0, 5, 10, 15, 40];
  const padding = { top: 50, right: 20, bottom: 50, left: 35 };

  let width = 800;
  let height = 550;

  function formatMobile(tick) {
    return "'" + (tick % 100);
  }

  $: xScale = scaleLinear()
    .domain([0, cantidad_por_step])
    .range([padding.left, width - padding.right]);

  $: yScale = scaleLinear()
    .domain([0, Math.max.apply(null, yTicks)])
    .range([height - padding.bottom, padding.top]);

  $: innerWidth = width - (padding.left + padding.right);
  $: barWidth = innerWidth / cantidad_por_step;

  function cambio_fecha(evt) {
    if (ultima_fecha_de_consulta)
      setTimeout(() => {
        //  comienza validacion para checar que no sea un click sin desear cambios
        const mismo_desde =
          desde.getTime() == new Date(ultima_fecha_de_consulta.desde).getTime();
        const mismo_hasta =
          hasta.getTime() == new Date(ultima_fecha_de_consulta.hasta).getTime();
        //  ejecutar validacion
        if (mismo_hasta && mismo_desde) return;
        obtenerPancake();
      }, 200);
  }

  let select = node => {
    //console.log(node);
    //return
    producto = node;
    //console.log(producto)
    resumen_producto = `
      <div class="centrado titulo_formulario">${producto.nombre_producto}</div>
       <img
      class="imagen_perfil_producto"
      src="${producto.img}"
      alt="Foto" />
      <div titulo="id en base de datos" class="indice_row centrado"> (${
        producto.id
      })</div>
      <table style="width:100%;">
      <tr>
        <td>
          ${producto.nombre_producto}
        </td>

        <td style="text-align:right">
          $ ${formato_precio(producto.precio)}
        </td>
      </tr>
      <tr>
        <td>
         Unidades vendidas <br> <span titulo="Unidad de venta" class="indice_row"> (${
           producto.unidad
         })</span>
        </td>

        <td titulo="Unidades vendidas" style="text-align:right">
          <b> ${producto.unidades_vendidas}<b>
        </td>
      </tr>
      </table>

      <hr>
      <div class="indice_row centrado">  venta total</div>
      <div class="centrado">  $  <span class="titulo_formulario">${formato_precio(
        producto.total_ventas_periodo
      )} </span> </div>
      `;

    viendo_producto = true;

    //   console.log(selected.height)
  };

  function borrar_ultimos_2(str) {
    str = str.substring(0, str.length - 3);
    return str;
  }
</script>

<style>
  h2 {
    text-align: center;
  }

  .chart {
    width: 100%;
    max-width: 90%;
    margin: 0 auto;
    border: 3px solid white;
    border-radius: 73px;
  }

  svg {
    position: relative;
    width: 100%;
    height: 450px;
    background-color: white;
    box-shadow: 0 0 10px #000000;
    border-radius: 5px;
  }

  .tick {
    font-family: Helvetica, Arial;
    font-size: 0.725em;
    font-weight: 200;
  }

  .tick line {
    stroke: #43015e;
    stroke-dasharray: 2;
  }

  .tick text {
    fill: rgb(102, 102, 102);
    text-anchor: start;
  }

  .tick.tick-0 line {
    stroke-dasharray: 0;
  }

  .x-axis .tick text {
    text-anchor: middle;
  }

  .bars rect {
    fill: #1976d2;
    stroke: none;
    opacity: 0.65;
  }

  rect:hover {
    fill: #1e77d0;
    stroke: #115ba5;
    stroke-width: 5px;
  }

  rect:active {
    cursor: pointer;
    fill: #194f85;
    stroke: #1145a5;
    stroke-width: 3px;
  }
  .contenedor {
    grid-area: area_cuatro;
    background: #464646;
    font-size: 0.85em;
    height: 100%;
    width: 100%;
    margin: 0 0 0 0;
  }
  .table_headertools {
    padding-top: 19px;
    width: 100%;
    padding-right: 20px;
    background: burlywood;
  }

  .paginacion_tabla {
    margin: 11px auto 0;
    color: white;
  }
  .unidades_vendidas {
    color: #43015e;
  }
  .unidades_vendidas:hover {
    font-size: 1.5em;
  }
  .lista_no_vendidos {
    background-color: aliceblue;
    height: 150px;
    overflow-y: auto;
    width: 100%
  }
  .row{
    width: 100%;
    text-align: left;
  }
  .row:hover{
    background-color: #1976d231;
  }
</style>

<div class="contenedor" in:fade={{ duration: 400 }}>
  <div>
    <div class="centrado" style="background: burlywood;">
      <table style=" padding-top: 5px; width: 100%; padding-right: 20px;">
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
            <!-- Obtener productos que no se vendieron en el periodo-->
            <Button
              disabled={http_ocupado || http_prods_sin_venta_ocupado}
              icon
              on:click={() => {
                ordenado = !ordenado;
                obtenerListaSinComsumir();
              }}
              title={http_prods_sin_venta_ocupado ? 'ocupado...' : 'Obtener productos activos que no se vendieron en el periodo'}>
              {#if http_prods_sin_venta_ocupado === false}
                <!-- ICONO OBTENER NO VENDIDOS -->
                <div in:fade={{ duration: 450 }}>
                  <i class="material-icons">money_off</i>
                </div>
              {:else}
                <!-- PROCESANDO -->
                <div in:fade={{ duration: 450 }}>
                  <i class="material-icons">hourglass_empty</i>
                </div>
              {/if}
            </Button>

          </td>
          <td>
            <!-- Invertir el orden actual de lista en el que se muestra los productos-->
            <Button
              icon
              disabled={http_ocupado || http_prods_sin_venta_ocupado}
              on:click={() => {
                ordenado = !ordenado;
                obtenerPancake();
              }}
              title={ordenado ? 'Orden descendente' : 'Orden ascendente'}>
              {#if ordenado}
                <!-- content here -->
                <div in:fade={{ duration: 450 }}>
                  <i class="material-icons">vertical_align_bottom</i>
                </div>
              {:else}
                <!-- else content here -->
                <div in:fade={{ duration: 450 }}>
                  <i class="material-icons">vertical_align_top</i>
                </div>
              {/if}
            </Button>

          </td>
          <td>
          <Desde_Hasta bind:desde bind:hasta on:cambio_fecha={cambio_fecha}/>
          </td>
        </tr>
      </table>
    </div>
    {#if http_ocupado}
      <!-- CARGANDO -->
      <Cargando size="60" color="#fff" />
    {:else if existen_resultados_a_mostrar}
      <!-- SI HAY ALGO QUE MOSTRAR -->

      <h2 style="color:white;padding-top:10px;">{ordenado?'Productos de más a menos vendidos':'Productos de menos a más vendidos'}</h2>

      <div class="chart" bind:clientWidth={width} bind:clientHeight={height}>
        <svg>
          <!-- y axis -->
          <g class="axis y-axis" transform="translate(0,{padding.top})">
            {#each yTicks as tick}
              <g
                class="tick tick-{tick}"
                transform="translate(0, {yScale(tick) - padding.bottom})">
                <line x2="100%" />
                <text y="-4">$ {borrar_ultimos_2(formato_precio(tick))}</text>
              </g>
            {/each}
          </g>

          <!-- x axis -->
          <g class="axis x-axis">
            {#each points as point, i}
              <g class="tick" transform="translate({xScale(i)},{height + 10})">
                <text x={barWidth / 2} y="-40">
                  {width > 380 ? point.nombre_producto : formatMobile(point.nombre_producto)}
                </text>

                <text x={barWidth / 2} y="-30">
                  $ {formato_precio(point.total_ventas_periodo)}
                </text>

                <text class="unidades_vendidas" x={barWidth / 2} y="-20">
                  u. vendidas {borrar_ultimos_2(formato_precio(point.unidades_vendidas))}
                </text>
              </g>
            {/each}
          </g>

          <g class="bars">
            {#each points as point, i}
              <rect
                on:click={() => {
                  select(point);
                }}
                x={xScale(i) + 2}
                y={yScale(point.total_ventas_periodo)}
                width={barWidth - 4}
                height={height - padding.bottom - yScale(point.total_ventas_periodo)} />
            {/each}
          </g>
        </svg>
      </div>

      <div class="centrado">

        <!-- paginacion -->
        <table class="paginacion_tabla">
          <tr>
            <td>
              <Button
                dense
                icon
                color="white"
                on:click={() => {
                  if (pagina_actual == 1) return;
                  pagina_actual--;
                  obtenerPancake();
                }}>
                <i class="material-icons">arrow_left</i>
              </Button>
            </td>
            <td>
              pag: {pagina_actual}
              <span title="total de páginas">de {total_paginas}</span>
            </td>

            <td>
              <Button
                dense
                icon
                color="white"
                on:click={() => {
                  if (pagina_actual == total_paginas) return;
                  pagina_actual++;
                  obtenerPancake();
                }}>
                <i class="material-icons">arrow_right</i>
              </Button>
            </td>
            <td>

              <span
                title={`total de productos vendidos y encontrados en el periodo`}
                class="indice_row">
                total de productos:
                <b>{total_registros}</b>
              </span>

            </td>
          </tr>
        </table>
      </div>
      <!--  LISTA NO VENDIDOS-->
      {#if consulta_no_vendidos_fue_realizada}
        <div class="centrado">
          <h3 style="color:white">
          <i class="material-icons vertical alineado" style="font-size:1em;">format_list_numbered</i><i class="material-icons">money_off</i>
            Productos
            <b>activos</b>
            no vendidos en el periodo (total {lista_productos_sin_venta.length})
          </h3>
          <div class="centrado lista_no_vendidos">
            {#each lista_productos_sin_venta as prod_no_vendido, i}
              <!-- content here -->

              <table class="row">
                <tr>
                  <td style="width:50px;">{i + 1})</td>
                  <td style="width:150px;">{prod_no_vendido.nombre}</td>
                  <td style="width:150px;">$ {formato_precio(prod_no_vendido.precio)}</td>
                </tr>
              </table>
            {:else}
              <!-- empty list -->

              <!-- CONSULTA NO VENDIDOS FUE REALIZADA -->
              <div class="centrado">
                No se encontraron productos activos no vendidos
              </div>
            {/each}
            <!--Lista_Infinita_productos bind:lista={lista_productos_sin_venta} /-->
          </div>
        </div>
      {/if}
    {:else}
      <!-- NO EXISTEN RESULTADOS -->
      <div class="centrado titulo_formulario" style="color:white">
        No se encontró algún producto vendido en el periodo
      </div>
    {/if}

  </div>

</div>

<Dialog width="450" bind:visible={viendo_producto}>

  {@html resumen_producto}
  <div slot="actions" class="actions center" />

  <div slot="footer" class="footer" />
</Dialog>
