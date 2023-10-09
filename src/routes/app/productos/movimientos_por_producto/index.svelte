<script>
  import {
    producto_selecto,
    ventas_producto_selecto,
    postData
  } from "./../../../stores";
  import { onMount } from "svelte";
  import Fechas from "./fechas.svelte";
  import Lista from './lista.svelte';
  import Buscador  from './buscador.svelte';
  let imagen = "imagenes/producto_generico.svg";
  let http_ocupado = false;
  let pagina_actual = 1;
  onMount(async () => {
    $ventas_producto_selecto.pendiente = false;
    $ventas_producto_selecto.desde = fecha_hoy();

    $ventas_producto_selecto.hasta = fecha_hace_un_mes();
    if (!$producto_selecto || $producto_selecto.nombre == "ninguno") return;
    imagen = "imagenes/producto_generico.svg";
    if ($producto_selecto.galeria_imagenes.length > 0) {
      imagen = $producto_selecto.galeria_imagenes[0];
    }
    $ventas_producto_selecto.pendiente = true;
  });


  $: if($ventas_producto_selecto.pendiente==true){
    $ventas_producto_selecto.pendiente = false;
    obtener_lista_ventas();
  }

  function obtener_lista_ventas() {
    console.log("se obtendra lista de ventas 1");
    $ventas_producto_selecto.id_producto = producto_selecto._id;
    if (http_ocupado) return;
    if(pagina_actual<1 || isNaN(pagina_actual)) return;
    $ventas_producto_selecto.cargando = true;
    http_ocupado = true;
    let periodicidad = {
      desde: $ventas_producto_selecto.desde,
      hasta: $ventas_producto_selecto.hasta
    };
    console.log({ periodicidad });
    postData("app/productos/movimientos_por_producto/lista", {
      producto_id: $producto_selecto._id,
      periodicidad,
      pagina_actual: pagina_actual - 1
    })
      .then(res => {
        console.log(res);
        http_ocupado = false;
        if (res.ok) {
          $ventas_producto_selecto.paginas = res.paginas;
          $ventas_producto_selecto.coincidencias = res.coincidencias;
          $ventas_producto_selecto.lista = res.lista;
          //resolve(res.lista);
        }
        $ventas_producto_selecto.cargando =false;
        return "hecho";
      })
      .catch(err => {
        console.log(err);
        http_ocupado = false;
        $ventas_producto_selecto.cargando =false;
        return "error";
      });
  }

  function fecha_hace_un_mes() {
    var d = new Date();
    // Set it to one month ago
    d.setMonth(d.getMonth() - 1);
    // Zero the hours
    d.setHours(0, 0, 0);
    // Zero the milliseconds
    d.setMilliseconds(0);
    // Get the time value in milliseconds and convert to seconds
    return d;
  }

  function fecha_hoy() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    // Set it to one month ago
    d.setHours(0, 0, 0);
    // Zero the milliseconds
    d.setMilliseconds(0);
    // Get the time value in milliseconds and convert to seconds
    return d;
  }
</script>

<style>
  .row {
    display: flex;
   
  }
  .nombre {
    font-size: 1.2em;
    font-weight: 800;    
    padding-top: 17px;
    padding-right: 8px;
  }
  .margen-centrado{
    width: max-content;
    margin: 0 auto;
  }
</style>

<h2 class="centrado">Movimientos por producto</h2>
<div class="row margen-centrado">
  <div class="centrado nombre">
    {$producto_selecto ? $producto_selecto.nombre : 'Seleccione algun producto'}
  </div>
  {#if $producto_selecto.galeria_imagenes != undefined && $producto_selecto.galeria_imagenes.length > 0}
    <!-- content here -->

    <div
      class="imagen_row"
      style="background-image:url({imagen ? imagen : ''})" />
  {/if}
</div>

<div class="row">

  <!-- <Fechas
    bind:desde={$ventas_producto_selecto.desde}
    bind:hasta={$ventas_producto_selecto.hasta} /> -->
  <div class="margen-centrado">
<Buscador bind:pagina_actual/>

  </div>



</div>
  <Lista {pagina_actual}/>