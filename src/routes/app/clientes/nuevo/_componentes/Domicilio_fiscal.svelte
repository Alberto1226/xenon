<script>
  import { Textfield, Button, Datefield } from "svelte-mui/src";
  import Region from "./Region.svelte";
  import Estado from "./Estado.svelte";
  import {fade} from "svelte/transition";
  export var nuevo_cliente;
</script>

<style>
  .grid-container {
      margin: 1px 10px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas: "uno dos tres tres" "cuatro cinco seis seis" "siete ocho nueve diez";
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

  .ocho {
    grid-area: ocho;
  }

  .nueve {
    grid-area: nueve;
  }

  .diez {
    grid-area: diez;
  }

  .espacio{
      padding: 5px;
  }
</style>

<div class="grid-container" in:fade={{duration:500}}>
  <div class="uno espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.rfc}
      placeholder="Colonia"
      message="Colonia"
      type="text" />

  </div>
  <div class="dos espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.razon_social}
      placeholder="Razón social"
      message="Razón social"
      type="text" />
  </div>
  <div class="tres espacio">
    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.calle}
      placeholder="Calle"
      message="Calle"
      type="text" />

  </div>
  <div class="cuatro espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.numero_exterior}
      placeholder="Número exterior"
      message="Número exterior"
      type="text" />
  </div>
  <div class="cinco espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.numero_interior}
      placeholder="Número interior"
      message="Número interior"
      type="text" />

  </div>
  <div class="seis espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.colonia}
      placeholder="Colonia"
      message="Colonia"
      type="text" />
  </div>
  <div class="siete espacio">
    <Estado bind:estado={nuevo_cliente.domicilio_fiscal.estado} />
  </div>
  <div class="ocho espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.municipio}
      placeholder="Municipio"
      message="Municipio"
      type="text" />
  </div>
  <div class="nueve espacio">

    <Textfield
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.localidad}
      placeholder="Localidad"
      message="Localidad"
      type="text" />
  </div>
  <div class="diez espacio">

    <Textfield
        style="border-radius: 10px;"
      disbled
      outlined
      bind:value={nuevo_cliente.domicilio_fiscal.cp}
      placeholder="C.P."
      message="Código postal"
      type="text" />
  </div>
</div>
