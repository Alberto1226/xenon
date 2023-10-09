<script>
  import { movimientos_del_producto } from "./../../../stores";
  import Checkboxes from "./checkboxes.svelte";
  export var pagina_actual = 1;
  var filtros_visibles = false;
  function toggle_visible_filtros() {
    filtros_visibles = !filtros_visibles;
  }

  function izquierda(params) {
    if (pagina_actual == 1) return;
    pagina_actual--;
    marcar_como_pendiente();
  }
  function derecha() {
    if (pagina_actual == $movimientos_del_producto.paginas) return;
    pagina_actual++;
    marcar_como_pendiente();
  }

  function marcar_como_pendiente() {
    $movimientos_del_producto.pendiente = true;
  }
</script>

{#if filtros_visibles == true}
  <!-- content here -->
  <div class="checkboxes">
    <Checkboxes />
  </div>
{/if}
<table>
  <tr>
    <td>
      <button
        on:click={izquierda}
        class:desactivado={pagina_actual == 1}
        class="pointer boton"
        disabled={pagina_actual == 1}
      >
        <i class="material-icons vertical-alineado">chevron_left</i>
      </button>
    </td>

    <td title="Página actual" class="centro_regular derecha">
      {pagina_actual} /
      <span />
    </td>
    <td title="Cuenta de logs" class="paginas centro_regular izquierda"
      >{$movimientos_del_producto.paginas}</td
    >

    <td>
      <button
        on:click={derecha}
        class:desactivado={pagina_actual >= $movimientos_del_producto.paginas}
        disabled={pagina_actual >= $movimientos_del_producto.paginas}
        class="pointer boton"
      >
        <i class="material-icons vertical-alineado">chevron_right</i>
      </button>
    </td>
    <td class="coincidencias " title="Coincidencias">
      coincidencias:
      {$movimientos_del_producto.coincidencias}
    </td>
    <td>
      <button on:click={marcar_como_pendiente} class="pointer recargar">
        <i class="material-icons vertical-alineado">autorenew</i>
      </button>
    </td>
    <td>
      <button class="boton-checkboxes" on:click={toggle_visible_filtros}>
        <i class="material-icons"> settings </i>
      </button>
    </td>
  </tr>
</table>

<style>
  .coincidencias {
    color: gray;
    font-size: 0.8em;
    padding: 0 5px;
  }
  .centro_regular {
    width: 40px;
    text-align: center;
  }
  .derecha {
    text-align: right;
  }
  .izquierda {
    text-align: left;
  }
  .boton {
    border-radius: 18px;
    background-color: rgb(0, 101, 255);
    color: rgb(255, 255, 255);
    border: 1px solid white;
  }
  .boton:hover {
    border-radius: 16px;
    background-color: rgb(34, 122, 255);
  }
  .boton:active {
    border-radius: 20px;
    background-color: rgb(0, 88, 219);
  }
  .recargar {
    border-radius: 3px;
  }
  .desactivado {
    background-color: gray;
    color: rgb(204, 204, 204);
  }
  .desactivado:hover {
    background-color: gray;
    color: rgb(204, 204, 204);
  }
  .desactivado:active {
    background-color: gray;
    color: rgb(204, 204, 204);
  }
  .checkboxes {
    position: absolute;
    background: white;
    padding: 18px;
    z-index: 1;
    box-shadow: 0 0 10px black;
    border-radius: 14px 0px 14px 14px;
  }
  .boton-checkboxes {
    border-radius: 5px;
  }
</style>
