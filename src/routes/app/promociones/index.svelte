<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { ui, promociones, buscadores, paginas_actuales } from "./../../stores";
  import { storeWithDebounce, accion_buscar } from "./storez.js";
  //****import Nuevo from "./nuevo/nuevo.svelte";
  import { blur } from "svelte/transition";
  import { onMount } from "svelte";
  import Lista from "./_lista/index.svelte";
  import { goto } from "@sapper/app";
  import { fade } from "svelte/transition";
  //***import Editar from "./editar/editar.svelte";

  var buscando = "";
  var buscando_mandar = "";
  var lista = [];
  var pagina_actual = 1;
  onMount(() => {
    buscando = $buscadores.promociones;
    pagina_actual = $paginas_actuales.promociones;
    // if ($clientes.lista.length > 0) return;
    //obtener_lista();
    
  });

  var estado_actual = "viendo lista"; // "creando promocion"  "editando promocion"

  function promocion_seleccionando() {
    estado_actual = "viendo_carritos_reservados";
  }
  function handle_editar_promocion() {
    estado_actual = "editando promoción";
  }

  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();
      estado_actual = "creando promoción";
      goto("app/promociones/nueva");
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo lista"
    }
  }

  function handle_buscar(evt) {
    //console.log(evt);

    $accion_buscar.valor = true;
    console.log('Mandando -> accion')
    return;




    if (evt.key === "Backspace" && $storeWithDebounce.length > 1) {
      //pagina_actual =1;
      setTimeout(() => {
        if ($storeWithDebounce==="") return;
        $paginas_actuales.promociones = 1;
        $accion_buscar.valor = true;

        //$buscadores.promociones = buscando;
        //buscando_mandar = buscando
      },1100);
    }
  }
</script>

<svelte:head>
<title>Productos</title>
  <!-- <link rel="stylesheet" href="promocion.css" /> -->
 </svelte:head>
<svelte:window on:keydown={handleKeydown} />
<div>

  <div class="centrado herramientas">
    {#if estado_actual == 'viendo lista'}
      <!-- content here -->
      <div class="centrado">
        <table style="width: 96%;">
          <tr>
            <td>
              <table style=" margin-left: 20px;width:250px;">
                <tr>
                  <td colspan="2">
                   
                  </td>
                  <td>
                   
                  </td>
                </tr>
              </table>
            </td>

            <td style="width: 72%;padding: 0 0 0px 0%;">
              <h3 class="titulo_formulario">
                Promociones
                <i style="vertical-align:middle;" class="material-icons">
                  view_list
                </i>
              </h3>
            </td>
            <td>
              Nueva promoción
              <Button
                on:click={() => {
                  estado_actual = 'creando promoción';
                  goto('app/promociones/nueva');
                }}
                icon
                raised
                outlined
                title="crear promoción nueva (+)">
                <i class="material-icons">add</i>
              </Button>
            </td>
          </tr>
        </table>
      </div>
    {:else if estado_actual == 'creando promoción'}
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
    <div in:fade={{ duration: 450 }}>

      <Lista
        bind:pagina_actual
        bind:buscando={buscando_mandar}
        on:promocion_seleccionando={promocion_seleccionando}
        on:editar_promocion={handle_editar_promocion} />

    </div>
  {/if}

</div>