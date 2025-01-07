<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { createEventDispatcher, onMount } from "svelte";
  import { postData, usuario_db, version } from "./../stores";
  import { goto } from "@sapper/app";
  import Wtfai from "./../_layouts/wtfai.svelte";
  // import { Producto, RUTA } from "./../store_http";
  let usuario = "";
  let password = "";
  let logueando = false;
  let intento_anterior_fallo = false;
  const dispatch = createEventDispatcher();

  onMount(async () => {
    //console.log($usuario_db);

    intento_anterior_fallo = localStorage.getItem("intento_de_acceso") != null;
    setTimeout(() => {
      if ($usuario_db.usuario != undefined) {
        goto("app/inicio");
      }
    }, 1000);
    //console.log(Producto);
    /*
    var res = await Producto.http.obtener
      .solicitar({}, RUTA.producto.nuevo_registro, Producto.stores.usando_id)
      .catch(console.error);
    setTimeout(() => {
      res.ok == true
        ? res.mensaje_bueno("todo bien")
        : res.mensaje_error("maal");
    }, 1000);
    */
  });

  function mandar() {
    logueando = true;
    let data = { usuario, password };
    postData("app/login", { usuario, password })
      .then((respuesta) => {
        //console.log(respuesta);
        $usuario_db = respuesta.usuario;
        goto(respuesta.url);
        logueando = false;
      })
      .catch((err) => {
        console.log(err);
        logueando = false;
      });
  }

  function loguear(evt) {
    if (evt.key === "Enter") {
      localStorage.setItem("intento_de_acceso", "pendiente");
      setTimeout(() => {
        mandar();
      }, 100);
    }
  }

  function handleKeydown(evt) {
    if (evt.key == "Enter") {
      //  estado_actual = "viendo listas"
      //goto("a")
      mandar();
    }
  }
</script>

<svelte:head>
  <title>Login</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="centrado contenedor_login ">
  <img class="logo" src="imagenes/GM GLOW MASTER 1.png" alt="" />

  {#if logueando}
    <!-- content here -->
    <div class="centrado">
      cargando
      <br />
      <div id="wave1" />
    </div>
  {:else}
    {#if intento_anterior_fallo}
      <!-- INFO FALLO LOGIN -->
      <div class="alerta centrado">password o usuario incorrectos</div>
    {/if}
    <Textfield
      dense
      filled
      class="redondeado"
      label="Usuario"
      bind:value={usuario}
      placeholder="nombre"
      message="nombre de usuario"
    />
    <Textfield
      dense
      filled
      class="redondeado"
      label="Password"
      bind:value={password}
      on:keyup={loguear}
      placeholder="password"
      type="password"
      message="Email"
    />
  {/if}
  {#if logueando}
    <!-- content here -->
    <div class="centrado">
      <div class="wave1" />
    </div>
  {:else}
    <!-- else content here -->
    <div class="pt33">
      <Button on:click={mandar} raised color="primary">
        login
        <i class="material-icons">double_arrow</i>
      </Button>
    </div>
  {/if}

  <div class="centrado version no_select">
    v{$version}
  </div>
</div>
<Wtfai />

<style>
  .contenedor_login {
    width: 48vw;
    margin: 17vh auto;
    background-color: #484848;
    border: #939393 1px solid;
    box-shadow: 10px 10px 23px -11px rgba(0, 0, 0, 0.75);
    padding: 66px;
    border-radius: 4px;
    height: 40vh;
  }
  .logo {
    width: 16vw;
    min-width: 230px;
    margin: 11px 0;
  }
  .alerta {
    color: red;
  }

  .version {
    color: gray;
    font-size: 0.8em;
    position: absolute;
    width: 2vw;
    margin: 0 auto;
    font-size: 0.8em;
    left: 49vw;
    padding: 46px 0 0 0;
  }

  .pt33 {
    padding-top: 33px;
  }
</style>
