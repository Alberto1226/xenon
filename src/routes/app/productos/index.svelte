<script>
  import { Button, Textfield } from "svelte-mui/src";
  import {
    ui,
    productos,
    buscadores,
    usuario_db,
    paginas_actuales,
  } from "./../../stores";
  import { storeWithDebounce, accion_buscar } from "./storez.js";
  //****import Nuevo from "./nuevo/nuevo.svelte";
  import { blur } from "svelte/transition";
  import { onMount } from "svelte";
  import Lista from "./_Lista.svelte";
  import { goto } from "@sapper/app";
  import { fade } from "svelte/transition";
  import Info_escaneados from "./Info_escaneados/index.svelte";
  import Almacen from "./Almacen/index.svelte";
  //***import Editar from "./editar/editar.svelte";

  var buscando = "";
  var buscando_mandar = "";
  var lista = [];
  var pagina_actual = 1;
  onMount(() => {
    buscando = $buscadores.productos;
    pagina_actual = $paginas_actuales.productos;
    // if ($clientes.lista.length > 0) return;
    //obtener_lista();
  });

  var estado_actual = "viendo lista"; // "creando producto"  "editando producto"

  function producto_seleccioando() {
    estado_actual = "viendo_carritos_reservados";
  }
  function handle_editar_producto() {
    estado_actual = "editando producto";
  }

  function handleKeydown(evt) {
    if ($usuario_db.rol == "administrador") {
      // console.log("usuario_db.rol", $usuario_db.rol);
      if (evt.key == "+") {
        evt.preventDefault();
        estado_actual = "creando producto";
        goto("app/productos/nuevo");
        return;
      }
    }

    // if (evt.key == "Escape") {
    //   //  estado_actual = "viendo lista"
    // }
  }

  function handle_buscar(evt) {
    //console.log(evt);

    $accion_buscar.valor = true;
    console.log("Mandando -> accion");
    return;

    if (evt.key === "Backspace" && $storeWithDebounce.length > 1) {
      //pagina_actual =1;
      setTimeout(() => {
        if ($storeWithDebounce === "") return;
        $paginas_actuales.productos = 1;
        $accion_buscar.valor = true;

        //$buscadores.productos = buscando;
        //buscando_mandar = buscando
      }, 1100);
    }
  }
</script>

<svelte:head>
  <title>Productos</title>
  <!-- <link rel="stylesheet" href="productos.css" /> -->
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
                  <td colspan="2" />
                  <td />
                </tr>
              </table>
            </td>

            <td
              style="width: 50%;            padding: 0px 0px 0px 0%;            min-width: 150px;"
            >
              <h3 class="titulo_formulario">
                Productos
                <i style="vertical-align:middle;" class="material-icons">
                  view_list
                </i>
              </h3>
            </td>
            <td>
              <Almacen />
            </td>
            <td>
              <Info_escaneados />
            </td>
            <td>
              {#if $usuario_db.rol != "diseñador" && $usuario_db.rol != "vendedor" && $usuario_db.rol != "gerente" && $usuario_db.rol != "almacen" && $usuario_db.rol != "ComercioExterior"}
                Nuevo
                <Button
                  on:click={() => {
                    estado_actual = "creando producto";
                    goto("app/productos/nuevo");
                  }}
                  icon
                  raised
                  outlined
                  title="crear producto nuevo (+)"
                >
                  <i class="material-icons">add</i>
                </Button>
              {/if}
            </td>
          </tr>
        </table>
      </div>
    {:else if estado_actual == "creando producto"}
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

  {#if estado_actual == "viendo lista"}
    <div in:fade={{ duration: 450 }}>
      <Lista
        bind:pagina_actual
        bind:buscando={buscando_mandar}
        on:producto_seleccioando={producto_seleccioando}
        on:editar_producto={handle_editar_producto}
      />
    </div>
  {/if}
</div>
