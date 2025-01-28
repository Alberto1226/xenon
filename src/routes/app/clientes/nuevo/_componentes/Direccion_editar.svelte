<script>
  import { Textfield, Button, Datefield, Checkbox } from "svelte-mui/src";

  import SelectPais from "../../Componentes/SelectPais.svelte";
  import SelectEstado from "../../Componentes/SelectEstado.svelte";
  import SelectMunicipios from "../../Componentes/SelectMunicipios.svelte";

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
    idEstado: "",
    localidad: "",
    localidad_nombre: "",
    municipio: "",
    nombre: "",
    notas: "",
    numero_exterior: "",
    numero_interior: "",
    pais: "",
    idPais: "",
    y_calle: "",
    rfc: "",
    tipo: "",
    predeterminada: true,
  };

  let activar = true;
  let actualizar_municipio = false;
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

  function AsignarIdPais(id) {
    direccion_a_editar.idPais = id;
    direccion_a_editar.estado = "";
    direccion_a_editar.idEstado = "";
    direccion_a_editar.municipio = "";
    // console.log(id, "ddddddd");
  }

  function AsignarIdEstado(id) {
    direccion_a_editar.idEstado = id;
    direccion_a_editar.municipio = "";
    // console.log("esId", id);
  }
</script>

<div class="grid-container">
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
    <SelectPais
      {activar}
      bind:pais={direccion_a_editar.pais}
      on:pais_cambio={(event) => AsignarIdPais(event.detail.id)}
      style="flex: 1;"
    />
    <!-- <Textfield
      disbled
      bind:value={direccion_a_editar.pais}
      placeholder="País"
      label="País"
      type="text" /> -->
  </div>
  <div class="estado">
    <SelectEstado
      {activar}
      bind:Pais={direccion_a_editar.pais}
      bind:estado={direccion_a_editar.estado}
      bind:IdPais={direccion_a_editar.idPais}
      on:estado_cambio={(event) => AsignarIdEstado(event.detail.id)}
      style="flex: 1;"
    />
    <!-- <Estado
      on:estado_cambio={solicitar_actualizacion_de_municipios}
      bind:estado={direccion_a_editar.estado}
    /> -->
  </div>
  <div class="municipio">
    <SelectMunicipios
      {activar}
      bind:IdPais={direccion_a_editar.idPais}
      bind:Pais={direccion_a_editar.pais}
      bind:Estado={direccion_a_editar.estado}
      bind:municipio={direccion_a_editar.municipio}
      bind:IdEstado={direccion_a_editar.idEstado}
      style="flex: 1;"
    />
    <!-- <Municipio
      bind:actualizar={actualizar_municipio}
      bind:municipio={direccion_a_editar.municipio}
      on:municipio_cambio={handle_municipio_cambio}
      bind:estado={direccion_a_editar.estado}
    /> -->
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
</div>

<style>
  .grid-container {
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
  }
</style>
