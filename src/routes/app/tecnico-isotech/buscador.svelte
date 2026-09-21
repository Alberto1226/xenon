<script>
  import { postData } from "./../../stores";
  import { onMount } from "svelte";

  export var buscando_texto = "";
  var http_ocupado = false;
  export var pagina_actual = 1;
  export var paginas = 1;
  export var accion = "todos";
  export var lista = [];
  var cuenta_de_logs = 0;

  const fechaActual = new Date();
  export var anio = fechaActual.getFullYear();
  export var mes = fechaActual.getMonth() + 1; // 1-12

  var lista_anios = [anio];

  const MESES = [
    { id: 1, nombre: "Enero" },
    { id: 2, nombre: "Febrero" },
    { id: 3, nombre: "Marzo" },
    { id: 4, nombre: "Abril" },
    { id: 5, nombre: "Mayo" },
    { id: 6, nombre: "Junio" },
    { id: 7, nombre: "Julio" },
    { id: 8, nombre: "Agosto" },
    { id: 9, nombre: "Septiembre" },
    { id: 10, nombre: "Octubre" },
    { id: 11, nombre: "Noviembre" },
    { id: 12, nombre: "Diciembre" }
  ];

  onMount(() => {
    cargar_anios();
    solicitar_logs();
  });

  async function cargar_anios() {
    try {
      let res = await postData("/app/tecnico-isotech/obtener_anios_logs", {});
      if (res && res.ok && res.anios && res.anios.length > 0) {
        lista_anios = res.anios;
        if (!lista_anios.includes(anio)) {
          lista_anios.push(anio);
          lista_anios.sort((a, b) => b - a);
        }
      }
    } catch (err) {
      console.log("Error al cargar años de logs:", err);
    }
  }

  function izquierda() {
    if (pagina_actual > 1) {
      pagina_actual--;
      solicitar_logs();
    }
  }

  function derecha() {
    if (pagina_actual < paginas) {
      pagina_actual++;
      solicitar_logs();
    }
  }

  function al_cambiar_filtro() {
    pagina_actual = 1;
    solicitar_logs();
  }

  async function solicitar_logs() {
    if (http_ocupado) return;
    http_ocupado = true;
    let url = "/app/tecnico-isotech/logsDB";
    postData(url, { pagina_actual, buscando_texto, accion, anio, mes })
      .then(resDB => {
        lista = resDB.lista || [];
        cuenta_de_logs = resDB.cuenta_de_logs || 0;
        paginas = resDB.paginas || 1;
        http_ocupado = false;
        return lista;
      })
      .catch(err => {
        console.log(err);
        http_ocupado = false;
        return { error: "No se pudo obtener el log" };
      });
  }
</script>

<style>
  .rowflex {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .pagina_actual_input {
    height: 36px;
    padding-left: 8px;
    width: 59px;
  }
  .buscar_texto {
    height: 36px;
    padding-left: 12px;
  }
  .select_filtro {
    height: 36px;
    padding: 0 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  .filtro_label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
  }
  .paginas-total {
    padding-bottom: 9px;
  }
</style>

<div class="rowflex">
  <table>
    <tr>
      <td>
        <button on:click={izquierda} disabled={pagina_actual <= 1}>
          <i class="material-icons vertical-alineado">chevron_left</i>
        </button>
      </td>

      <td title="Página actual" class="pointer">
        <input
          class="pagina_actual_input"
          step="1"
          type="number"
          min="1"
          max={paginas}
          bind:value={pagina_actual}
          on:change={solicitar_logs}
        />/
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

  <div class="filtro_label">
    <span>Año:</span>
    <select class="select_filtro" bind:value={anio} on:change={al_cambiar_filtro}>
      {#each lista_anios as a}
        <option value={a}>{a}</option>
      {/each}
    </select>
  </div>

  <div class="filtro_label">
    <span>Mes:</span>
    <select class="select_filtro" bind:value={mes} on:change={al_cambiar_filtro}>
      {#each MESES as m}
        <option value={m.id}>{m.nombre}</option>
      {/each}
    </select>
  </div>

  <input
    placeholder="buscar texto"
    class="buscar_texto"
    type="text"
    bind:value={buscando_texto}
    on:keydown={(e) => { if (e.key === 'Enter') al_cambiar_filtro(); }}
  />

  <select class="select_filtro" name="cars" id="cars" bind:value={accion} on:change={al_cambiar_filtro}>
    <option value="todos">Todos</option>
    <option value="pedidos/cambiar_status_a_envio">
      Descuento de inventario ( Cambiar status a envío)
    </option>
    <option value="cambio_status_pedidos/enviado">
      Cambiar status a enviado
    </option>

    <option value="clientes/crear_ficha_de_descuento"> Fichas de descuento</option>

    <option value="pedidos/cambiar_descuento_de_pedido">
      Cambio de descuento
    </option>
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

  <button on:click={al_cambiar_filtro}>
    buscar
    <i class="material-icons">search</i>
  </button>
</div>
