<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import {
    productos,
    lista_productos_en_pedido_nuevo,
    formato_precio,
    mensajes_app,
    pedidos,
    cargando_mensajes_app,
    postData,
    buscadores,
    paginas_actuales,
  } from "./../../../stores";
import {get_productos} from "./../../productos/storez"

  import Row_productos from "./Row_producto.svelte";
  import Row_productos_pedido from "./Row_producto_pedido.svelte";
  import { goto } from "@sapper/app";
  export var pedido_nuevo;
  export var ficha_de_descuento;
  export var cliente;

  const dispatch = createEventDispatcher();
  var db;
  var buscar = "";
  var lista = [];
  var total = 0;
  var mensaje_boton_terminar = "Terminar pedido";
  var confirmaciones = 0;
  var procesando_pedido = false;
  var descuento_a_usar = 0;
  var total_pedido;
  let guardando = false;
  var solicitando_productos = false;
  let limite_lista = 10;

  let http_ocupado = false;
  let pagina_actual = 1;
  let total_paginas = 0;
  let busqueda_dinamica = "";
  let coincidencias = 0;

  onMount(() => {

    return goto("app/pedidos")
    buscar = $buscadores.productos;
    pedido_nuevo.descuento = cliente.perfil.porcentaje;
    descuento_a_usar = pedido_nuevo.descuento;
    total_pedido = formato_precio(total); /// info para el footer title

    selecionar_input_buscar();
    if ($productos.lista.length > 10) {
      lista = $productos.lista;
      return;
    }
     obtener_productos_por_pagina();
    //obtener_lista_productos();
  });

  $: if ($lista_productos_en_pedido_nuevo.length) {
    total = sumar_cantidades();
    total_pedido = "Total sin descuento $" + formato_precio(total);
  }
  $: if (ficha_de_descuento != null) {
    descuento_a_usar = ficha_de_descuento.descuento;
  }
  $: if (descuento_a_usar) {
    pedido_nuevo.descuento = descuento_a_usar;
  }
  function terminar() {
    if (confirmaciones < 2) {
      confirmaciones++;
      mensaje_boton_terminar = `Confirma ${3 - confirmaciones} veces`;
      return;
    }
    procesando_pedido = true;
    mensaje_boton_terminar = "Creando el pedido...";

    guardar_en_DB();
  }
  function incluye_busqueda(texto) {
    if (texto.toLowerCase().indexOf(buscar.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function selecionar_input_buscar() {
    var input = document.getElementById("input_buscar");
    setTimeout(() => {
      input.focus();
    }, 200);
  }

  function sumar_cantidades() {
    var total_dinero = 0;
    if ($lista_productos_en_pedido_nuevo == undefined) {
      total_dinero = 0;
      return;
    }
    if ($lista_productos_en_pedido_nuevo == 0) {
      total_dinero = 0;
      return;
    }
    total_dinero = $lista_productos_en_pedido_nuevo.reduce(
      (a, b) => +a + +b.producto.precio * +b.cantidad,
      0
    );
    return total_dinero;
  }

  function mostrar_cargando() {
    $cargando_mensajes_app.push({
      tipo: "info",
      mensaje: `El pedido está siendo procesado, <br> <span class="indice_row">El proceso puede tardar de 5 segundos a 1 minuto.</span>`
    });
    $cargando_mensajes_app = $cargando_mensajes_app;
  }

  function quitar_cargando() {
    $cargando_mensajes_app = [];
    $cargando_mensajes_app = $cargando_mensajes_app;
  }


  
/*
  function guardar_en_DB() {
    ////console.log(pedido_nuevo);
    ////console.log(cliente);
    let arreglado_pedido = JSON.parse(JSON.stringify(pedido_nuevo));
    arreglado_pedido.cliente = cliente;
    arreglado_pedido.lista_productos_en_pedido_nuevo = $lista_productos_en_pedido_nuevo;
    if (arreglado_pedido.moneda === "Pesos Mexicanos")
      arreglado_pedido.tipo_de_cambio = 1;
    else arreglado_pedido.tipo_de_cambio = pedido_nuevo.tipo_de_cambio;
    //console.log(arreglado_pedido);

    guardando = true;
    postData("app/pedidos/nuevo/crear_pedido_nuevo", {
      pedido_nuevo: arreglado_pedido
    })
      .then(respuesta => {
        //console.log(respuesta);

        //  Checar si se logro guardar el usuario
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "pedido creado !"
            });
            $mensajes_app = $mensajes_app;

            $lista_productos_en_pedido_nuevo = [];
            $lista_productos_en_pedido_nuevo = $lista_productos_en_pedido_nuevo;
            //dispatch("ver_lista");
            goto("/app/pedidos");
          }
          guardando = false;
        } else {
          guardando = false;
          $mensajes_app.push({
            tipo: "error",
            mensaje: "No se pudo crear el pedido."
          });
          $mensajes_app = $mensajes_app;
        }

        ////console.log(respuesta);
      })
      .catch(err => {
        guardando = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo crear el pedido."
        });
        $mensajes_app = $mensajes_app;
      });
  }
  
*/
  const obtener_productos_por_pagina = async () => {
    if (http_ocupado) return;
    http_ocupado = true;
    let respuesta = await get_productos(
      $buscadores.productos,
      $productos.pagina_actual,
      true
    );
    http_ocupado = false;
    if (respuesta.ok === false) {
      alert("Ups, no se pudo descargar la lista de productos");
      return;
    }
    $productos.lista_actualizada = new Date();
    $productos.lista = respuesta.lista;
    //lista = respuesta.lista;
    $productos.paginas = respuesta.paginas;    
    if($buscadores.productos==="")$productos.total_registros = respuesta.numero_total;
    $productos.coincidencias = respuesta.coincidencias;
  };

  var delayTimer;

  function handle_buscar(evt) {
    if (http_ocupado === true) return;

    if (evt.key === "Backspace" && buscar==="") {
      $buscadores.productos = buscar;
      $productos.pagina_actual= 1;
      obtener_productos_por_pagina();
      return;
    }
    if (evt.key === "Enter") {
      $buscadores.productos = buscar;
      $productos.pagina_actual= 1;
      obtener_productos_por_pagina();
      return;
    }
  }
</script>

<style>
  .grid-container {
    height: calc(100vh - 166px);
    display: grid;
    grid-template-columns: 0.7fr 1.4fr;
    grid-template-rows: 50px 2.2fr 0.4fr;
    grid-template-areas: "titulo_1 titulo_2" "listas lista_de_pedido" "barra_1 barra_2";
  }

  .titulo_1 {
    grid-area: titulo_1;
  }

  .titulo_2 {
    grid-area: titulo_2;
    margin-right: 4px;
  }

  .listas {
    grid-area: listas;
    padding: 0px 3px 0 17px;
    border: 1px solid #222d32;
    border-radius: 0 0px 7px 7px;
    margin-right: 1px;
    box-shadow: 0px 0px 4px #b6b6ff;
  }

  .lista_de_pedido {
    grid-area: lista_de_pedido;
    border-left: 1px solid #222d32;
    border-bottom: solid 1px #222d32;
    border-radius: 1px 0px 5px 5px;
    margin-right: 4px;
    border-right: 1px solid #222d32;
    box-shadow: 0px 0px 4px #b6b6ff;
    height: 68vh;
    max-height: 68vh;
    overflow-y: auto;
  }

  .barra_2 {
    grid-area: barra_2;
    margin: 0 auto;
  }

  .barra_1 {
    grid-area: barra_1;
    padding-left: 9px;
  }
  .contenedor_lista_busqueda {
    height: 60vh;
    overflow-y: auto;
  }
  .subtitulo_ {
    padding: 14px;
    background: #7575ff;
    color: white;
  }
  .total_final {
    font-weight: 500;
    font-size: 1.1em;
  }

  .existe_ficha {
    color: #0065ff;
    font-weight: 500;
  }
  .recargar_productos {
    position: absolute;
    right: 14px;
    top: 56px;
  }
  .recargar_productos:hover {
    font-weight: 500;
  }
  .ocupado {
    color: gray;
  }
</style>

<div class="grid-container">
<!-- BUSCAR PRODUCTOS-->
  <div
    class="titulo_1 titulo_formulario subtitulo_"
    style="border-right: 1px solid white;">
    Buscar productos
  </div>
  <div class="titulo_2 titulo_formulario subtitulo_">
    <table style="width:100%;margin: -10px 0 0 0;">
      <tr>
        <td>Lista de pedido nuevo</td>
        <td style="text-align:right">
          <Button
            on:click={() => {
              $lista_productos_en_pedido_nuevo = [];
            }}
            icon
            title="Borrar todos los productos en la lista !"
            color="#4040a9"
            raised
            dense>
            <i class="material-icons">delete</i>
          </Button>
        </td>
      </tr>
    </table>

  </div>
  <div class="listas">
<!-- BUSCADOR-->
    <table style="margin: -21px 0px 0 55px;">
      <tr>
        <td>
          <Textfield
            id="input_buscar"
            on:keyup={handle_buscar}
            bind:value={buscar}
            placeholder="Buscar con nombre de producto" />
        </td>
        <td>
          <Button  on:click={() => {
             // pagina_actual = 1;
              $productos.pagina_actual= 1;
              obtener_productos_por_pagina();
            }} icon>
            <i class="material-icons">search</i>
          </Button>
        </td>
        <td class="pointer">
          <Button
            on:click={() => {
              buscar = '';
              $buscadores.productos = '';
              lista = $productos.lista;
              $productos.pagina_actual= 1;
              obtener_productos_por_pagina();
              selecionar_input_buscar();
            }}
            icon>
            <i class="material-icons ">cancel</i>
          </Button>
        </td>
      </tr>
    </table>
    <!-- paginacion -->
    <table style="margin: -23px 0 0 39px;">
      <tr>
        <td>
          <Button
            dense
            icon
            on:click={() => {
              if ($productos.pagina_actual== 1) return;
              $productos.pagina_actual--;
              obtener_productos_por_pagina();
            }}>
            <i class="material-icons">arrow_left</i>
          </Button>
        </td>
        <td>
          pag: {$productos.pagina_actual}
          <span title="total de páginas">de {$productos.paginas}</span>
        </td>

        <td>
          <Button
            dense
            disabled={$productos.pagina_actual== $productos.paginas}
            icon
            on:click={() => {
              if ($productos.pagina_actual== $productos.paginas) return;
              $productos.pagina_actual++;
              obtener_productos_por_pagina();
            }}>
            <i class="material-icons">arrow_right</i>
          </Button>
        </td>
        <td>
          {#if buscar != ''}
            <!-- content here -->
            <span class="indice_row">coinciden {$productos.coincidencias}</span>
          {:else}
            <span class="indice_row">total {$productos.total_registros}</span>
          {/if}
        </td>
      </tr>
    </table>
    {#if http_ocupado}
      <!-- content here -->
      <div class="centrado">cargando...</div>
    {:else}
      <!-- else content here -->
      <div class="contenedor_lista_busqueda">

        {#each $productos.lista as producto, i (producto._id)}
          <!-- content here -->
          
            <!-- content here -->
            <Row_productos
              bind:descuento_a_usar
              {producto}
              indice={10 * $productos.pagina_actual+ i + 1 - 10} />
         
        {:else}
          <!-- empty list -->
          {#if buscar != ''}
            <!-- content here -->
            No existen registros que coincidan con la busqueda "
            <b>{buscar}</b>
            "
          {:else if $productos.total_registros === 0}
            No existen productos registrados en Base de datos.
          {/if}
        {/each}
      </div>
    {/if}

  </div>
  <div class="lista_de_pedido">
    {#each $lista_productos_en_pedido_nuevo as item, i (item.producto._id)}
      <!-- content here -->
      <Row_productos_pedido
        id={item.producto.codigo}
        on:actualizar_totales={sumar_cantidades}
        bind:descuento_a_usar
        bind:item_pedido={item}
        indice={i} />
    {:else}
      <!-- empty list -->
      <div class="lista_vacia">[ Lista vacía ]</div>
    {/each}
  </div>
  <div class="barra_2">
    <!--  BARRA DE ABAJO-->
    {#if procesando_pedido}
      <!-- Procesando -->
      <div class="centrado">
        {mensaje_boton_terminar}
        <br />
        <div id="wave1_subir_pedido" />

      </div>
    {:else}
      <!-- Sin acciones , total y boton mandar -->
      <table>
        <tr>
          {#if ficha_de_descuento == null}
            <!-- SIN FICHA DE DESCUENTO -->

            <td>Total con descuento</td>
            <td class="total_final">
              $ {formato_precio(total)}
              <span class="indice_row">
                ,descuento {formato_precio(pedido_nuevo.descuento)} %
              </span>
            </td>
          {:else}
            <!-- CON FICHA -->
            <td title={total_pedido}>Total con descuento en Ficha</td>
            <td class="total_final existe_ficha">
              <i
                title="Tiene ficha de descuento"
                class="material-icons vertical-alineado">
                loyalty
              </i>
              $ {formato_precio(total)}
              <span class="indice_row">
                ,descuento en ficha {descuento_a_usar} %
              </span>
            </td>
          {/if}

          <td>
            <Button
              raised={$lista_productos_en_pedido_nuevo.length != 0}
              color={$lista_productos_en_pedido_nuevo.length != 0 ? '#40f' : 'gray'}
              disabled={guardando || confirmaciones >= 3 || $lista_productos_en_pedido_nuevo.length == 0}
              on:click={terminar}>
              <i class="material-icons">check</i>
              {mensaje_boton_terminar}
            </Button>
          </td>
        </tr>
      </table>
    {/if}

  </div>
  <div class="barra_1">
    <div style="padding-top: 10px;">
      <b>{pedido_nuevo.cliente_nombre}</b>
    </div>
    <div style="padding-top: 10px;">
      <i
        style="color: gray; font-size: 1em;"
        class="material-icons vertical-alineado">
        email
      </i>
      {pedido_nuevo.cliente_correo}
    </div>

    <div class="indice_row">
      <i
        style="color: gray; font-size: 1em;"
        class="material-icons vertical-alineado">
        place
      </i>
      {pedido_nuevo.cliente_direccion}
    </div>
  </div>
</div>
