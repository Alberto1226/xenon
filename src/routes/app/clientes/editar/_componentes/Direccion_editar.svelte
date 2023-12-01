<script>
  import { Textfield, Button, Datefield, Checkbox } from "svelte-mui/src";

  import Estado from "./Estado.svelte";
  import Municipio from "./Municipio.svelte";
  import Tipo_direccion from "./Tipo_direccion.svelte";
  import { onMount } from "svelte";
  import { editar_store } from "./../../../../stores";
  export var cargando;
  export var direccion_a_editar = {
    calle: "",
    colonia: "",
    cp: 0,
    entre_calle: "",
    estado: "",
    localidad: "",
    localidad_nombre: "",
    municipio: "",
    nombre: "",
    notas: "",
    numero_exterior: "",
    numero_interior: "",
    pais: "",
    y_calle: "",
    rfc: "",
    cfdi: "",
    rfiscal: "",
    tipo: "",
    predeterminada: true,
  };

  let actualizar_municipio = false;
  let activar = true;
  onMount(() => {
    //console.log("Comienza onmount editar");
  });
  let props = {
    color: "primary",
    name: "direccion_predeterminada",
    value: "predeterminada",
  };
  let checked = true;

  //console.log(direccion_a_editar);

  let municipio_editable = "";

  function handle_municipio_cambio() {
    direccion_a_editar.municipio = municipio_editable;
  }

  function solicitar_actualizacion_de_municipios() {
    actualizar_municipio = true;
  }
</script>

<div class="grid-container">
  <div class="row-flex">
    <div>
      <Tipo_direccion
        bind:tipo_direccion={direccion_a_editar.tipo}
        bind:isSelected={activar}
      />
    </div>
    {#if direccion_a_editar.tipo === "envio/facturacion" || direccion_a_editar.tipo == "facturacion"}
      <!-- content here -->
      <div class="row-flex" style="flex:1; margin-left: 5px;">
        <div class="rfc">
          <Textfield
            disabled={!activar}
            bind:value={direccion_a_editar.rfc}
            placeholder="RFC"
            label="R.F.C."
            type="text"
            required
          />
        </div>
        <div class="rfc">
          <Textfield
            disabled={!activar}
            bind:value={direccion_a_editar.cfdi}
            placeholder="Uso del CFDI"
            label="Uso del CFDI"
            type="text"
            required
          />
        </div>
        <div class="rfc">
          <Textfield
            disabled={!activar}
            bind:value={direccion_a_editar.rfiscal}
            placeholder="Regimen Fiscal"
            label="Regimen Fiscal"
            type="text"
            required
          />
        </div>
      </div>
    {/if}
  </div>
  <div class="row-flex">
    <div class="nombre" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_a_editar.nombre}
        placeholder="Nombre"
        label="Nombre"
        type="text"
      />
    </div>
    <div class="telefono" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_a_editar.telefono}
        placeholder="Teléfono"
        label="Teléfono"
        type="tel"
      />
    </div>
    <div class="correo" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_a_editar.correo}
        placeholder="Correo"
        label="Correo"
        type="email"
      />
    </div>
  </div>
  <div class="row-flex">
    <div class="pais" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_a_editar.pais}
        placeholder="País"
        label="País"
        type="text"
      />
    </div>
    <div class="estado">
      <Estado
        {activar}
        on:estado_cambio={solicitar_actualizacion_de_municipios}
        bind:estado={direccion_a_editar.estado}
      />
    </div>
    <div class="municipio">
      <Municipio
        {activar}
        bind:estado={direccion_a_editar.estado}
        bind:municipio={direccion_a_editar.municipio}
        bind:actualizar={actualizar_municipio}
      />
    </div>
  </div>
  <div class="row-flex">
    <div class="cp" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_a_editar.cp}
        placeholder="C.P."
        label="C.P."
        type="text"
      />
    </div>
    <div class="row-flex" style="flex:8">
      <div class="localidad" style="flex:1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.localidad_nombre}
          placeholder="Localidad"
          label="Localidad"
          type="text"
        />
      </div>
      <div class="colonia" style="flex:1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.colonia}
          placeholder="Colonia"
          label="Colonia"
          type="text"
        />
      </div>

      <div class="calle" style="flex:1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.calle}
          placeholder="Calle"
          label="Calle"
          type="text"
        />
      </div>
    </div>
  </div>
  <div class="row-flex">
    <div class="row-flex" style="flex: 1">
      <div class="no_exterior">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.numero_exterior}
          placeholder="N° Exterior"
          label="N° Exterior"
          type="text"
        />
      </div>
      <div class="no_interior">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.numero_interior}
          placeholder="N° Interior"
          label="N° Interior"
          type="text"
        />
      </div>
    </div>
    <div class="row-flex" style="flex: 4">
      <div class="entre_calle" style="flex: 1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.entre_calle}
          placeholder="Entre calle"
          label="Entre calle"
          type="text"
        />
      </div>
      <div class="y_calle" style="flex: 1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_a_editar.y_calle}
          placeholder="Y calle"
          label="Y calle"
          type="text"
        />
      </div>
    </div>
  </div>

  <div class="predeterminado">
    <Checkbox
      {...props}
      disabled={!activar}
      bind:checked={direccion_a_editar.predeterminada}
    >
      <span> Usar como predeterminada </span>
    </Checkbox>
  </div>
  <div class="descripcion">
    <Textfield
      disabled={!activar}
      bind:value={direccion_a_editar.notas}
      placeholder="Indicaciones"
      label="Indicaciones"
      type="text"
    />
  </div>
</div>

<!-- <div class="grid-container">
  <div class="rfc">
    <Textfield
      disbled
      bind:value={direccion_a_editar.rfc}
      placeholder="RFC"
      label="R.F.C."
      type="text"
    />
  </div>
  <div class="nombre">
    <Textfield
      disbled
      bind:value={direccion_a_editar.nombre}
      placeholder="Nombre"
      label="Nombre"
      type="text"
    />
  </div>
  <div class="telefono">
    <Textfield
      disbled
      bind:value={direccion_a_editar.telefono}
      placeholder="Teléfono"
      label="Teléfono"
      type="text"
    />
  </div>
  <div class="correo">
    <Textfield
      disbled
      bind:value={direccion_a_editar.correo}
      placeholder="Correo"
      label="Correo"
      type="text"
    />
  </div>
  <div class="pais">
    <Textfield
      disbled
      bind:value={direccion_a_editar.pais}
      placeholder="País"
      label="País"
      type="text"
    />
  </div>
  <div class="estado">
    <Estado
      on:estado_cambio={solicitar_actualizacion_de_municipios}
      bind:estado={direccion_a_editar.estado}
    />
  </div>
  <div class="municipio">
    <Municipio
      bind:actualizar={actualizar_municipio}
      bind:municipio={direccion_a_editar.municipio}
      on:municipio_cambio={handle_municipio_cambio}
      bind:estado={direccion_a_editar.estado}
    />
  </div>
  <div class="localidad">
    <Textfield
      disbled
      bind:value={direccion_a_editar.localidad_nombre}
      placeholder="Localidad"
      label="Localidad"
      type="text"
    />
  </div>
  <div class="tipo_domicilio">
    <Tipo_direccion bind:tipo_direccion={direccion_a_editar.tipo} />
  </div>
  <div class="colonia">
    <Textfield
      disbled
      bind:value={direccion_a_editar.colonia}
      placeholder="Colonia"
      label="Colonia"
      type="text"
    />
  </div>
  <div class="cp">
    <Textfield
      disbled
      bind:value={direccion_a_editar.cp}
      placeholder="C.P."
      label="C.P."
      type="text"
    />
  </div>
  <div class="calle">
    <Textfield
      disbled
      bind:value={direccion_a_editar.calle}
      placeholder="Calle"
      label="Calle"
      type="text"
    />
  </div>
  <div class="no_exterior">
    <Textfield
      disbled
      bind:value={direccion_a_editar.numero_exterior}
      placeholder="Número exterior"
      label="Número exterior"
      type="text"
    />
  </div>
  <div class="no_interior">
    <Textfield
      disbled
      bind:value={direccion_a_editar.numero_interior}
      placeholder="Número interior"
      label="Número interior"
      type="text"
    />
  </div>
  <div class="entre_calle">
    <Textfield
      disbled
      bind:value={direccion_a_editar.entre_calle}
      placeholder="Entre calle"
      label="Entre calle"
      type="text"
    />
  </div>
  <div class="y_calle">
    <Textfield
      disbled
      bind:value={direccion_a_editar.y_calle}
      placeholder="Y calle"
      label="Y calle"
      type="text"
    />
  </div>
  <div class="predeterminado">
    <Checkbox {...props} bind:checked={direccion_a_editar.predeterminada}>
      <span>Usar como predeterminada</span>
    </Checkbox>
  </div>
  <div class="predeterminado2" />
  <div class="descripcion">
    <Textfield
      disbled
      bind:value={direccion_a_editar.notas}
      placeholder="Indicaciones"
      label="Indicaciones"
      type="text"
    />
  </div>
</div> -->

<style>
  .grid-container {
    display: grid;
  }

  .row-flex {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
  /* .grid-container {
    margin-left: 18px;
    width: 556px;
    height: 660px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 2.5fr;
    grid-template-areas: "rfc rfc nombre nombre" "telefono telefono correo correo" "pais pais estado estado" "municipio municipio localidad localidad" "tipo_domicilio colonia colonia cp" "calle calle no_exterior no_interior" "entre_calle entre_calle y_calle y_calle" "predeterminado predeterminado predeterminado2 predeterminado2" "descripcion descripcion descripcion descripcion";
  }

  .rfc {
    grid-area: rfc;
  }

  .nombre {
    grid-area: nombre;
  }

  .telefono {
    grid-area: telefono;
  }

  .correo {
    grid-area: correo;
  }

  .pais {
    grid-area: pais;
  }

  .estado {
    grid-area: estado;
  }

  .municipio {
    grid-area: municipio;
  }

  .localidad {
    grid-area: localidad;
  }

  .tipo_domicilio {
    grid-area: tipo_domicilio;
  }

  .colonia {
    grid-area: colonia;
  }

  .cp {
    grid-area: cp;
  }

  .calle {
    grid-area: calle;
  }

  .no_exterior {
    grid-area: no_exterior;
  }

  .no_interior {
    grid-area: no_interior;
  }

  .entre_calle {
    grid-area: entre_calle;
  }

  .y_calle {
    grid-area: y_calle;
  }

  .predeterminado {
    grid-area: predeterminado;
  }

  .predeterminado2 {
    grid-area: predeterminado2;
  }

  .descripcion {
    grid-area: descripcion;
  } */
</style>
