<script>
  export let visible = false;
  export let usuario ;
  export var id = "1";
  import { Dialog, Textfield, Button } from "svelte-mui/src";
  import { fly, blur } from "svelte/transition";
  import { postData } from "./../../../stores";

  let password = "";
  var guardar_deshabilitado = false;
  var guardando = false;
  var error = "";

  function ocultar() {
    guardando = true;
    setTimeout(() => {
      visible = false;
      guardando = false;
    }, 750);
  }

  function subir_password() {
   //console.log(usuario)
    var data = {
      id:usuario._id,
      password
    };
    guardando = true;

    postData("app/usuarios/dialogos/cambiar_password", data)
      .then(resp => {
        guardando = false;
       //console.log(resp);
        if (resp.ok == true) {
          // goto("app/aDmInnn/lista_de_usuarios");
          guardando = true;
          setTimeout(() => {
            visible = false;
            guardando = false;
            password = "";
          }, 1000);
        } else {
          error = resp.mensaje;
          visible = true;
        }
      })
      .catch(err => {
        console.log(err);
        
        guardando = false;
        error = "No se pudo guardar el usuario.";
      });
  }

  $: guardar_deshabilitado = password.length < 6;

  function funcion_guardar(evt) {
    if (guardar_deshabilitado) {
      return;
    }
    //console.log(evt.key);

    if (evt.key == "Enter") subir_password();
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
  .password_muy_corto {
    color: red;
    font-weight: 500;
  }
  .fondo {
    background-color: #ec3e3e;
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
      Cambiar password
      <i class="material-icons">security</i>
    </div>
  </div>

  {#if guardando == false}
    <!-- content here -->
    <div
      class="centrado no_seleccionable"
      class:password_muy_corto={guardar_deshabilitado}>
      <div class="centrado">
      usuario :{usuario.usuario}
      </div>
      6 caracteres en adelante
    </div>
    <Textfield
      bind:value={password}
      name="nuevo"
      id="nuevo"
       autocomplete="new-password"
      placeholder="Password nuevo ( 6 caracteres en adelante )"
      type="password"
      error={password.length<6?'El password es muy corto':''}
      on:keydown={funcion_guardar} />
    <div class="centrado" style="padding-top:30px;">
      <Button
        on:click={subir_password}
        disabled={guardar_deshabilitado}
        raised
        color="primary">
        Guardar
      </Button>
    </div>
  {:else}
    <div in:blur={{ amount: 3, duration: 1150 }}>
      <h4 class="centrado guardando_slim">guardando password nuevo ...</h4>
      <h4 class="centrado guardando">
        " usuario
        <b>{usuario.usuario}</b>
        "
      </h4>
    </div>
    <!-- else content here -->
  {/if}

  <div slot="footer" class="footer" />
</Dialog>
