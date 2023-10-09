<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { ui, usuarios } from "./../../stores";
  //****import Nuevo from "./nuevo/nuevo.svelte";
  import { blur } from "svelte/transition";
  import { onMount } from "svelte";
  import Lista from "./_Lista.svelte";
  import {goto} from '@sapper/app';
  import {fade} from 'svelte/transition';
  //***import Editar from "./editar/editar.svelte";

  var buscando = "";
  var buscando_mandar ='';
  var lista = [];
  onMount(() => {
    if ($usuarios.lista.length > 0) return;
  });

  var estado_actual = "viendo lista"; // "creando usuario"  "editando usuario"

  function usuario_seleccioando() {
    estado_actual = "viendo_carritos_reservados";
  }
  function handle_editar_usuario() {
    estado_actual = "editando usuario";
  }

  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();

      estado_actual = "creando usuario";
      goto('app/usuarios/nuevo/nuevo')
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo lista"
    }
  }


  function handle_buscar(evt) {
    if(evt.key==='Enter'){
      buscando_mandar = buscando;
    }
  }
</script>

<svelte:head>
<title>Usuarios</title>
 </svelte:head>
<svelte:window on:keydown={handleKeydown} />
<div >

  <div class="centrado herramientas">
    {#if estado_actual == 'viendo lista'}
      <!-- content here -->
      <div class="centrado">
        <table style="width: 96%;" >
          <tr>
            <td>
              <table style=" margin-left: 20px;width:250px;">
                <tr>
                  <td>
                    <Textfield  bind:value={buscando} on:keyup={handle_buscar} />
                  </td>
                  <td>
                    <i class="material-icons">search</i>
                  </td>
                </tr>
              </table>
            </td>

            <td style="width: 72%;padding: 0 0 0px 0%;">
              <h3 class="titulo_formulario">
                Usuarios
                <i style="vertical-align:middle;" class="material-icons">
                  account_tree
                </i>
              </h3>
            </td>
            <td>
              Nuevo usuario
              <Button
                on:click={() => {
                  estado_actual = 'creando usuario';
                  goto('app/usuarios/nuevo/nuevo')
                }}
                icon
                raised
                outlined
                title="crear usuario nuevo (+)">
                <i class="material-icons">add</i>
              </Button>
            </td>
          </tr>
        </table>
      </div>
    {:else if estado_actual == 'creando usuario'}
      <!-- else content here -->
      <div class="izquierda" style="padding-left: 5px;">

        <Button
          on:click={() => {
            estado_actual = 'viendo lista';
          }}
          raised
          outlined
          title="ver lista">
          <i class="material-icons">arrow_back</i>
          Ver lista
        </Button>
      </div>
    {/if}
  </div>

  {#if estado_actual == 'viendo lista'}
  <div in:fade={{duration:300}}>
  
  </div>
    <Lista
      bind:buscando={buscando_mandar}
      on:usuario_seleccioando={usuario_seleccioando}
      on:editar_usuario={handle_editar_usuario} />

  {/if}

</div>
