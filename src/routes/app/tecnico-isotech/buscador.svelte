<script>
  import { postData } from "./../../stores";
  export var buscando_texto = "";
  var http_ocupado = false;
  export var pagina_actual = 0;
  export var paginas = 0;
  export var accion = "";
  export var lista = [];
  var cuenta_de_logs =0;

  function izquierda() {
    if (pagina_actual > 1) pagina_actual--;
    solicitar_logs();
  }

  function derecha() {
    pagina_actual++;
    solicitar_logs();
  }
  

  async function solicitar_logs() {
    if (http_ocupado) return;
    http_ocupado = true;
    //console.log("mandando");
    let url = "/app/tecnico-isotech/logsDB";
    postData(url, { pagina_actual, buscando_texto, accion })
      .then(resDB => {
        lista = resDB.lista;
        cuenta_de_logs = resDB.cuenta_de_logs;
        paginas = resDB.paginas;
        http_ocupado = false;
        //console.log("ya llego respuesta")
        return lista;
      })
      .catch(err => {
        //console.log("error detectado");
        console.log(err);
        http_ocupado = false;
        return { error: "No se pudo obtener el log" };
      });
  }
</script>

<style>
  .rowflex {
    display: flex;
  }

  .pagina_actual_input{
        height: 36px;
    padding-left: 12px;
    width: 59px;
  }
  .buscar_texto{
        height: 36px;
    padding-left: 12px;
    /* width: 59px; */
  }

  .paginas-total{
    padding-bottom: 9px;
  }
</style>

<div class="rowflex">

  <table>
    <tr>
      <td>
        <button on:click={izquierda}>
          <i class="material-icons vertical-alineado">chevron_left</i>
        </button>
      </td>

      <td title="Página actual" class="pointer">
        <input class="pagina_actual_input" step="1" type="number" min="1" max="9999" bind:value={pagina_actual}>/
        <span />
      </td>
      <td title="Cuenta de logs" class="paginas-total">{paginas}</td>
      <td>
        <button on:click={derecha} disabled={pagina_actual >= paginas}>
          <i class="material-icons vertical-alineado">chevron_right</i>
        </button>
      </td>
    </tr>
  </table>

  <input placeholder="buscar texto" class="buscar_texto" type="text" bind:value={buscando_texto} />
  <select name="cars" id="cars" bind:value={accion} on:change={solicitar_logs}>
    <option value="todos">Todos</option>
    <option value="pedidos/cambiar_status_a_envio">
      Descuento de inventario ( Cambiar status a envío)
    </option>
    <option value="cambio_status_pedidos/enviado">
      Cambiar status a enviado
    </option>

    <option value="clientes/crear_ficha_de_descuento"> Fichas de descuento</option>

    <option value="pedidos/cambiar_descuento_de_pedido">
    Cambio de descuento</option>
    <option value="carrito/cambiar_cantidad/">
      Cambiar cantidad de producto
    </option>
    <option value="carrito/cambiar_cantidad_v2.1/">
      Cambiar cantidad de producto V2
    </option>
    <option value="login/exitoso">Logins</option>

    <option value="pedidos/cambiar_precio">
      Edición de precio directo (admin)
    </option>

    <option value="productos/editar/modificar_existencias_desde_listas">
      Modificar Existencias en inventario (admin)
    </option>
  </select>
  <button on:click={solicitar_logs}>
    buscar
    <i class="material-icons">search</i>
  </button>

</div>
