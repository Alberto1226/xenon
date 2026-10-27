<script>
  import { Button } from "svelte-mui/src";
  import Boton_menu from "./_layouts/boton_minimizar_sidepanel.svelte";
  import Side_panel from "./_layouts/side_panel.svelte";
  import WTFAI from "./_layouts/wtfai.svelte";
  import Mensajes_app from "./_layouts/mensajes_app.svelte";
  import {
    usuario_db,
    cargando_mensajes_app,
    postData,
    ui,
    version,
  } from "./stores";
  import { goto } from "@sapper/app";
  import Login from "./login/index.svelte";
  import { onMount, tick, afterUpdate } from "svelte";
  //export let segment;
  var logueado = false;
  var ancho_side_panel = 185;

  var noti = false;
  var meses = 3;
  let esVisible = false;
  var dir = "";

  $: $ui.side_panel_minimizado = ancho_side_panel === 100;

  onMount(() => {
    //console.log($usuario_db, "usuario al montar");
    tick().then(() => {
      // Ahora el componente está en el DOM, puedes ejecutar código relacionado con su visualización
      esVisible = true;
      //console.log("Componente visible");
    });
  });

  $: if ($usuario_db.rol != undefined) {
    //console.log($usuario_db, "usuario al montar ifififififfiif");
    postData("app/notificacion/activar_notis", {
      m: meses,
      us: $usuario_db,
      donde: "layout",
    })
      .then((res) => {
        if (res.ok) {
          if (res.rol === "administrador") {
            noti = res.notis;
            dir = res.ruta;
          }
          if (res.rol === "vendedor") {
            noti = res.notis;
            dir = res.ruta;
          }
        } else {
          console.log(res, "else");
        }
        return "hecho";
      })
      .catch((err) => {
        console.log(err);
        return "error";
      });
  }
</script>

<main class:admin_background={$usuario_db.usuario == undefined}>
  {#if $cargando_mensajes_app.length > 0}
    <!-- Cargando en fullscreen con diseño moderno, centrado y legible -->
    <div class="pantalla_cargando_overlay">
      <div class="cargando_card">
        <div class="spinner_contenedor">
          <div class="spinner_glow" />
          <div class="loader_pulso_moderno" />
        </div>
        <div class="mensajes_contenedor">
          {#each $cargando_mensajes_app as item}
            <div class="cargando_mensaje">
              {@html item.mensaje}
            </div>
          {/each}
        </div>
      </div>
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
              {#if noti == true && ($usuario_db.rol == "administrador" || $usuario_db.rol == "vendedor")}
                <td>
                  <Button
                    on:click={() => {
                      if ($usuario_db.rol == "vendedor") {
                        goto(`app/notificacion/${dir}`);
                      }
                      if ($usuario_db.rol == "administrador") {
                        goto(`app/notificacion/${dir}`);
                      }
                    }}
                  >
                    <i class="material-icons" id="notis">notifications_active</i
                    >
                  </Button>
                </td>
              {/if}
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
  #notis {
    color: rgb(247, 0, 0);
  }

  #notis:hover {
    color: rgb(255, 136, 0);
  }

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

  /* Overlay de carga a pantalla completa */
  .pantalla_cargando_overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: radial-gradient(circle at center, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.94) 100%);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  }

  .cargando_card {
    background: #ffffff;
    border-radius: 20px;
    padding: 40px 38px;
    max-width: 540px;
    width: 90%;
    margin: 0 auto;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.2);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    animation: cargandoAparecer 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes cargandoAparecer {
    from {
      opacity: 0;
      transform: scale(0.93) translateY(14px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .spinner_contenedor {
    position: relative;
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .spinner_glow {
    position: absolute;
    width: 64px;
    height: 64px;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.35) 0%, rgba(249, 115, 22, 0) 70%);
    border-radius: 50%;
    animation: pulsarGlow 1.6s ease-in-out infinite alternate;
  }

  @keyframes pulsarGlow {
    0% { transform: scale(0.85); opacity: 0.4; }
    100% { transform: scale(1.35); opacity: 0.9; }
  }

  .loader_pulso_moderno {
    width: 58px;
    height: 58px;
    border: 4px solid #e2e8f0;
    border-top-color: #0065ff;
    border-right-color: #f97316;
    border-radius: 50%;
    animation: girarLoader 0.85s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
  }

  @keyframes girarLoader {
    to { transform: rotate(360deg); }
  }

  .mensajes_contenedor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .cargando_mensaje {
    font-size: 1.18rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.55;
  }

  .cargando_mensaje :global(i.material-icons) {
    vertical-align: middle;
    font-size: 1.45rem;
    margin: 0 4px;
    color: #ea580c;
  }

  .cargando_mensaje :global(b) {
    color: #0065ff;
    font-weight: 700;
  }

  .cargando_mensaje :global(.indice_row) {
    display: inline-block;
    margin-top: 10px;
    padding: 7px 16px;
    background: #f1f5f9;
    color: #334155;
    font-size: 0.92rem;
    font-weight: 500;
    border-radius: 20px;
    border: 1px solid #cbd5e1;
  }
</style>
