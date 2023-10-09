<script>
  export let visible = false;
  export let cliente;
  export let agente; //usuario
  export var id = "1";
  import { Dialog, Textfield, Button } from "svelte-mui/src";
  import { fly, blur } from "svelte/transition";
  import { postData } from "./../../../stores";
  import Agente from "./Agente_ventas.svelte";
  import {createEventDispatcher} from 'svelte';
  const dispatch = createEventDispatcher();

  let password = "";
  var guardar_deshabilitado = false;
  var guardando = false;
  var error = "";
  let agente_nuevo;

  function ocultar() {
    guardando = true;
    setTimeout(() => {
      visible = false;
      guardando = false;
    }, 750);
  }

  function cambiar_agente() {
    //console.log(cliente)

    if (agente_nuevo === null || agente_nuevo === undefined) return;
    var data = {
      cliente_id: cliente._id,
      agente_id: agente_nuevo.id
    };
    //console.log(data);
    guardando = true;

    postData("app/clientes/dialogos/cambiar_agente", data)
      .then(resp => {
        guardando = false;
        dispatch('refrescar_lista',{agente:agente_nuevo});
        //console.log(resp);
        if (resp.ok == true) {
          // goto("app/aDmInnn/lista_de_clientes");
          guardando = true;
          setTimeout(() => {
            visible = false;
            guardando = false;
          }, 1000);
        } else {
          error = resp.mensaje;
          visible = true;
        }
      })
      .catch(err => {
        console.log(err);

        guardando = false;
        error = "No se pudo guardar el cliente.";
      });
  }

  $: guardar_deshabilitado = password.length < 6;

  function funcion_guardar(evt) {
    if (guardar_deshabilitado) {
      return;
    }
    //console.log(evt.key);

    if (evt.key == "Enter") cambiar_agente();
  }
</script>

<style>
  .footer {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 13px;
  }

  .guardando {
    text-transform: uppercase;
    padding-top: 15px;
    color: #0091d7;
    font-weight: 500;
    font-size: 2.2em;
  }
  .guardando_slim {
    color: #0091d7;
    font-weight: 200;
    font-size: 1.2em;
  }
  .fondo {
    background-color: #3e58ec;
    border-radius: 5px;
    font-size: 1.2em;
    color: white;
    height: 61px;

    padding-top: 22px;
  }
</style>

<Dialog width="350" bind:visible>
  <div slot="title" class="fondo">
    <div class="delgada centrado no_seleccionable">
      Cambiar agente
      <i class="material-icons">accesibility</i>
    </div>
  </div>

  {#if guardando == false}
    <!-- content here -->
    <div class="centrado no_seleccionable">
      <div class="centrado">cliente :{cliente.nombre}</div>

      <div class="centrado" style="padding-top:30px;">

        {#if agente.nombre!=''}
          <!-- content here -->
          El cliente ya cuenta con agente,
          <b>{agente.nombre}</b>
          <br />
          Selecciona a otro agente si deseas cambiarlo
        {:else}
          <!-- else content here -->
         <div style="color:darkorange">
          No se le ha asignado un agente a
          <b>{cliente.nombre}</b>
          <br />
         </div>
         <div>
         
          Selecciona un agente
          </div>
        {/if}

      </div>

    </div>
    <div class="centrado" style="padding-top:10px;">
      <Agente agente={agente_nuevo} on:change={(evt)=>{ agente_nuevo=  evt.detail}} />
    </div>

    <div class="centrado" style="padding-top:30px;">

      {#if agente_nuevo}
        <!-- content here -->
        Seleccionaste a,
        <b>{agente_nuevo.nombre}</b>

        <div class="centrado" style="padding-top:30px;">
          {#if guardando}
            <!-- content here -->
            guardando...
          {:else}
            <Button
            dense
              on:click={cambiar_agente}
              disabled={agente_nuevo === undefined || agente_nuevo === null}
              raised
              color="primary">
              <i class="material-icons vertical-alineado">save</i>
              Guardar
            </Button>
          {/if}
        </div>
      {:else}
        <!-- else content here -->
        ...
      {/if}

    </div>
  {:else}
    <div in:blur={{ amount: 3, duration: 1150 }}>
      <h4 class="centrado guardando_slim">guardando cliente ...</h4>
      <h4 class="centrado guardando">
        " cliente
        <b>{cliente.nombre}</b>
        "
      </h4>
    </div>
    <!-- else content here -->
  {/if}

  <div slot="footer" class="footer" />
</Dialog>
