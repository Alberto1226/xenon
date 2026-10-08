<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { ui, clientes, postData, buscadores, donde, usuario_db } from "./../../stores";
  import { blur } from "svelte/transition";
  import { onMount } from "svelte";
  import Lista from "./_Lista.svelte";
  import { goto } from "@sapper/app";
  // import Carritos_reservados from "./_reservados/reservados_cliente.svelte";
  var buscando = "";
  var buscando_mandar = "";
  let puede_editar_clientes = false;
  var lista = [];
  var pagina_actual = 1;
  onMount(() => {
    //console.log(buscando)
    buscando = $buscadores.clientes;
    cargar_permisos_edicion();
    // if ($clientes.lista.length > 0) return;
    //obtener_lista();
  });

  async function cargar_permisos_edicion() {
    if (["administrador", "gerente"].includes($usuario_db.rol)) {
      puede_editar_clientes = true;
      return;
    }
    if (!["vendedor", "marketing", "ComercioExterior"].includes($usuario_db.rol)) return;
    try {
      const respuesta = await postData("app/clientes/permisos_edicion", {});
      puede_editar_clientes = respuesta.ok && respuesta.puede_editar;
    } catch (err) {
      console.error("No se pudieron consultar los permisos de edición de clientes:", err);
      puede_editar_clientes = false;
    }
  }

  $: if (buscando.length > 0) {
    pagina_actual = 1;
    $buscadores.clientes = buscando;
  }

  $: if (buscando.length == 0) {
    pagina_actual = 1;
    $buscadores.clientes = buscando;
  }

  var estado_actual = "viendo lista"; // "creando cliente"  "editando cliente"

  function cliente_seleccioando() {
    estado_actual = "viendo_carritos_reservados";
  }
  function handle_editar_cliente() {
    estado_actual = "editando cliente";
  }

  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();
      estado_actual = "creando cliente";
      donde.set("crear");
      goto("app/clientes/DatosCliente");
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo lista"
    }
  }

  function handle_buscar(evt) {
    if (evt.key === "Enter") {
      buscando_mandar = buscando;
    }
  }
</script>

<svelte:head>
  <title>Clientes</title>
</svelte:head>
<svelte:window on:keydown={handleKeydown} />
<div>
  <div class="centrado herramientas">
    {#if estado_actual == "viendo lista"}
      <!-- content here -->
      <div class="centrado">
        <table style="width: 96%;">
          <tr>
            <td>
              <table style=" margin-left: 20px;width:250px;">
                <tr>
                  <td>
                    <Textfield
                      label="Buscar con nombre o correo"
                      on:keyup={handle_buscar}
                      bind:value={buscando}
                    />
                  </td>
                  <td>
                    <Button
                      on:click={() => {
                        buscando_mandar = buscando;
                      }}
                      icon
                    >
                      <i class="material-icons">search</i>
                    </Button>
                  </td>
                </tr>
              </table>
            </td>
            <td style="width: 72%;padding: 0 0 0px 0%;">
              <h3 class="titulo_formulario">
                Clientes
                <i style="vertical-align:middle;" class="material-icons">
                  people
                </i>
              </h3>
            </td>
            <td>
              Nuevo cliente
              <Button
                on:click={() => {
                  estado_actual = "creando cliente";
                  donde.set("crear");
                  goto("app/clientes/DatosCliente");
                }}
                icon
                raised
                outlined
                title="crear cliente nuevo (Ctrl + u)"
              >
                <i class="material-icons">add</i>
              </Button>
              <!-- <Button
                on:click={() => {
                  estado_actual = "creando cliente";
                  goto("app/clientes/nuevo");
                }}
                icon
                raised
                outlined
                title="crear cliente nuevo (Ctrl + u)"
              >
                <i class="material-icons">add</i>
              </Button> -->
            </td>
          </tr>
        </table>
      </div>
    {:else if estado_actual == "creando cliente"}
      <!-- else content here -->
      <div class="izquierda" style="padding-left: 5px;">
        <Button
          on:click={() => {
            estado_actual = "viendo lista";
          }}
          raised
          outlined
          title="ver lista"
        >
          <i class="material-icons">arrow_back</i>
          Ver lista
        </Button>
      </div>
    {/if}
  </div>

  <Lista
    bind:pagina_actual
    bind:buscando={buscando_mandar}
    {puede_editar_clientes}
    on:cliente_seleccioando={cliente_seleccioando}
    on:editar_cliente={handle_editar_cliente}
  />
</div>
