<script>
  import { Textfield, Button, Datefield, Checkbox } from "svelte-mui/src";

  import Estado from "./Estado.svelte";
  import Municipio from "./Municipio.svelte";
  import Tipo_direccion from "./Tipo_direccion.svelte";

  let actualizar_municipio = false;
  let activar = false;

  export var direccion_nueva = {
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
    cfdi:"",
    rfiscal:"",
    tipo: "",
    predeterminada: true,
  };

  let props = {
    color: "primary",
    name: "direccion_predeterminada",
    value: "predeterminada",
  };
  let checked = true;

  function solicitar_actualizacion_de_municipios() {
    actualizar_municipio = true;
  }
</script>

<div class="grid-container">
  <div class="row-flex">
    <div>
      <Tipo_direccion
        bind:tipo_direccion={direccion_nueva.tipo}
        bind:isSelected={activar}
      />
    </div>
    {#if direccion_nueva.tipo === "envio/facturacion" || direccion_nueva.tipo == "facturacion"}
      <!-- content here -->
      <div class="row-flex" style="flex:1; margin-left: 5px;">
        <div class="rfc">
          <Textfield
            disabled={!activar}
            bind:value={direccion_nueva.rfc}
            placeholder="RFC"
            label="R.F.C."
            type="text"
            required
          />
        </div>
        <div class="rfc">
          <Textfield
            disabled={!activar}
            bind:value={direccion_nueva.cfdi}
            placeholder="Uso del CFDI"
            label="Uso del CFDI"
            type="text"
            required
          />
        </div>
        <div class="rfc">
          <Textfield
            disabled={!activar}
            bind:value={direccion_nueva.rfiscal}
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
        bind:value={direccion_nueva.nombre}
        placeholder="Nombre"
        label="Nombre"
        type="text"
      />
    </div>
    <div class="telefono" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_nueva.telefono}
        placeholder="Teléfono"
        label="Teléfono"
        type="tel"
      />
    </div>
    <div class="correo" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_nueva.correo}
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
        bind:value={direccion_nueva.pais}
        placeholder="País"
        label="País"
        type="text"
      />
    </div>
    <div class="estado">
      <Estado
        {activar}
        on:estado_cambio={solicitar_actualizacion_de_municipios}
        bind:estado={direccion_nueva.estado}
      />
    </div>
    <div class="municipio">
      <Municipio
        {activar}
        bind:estado={direccion_nueva.estado}
        bind:municipio={direccion_nueva.municipio}
        bind:actualizar={actualizar_municipio}
      />
    </div>
  </div>
  <div class="row-flex">
    <div class="cp" style="flex:1;">
      <Textfield
        disabled={!activar}
        bind:value={direccion_nueva.cp}
        placeholder="C.P."
        label="C.P."
        type="text"
      />
    </div>
    <div class="row-flex" style="flex:8">
      <div class="localidad" style="flex:1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_nueva.localidad_nombre}
          placeholder="Localidad"
          label="Localidad"
          type="text"
        />
      </div>
      <div class="colonia" style="flex:1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_nueva.colonia}
          placeholder="Colonia"
          label="Colonia"
          type="text"
        />
      </div>

      <div class="calle" style="flex:1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_nueva.calle}
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
          bind:value={direccion_nueva.numero_exterior}
          placeholder="N° Exterior"
          label="N° Exterior"
          type="text"
        />
      </div>
      <div class="no_interior">
        <Textfield
          disabled={!activar}
          bind:value={direccion_nueva.numero_interior}
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
          bind:value={direccion_nueva.entre_calle}
          placeholder="Entre calle"
          label="Entre calle"
          type="text"
        />
      </div>
      <div class="y_calle" style="flex: 1">
        <Textfield
          disabled={!activar}
          bind:value={direccion_nueva.y_calle}
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
      bind:checked={direccion_nueva.predeterminada}
    >
      <span> Usar como predeterminada </span>
    </Checkbox>
  </div>
  <div class="descripcion">
    <Textfield
      disabled={!activar}
      bind:value={direccion_nueva.notas}
      placeholder="Indicaciones"
      label="Indicaciones"
      type="text"
    />
  </div>
</div>

<style>
  .grid-container {
    display: grid;
  }

  .row-flex {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

</style>
