<script>
  import { Button, Textfield, Menu, Menuitem, Ripple } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { clientes, postData, buscadores } from "./../../../stores";
  export var cliente;
  export var cliente_tiene_carrito;
  const dispatch = createEventDispatcher();
  onMount(() => {
    //console.log('montado de cliente');
    //console.log($clientes.lista.length);
    busqueda = $buscadores.clientes;
    if (busqueda.length > 0) {
      obtener_clientes_por_pagina();
      return;
    }
    if ($clientes.lista.length === 0) {
      obtener_clientes_por_pagina();
      return;
    }

    if ($clientes.lista.length > 0) {
      lista = $clientes.lista;
      //console.log('prellenado');

      return;
    }
  });
  var input_1;
  var busqueda = "";
  var lista = [];
  var lista_visible = true;
  var http_ocupado = false;
  var http_ultima_actividad_fecha = Date.now();
  var pagina_actual = 1;
  let total_paginas = 0;
  let coincidencias = 0;
  let limite_lista = 10;
  let visible = true;
  let ultima_busqueda = "";

  function obtener_clientes_por_pagina() {
    if (http_ocupado) return;
    http_ocupado = true;
    //console.log("post a lista clientes");
    ultima_busqueda = busqueda;
    postData("app/clientes/lista_de_clientes", {
      buscando: busqueda,
      pagina_actual,
      solo_activos: true,
    })
      .then((res) => {
        http_ultima_actividad_fecha = Date.now();
        setTimeout(() => {
          http_ocupado = false;
        }, 200);
        //   console.log(res);
        if (res.ok) {
          $clientes.lista = res.lista;
          $clientes.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $clientes = $clientes;
          lista = $clientes.lista;
          $clientes.total_registros = res.numero_total;
          // $clientes.total_registros = res.numero_total;
          total_paginas = res.paginas;
          if (busqueda === "") {
            // total_paginas = res.numero_total;
          } else {
            coincidencias = res.coincidencias;

            total_paginas = res.paginas;
          }
          //total_paginas = Math.floor(res.lista.length / limite_lista);
        }
      })
      .catch((err) => {
        console.log(err);

        http_ocupado = false;
      });
  }

  function Buscar(evt) {
    if ((evt.key === "Enter" && http_ocupado === false) || busqueda === "") {
      pagina_actual = 1;
      obtener_clientes_por_pagina();
    }
  }

  function incluye_busqueda(cliente_selecto) {
    if (cliente_selecto.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function filtrar_nuevo_arreglo() {
    if (busqueda == "") {
      lista = $clientes.lista;
      return;
    }
    var lista_previa = $clientes.lista;
    var lista_temp = lista_previa.filter((cliente_tmp) =>
      incluye_busqueda(cliente_tmp.nombre)
    );

    lista = lista_temp;
  }

  $: if (visible) {
    setTimeout(() => {
      let domelm = document.getElementById("input_1");
      domelm.focus();
    }, 300);
  }
</script>

<table>
  <tr>
    <td style="color: gray;">cliente :</td>
  </tr>
  <tr>
    <td>
      <Button
        on:click={() => (visible = true)}
        dense
        color={cliente.nombre == "" || cliente_tiene_carrito
          ? "darkorange"
          : "primary"}
        raised
        ripple={false}
        style="padding-right: 4px;width:100%;"
      >
        <i class="material-icons vertical-alineado icono_peque colorblanco">
          arrow_drop_down
        </i>
        <i class="material-icons vertical-alineado icono_peque">
          account_circle
        </i>

        {#if cliente.nombre === ""}
          <!-- content here -->
          <i class="material-icons vertical-alineado icono_peque colorblanco"
            >schedule</i
          >
          pendiente...
        {:else}
          {cliente.nombre}
          <i class="material-icons vertical-alineado icono_peque colorblanco">
            double_arrow
          </i>
        {/if}
      </Button>
    </td>
  </tr>
</table>
{#if visible}
  <!-- content here -->
  <div
    class="contenido"
    id="contenedor"
    on:click={(evt) => {
      if (evt.target.id === "contenedor") visible = false;
    }}
  >
    <div class="icono_cerrar">
      <Button fab dense on:click={() => (visible = false)}>
        <i
          class="material-icons"
          title="cerrar diálogo"
          style="color:red;font-size:2em;"
        >
          close
        </i>
      </Button>
    </div>
    <div class="dentro_contenedor">
      <div class="centrado">
        <h3 class="colorblanco">Clientes</h3>
      </div>
      <div class="top_tools">
        <table style="width:80%">
          <tr>
            <td>
              <input
                class="input"
                id="input_1"
                type="text"
                bind:value={busqueda}
                placeholder="Buscar cliente..."
                on:keyup={Buscar}
              />
            </td>

            <td>
              <Button
                icon
                title="borrar texto en búsqueda"
                on:click={() => {
                  busqueda = "";
                  obtener_clientes_por_pagina();
                  input_1 = document.getElementById("input_1");
                  if (input_1 == null) return;
                  input_1.focus();
                }}
              >
                <i class="material-icons vertical-alineado colorblanco"
                  >cancel</i
                >
              </Button>
            </td>
            <td>
              <Button icon on:click={Buscar}>
                <i class="material-icons vertical-alineado colorblanco"
                  >search</i
                >
              </Button>
            </td>
          </tr>
        </table>

        <!-- paginacion -->
        <table style="width:80%;margin-bottom:20px;" class="colorblanco">
          <tr>
            <td>
              <Button
                color="white"
                dense
                icon
                on:click={() => {
                  if (pagina_actual == 1) return;
                  pagina_actual--;
                  obtener_clientes_por_pagina();
                }}
              >
                <i class="material-icons">arrow_left</i>
              </Button>
            </td>
            <td>
              pag: {pagina_actual}
              <span title="total de páginas">de {total_paginas}</span>
            </td>

            <td>
              <Button
                color="white"
                dense
                icon
                on:click={() => {
                  if (pagina_actual == total_paginas) return;
                  pagina_actual++;
                  obtener_clientes_por_pagina();
                }}
              >
                <i class="material-icons">arrow_right</i>
              </Button>
            </td>
            <td>
              {#if busqueda != ""}
                <!-- content here -->
                <span class="indice_row">coinciden {coincidencias}</span>
              {:else}
                <span class="indice_row">total {$clientes.total_registros}</span
                >
              {/if}
            </td>
          </tr>
        </table>
      </div>
      {#if http_ocupado}
        <!-- content here -->
        <div class="centrado indice_row" style="padding-top:250px">
          cargando...
        </div>
      {:else}
        <!-- else content here -->

        <div class="scrollable">
          {#each lista as item, i}
            <div
              class="row_clientes_pop"
              on:click={() => {
                cliente = item;
                dispatch("cliente_selecto");
                visible = false;
              }}
            >
              <Ripple />
              <table>
                <tr>
                  <td class="indice_row"
                    >{i + 1 + (+pagina_actual - 1) * limite_lista}</td
                  >
                  {#if item.location.lat != 0}
                    <!-- content here -->
                    <td title="Cuenta con geo-localización">
                      <i class="material-icons">person_pin_circle</i>
                    </td>
                  {/if}
                  <td class="nombre">{item.nombre}</td>
                </tr>
              </table>
            </div>
          {:else}
            <div class="centrado colorblanco">
              {#if busqueda == "" && ultima_busqueda != ""}
                <!-- content here -->
                No cuentas con clientes registrados.
              {:else}
                <!-- else content here -->
                No se encontraron resultados con "{ultima_busqueda}"
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .scrollable {
    overflow-y: auto;
    height: 50%;
  }
  .email {
    color: gray;
    font-size: 0.8em;
    font-weight: 200;
  }
  .nombre {
    text-align: left;
  }
  .input {
    width: 250px;
    margin: 0 16px;
  }
  .contenido {
    background-color: #272727f5;
    position: absolute;
    left: 0px;
    top: 0px;
    height: 100%;
    width: 100%;
    z-index: 2;
  }
  .row_clientes_pop {
    height: 44px;
    user-select: none;
    display: flex;
    align-items: center;
    padding: 0 16px;
    white-space: nowrap;
    background: #bfbfbf;
    border-bottom: 1px solid #c5c5c5;
  }
  .row_clientes_pop:hover {
    background: #a0a0a0;
  }
  .top_tools {
    margin: -10px auto;
    width: 40%;
    min-width: 300px;
  }
  .colorblanco {
    color: white;
  }
  .icono_cerrar {
    color: red;
    position: absolute;
    top: 50px;
    right: 50px;
  }
  .dentro_contenedor {
    width: 422px;
    margin: 70px auto;
  }
</style>
