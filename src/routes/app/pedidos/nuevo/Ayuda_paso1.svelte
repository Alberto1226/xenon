<script>
  import { Button } from "svelte-mui/src";
  let visible = false;
</script>

{#if visible}
  <!-- content here -->
  <div class="centrado">
    <div class="tarjeta">
      <div class="centrado titulo_formulario">Paso #1</div>
      <div class="contenido">
        a) Seleccionar al cliente
        <br />
        b) Selecciona un tipo diferente de
        <b>moneda</b>
        y su tipo de cambio
        <span class="indice_row">(opcional)</span>
        <br />
        c) Puedes seleccionar de la lista de
        <b>direcciones</b>
        registradas.
        <br />
        <b>Nota:</b> Las direcciones deben contener estos datos obligatorios:
        <ul>
          <li>Calle</li>
          <li>Número Exterior</li>
          <li>Colonia</li>
          <li>Localidad</li>
          <li>Código Postal</li>
          <li>Estado</li>
          <li>Municipio</li>
        </ul>
        <br />
        <Button
          on:click={() => {
            visible = false;
          }}
          color="primary"
        >
          ok
        </Button>
      </div>
    </div>
  </div>
{:else}
  <div class="centrado boton_ayuda">
    <Button
      fab
      dense
      icon
      on:click={() => {
        visible = !visible;
      }}
    >
      <i class="material-icons">help</i>
    </Button>
  </div>
{/if}

<style>
  .tarjeta {
    padding: 20px;
    margin: 0 auto;
    width: 80%;
    background: white;
    border-radius: 6px;
    box-shadow: 3px 3px 10px #222d324f;
    text-align: left;
  }

  .boton_ayuda {
    position: absolute;
    right: 8px;
    top: 45px;
  }
</style>
