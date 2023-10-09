<script>
  import { ventas_cliente_selecto } from "./../../../stores";
  export var pagina_actual = 1;

  function izquierda(params) {
    if (pagina_actual == 1) return;
    pagina_actual--;
    marcar_como_pendiente();
  }
  function derecha() {
    if (pagina_actual == $ventas_cliente_selecto.paginas) return;
    pagina_actual++;
    marcar_como_pendiente();
  }

  function marcar_como_pendiente() {
    $ventas_cliente_selecto.pendiente = true;
  }
</script>

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
      >{$ventas_cliente_selecto.paginas}</td
    >

    <td>
      <button
        on:click={derecha}
        class:desactivado={pagina_actual >= $ventas_cliente_selecto.paginas}
        disabled={pagina_actual >= $ventas_cliente_selecto.paginas}
        class="pointer boton"
      >
        <i class="material-icons vertical-alineado">chevron_right</i>
      </button>
    </td>
    <td class="coincidencias " title="Coincidencias">
      pedidos enviados:
      {$ventas_cliente_selecto.coincidencias}
    </td>
    <td>
      <button on:click={marcar_como_pendiente} class="pointer recargar">
        <i class="material-icons vertical-alineado">autorenew</i>
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
</style>
