<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import { onMount, onDestroy } from "svelte";
  import { postData } from "./../../../stores";
  import { createEventDispatcher } from "svelte";
  export var agente;
  const dispatch = createEventDispatcher();

  onMount(() => {
    obtener_agentes();
  });

  onDestroy(() => {
    busqueda = "";
  });

  var input_1;
  var busqueda = "";
  var lista = [];
  var agentes = [];
  let cargando = false;

  function obtener_agentes() {
    if (cargando) return;
    cargando = true;
    postData("app/usuarios/lista_de_usuarios", { todos: true })
      .then(res => {
        cargando = false;
        if (res.ok) {
          agentes = res.lista || [];
          filtrar_nuevo_arreglo();
        }
      })
      .catch(err => {
        console.log(err);
        cargando = false;
      });
  }

  function incluye_busqueda(agente_selecto) {
    if (!agente_selecto) return false;
    const term = (busqueda || "").trim().toLowerCase();
    if (!term) return true;
    const nombre = (agente_selecto.nombre || "").toLowerCase();
    const usuario = (agente_selecto.usuario || "").toLowerCase();
    const correo = (agente_selecto.correo || "").toLowerCase();
    const alias = (agente_selecto.alias || "").toLowerCase();
    return (
      nombre.indexOf(term) >= 0 ||
      usuario.indexOf(term) >= 0 ||
      correo.indexOf(term) >= 0 ||
      alias.indexOf(term) >= 0
    );
  }

  function filtrar_nuevo_arreglo() {
    if (!busqueda || busqueda.trim() === "") {
      lista = agentes;
      return;
    }
    lista = agentes.filter(state => incluye_busqueda(state));
  }

  function buscar_servidor_o_local(evt) {
    filtrar_nuevo_arreglo();
    if (evt && evt.key === 'Enter') {
      if (lista.length === 0 && busqueda.trim() !== '') {
        cargando = true;
        postData("app/usuarios/lista_de_usuarios", { buscando: busqueda, todos: true })
          .then(res => {
            cargando = false;
            if (res.ok && res.lista) {
              lista = res.lista;
            }
          })
          .catch(() => {
            cargando = false;
          });
      }
    }
  }

  function handleKeydown(evt) {
    input_1 = document.getElementById("input_1");
    if (input_1 == null) return;
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    input_1.focus();
  }
</script>

<style>
  .scrollable {
    overflow-y: auto;
    height: 180px;
    width: 350px;
  }
  .input-buscar-agente {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid #e0e0e0;
  }
  .input-buscar-agente input {
    flex: 1;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 5px 8px;
    outline: none;
  }
  .input-buscar-agente input:focus {
    border-color: #3e58ec;
  }
</style>

<svelte:window on:keydown={handleKeydown} />
<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <span class="indice_row">agente nuevo a asignar :</span>
    <br />
    <Button
      color={agente ? (agente.nombre == '' ? 'red' : 'primary') : 'darkorange'}
      raised
      ripple={false}
      style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>{agente ? (agente.nombre || agente.usuario) : 'pendiente...'}</span>

    </Button>
  </div>
  <div class="input-buscar-agente">
    <input
      id="input_1"
      type="text"
      placeholder="Buscar por nombre, usuario o correo..."
      bind:value={busqueda}
      on:input={filtrar_nuevo_arreglo}
      on:keyup={buscar_servidor_o_local} />
    <i class="material-icons vertical-alineado" style="cursor: pointer; margin-left: 6px; color: #555;" on:click={() => buscar_servidor_o_local({ key: 'Enter' })}>search</i>
  </div>
  {#if cargando}
    <div class="centrado" style="padding: 15px;">
      <b>cargando...</b>
    </div>
  {:else if lista.length === 0}
    <div class="centrado" style="padding: 20px; color: #777;">
      <i>No se encontraron usuarios</i>
    </div>
  {:else}
    <div class="scrollable">
      {#each lista as item}
        <Menuitem
          on:click={() => {
            agente = { nombre: item.nombre || item.usuario, id: item._id, correo: item.correo || '' };
            dispatch('change', agente);
          }}>
          {item.nombre || item.usuario} {item.correo ? `(${item.correo})` : ''}
        </Menuitem>
      {/each}
    </div>
  {/if}

</Menu>
