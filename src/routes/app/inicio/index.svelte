<script>
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { goto } from "@sapper/app";
  import { Button } from "svelte-mui/src";
  import { usuario_db, version } from "./../../stores";

  const pedido_nuevo = () => {
    goto("app/pedidos/nuevo/nuevo");
  };
  localStorage.removeItem("intento_de_acceso");
  let letra_p_visible = false;

  let signo_mas_visible = false;

  function ir_a_logs() {
    goto("/app/tecnico-isotech/logs");
  }

  function handleKeydown(evt) {
    if (evt.key == "p") {
      //evt.preventDefault();
      // estado_actual = "creando pedido";
      letra_p_visible = true;
      setTimeout(() => {
        goto("/app/pedidos/");
      }, 550);
      return;
    }
    if (evt.key == "+") {
      evt.preventDefault();
      // estado_actual = "creando pedido";

      signo_mas_visible = true;
      setTimeout(() => {
        goto("/app/pedidos/nuevo/nuevo");
      }, 550);
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo listas"
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<svelte:head>
  <title>Inicio</title>
</svelte:head>

<div class="centrado">
  <div class="centrado">Version {$version}</div>

  {#if $usuario_db.rol != "almacen"}
    <div class="centrado" in:fade={{ duration: 400 }}>
      <Button
        title="Presiona + en tu teclado"
        color="rgb(0, 101, 255)"
        raised
        on:click={pedido_nuevo}
      >
        Pedido nuevo
      </Button>

      <br />
      <h3 class="centrado">Tips (en esta pag)</h3>
      <div class="centrado">
        <table class="margen">
          <tr>
            <td>
              1) Presiona "
              <b>p</b>
              " para ver lista de pedidos
            </td>
          </tr>
          <tr>
            <td>
              2) Presiona "
              <b>+</b>
              " para crear un pedido nuevo
            </td>
          </tr>
        </table>
      </div>

      <div class="centrado">
        {#if $usuario_db.rol === "administrador"}
          <!-- content here -->
          <Button
            title="Log de acciones en sistema"
            color="rgb(0, 101, 255)"
            raised
            on:click={ir_a_logs}
          >
            Ver acciones en sistema
          </Button>
        {/if}
      </div>

      <!-- 



    <h3>Cambios:</h3>
    Solución de bugs , al realizar pedido , agregué campos de búsqueda para
    productos y clientes,
    <br />
    cambié el formato de cvs. -
    <b>Admin</b>
    Cambio en listas de existencias
    <br />
    -
    <b>Productos</b>
    Cambios en descarga Archivo de Excel :
    <br />
    -
    <b>Clientes</b>
    Descarga de Archivo de Excel :
    <br />
    -
    <b>Admin</b>
    Graficos (2)
    <br />
    -
    <b>Pedido nuevo y editar:</b>
    Paginación en lista de productos.

- <b>Clientes:</b> Asignacion de agente desde listas. <br>
- <b>Pedido nuevo y editar:</b> Paginación en lista de productos.

 -->

      {#if letra_p_visible}
        <h1 class="centrado" style="font-weight:900;">Pedidos</h1>
      {/if}

      {#if signo_mas_visible}
        <h1 class="centrado" style="font-weight:900;">+ Nuevo pedido</h1>
      {/if}
    </div>
  {/if}
</div>

<style>
  .margen {
    margin: 0 auto;
  }
</style>
