<script>
  import { Button, Ripple } from "svelte-mui/src";
  import {
    ui,
    usuario_db,
    pedidos,
    usuarios,
    clientes,
    productos,
  } from "./../stores";
  import { goto } from "@sapper/app";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import Item from "./Item_side_panel.svelte";
  export var maximizado = true;
  let cargado = false;
  let menu_actual = "inicio";
  let development = false;
  onMount(() => {
    if (window.location.hostname === "localhost") development = true;
    menu_actual = devolver_menu_actual();
    setTimeout(() => {
      cargado = true;
    }, 1000);
  });

  var lista_De_menu = [
    {
      url: "/app/inicio",
      titulo: "Inicio",
      icono: "home",
      roles: ["administrador", "vendedor", "almacen", "gerente"],
    },

    {
      url: "/app/pedidos",
      titulo: "Pedidos",
      icono: "shopping_cart",
      roles: ["administrador", "almacen", "vendedor", "gerente"],
    },
    {
      url: "/app/productos",
      titulo: "Productos",
      icono: "view_list",
      roles: ["administrador", "vendedor", "almacen", "gerente", "diseñador"],
    },
    {
      url: "/app/Catalogos",
      titulo: "Catalogos",
      icono: "view_cozy",
      roles: ["administrador", "gerente"],
    },
    {
      url: "/app/clientes",
      titulo: "Clientes",
      icono: "people",
      roles: ["administrador", "vendedor", "gerente"],
    },

    {
      url: "/app/clientes_nuevos",
      titulo: "Clientes Nuevos",
      icono: "supervised_user_circle",
      roles: ["administrador"],
    },

    {
      url: "/app/graficos",
      titulo: "Gráficos",
      icono: "bar_chart",
      roles: ["administrador"],
    },

    {
      url: "/app/usuarios",
      titulo: "Usuarios",
      icono: "supervised_user_circle",
      roles: ["administrador"],
    },

    {
      url: "/app/mapas",
      titulo: "Mapas",
      icono: "maps",
      roles: ["administrador"],
    },
    {
      url: "/app/tecnico-isotech/logs",
      titulo: "Logs",
      icono: "admin_panel_settings",
      roles: ["administrador"],
    },

    {
      url: "/app/categorias",
      titulo: "Categorias",
      icono: "account_tree",
      roles: ["administrador"],
    },
    {
      url: "/app/promociones",
      titulo: "Promociones",
      icono: "new_releases",
      roles: ["administrador"],
    },
    {
      url: "/app/productos/Almacen/Empaque",
      titulo: "Almacen -Salidas",
      icono: "home",
      roles: ["administrador", "almacen"],
    },
    {
      url: "/app/pedidos/publicos",
      titulo: "Pedidos públicos",
      icono: "fingerprint",
      roles: ["administrador"],
    },
  ];

  function devolver_menu_actual() {
    setTimeout(() => {
      let locacion = location.pathname;

      switch (locacion) {
        case "/app/inicio":
          menu_actual = "inicio";
          break;
        case "/app/pedidos":
          menu_actual = "pedidos";
          break;
        case "/app/productos":
          menu_actual = "productos";
          break;
        case "/app/promociones":
          menu_actual = "promociones";
          break;
        case "/app/clientes":
          menu_actual = "clientes";
          break;
        case "/app/clientes_nuevos":
          menu_actual = "clientes_nuevos";
          break;
        case "/app/usuarios":
          menu_actual = "usuarios";
          break;
        case "/app/mapas":
          menu_actual = "mapas";
          break;
        case "/app/categorias":
          menu_actual = "categorias";
          break;
        case "/app/pedidos/publicos":
          menu_actual = "pedidos-publicos";
          break;
        case "/app/productos/Almacen/Empaque":
          menu_actual = "almacen";
          break;
        default:
          break;
      }
    }, 100);
  }
</script>

<div class="espacio_arriba">
  <!-- coment -->
</div>
{#each lista_De_menu as item}
  {#if item.roles.includes($usuario_db.rol)}
    <Item
      icono_o_imagen={item.icono}
      {maximizado}
      titulo={item.titulo}
      url={item.url}
    />
  {/if}
{/each}

<!-- 
<div
  class="texto-izq fondo_sidepanel_izquierda no_select"
  style="margin-top:10px;border-bottom: 1px #555 solid;"
>
  <div class="item_lista">
    <Button
      compact
      color="white"
      on:click={() => {
        goto("/app/logout");
      }}
    >
      <i class="material-icons">meeting_room</i>
      {#if maximizado}
        
        Salir
      {/if}
    </Button>
  </div>
  <hr />

  {#if cargado}
    
    <div in:fly={{ duration: 100, x: -20 }}>
      <div
        class:centrado={!maximizado}
        class:actual={menu_actual == "inicio"}
        class="item_lista"
        on:click={() => {
          goto("app/inicio");
          $ui.ventana_visible = "inicio";
          devolver_menu_actual();
        }}
      >
        <i
          class:iconos_grandes={!maximizado}
          class="material-icons vertical-alineado icono_peque centrado "
        >
          home
        </i>
        {#if maximizado}
          
          Inicio
        {/if}
        <Ripple />
      </div>

      <div
        class:centrado={!maximizado}
        class:actual={menu_actual == "pedidos"}
        class="item_lista"
        on:click={() => {
          goto("app/pedidos");
          devolver_menu_actual();
        }}
      >
        <i
          class:iconos_grandes={!maximizado}
          class="material-icons vertical-alineado icono_peque centrado"
        >
          shopping_cart
        </i>
        {#if maximizado}
          
          Pedidos
        {/if}

        <Ripple />
      </div>

      <div
        class:centrado={!maximizado}
        class:actual={menu_actual == "productos"}
        class="item_lista"
        title="Productos"
        on:click={() => {
          goto("app/productos");
          $ui.ventana_visible = "productos";
          devolver_menu_actual();
        }}
      >
        <i
          class:iconos_grandes={!maximizado}
          class="material-icons vertical-alineado icono_peque centrado"
        >
          view_list
        </i>
        {#if maximizado}
          
          Productos
        {/if}

        <Ripple />
      </div>

      <div
        class:centrado={!maximizado}
        class:actual={menu_actual == "clientes"}
        class="item_lista"
        title="Clientes"
        on:click={() => {
          goto("app/clientes");
          $ui.ventana_visible = "clientes";
          devolver_menu_actual();
        }}
      >
        <i
          class:iconos_grandes={!maximizado}
          class="material-icons vertical-alineado icono_peque centrado"
        >
          people
        </i>
        {#if maximizado}
          
          Clientes
        {/if}

        <Ripple />
      </div>

      {#if $usuario_db.rol === "administrador"}
       

        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "clientes_nuevos"}
          class="item_lista"
          title="Clientes_nuevos"
          on:click={() => {
            goto("app/clientes_nuevos");
            $ui.ventana_visible = "clientes_nuevos";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            supervised_user_circle
          </i>
          {#if maximizado}
            
            Clientes Nuevos
          {/if}

          <Ripple />
        </div>

        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "graficos"}
          class="item_lista"
          title="Graficos"
          on:click={() => {
            goto("app/graficos");
            $ui.ventana_visible = "graficos";
            menu_actual = "graficos";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            bar_chart
          </i>
          {#if maximizado}Graficos{/if}

          <Ripple />
        </div>

        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "usuarios"}
          class="item_lista"
          title="Usuarios"
          on:click={() => {
            goto("app/usuarios");
            $ui.ventana_visible = "usuarios";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            supervised_user_circle
          </i>
          {#if maximizado}
            
            Usuarios
          {/if}

          <Ripple />
        </div>

        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "mapas"}
          disabled={!google_maps_cargado}
          class="item_lista"
          title="Mapa "
          on:click={() => {
            goto("app/mapas");
            $ui.ventana_visible = "mapas";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            style="width: 1em;"
            class="material-icons vertical-alineado icono_peque centrado"
            >maps
          </i>{#if maximizado}Mapas{/if}
          <Ripple />
        </div>

        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "Logs"}
          class="item_lista"
          title="Logs"
          on:click={() => {
            goto("app/tecnico-isotech/logs");
            $ui.ventana_visible = "logs";
            menu_actual = "logs";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            admin_panel_settings
          </i>
          {#if maximizado}Logs{/if}

          <Ripple />
        </div>
      {/if}
      {#if $usuario_db.rol == "administrador"}
        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "categorias"}
          class="item_lista"
          title="Categorías"
          on:click={() => {
            goto("app/categorias");
            $ui.ventana_visible = "categorias";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            account_tree
          </i>
          {#if maximizado}
            
            Categorías
          {/if}

          <Ripple />
        </div>
      {/if}

      {#if $usuario_db.usuario == "isotech_Xenonymas" || $usuario_db.usuario == "xenon"}
        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "promociones"}
          class="item_lista"
          title="Productos"
          on:click={() => {
            goto("app/promociones");
            $ui.ventana_visible = "promociones";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            new_releases
          </i>
          {#if maximizado}
            
            Promociones
          {/if}

          <Ripple />
        </div>
      {/if}
      {#if $usuario_db.rol == "administrador" || $usuario_db.rol == "almacen"}
        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "almacen"}
          class="item_lista"
          title="Almacen"
          on:click={() => {
            goto("app/productos/Almacen/Empaque");
            $ui.ventana_visible = "almacen";
            devolver_menu_actual();
          }}
        >
          <img
            src="imagenes/icono_montacargas.svg"
            class="montacargas"
            alt=""
          />

          {#if maximizado}
            
            Almacén
          {/if}

          <Ripple />
        </div>
      {/if}
      {#if $usuario_db.rol == "administrador" || $usuario_db.rol == "almacen"}
        <div
          class:centrado={!maximizado}
          class:actual={menu_actual == "pedidos-publicos"}
          class="item_lista"
          title="Pedidos públicos"
          on:click={() => {
            goto("/app/pedidos/publicos");
            $ui.ventana_visible = "pedidos-publicos";
            devolver_menu_actual();
          }}
        >
          <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
          >
            fingerprint
          </i>
          {#if maximizado}
            
            Pedidos públicos
          {/if}

          <Ripple />
        </div>
      {/if}
    </div>
  {:else}
    <div class="centrado">
      <div style="color:white;font-size:.8em;padding:30px;">
        cargando webapp..
      </div>
    </div>
  {/if}

  {#if development == true}
    
    <h3 class="centrado">desarrollo</h3>
  {/if}

</div> -->
<style>
  .montacargas {
    height: 17px;
  }
  .item_lista {
    font-weight: 200;
    color: aliceblue;
    padding-left: 10px;
    font-size: 0.9em;
    cursor: pointer;
    padding: 15px;
    border-radius: 7px;
    margin-left: 10px;
    margin-right: 10px;
  }
  .item_lista:hover {
    background-color: rgba(240, 248, 255, 0.075);
    text-shadow: 0px 0px 3px black;
  }
  .vertical-alineado {
    vertical-align: text-bottom;
  }
  .icono_peque {
    font-size: 0.95em;
  }
  .actual {
    font-weight: 500;
    /*background-color: #0000003b;*/
    background: linear-gradient(
      54deg,
      rgb(34, 45, 48) 5%,
      rgb(25, 56, 70) 57%,
      rgb(48, 43, 85) 100%
    );
    border: 1px solid #ffffff30;
  }
  .iconos_grandes {
    font-size: 2em;
    text-align: center;
  }

  .fondo_sidepanel_izquierda {
    display: block;
  }
  .espacio_arriba {
    height: 40px;
  }
</style>
