<script>
  import AvisoFoliosNoDisponibles from "./_listas/Aviso_folios_no_disponibles.svelte";
  import { Textfield, Button, Dialog } from "svelte-mui/src";
  import { onMount } from "svelte";
  import {
    pedidos,
    pedidos_cancelados,
    postData,
    pedidos_historicos,
    buscadores,
  } from "./../../stores";
  import Lista from "./_listas/Lista.svelte";
  //import Lista_cancelados from "./_listas/Lista_cancelados.svelte";
  //import Lista_historicos from "./_listas/Lista_historicos.svelte";
  import PDFvisor from "./PDFvisor2.svelte";
  import { goto } from "@sapper/app";
  import { fade } from "svelte/transition";
  import { visible_ventana_de_detalles } from "./_listas/store_folios_que_ya_no_existen";

  var cargando = true;
  var pedido_seleccionado = null;
  var viendo = "Pendientes";
  let visible_tipo_pedidos_visible = false;
  var estado_actual = "viendo listas";
  var buscando = "";
  var buscando_mandar = "";
  var pagina_actual = 1;
  var url_consulta = "app/pedidos/lista_de_pedidos";
  var ejecutar_consulta = false;
  var sugerencia_visible = false;

  onMount(() => {
    buscando = $buscadores.pedidos;
    // if ($clientes.lista.length > 0) return;
    //obtener_lista();
  });

  $: if (buscando.length) {
    $buscadores.pedidos = buscando;
  }

  function obtener_pendientes(params) {
    url_consulta = "app/pedidos/lista_de_pedidos";
    ejecutar_consulta = true;
  }

  function obtener_cancelados(params) {
    url_consulta = "app/pedidos/lista_de_pedidos_cancelados";
    ejecutar_consulta = true;
  }

  function obtener_historicos(params) {
    url_consulta = "app/pedidos/lista_de_pedidos_historicos";
    ejecutar_consulta = true;
  }

  function editar_pedido() {
    estado_actual = "editando pedido";
  }

  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();
      estado_actual = "creando pedido";
      goto("/app/pedidos/nuevo/nuevo");
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo listas"
    }
  }

  function handle_buscar(evt) {
    if (evt.key === "Enter") {
      buscando_mandar = buscando;
    }
  }

  function cerrar_dialogo_de_Folios() {
    $visible_ventana_de_detalles = false;
  }
</script>

<svelte:head>
  <title>Pedidos</title>
</svelte:head>
<svelte:window on:keydown={handleKeydown} />
<!-- Barra de herramientas -->

<div class="centrado herramientas">
  {#if estado_actual == "viendo listas"}
    <!-- Buscando -->
    <div class="centrado">
      <table style="width: 96%;">
        <tr>
          <td>
            <table style=" margin-left: 20px;width:250px;">
              <tr>
                <td>
                  <Textfield
                    placeholder="Buscar"
                    on:keyup={handle_buscar}
                    bind:value={buscando}
                  />
                </td>
                <td>
                  <i class="material-icons">search</i>
                </td>
                <td>
                  <Button
                    on:click={() => {
                      visible_tipo_pedidos_visible = true;
                    }}
                    icon
                  >
                    <i class="material-icons">settings</i>
                  </Button>
                </td>
              </tr>
            </table>
          </td>
          <!-- Titulo -->
          <td style="width: 72%;padding: 0 0 0px 0%;">
            <h3 class="titulo_formulario">
              Pedidos {viendo}

              {#if viendo === "Enviados"}
                <!-- content here -->
                <i class="material-icons">flight_land</i>
              {:else if viendo === "Pendientes"}
                <i style="" class="material-icons icono_titulo">shopping_cart</i
                >
              {:else if viendo === "Cancelados"}
                <i style="" class="material-icons icono_titulo">backspace</i>
              {/if}
            </h3>
          </td>
          <td>
            Nuevo Pedido
            <Button
              on:click={() => {
                estado_actual = "creando pedido";
                goto("/app/pedidos/nuevo/nuevo");
              }}
              icon
              raised
              outlined
              title="crear pedido nuevo (+)"
            >
              <i class="material-icons">add</i>
            </Button>
          </td>
        </tr>
      </table>
    </div>
  {:else if estado_actual == "creando pedido"}
    <!-- else content here -->
    <div class="izquierda" style="padding-left: 5px;">
      <table>
        <tr>
          <td>
            <Button
              on:click={() => {
                estado_actual = "viendo listas";
              }}
              raised
              outlined
              title="ver lista"
            >
              <i class="material-icons">arrow_back</i>
              Ver lista
            </Button>
          </td>
          <td class="centrado titulo_formulario" style="width: 63vw;">
            Pedido Nuevo
          </td>
        </tr>
      </table>
    </div>
  {/if}
</div>

<!-- content here -->
{#if estado_actual === "viendo listas"}
  <!-- content here -->

  <div in:fade={{ duration: 300 }}>
    <Lista
      bind:pagina_actual
      bind:buscando={buscando_mandar}
      on:editar_pedido={editar_pedido}
      bind:cargando
      bind:ejecutar_consulta
      bind:viendo
      bind:url_consulta
      on:ver_un_pdf={(evt) => {
        estado_actual = "ver_un_pdf";
        pedido_seleccionado = evt.detail.pedido;
      }}
    />
  </div>
  <!-- content here -->
{:else if estado_actual === "ver_un_pdf"}
  <PDFvisor
    on:mostrar_lista={() => {
      estado_actual = "viendo listas";
    }}
    bind:pedido={pedido_seleccionado}
  />
{/if}

<Dialog width="480" bind:visible={$visible_ventana_de_detalles}>
  <div class="centrado">Folios faltantes</div>
  <div class="contendio">
    <AvisoFoliosNoDisponibles />
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
    <Button on:click={() => (sugerencia_visible = true)}>Sugerencia</Button>
    <Button color="primary" raised on:click={cerrar_dialogo_de_Folios}>
      Ok</Button
    >
  </div>
  <div slot="footer" class="footer" />
</Dialog>

<Dialog width="480" bind:visible={visible_tipo_pedidos_visible}>
  <div class="centrado">Opciones de vista</div>

  <table>
    <tr>
      <td>
        <Button
          on:click={() => {
            pagina_actual = 1;
            viendo = "Pendientes";
            obtener_pendientes();
          }}
        >
          <i class="material-icons">timer</i>
          Pendientes
        </Button>
      </td>
      <td>
        <Button
          on:click={() => {
            pagina_actual = 1;
            viendo = "Enviados";
            obtener_historicos();
          }}
        >
          <i class="material-icons">flight_land</i>
          Enviados
        </Button>
      </td>
      <td>
        <Button
          on:click={() => {
            pagina_actual = 1;
            viendo = "Cancelados";
            if ($pedidos_cancelados.lista.length > 0) {
              cargando = false;
              return;
            }
            obtener_cancelados();
          }}
        >
          <i class="material-icons">flight_land</i>
          Cancelados
        </Button>
      </td>
    </tr>
  </table>

  <div slot="actions" class="actions center" />

  <div slot="footer" class="footer" />
</Dialog>

<style>
  .icono_titulo {
    vertical-align: middle;
    font-size: 0.85em;
  }

  .footer-dolios-dialogo {
    justify-content: space-between;
  }

  .sugerencia {
    color: green;
  }
  .indice {
    font-size: 9px;
    color: black;
  }
</style>
