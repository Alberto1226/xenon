<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import { onMount, onDestroy } from "svelte";
  //import firebase from "firebase/app";
  import { usuarios, postData } from "./../../../stores";
  import { createEventDispatcher } from "svelte";
  export var agente;
  const dispatch = createEventDispatcher();

  onMount(() => {
    //console.log('antes');

    if ($usuarios.lista.length > 0) {
      lista = $usuarios.lista;
      agentes = lista;
      return;
    }
    //console.log('aqui');
    //var db = firebase.database;
    obtener_agentes();
    // var ref = firebase.database().ref("usuarios/bodega_1/usuarios")
  });
  onDestroy(() => {
    busqueda = "";
  });
  var input_1;
  var busqueda = "";
  var lista = [];

  var agentes = [];
  var lista_visible = true;
  let cargando = false;

  function obtener_agentes() {
    if (cargando) return;
    cargando = true;
    postData("app/usuarios/lista_de_usuarios", { buscando: busqueda })
      .then(res => {
        cargando = false;
        if (res.ok) {
          $usuarios.lista = res.lista;
          $usuarios.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $usuarios = $usuarios;
          agentes = res.lista;
          lista = $usuarios.lista;
        }
      })
      .catch(err => {
        console.log(err);
        cargando = false;
      });
  }

  function incluye_busqueda(agente_selecto) {
  //  console.log(agente_selecto);
    if (
      agente_selecto.usuario.toLowerCase().indexOf(busqueda.toLowerCase()) >=
        0 ||
      agente_selecto.nombre.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0
    ) {
      return true;
    }
    return false;
  }

  function filtrar_nuevo_arreglo() {
    if (busqueda == "") {
      lista = agentes;

      return;
    }
    var lista_previa = $usuarios.lista;
    var lista_temp = agentes.filter(state => incluye_busqueda(state));

    lista = lista_temp;
  }

  function handleKeydown(evt) {
    input_1 = document.getElementById("input_1");
    if (input_1 == null) return;
    input_1.focus();
  }
</script>

<style>
  .scrollable {
    overflow-y: auto;
    height: 150px;
    width: 350px;
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

      <span>{agente ? agente.nombre : 'pendiente...'}</span>

    </Button>
  </div>
  <input
    id="input_1"
    type="text"
    bind:value={busqueda}
    on:keyup={filtrar_nuevo_arreglo} />
  <i class="material-icons vertical-alineado">search</i>
  {#if cargando}
    <!-- content here -->
    <div class="centrado">
      <b>cargando...</b>
    </div>
  {:else}
    <!-- else content here -->
    <div class="scrollable">
      {#each lista as item}
        <!-- content here -->

        <Menuitem
          on:click={() => {
            agente = { nombre: item.nombre, id: item._id, correo: item.correo };
            dispatch('change', agente);
          }}>
          {item.nombre} {item.correo}
        </Menuitem>
      {/each}
    </div>
  {/if}

</Menu>
