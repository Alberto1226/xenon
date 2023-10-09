<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { clientes ,postData} from "./../../../stores";
  export var cliente;
  export var cliente_tiene_carrito;
  const dispatch = createEventDispatcher();
  onMount(() => {
    if ($clientes.lista.length > 0) {
      lista = $clientes.lista;
      return;
    }
    obtener_lista();
  });
  var input_1;
  var busqueda = "";
  var lista = [];

  var lista_visible = true;
function obtener_lista() {
    postData("app/clientes/lista_de_clientes")
      .then(res => {
        if (res.ok) {
          $clientes.lista = res.lista;
          $clientes.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $clientes = $clientes;
          filtrar_nuevo_arreglo();
        }
      })
      .catch(err => {
        console.log(err);
      });
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
    height: 150px;
    width: 350px;
  }
  .email {
    color: gray;
    font-size: 0.8em;
    font-weight: 200;
  }
  .nombre {
    text-align: left;
  }
</style>

<svelte:window on:keydown={handleKeydown} />
<Menu origin="top left" style="width:300px;">
  <div slot="activator">
    <Button
      color={cliente.nombre == '' || cliente_tiene_carrito ? 'red' : 'primary'}
      raised
      ripple={false}
      style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>
        cliente : {cliente.nombre == '' ? 'pendiente...' : cliente.nombre}
      </span>

    </Button>
  </div>
  <input
  style="width: 260px;"
    id="input_1"
    type="text"
    bind:value={busqueda}
    on:keyup={filtrar_nuevo_arreglo} />
  <i class="material-icons vertical-alineado">search</i>
  <div class="scrollable">
    {#each lista as item}
      <!-- content here -->

      {#if item.activo}
        <!-- content here -->
        <Menuitem
          on:click={() => {
            cliente = item;
            dispatch('cliente_selecto');
          }}>
          <table>
            <tr>
              <td class="nombre">{item.nombre}</td>

            </tr>
            <tr>
              <td>
                <span class="email">
                  ({item.correo == undefined ? '' : item.correo})
                </span>
              </td>

              <td>
                <span class="email">
                  ({item.perfil.perfil == undefined ? '' : item.perfil.perfil})
                </span>
              </td>
            </tr>
          </table>
        </Menuitem>
      {/if}
    {/each}
  </div>

</Menu>
