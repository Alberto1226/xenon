<script>
  import Cambiar_descuento from "./../_listas/Nuevo_Descuento.svelte";
  import { blur } from "svelte/transition";

  import SolicitarResumenDeFolios from "./Solicitar_resumen_de_folios.svelte";
  import { Button, Textfield, Dialog } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import {
    lista_detalle,
    visible_ventana_de_detalles,
  } from "./../_listas/store_folios_que_ya_no_existen";
  import {
    productos,
    lista_productos_en_pedido_en_edicion,
    formato_precio,
    mensajes_app,
    pedidos,
    cargando_mensajes_app,
    postData,
    editar_store,
    buscadores,
    paginas_actuales,
    usuario_db,
  } from "./../../../stores";
  import Row_productos from "./Row_producto.svelte";
  import Row_productos_pedido from "./Row_producto_pedido.svelte";
  import Info_promos_completo from "./_promos/info_promos_completo.svelte";
  import { goto } from "@sapper/app";
  import { get_productos } from "./../../productos/storez";
  import Aviso_folios_no_disponibles from "./../_listas/Aviso_folios_no_disponibles.svelte";
  import { obtener_analisis_promos_de_carrito } from "./_promos/obtener_analisis_promos_de_carrito";
  export var pedido_selecto;
  export var ficha_de_descuento;
  export var cliente;
  export var lista_productos;
  export var id_carrito;

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
  let procesando_en_la_nube = false;
  let http_ocupado = false;
  let http_ocupado_lista_pedido = false;
  let limite_lista = 10;
  let total_paginas = 0;
  let pagina_actual = 1;
  let busqueda_dinamica = "";
  let ultima_busqueda_realizada = "";
  let busqueda_coincidencias = 0;
  var total_unidades = 0;
  let tenia_ficha = false;

  let visible = false;
  let descuento_nuevo = 1;
  let input;

  var recargar_txt =
    "Recargar lista de productos en pedido " + $editar_store.pedido
      ? $editar_store.pedido.folio
      : "";
  var actualizar_lista_de_productos = false;
  var visible_promos_analisis = false;
  var analisis = null;
  var mandar_solicitud_checado_de_folios = false;
  var cambio_descuento_gral = false;
  var sugerencia_visible = false;

  onMount(() => {
    buscar = $buscadores.productos;
    console.log($editar_store.pedido.descuento);
    $lista_productos_en_pedido_en_edicion = lista_productos;
    // pedido_selecto.descuento = cliente.perfil.porcentaje;
    descuento_a_usar = $editar_store.pedido.descuento;

    descuento_nuevo = descuento_a_usar;

    tenia_ficha = $editar_store.pedido.tenia_ficha;
    total_pedido = formato_precio(total); /// info para el footer title

    selecionar_input_buscar();
    obtener_productos_por_pagina();
    /*
    
    if ($productos.lista.length > 0) {
      lista = $productos.lista;
      return;
    }
    */
  });
  $: if (actualizar_lista_de_productos == true) {
    actualizar_lista_de_productos = false;
    obtener_productos_por_pagina();
  }

  $: if ($editar_store.pedido.folio) {
    // para evitar errores en single line reactivo
    recargar_texto_crear_string();
  }

  $: if ($lista_productos_en_pedido_en_edicion.length) {
    total = sumar_cantidades();
    total_pedido = "Total sin descuento $" + formato_precio(total);
    $editar_store.pedido.total_dinero = total;
  }
  $: if (ficha_de_descuento != null) {
    descuento_a_usar = ficha_de_descuento.descuento;
  }
  $: if (descuento_a_usar) {
    $editar_store.descuento = descuento_a_usar;
  }

  async function obtener_analisis_promos() {
    if (http_ocupado == true) return;
    http_ocupado = true;
    let analisis_proceso = await obtener_analisis_promos_de_carrito(
      $editar_store.pedido._id,
    );
    console.log("--**---***---*-*-*-*-*-*");
    visible_promos_analisis = true;

    if (analisis_proceso.ok == true) analisis = analisis_proceso.resumen;
    console.log(analisis);
    http_ocupado = false;
  }

  function incluye_busqueda(texto) {
    if (texto.toLowerCase().indexOf(buscar.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function recargar_texto_crear_string() {
    recargar_txt = "Recargar lista de productos en pedido ";
    if (!$editar_store.pedido) return;
    recargar_txt += $editar_store.pedido.folio;
  }

  function filtrar_nuevo_arreglo() {
    if (buscar == "") {
      lista = $productos.lista;
      return;
    }
    var lista_previa = $productos.lista;
    var lista_temp = $productos.lista.filter((producto) =>
      incluye_busqueda(producto.nombre + producto.codigo),
    );

    lista = lista_temp;
  }

  function selecionar_input_buscar() {
    var input = document.getElementById("input_buscar");
    setTimeout(() => {
      input.focus();
    }, 200);
  }

  function sumar_cantidades() {
    var total_dinero = 0;
    total_unidades = 0;
    if ($lista_productos_en_pedido_en_edicion == undefined) {
      total_dinero = 0;
      return;
    }
    if ($lista_productos_en_pedido_en_edicion == 0) {
      total_dinero = 0;
      return;
    }
    total_dinero = $lista_productos_en_pedido_en_edicion.reduce(
      (a, b) => +a + +b.producto.precio * +b.cantidad,
      0,
    );

    total_unidades = $lista_productos_en_pedido_en_edicion.reduce(
      (a, b) => +a + +b.cantidad,
      0,
    );
    let lista_temp = $pedidos.lista;
    //console.log('buscar '+$editar_store.pedido._id );
    //console.log(lista_temp);

    let pedido_en_lista_stores = lista_temp.find(
      (element) => element._id === $editar_store.pedido._id,
    );
    if (pedido_en_lista_stores === undefined) {
      $pedidos.lista.push($editar_store.pedido);
      $pedidos = $pedidos;
      pedido_en_lista_stores = lista_temp.find(
        (element) => element._id === $editar_store.pedido._id,
      );
    }
    pedido_en_lista_stores.total_pedido = total_dinero;
    $pedidos.lista = lista_temp;
    $pedidos = $pedidos;
    return total_dinero;
  }

  ///   usado si algun row cambia en ambas listas

  function mostrar_cargando() {
    $cargando_mensajes_app.push({
      tipo: "info",
      mensaje: `El pedido está siendo procesado, <br> <span class="indice_row">El proceso puede tardar de 5 segundos a 1 minuto.</span>`,
    });
    $cargando_mensajes_app = $cargando_mensajes_app;
  }

  function quitar_cargando() {
    $cargando_mensajes_app = [];
    $cargando_mensajes_app = $cargando_mensajes_app;
  }

  const obtener_productos_por_pagina = async () => {
    if (http_ocupado) return;
    http_ocupado = true;
    let respuesta = await get_productos(
      $buscadores.productos,
      $productos.pagina_actual,
      true,
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
    if ($buscadores.productos === "")
      $productos.total_registros = respuesta.numero_total;
    $productos.coincidencias = respuesta.coincidencias;
  };

  var delayTimer;

  function handle_buscar(evt) {
    if (http_ocupado === true) return;

    if (evt.key === "Backspace" && buscar === "") {
      $buscadores.productos = buscar;
      $productos.pagina_actual = 1;
      // $paginas_actuales.productos = 1;
      obtener_productos_por_pagina();
      return;
    }
    if (evt.key === "Enter") {
      $buscadores.productos = buscar;
      $productos.pagina_actual = 1;
      //$paginas_actuales.productos = 1;
      obtener_productos_por_pagina();
      return;
    }
  }

  function actualizar_pedido() {
    return new Promise((resolve, reject) => {
      if (http_ocupado_lista_pedido == true) return;
      http_ocupado_lista_pedido = true;
      postData("app/pedidos/editar/devolver_carrito", { id: id_carrito })
        .then((respuesta) => {
          // console.log(respuesta);
          http_ocupado_lista_pedido = false;

          if (respuesta.ok) {
            let lista_temp = $pedidos.lista;
            let pedido_en_lista = lista_temp.find(
              (element) => element._id === $editar_store.pedido._id,
            );
            pedido_en_lista = respuesta.carrito;
            $lista_productos_en_pedido_en_edicion = respuesta.carrito.lista;
            //$pedidos.lista = lista_temp;

            //$pedidos =$pedidos;
            //$editar_store.pedido= pedido_en_lista;
            resolve(respuesta);
            return;
          } else {
            reject(respuesta);
            return;
          }
        })
        .catch((err) => {
          http_ocupado_lista_pedido = false;
          console.log(err);
          reject(err);
        });
    });
  }

  async function solicitar_resumen_folios() {
    mandar_solicitud_checado_de_folios = true;
  }

  function cambiar_descuento() {
    if (http_ocupado) return;
    if (descuento_nuevo > 99 || descuento_nuevo < 0) return;

    http_ocupado = true;
    console.log($editar_store.pedido);
    postData("/app/pedidos/cambiar_descuento_de_pedido", {
      id: $editar_store.pedido._id,
      descuento_nuevo,
    })
      .then((respuesta) => {
        //console.log(respuesta);
        http_ocupado = false;
        if (respuesta.ok) {
          $mensajes_app.push({
            tipo: "exito",
            mensaje:
              "Pedido " +
              $editar_store.pedido.folio +
              " ha cambiado el descuento " +
              status,
          });
          $mensajes_app = $mensajes_app;
          const { nueva_lista, total_pedido, descuento_nuevo } = respuesta;
          $editar_store.pedido.lista = nueva_lista;
          $editar_store.pedido.total_pedido = total_pedido;
          $editar_store.pedido.lista = descuento_nuevo;

          dispatch("descuento_cambiado", respuesta);
          visible = false;
          actualizar_pedido();
          descuento_a_usar = descuento_nuevo;
          // console.log(descuento_a_usar);
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje:
              "Pedido " +
              $editar_store.pedido.folio +
              " no pudo cambiar el descuento ",
          });
          $mensajes_app = $mensajes_app;
        }
      })
      .catch((err) => {
        http_ocupado = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje:
            "Ups, no se pudo hacer el cambio de descuento, intalo de nuevo.",
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }

  function handleKeyup(event) {
    //console.log(event.key == "Enter");
    if (event.key === "Enter") {
      cambiar_descuento();
    }
  }

  function procesar_termino_consulta_de_folios(evt) {
    console.log(evt.detail);
    var respuesta = evt.detail;
    if (respuesta.ok == true) {
      if (respuesta.resultado.ok == true) {
        console.log("sin fallas");
        $lista_detalle = [];
      } else {
        console.log("con fallas");
        $lista_detalle = respuesta.resultado.reporte_de_folios_para_frontend;
      }

      $visible_ventana_de_detalles = true;
    }
    mandar_solicitud_checado_de_folios = false;
  }

  function cerrar_dialogo_de_Folios() {
    $visible_ventana_de_detalles = false;
  }

  const mover_a_mouse = (event) => {
    // console.log($editar_store.pedido.descuento);
    visible = true;
  };
</script>

{#if mandar_solicitud_checado_de_folios == true}
  <SolicitarResumenDeFolios
    on:termino={procesar_termino_consulta_de_folios}
    pedido_id={$editar_store.pedido._id}
  />
{/if}

<Info_promos_completo {analisis} bind:visible={visible_promos_analisis} />
<div class="grid-container">
  <div
    class="titulo_1 titulo_formulario subtitulo_"
    style="border-right: 1px solid white;"
  >
    Buscar productos
  </div>
  <div class="titulo_2 titulo_formulario subtitulo_">
    Lista de pedido {$editar_store.pedido ? $editar_store.pedido.folio : ""}
    <i class="vertical-align material-icons">create</i>

    <div class="tools-folio">
      {#if visible === false}
        <!-- content here -->
        <!-- <Button
          icon
          dense
          color="white"
          disabled={$usuario_db.rol == "almacen" ||
            $usuario_db.rol == "vendedor"}
          hidden={$usuario_db.rol == "almacen" || $usuario_db.rol == "vendedor"}
          on:click={mover_a_mouse}
          title="Cambiar descuento de un pedido"
        >
          <i class="material-icons">local_atm</i>
        </Button> -->
      {:else}
        <!-- else content here -->

        <div
          id={$editar_store.pedido._id}
          class="flotante"
          in:blur={{ amount: 3, duration: 450 }}
          out:blur={{ amount: 3, duration: 450, delay: 500 }}
        >
          <table style="width:100%" class="no_select">
            <tr>
              <td style="width:50px;font-weight:900;">
                <table>
                  <tr>
                    <td style="width:150px;font-weight:900;">
                      folio: {$editar_store.pedido.folio}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="width:50px;font-weight:900;"
                      title="descuento aplicado"
                    >
                      {$editar_store.pedido.descuento} %
                    </td>
                  </tr>
                </table>
              </td>

              <td style="width:250px">
                <Textfield
                  style="text-align:center"
                  min="0"
                  max="99"
                  bind:this={input}
                  outlined
                  type="number"
                  bind:value={descuento_nuevo}
                  message="Nuevo descuento"
                  autofocus
                  on:keyup={handleKeyup}
                  placeholder="Aplicar un descuento distinto"
                />
              </td>
              <td style="width: 50px;">%</td>
              <td style="width:50px">
                <Button
                  style="border-radius:25px"
                  raised
                  color="primary"
                  title="Cambiar el descuento actual"
                  on:click={cambiar_descuento}
                >
                  <i class="material-icons">save</i>
                </Button>
              </td>
              <td style="width:50px" title="Cerrar dialogo">
                <Button
                  icon
                  on:click={() => {
                    visible = false;
                  }}
                  color="red"
                >
                  <i class="material-icons">cancel</i>
                </Button>
              </td>
            </tr>
          </table>
        </div>
      {/if}

      <!-- <Button
        on:click={solicitar_resumen_folios}
        disabled={$usuario_db.rol == "almacen"}
        ><img
          src="imagenes/icono_mas_info_de_folios.svg"
          alt="Más información de los folios"
          title="Info sobre disponibilidad de los folios selectos"
        /></Button
      > -->
      <Button
        color="white"
        disabled={$usuario_db.rol == "almacen"}
        icon
        dense
        on:click={obtener_analisis_promos}
      >
        <i
          class="material-icons"
          title="Obtener analisis de promos y sus condiciones en el pedido"
        >
          new_releases</i
        >
      </Button>
      <Button color="white" icon dense on:click={actualizar_pedido}>
        <i class="material-icons" title={recargar_txt}> autorenew</i>
      </Button>
    </div>
  </div>
  <div class="listas">
    <table>
      <tr>
        <td>
          <Textfield
            id="input_buscar"
            disabled={$usuario_db.rol == "almacen"}
            on:keyup={handle_buscar}
            outlined
            bind:value={buscar}
            placeholder="Buscar con nombre de producto"
          />
        </td>
        <td>
          <Button
            on:click={() => {
              $productos.pagina_actual = 1;
              $paginas_actuales.productos = 1;
              obtener_productos_por_pagina();
            }}
            icon
          >
            <i class="material-icons">search</i>
          </Button>
        </td>
        <td class="pointer">
          <Button
            on:click={() => {
              buscar = "";
              $buscadores.productos = "";
              lista = $productos.lista;
              selecionar_input_buscar();
              $productos.pagina_actual = 1;
              obtener_productos_por_pagina();
            }}
            icon
          >
            <i class="material-icons">cancel</i>
          </Button>
        </td>
      </tr>
    </table>

    {#if $usuario_db.rol != "almacen"}
      <!-- paginacion -->
      <table style="margin: -23px 0 0 39px;">
        <tr>
          <td>
            <Button
              dense
              icon
              on:click={() => {
                if ($productos.pagina_actual == 1) return;
                $productos.pagina_actual--;
                obtener_productos_por_pagina();
              }}
            >
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
              icon
              on:click={() => {
                if ($productos.pagina_actual == $productos.paginas) return;
                $productos.pagina_actual++;
                obtener_productos_por_pagina();
              }}
            >
              <i class="material-icons">arrow_right</i>
            </Button>
          </td>
          <td>
            {#if buscar != ""}
              <!-- content here -->
              <span class="indice_row"
                >coinciden {$productos.coincidencias}</span
              >
            {:else}
              <span class="indice_row">total {$productos.total_registros}</span>
            {/if}
          </td>
        </tr>
      </table>
    {/if}

    {#if $usuario_db.rol != "almacen"}
      {#if http_ocupado}
        <!-- content here -->
        <div class="centrado">cargando...</div>
      {:else}
        <div class="contenedor_lista_busqueda">
          <br />
          {#each $productos.lista as producto, i (producto._id)}
            <!-- svelte-ignore empty-block -->
            {#if procesando_pedido || procesando_en_la_nube}
              {#if i == 0}
                <div class="centrado">cargando...</div>
              {/if}
            {:else}
              <!-- content here -->
              <Row_productos
                bind:procesando_en_la_nube
                on:actualizar_lista={filtrar_nuevo_arreglo}
                bind:id_carrito
                bind:descuento_a_usar
                {producto}
                indice={10 * $productos.pagina_actual + i + 1 - 10}
              />
            {/if}
          {:else}
            <!-- empty list -->
          {/each}
        </div>
      {/if}
    {/if}
  </div>
  <div class="lista_de_pedido">
    {#if http_ocupado_lista_pedido == false}
      <!-- content here -->
      {#each $lista_productos_en_pedido_en_edicion as item, i (item.producto._id + "en_lista")}
        <!-- content here -->
        <Row_productos_pedido
          id={item.producto._id + "en_lista"}
          on:se_actualizaron_folios={actualizar_pedido}
          on:se_borro_el_producto={() => {
            lista = [];
            setTimeout(() => {
              //filtrar_nuevo_arreglo();
              //console.log("se borro ||||");
              actualizar_lista_de_productos = true;
            }, 500);
          }}
          bind:descuento_a_usar
          bind:id_carrito
          bind:id_registro={item._id}
          bind:cliente
          bind:item_pedido={item}
          bind:procesando_en_la_nube
          indice={i}
        />
      {:else}
        <!-- empty list -->
        <div class="lista_vacia">[ Lista vacía ]</div>
      {/each}
    {:else}
      <div class="centrado">
        <h3>cargando...</h3>
      </div>
    {/if}
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
      <table class="cantidad">
        <tr>
          {#if tenia_ficha == false}
            <!-- SIN FICHA DE DESCUENTO -->

            <td>
              Total Precio:
              <br />
            </td>
            <td class="total_final" style="text-align: left;">
              $ {formato_precio(total)}
              <br />

              <span class="porcentaje_pedido">
                descuento {descuento_a_usar} %
              </span>
            </td>
            <td>
              Total Unidades:
              <b style="font-weight:800;font-size:1.2em">{total_unidades}</b>
            </td>
          {:else}
            <!-- CON FICHA -->
            <td title={total_pedido}>Total:</td>
            <td class="total_final existe_ficha">
              <i
                title="Tiene ficha de descuento"
                class="material-icons vertical-alineado"
              >
                loyalty
              </i>
              $ {formato_precio(total)}
              <br />
              <span style="color:white;font-size:0.9em;">
                descuento en ficha {descuento_nuevo} %
              </span>
            </td>
          {/if}

          <td>
            {#if procesando_pedido || procesando_en_la_nube}
              <!-- content here -->
              Guardando...
              <i
                style="color:#1c5f47;"
                class="material-icons vertical-alineado"
              >
                lock_open
              </i>
            {:else}
              <!-- else content here -->
              Guardado !
              <i
                style="color: #82ffd2;"
                class="material-icons vertical-alineado"
              >
                cloud_done
              </i>
            {/if}
          </td>
        </tr>
      </table>
    {/if}
  </div>
  <div class="barra_1">
    <div style="padding-top: 10px;">
      <b>{$editar_store.pedido.cliente.nombre}</b>
    </div>
    <div style="padding-top: 10px;">{$editar_store.pedido.cliente.correo}</div>

    <div class="indice_row">{$editar_store.pedido.cliente.direccion}</div>
  </div>
</div>

<Dialog width="480" bind:visible={$visible_ventana_de_detalles}>
  <div class="centrado">Folios faltantes</div>
  <div class="contendio">
    <Aviso_folios_no_disponibles />
  </div>

  {#if sugerencia_visible == true}
    <div class="sugerencia">
      <span class="indice">a)</span> Editar el pedido, <strong>cambiar</strong>
      el folio por algun otro que si exista <br />
      <span class="indice">b)</span>Editar el pedido, <strong>borrar</strong>
      los/el folio(s) que se muestran arriba. <br />
    </div>
  {/if}
  <div slot="actions" class="actions centrado footer-dolios-dialogo">
    <Button color="primary" on:click={cerrar_dialogo_de_Folios}>Ok</Button>
  </div>
  <div slot="footer" class="footer" />
</Dialog>

<style>
  .contendio {
    max-height: 285px;
    overflow-y: auto;
  }
  .folios {
    cursor: pointer;
  }
  .grid-container {
    height: calc(100vh - 166px);
    display: grid;
    grid-template-columns: 0.6fr 1.4fr;
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
    border: 1px solid #adb7bb;
    border-radius: 0 0px 7px 7px;
    margin-right: 1px;
    box-shadow: 0px 0px 4px #b6b6ff;
  }

  .lista_de_pedido {
    grid-area: lista_de_pedido;
    border-left: 1px solid #adb7bb;
    border-bottom: solid 1px #adb7bb;
    border-radius: 1px 0px 5px 5px;
    margin-right: 4px;
    border-right: 1px solid #adb7bb;
    box-shadow: 0px 0px 4px #b6b6ff;
    height: 70vh;
    max-height: 70vh;
    overflow-y: auto;
  }

  .barra_2 {
    grid-area: barra_2;
    margin: 0 auto;
    padding-top: 10px;
  }

  .barra_1 {
    grid-area: barra_1;
  }
  .contenedor_lista_busqueda {
    height: 60vh;
    overflow-y: auto;
  }
  .subtitulo_ {
    padding: 14px;
    background: #19825c;
    color: white;
  }
  .total_final {
    font-weight: 800;
    font-size: 1.1em;
  }

  .existe_ficha {
    color: #4992ff;
    font-weight: 500;
    text-shadow: 0px 0px 5px black;
  }
  .porcentaje_pedido {
    color: white;
    font-weight: 100;
    font-size: 0.8em;
  }

  .cantidad {
    width: 47vw;
    font-size: 1.1em;
    padding: 6px;
    margin: 2px;
    background-color: #222d32;
    color: white;
    border-radius: 9px;
    text-align: center;
  }
  .tools-folio {
    text-align: right;
    padding-bottom: 4px;
    margin-top: -35px;
  }

  .vertical-align {
    vertical-align: middle;
  }

  .lista_vacia {
    margin: 32vh auto;
    width: fit-content;
    color: gray;
  }

  .flotante {
    position: relative;
    /* se modifico la posision a relativa para correjir el bug del div que se posicionaba fuera de pantalla */
    /* margin: -47px 0px 0px -259px; */
    background-color: white;
    color: #222d32;
    box-shadow: 0px 0px 20px #b3b3b3;
    z-index: 2;
    border-radius: 19px;
    padding: 4px 17px;
    width: 300px;

    animation-name: borde_animado;
    animation-duration: 450ms;
  }

  .fondo {
    top: 0px;
    left: 0px;
    position: absolute;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 255, 255, 0.301);
    z-index: 1;
  }

  @keyframes borde_animado {
    from {
      border-radius: 14px;
    }
    to {
      border-radius: 19px;
    }
  }
</style>
