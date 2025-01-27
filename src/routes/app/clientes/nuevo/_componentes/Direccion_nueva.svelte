<script>
  import { Textfield, Button, Datefield, Checkbox } from "svelte-mui/src";

  import Estado from "./Estado.svelte";
  import Municipio from "./Municipio.svelte";
  import Tipo_direccion from "./Tipo_direccion.svelte";

  import SelectPais from "../../Componentes/SelectPais.svelte";
  import SelectEstado from "../../Componentes/SelectEstado.svelte";
  import SelectMunicipios from "../../Componentes/SelectMunicipios.svelte";

  let actualizar_municipio = false;
  let activar = true;

  export var direccion_nueva = {
    calle: "",
    colonia: "",
    cp: "",
    entre_calle: "",
    estado: "",
    idEstado: "",
    localidad: "",
    localidad_nombre: "",
    municipio: "",
    nombre: "",
    telefono: "",
    correo: "",
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

  let props = {
    color: "primary",
    name: "direccion_predeterminada",
    value: "predeterminada",
  };
  let checked = true;

  function solicitar_actualizacion_de_municipios() {
    actualizar_municipio = true;
  }

  function AsignarIdPais(id) {
    direccion_nueva.idPais = id;
    direccion_nueva.estado = "";
    direccion_nueva.idEstado = "";
    direccion_nueva.municipio = "";
    // console.log(id, "ddddddd");
  }

  function AsignarIdEstado(id) {
    direccion_nueva.idEstado = id;
    direccion_nueva.municipio = "";
    // console.log("esId", id);
  }
</script>

<div class="grid-container">
  <div class="rfc">
    <!-- <div class:error={direccion_nueva.rfc === ""}> -->
    <Textfield
      error={direccion_nueva.rfc == "" ? "El RFC no puede estar vacío" : ""}
      bind:value={direccion_nueva.rfc}
      placeholder="RFC"
      label="R.F.C."
      type="text"
    />
    <!-- </div> -->
  </div>
  <div class="nombre">
    <Textfield
      error={direccion_nueva.nombre == ""
        ? "El Nombre no puede estar vacío"
        : ""}
      disbled
      bind:value={direccion_nueva.nombre}
      placeholder="Nombre"
      label="Nombre"
      type="text"
    />
  </div>
  <div class="telefono">
    <Textfield
      error={direccion_nueva.telefono == ""
        ? "El telefono no puede estar vacío"
        : ""}
      disbled
      bind:value={direccion_nueva.telefono}
      placeholder="Teléfono*"
      label="Teléfono"
      type="text"
    />
  </div>
  <div class="correo">
    <Textfield
      error={direccion_nueva.correo == ""
        ? "El correo no puede estar vacío"
        : ""}
      disbled
      bind:value={direccion_nueva.correo}
      placeholder="Correo"
      label="Correo"
      type="text"
    />
  </div>
  <div class="pais">
    <SelectPais
      {activar}
      bind:pais={direccion_nueva.pais}
      on:pais_cambio={(event) => AsignarIdPais(event.detail.id)}
      style="flex: 1;"
    />
    <!-- <Textfield
      disbled
      bind:value={direccion_nueva.pais}
      placeholder="País"
      label="País"
      type="text" /> -->
  </div>
  <div class="estado">
    <SelectEstado
      {activar}
      bind:Pais={direccion_nueva.pais}
      bind:estado={direccion_nueva.estado}
      bind:IdPais={direccion_nueva.idPais}
      on:estado_cambio={(event) => AsignarIdEstado(event.detail.id)}
      style="flex: 1;"
    />
    <!-- <Estado
      on:estado_cambio={solicitar_actualizacion_de_municipios}
      bind:estado={direccion_nueva.estado}
    /> -->
  </div>
  <div class="municipio">
    <SelectMunicipios
      {activar}
      bind:IdPais={direccion_nueva.idPais}
      bind:Pais={direccion_nueva.pais}
      bind:Estado={direccion_nueva.estado}
      bind:municipio={direccion_nueva.municipio}
      bind:IdEstado={direccion_nueva.idEstado}
      style="flex: 1;"
    />
    <!-- <Municipio
      bind:estado={direccion_nueva.estado}
      bind:municipio={direccion_nueva.municipio}
      bind:actualizar={actualizar_municipio}
    /> -->
  </div>
  <div class="localidad">
    <Textfield
      error={direccion_nueva.rfc == "" ? "El RFC no puede estar vacío" : ""}
      disbled
      bind:value={direccion_nueva.localidad_nombre}
      placeholder="Localidad"
      label="Localidad"
      type="text"
    />
  </div>
  <div class="tipo_domicilio">
    <Tipo_direccion bind:tipo_direccion={direccion_nueva.tipo} />
  </div>
  <div class="colonia">
    <Textfield
      error={direccion_nueva.colonia == ""
        ? "La colonia no puede estar vacía"
        : ""}
      disbled
      bind:value={direccion_nueva.colonia}
      placeholder="Colonia"
      label="Colonia"
      type="text"
    />
  </div>
  <div class="cp">
    <Textfield
      error={direccion_nueva.cp == "" ? "El cp no puede estar vacío" : ""}
      disbled
      bind:value={direccion_nueva.cp}
      placeholder="C.P."
      label="C.P."
      type="text"
    />
  </div>
  <div class="calle">
    <Textfield
      error={direccion_nueva.calle == "" ? "La calle no puede estar vacía" : ""}
      disbled
      bind:value={direccion_nueva.calle}
      placeholder="Calle"
      label="Calle"
      type="text"
    />
  </div>
  <div class="no_exterior">
    <Textfield
      error={direccion_nueva.numero_exterior == ""
        ? "El numero exterior no puede estar vacío"
        : ""}
      disbled
      bind:value={direccion_nueva.numero_exterior}
      placeholder="Número exterior"
      label="Número exterior"
      type="text"
    />
  </div>
  <div class="no_interior">
    <Textfield
      disbled
      bind:value={direccion_nueva.numero_interior}
      placeholder="Número interior"
      label="Número interior"
      type="text"
    />
  </div>
  <div class="entre_calle">
    <Textfield
      error={direccion_nueva.entre_calle == ""
        ? "La calle no puede estar vacía"
        : ""}
      disbled
      bind:value={direccion_nueva.entre_calle}
      placeholder="Entre calle"
      label="Entre calle"
      type="text"
    />
  </div>
  <div class="y_calle">
    <Textfield
      error={direccion_nueva.y_calle == ""
        ? "La calle no puede estar vacía"
        : ""}
      disbled
      bind:value={direccion_nueva.y_calle}
      placeholder="Y calle"
      label="Y calle"
      type="text"
    />
  </div>
  <div class="predeterminado">
    <Checkbox {...props} bind:checked={direccion_nueva.predeterminada}>
      <span> Usar como predeterminada </span>
    </Checkbox>
  </div>
  <div class="predeterminado2"></div>
  <div class="descripcion">
    <Textfield
      disbled
      bind:value={direccion_nueva.notas}
      placeholder="Indicaciones"
      label="Indicaciones"
      type="text"
    />
  </div>
</div>

<style>
  .error {
    border: 1px solid red;
    background-color: #ffe6e6; /* Color de fondo para resaltar */
  }

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
