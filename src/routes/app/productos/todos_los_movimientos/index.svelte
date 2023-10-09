<script>
  import {
    producto_selecto,
    movimientos_del_producto,
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
    $movimientos_del_producto.pendiente = false;
    $movimientos_del_producto.desde = fecha_hoy();

    $movimientos_del_producto.hasta = fecha_hace_un_mes();
    if (!$producto_selecto || $producto_selecto.nombre == "ninguno") return;
    imagen = "imagenes/producto_generico.svg";
    if ($producto_selecto.galeria_imagenes.length > 0) {
      imagen = $producto_selecto.galeria_imagenes[0];
    }
    $movimientos_del_producto.pendiente = true;
  });


  $: if($movimientos_del_producto.pendiente==true){
    $movimientos_del_producto.pendiente = false;
    obtener_lista_ventas();
  }

  function obtener_lista_ventas() {
    console.log("se obtendra lista de ventas 1");
    $movimientos_del_producto.id_producto = producto_selecto._id;
    if (http_ocupado) return;
    if(pagina_actual<1 || isNaN(pagina_actual)) return;
    $movimientos_del_producto.cargando = true;
    http_ocupado = true;
    let periodicidad = {
      desde: $movimientos_del_producto.desde,
      hasta: $movimientos_del_producto.hasta
    };
    console.log({ periodicidad });
    postData("app/productos/todos_los_movimientos/lista", {
      producto_id: $producto_selecto._id,
      pagina_actual: pagina_actual - 1,
      filtros_acciones:$movimientos_del_producto.filtros_acciones
    })
      .then(res => {
        console.log(res);
        http_ocupado = false;
        if (res.ok) {
          $movimientos_del_producto.paginas = res.paginas;
          $movimientos_del_producto.coincidencias = res.coincidencias;
          $movimientos_del_producto.lista = res.lista;
          //resolve(res.lista);
        }
        $movimientos_del_producto.cargando =false;
        return "hecho";
      })
      .catch(err => {
        console.log(err);
        http_ocupado = false;
        $movimientos_del_producto.cargando =false;
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
    bind:desde={$movimientos_del_producto.desde}
    bind:hasta={$movimientos_del_producto.hasta} /> -->
  <div class="margen-centrado">
<Buscador bind:pagina_actual/>

  </div>



</div>
  <Lista {pagina_actual}/>