<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
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

  function obtener_clientes_por_pagina() {
    if (http_ocupado) return;
    http_ocupado = true;
    //console.log("post a lista clientes");

    postData("app/clientes/lista_de_clientes_activos", {
      buscando: busqueda,
      pagina_actual
    })
      .then(res => {
        http_ultima_actividad_fecha = Date.now();
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
          //total_paginas = Math.floor(res.lista.length / limite_lista);
        }
      })
      .catch(err => {
        console.log(err);

        http_ocupado = false;
      });
  }

  function Buscar(evt) {
    if (evt.key === "Enter" && http_ocupado === false) {
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
    var lista_temp = lista_previa.filter(cliente_tmp =>
      incluye_busqueda(cliente_tmp.nombre)
    );

    lista = lista_temp;
  }

  function handleKeydown(evt) {
    input_1 = document.getElementById("input_1");
    if (input_1 == null) return;
    input_1.focus();
  }
</script>

<style>
  .scrollable {
    overflow-y: auto;
    height: 350px;
    width: 350px;
  }
  /*.email {
    color: gray;
    font-size: 0.8em;
    font-weight: 200;
  }
  */
  .nombre {
    text-align: left;
  }
  .input {
    width: 150px;
    margin: 0 16px;
  }
</style>

<svelte:window on:keydown={handleKeydown} />
<Menu origin="top left" style="width:300px;">
  <div slot="activator">
    <table>
      <tr>
        <td style="color: gray;">cliente :</td>
      </tr>
      <tr>

        <td>

          <Button
            dense
            color={cliente.nombre == '' || cliente_tiene_carrito ? 'darkorange' : 'primary'}
            raised
            ripple={false}
            style="padding-right: 4px;width:100%;">
            <i class="material-icons vertical-alineado icono_peque">
              arrow_drop_down
            </i>
            <i class="material-icons vertical-alineado icono_peque">
              account_circle
            </i>

            {#if cliente.nombre === ''}
              <!-- content here -->
              <i class="material-icons vertical-alineado icono_peque">
                schedule
              </i>
              pendiente...
            {:else}
              {cliente.nombre}
              <i class="material-icons vertical-alineado icono_peque">
                double_arrow
              </i>
            {/if}

          </Button>
        </td>
      </tr>
    </table>
  </div>

  <table style="width:100%">
    <tr>
      <td>
        <input
          class="input"
          id="input_1"
          type="text"
          bind:value={busqueda}
          placeholder="Buscar..."
          on:keyup={Buscar} />
      </td>

      <td>

        <Button
          icon
          on:click={() => {
            busqueda = '';
            input_1 = document.getElementById('input_1');
            if (input_1 == null) return;
            input_1.focus();
          }}>
          <i class="material-icons vertical-alineado">cancel</i>
        </Button>
      </td>
      <td>

        <Button icon on:click={Buscar}>
          <i class="material-icons vertical-alineado">search</i>
        </Button>
      </td>
    </tr>
  </table>
  {#if http_ocupado}
    <!-- content here -->
    <div class="centrado indice_row">cargando...</div>
  {:else}
    <!-- else content here -->
    <div class="centrado">
      clientes registrados
      <span class="indice_row">({$clientes.total_registros})</span>
    </div>
    <div class="indice_row centrado">mostrando los primeros 10 resultados</div>
    <br />
    <div class="scrollable">
      {#each lista as item}
        <Menuitem
          on:click={() => {
            cliente = item;
            dispatch('cliente_selecto');
          }}>
          <table>

            <tr>
              {#if item.location.lat != 0}
                <!-- content here -->
                <td title="Cuenta con geo-localización">
                  <i class="material-icons">person_pin_circle</i>
                </td>
              {/if}
              <td class="nombre">{item.nombre}</td>

            </tr>
          </table>
        </Menuitem>
      {/each}
    </div>
  {/if}

</Menu>
