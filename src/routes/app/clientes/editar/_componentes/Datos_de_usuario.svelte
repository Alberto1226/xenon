<script>
  import { Textfield, Button, Datefield } from "svelte-mui/src";
  import Perfil from "./Perfil.svelte";
  import Region from "./Region.svelte";
  import { fade } from "svelte/transition";
  import Agente from "./Agente_ventas.svelte";
  import { onMount } from "svelte";

  import { usuario_db } from "./../../../../stores";
  export var cliente_selecto;
  let format = "D.MM.YYYY";
  let locale = "es-MX";

  onMount(() => {
    setTimeout(() => {
      const primer_input = document.getElementById("primer_input");
      primer_input.focus();
      //console.log(cliente_selecto);
    }, 500);
  });
  const onchange = ({ detail }) => {
    //console.log("onchange", detail);
  };
  var errores = {
    nombre: "Nombre no puede estar vacío",
    alias: "Alias no puede estar vacío",
    correo: "Correo no puede estar vacío",
    password: "Correo no puede estar vacío 6 o más dígitos",
  };
</script>

<div in:fade={{ duration: 500 }}>
  <div class="grid-container">
    <div class="uno espacio">
      <Textfield
        error={cliente_selecto.nombre == ""
          ? "Nombre no puede estar vacío"
          : ""}
        bind:value={cliente_selecto.nombre}
        placeholder="Nombre"
        label="Nombre*"
        message="Nombre"
        id="primer_input"
        type="text"
      />
    </div>
    <div class="dos espacio">
      <Textfield
        error={cliente_selecto.alias == "" ? "Alias no puede estar vacío" : ""}
        bind:value={cliente_selecto.alias}
        placeholder="Alias"
        label="Alias*"
        message="Alias"
        autocomplete="new-password"
        type="text"
      />
    </div>
    <div class="tres espacio">
      <Textfield
        error={cliente_selecto.correo == ""
          ? "Correo no puede estar vacío"
          : ""}
        bind:value={cliente_selecto.correo}
        label="Correo*"
        placeholder="Correo"
        message="Correo"
        autocomplete="new-password"
        type="text"
      />
    </div>
    <div class="cuatro espacio">
      <Textfield
        bind:value={cliente_selecto.observaciones}
        placeholder="Observaciones"
        label="Observaciones*"
        message="Observaciones"
        type="text"
      />
    </div>
    <div class="cinco espacio">
      <Datefield
        value={cliente_selecto.fecha_nacimiento}
        label="Cumpleaños"
        {format}
        message={format}
        {locale}
        readonly="false"
        on:date-change={onchange}
      />
    </div>
    <div class="seis espacio">
      <Perfil bind:perfil={cliente_selecto.perfil} />
    </div>
    <div class="siete espacio">
      <Region bind:region={cliente_selecto.region} />

      {#if $usuario_db.rol === "administrador" || usuario_db.rol === "gerente"}
        <!-- content here -->
        <Agente bind:agente={cliente_selecto.agente} />
      {:else}
        Agente :
        <b>{$usuario_db.nombre}</b>
      {/if}
    </div>
  </div>
</div>

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
