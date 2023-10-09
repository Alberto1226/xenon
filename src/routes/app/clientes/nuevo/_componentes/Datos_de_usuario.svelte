<script>
  import { Textfield, Button, Datefield } from "svelte-mui/src";
  import Perfil from "./Perfil.svelte";
  import Region from "./Region.svelte";
  import { fade } from "svelte/transition";
  import Agente from "./Agente_ventas.svelte";
  import { onMount } from "svelte";
  import { usuario_db } from "./../../../../stores";
  export var nuevo_cliente;
  let format = "D.MM.YYYY";
  let locale = "es-MX";

  onMount(() => {
    setTimeout(() => {
      const primer_input = document.getElementById("primer_input");
      //primer_input.focus();
    }, 500);
  });
  const onchange = ({ detail }) => {
    //console.log("onchange", detail);
  };
  var errores = {
    nombre: "Nombre no puede estar vacío",
    alias: "Alias no puede estar vacío",
    correo: "Correo no puede estar vacío",
    password: "Correo no puede estar vacío 6 o más dígitos"
  };
</script>

<style>
  .grid-container {
    margin: 1px 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr;
    grid-template-areas: "uno dos" "tres cuatro" "cinco seis" "siete siete";
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;
  }

  .tres {
    grid-area: tres;
  }

  .cuatro {
    grid-area: cuatro;
  }

  .cinco {
    grid-area: cinco;
  }

  .seis {
    grid-area: seis;
  }

  .siete {
    grid-area: siete;
  }

  .espacio {
    padding: 5px;
  }
</style>

<div in:fade={{ duration: 500 }}>
  <div class="grid-container">
    <div class="uno espacio">

      <Textfield
        error={nuevo_cliente.nombre == '' ? 'Nombre no puede estar vacío' : ''}
        outlined
        bind:value={nuevo_cliente.nombre}
        placeholder="Nombre*"
        message="Nombre*"
        id="primer_input"
        type="text" />
    </div>
    <div class="dos espacio">

      <Textfield
        error={nuevo_cliente.alias == '' ? 'Alias no puede estar vacío' : ''}
        outlined
        bind:value={nuevo_cliente.alias}
        placeholder="Alias*"
        message="Alias*"
        autocomplete="new-password"
        type="text" />
    </div>
    <div class="tres espacio">

      <Textfield
        error={nuevo_cliente.correo == '' ? 'Correo no puede estar vacío' : ''}
        outlined
        bind:value={nuevo_cliente.correo}
        placeholder="Correo"
        message="Correo"
        autocomplete="new-password"
        type="text" />
    </div>
    <div class="cuatro espacio">
      <Textfield
        error={nuevo_cliente.password == '' || nuevo_cliente.password.length < 6 ? 'Password no puede estar vacío o ser menor a 6 dígitos' : ''}
        outlined
        bind:value={nuevo_cliente.password}
        placeholder="Password"
        autocomplete="new-password"
        message="Password"
        type="password" />
    </div>
    <div class="cinco espacio">

      <Datefield
        value={nuevo_cliente.fecha_nacimiento}
        label="Cumpleaños"
        {format}
        message={format}
        {locale}
        readonly="false"
        on:date-change={onchange} />
    </div>
    <div class="seis espacio">

      <Perfil bind:perfil={nuevo_cliente.perfil} />
    </div>
    <div class="siete espacio">

      <Region bind:region={nuevo_cliente.region} />

      {#if $usuario_db.rol === 'administrador' || usuario_db.rol === 'gerente'}
        <!-- content here -->
        <Agente bind:agente={nuevo_cliente.agente} />
      {:else}
        Agente :
        <b>{$usuario_db.nombre}</b>
      {/if}

    </div>
  </div>

</div>
