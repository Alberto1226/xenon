<script>
  import { Button } from "svelte-mui/src";
  import Boton_menu from "./_layouts/boton_minimizar_sidepanel.svelte";
  import Side_panel from "./_layouts/side_panel.svelte";
  import WTFAI from "./_layouts/wtfai.svelte";
  import Mensajes_app from "./_layouts/mensajes_app.svelte";
  import { usuario_db, cargando_mensajes_app, ui, version } from "./stores";
  import { goto } from "@sapper/app";
  import Login from "./login/index.svelte";
  //export let segment;
  var logueado = false;
  var ancho_side_panel = 185;

  $: $ui.side_panel_minimizado = ancho_side_panel === 100;
</script>

<main class:admin_background={$usuario_db.usuario == undefined}>
  {#if $cargando_mensajes_app.length > 0}
    <!-- CArgando  en fullscreen -->
    <div class="centrado">
      {#each $cargando_mensajes_app as item}
        <!-- content here -->

        <div class="centrado_vertical">
          {@html item.mensaje}
          <br />
        </div>
      {/each}
      <div id="wave1" />
    </div>
  {:else}<!-- NADA esta cargando en fullscreen-->
    {#if $usuario_db.usuario != undefined}<!--LOGUEADO-->
      <div
        class="grid-container"
        style="grid-template-columns: {ancho_side_panel}px 4fr;"
      >
        <div class="area_seis version" />
        <div class="area_uno">
          {#if ancho_side_panel > 150}
            <!-- content here -->
            <img src="imagenes/logo_white.png" class="logo_mini" alt="" />
          {:else}
            <!-- else content here -->
            <img src="imagenes/logo_min.png" class="logo_mini" alt="" />
          {/if}
        </div>
        <div class="area_dos">
          <!-- BARRA SUPERIOR-->
          <table>
            <tr>
              <td>
                <Boton_menu
                  on:click={() => {
                    ancho_side_panel == 185
                      ? (ancho_side_panel = 100)
                      : (ancho_side_panel = 185);
                  }}
                />
              </td>
              <td>
                <span class="usuario no_select">
                  <i style="vertical-align: middle;" class="material-icons">
                    portrait
                  </i>
                  {$usuario_db.nombre === ""
                    ? $usuario_db.correo
                    : $usuario_db.nombre}
                </span>
                <span class="rol no_select">
                  <i style="vertical-align: middle;" class="material-icons">
                    vpn_key
                  </i>
                  {$usuario_db.rol}
                </span>
              </td>
              <td>
                {location.hostname}
              </td>
              <td>
                <Button
                  on:click={() => {
                    goto("app/logout");
                  }}
                >
                  <i class="material-icons">meeting_room</i>
                  Salir
                </Button>
              </td>
            </tr>
          </table>
        </div>
        <div class="area_tres">
          <Side_panel maximizado={ancho_side_panel == 185} />
        </div>
        <div class="area_cuatro">
          <slot />
        </div>
        <div class="area_cinco version centrado">
          v{$version}
        </div>
      </div>
    {:else}
      <!-- No LOgueado -->

      <slot />
    {/if}
  {/if}
</main>
<WTFAI />
<Mensajes_app />

<style>
  main {
    position: relative;
    height: 100vh;
    max-width: 100vw;
    overflow-x: hidden;
    background-color: #d4d4d4;
    /*
    max-width: 56em;
    padding: 0.8em 0em 0em 0em;
    */
    margin: 0 auto;
    box-sizing: border-box;
  }

  .grid-container {
    height: 100vh;
    max-height: 100vh;
    width: 100vw;
    max-width: 100vw;
    display: grid;
    grid-template-rows: 42px 2.8fr 0.1fr;
    grid-template-areas: "area_uno area_dos" "area_tres area_cuatro" "area_cinco area_seis";
    transition: ease-in 200ms;
  }

  .area_uno {
    grid-area: area_uno;

    background-color: #222d32;
    box-shadow: 2px 0px 6px #222d32;
    z-index: 2;
  }

  .area_dos {
    grid-area: area_dos;
    color: #40f;
    background: white;
    /* background: rgb(255,194,0);
background: linear-gradient(351deg, rgba(255,194,0,1) 5%, rgba(230,255,0,1) 100%); */
    box-shadow: 2px 0px 4px #222d32;
    z-index: 2;
  }

  .area_tres {
    grid-area: area_tres;
    background-color: #222d32;
    box-shadow: 2px 0px 6px #222d32;
    z-index: 2;
  }

  .area_cuatro {
    grid-area: area_cuatro;
    background: #f0f1ff;
    font-size: 0.85em;
  }

  .area_cinco {
    grid-area: area_cinco;
    background-color: black;
  }

  .area_seis {
    grid-area: area_seis;
    background-color: black;
  }
  .logo_mini {
    height: 50px;
    padding-top: 4px;
  }
  .usuario {
    color: #0065ff;
  }
  .rol {
    font-weight: 500;
    font-size: 0.9em;
  }

  .version {
    color: #313131;
    font-size: 0.8em;
    padding-top: 7px;
  }
</style>
