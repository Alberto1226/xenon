<script>
  import {
    Textfield,
    Button,
    Datefield,
    Checkbox,
    Menuitem,
    Menu,
  } from "svelte-mui/src";

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
    cfdi: "",
    rfiscal: "",
    tipo_persona: "",
    tipo: "",
    predeterminada: true,
  };

  let actualizar_municipio = false;
  let activar = true;

  let showCfdiMenu = false;
  let showRfisMenu = false;
  let cfdiOptions,
    rfOptions,
    rfOptions2 = [];

  var tp = ["FISICA", "MORAL"];
  var cfdi_pf = [
    {
      CFDI: "G01",
      DES: "Adquisición de mercancías.",
      RF_PF: [601, 603, 606, 6012, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "G02",
      DES: "Devoluciones, descuentos o bonificaciones.",
      RF_PF: [601, 603, 606, 612, 616, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "G03",
      DES: "Gastos en general.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I01",
      DES: "Construcciones.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I02",
      DES: "Mobiliario y equipo de oficina por inversiones.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I03",
      DES: "Equipo de transporte.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I04",
      DES: "Equipo de computo y accesorios.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I05",
      DES: "Dados, troqueles, moldes, matrices y herramental.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I06",
      DES: "Comunicaciones telefónicas.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I07",
      DES: "Comunicaciones satelitales.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I08",
      DES: "Otra maquinaria y equipo.",
      RF_PF: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "D01",
      DES: "Honorarios médicos, dentales y gastos hospitalarios.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D01",
      DES: "Honorarios médicos, dentales y gastos hospitalarios.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D02",
      DES: "Gastos médicos por incapacidad o discapacidad.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D03",
      DES: "Gastos funerales.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D04",
      DES: "Donativos.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D05",
      DES: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación).",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D06",
      DES: "Aportaciones voluntarias al SAR.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D07",
      DES: "Primas por seguros de gastos médicos.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D08",
      DES: "Gastos de transportación escolar obligatoria.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D09",
      DES: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones.",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "D10",
      DES: "Pagos por servicios educativos (colegiaturas).",
      RF_PF: [605, 606, 608, 611, 612, 614, 607, 615, 625],
    },
    {
      CFDI: "S01",
      DES: "Sin efectos fiscales.",
      RF_PF: [
        601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622, 623,
        624, 607, 615, 625, 626,
      ],
    },
    {
      CFDI: "CP01",
      DES: "Pagos",
      RF_PF: [
        601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622, 623,
        624, 607, 615, 625, 626,
      ],
    },
    { CFDI: "CN01", DES: "Nómina", RF_PF: [605] },
  ];

  var cfdi_pm = [
    {
      CFDI: "G01",
      DES: "Adquisición de mercancías.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "G02",
      DES: "Devoluciones, descuentos o bonificaciones.",
      RF_PM: [601, 603, 606, 612, 616, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "G03",
      DES: "Gastos en general.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I01",
      DES: "Construcciones.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I02",
      DES: "Mobiliario y equipo de oficina por inversiones.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I03",
      DES: "Equipo de transporte.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I04",
      DES: "Equipo de computo y accesorios.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I05",
      DES: "Dados, troqueles, moldes, matrices y herramental.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I06",
      DES: "Comunicaciones telefónicas.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I07",
      DES: "Comunicaciones satelitales.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "I08",
      DES: "Otra maquinaria y equipo.",
      RF_PM: [601, 603, 606, 612, 620, 621, 622, 623, 624, 625, 626],
    },
    {
      CFDI: "S01",
      DES: "Sin efectos fiscales.",
      RF_PM: [
        601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622, 623,
        624, 607, 615, 625, 626,
      ],
    },
    {
      CFDI: "CP01",
      DES: "Pagos",
      RF_PM: [
        601, 603, 605, 606, 608, 610, 611, 612, 614, 616, 620, 621, 622, 623,
        624, 607, 615, 625, 626,
      ],
    },
  ];

  var rf = [
    { CLAVE: "601", DES: "General de Ley Personas Morales" },
    { CLAVE: "603", DES: "Personas Morales con Fines no Lucrativos" },
    {
      CLAVE: "605",
      DES: "Sueldos y Salarios e Ingresos Asimilados a Salarios",
    },
    { CLAVE: "606", DES: "Arrendamiento" },
    { CLAVE: "607", DES: "Régimen de Enajenación o Adquisición de Bienes" },
    { CLAVE: "608", DES: "Demás ingresos" },
    { CLAVE: "609", DES: "Consolidación" },
    {
      CLAVE: "610",
      DES: "Residentes en el Extranjero sin Establecimiento Permanente en México",
    },
    { CLAVE: "611", DES: "Ingresos por Dividendos (socios y accionistas)" },
    {
      CLAVE: "612",
      DES: "Personas Físicas con Actividades Empresariales y Profesionales",
    },
    { CLAVE: "614", DES: "Ingresos por intereses" },
    { CLAVE: "615", DES: "Régimen de los ingresos por obtención de premios" },
    { CLAVE: "616", DES: "Sin obligaciones fiscales" },
    {
      CLAVE: "620",
      DES: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos",
    },
    { CLAVE: "621", DES: "Incorporación Fiscal" },
    {
      CLAVE: "622",
      DES: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
    },
    { CLAVE: "623", DES: "Opcional para Grupos de Sociedades" },
    { CLAVE: "624", DES: "Coordinados" },
    {
      CLAVE: "625",
      DES: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
    },
    { CLAVE: "626", DES: "Régimen Simplificado de Confianza" },
    { CLAVE: "628", DES: "Hidrocarburos" },
    {
      CLAVE: "629",
      DES: "De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales",
    },
    { CLAVE: "630", DES: "Enajenación de acciones en bolsa de valores" },
  ];

  onMount(() => {
    //console.log("Comienza onmount editar");
  });
  let props = {
    color: "primary",
    name: "direccion_predeterminada",
    value: "predeterminada",
  };
  let checked = true;

  let municipio_editable = "";

  $: if (direccion_a_editar.cfdi == "") {
    showRfisMenu = false;
  }

  $: if (
    (direccion_a_editar.tipo === "envio/facturacion" ||
      direccion_a_editar.tipo == "facturacion") &&
    !direccion_a_editar.cfdi == "" &&
    !direccion_a_editar.rfiscal == ""
  ) {
    showCfdiMenu = true;
    showRfisMenu = true;
  }

  $: if (showCfdiMenu) {
    updateCfdiOptions();
  }

  $: if (showRfisMenu) {
    updateRfisOptions();
  }

  function updateCfdiOptions() {
    if (direccion_a_editar.tipo_persona === "FISICA") {
      cfdiOptions = cfdi_pf.map((item) => ({
        value: item.CFDI,
        label: `${item.CFDI} - ${item.DES}`,
      }));
    } else {
      cfdiOptions = cfdi_pm.map((item) => ({
        value: item.CFDI,
        label: `${item.CFDI} - ${item.DES}`,
      }));
    }
  }

  function updateRfisOptions() {
    if (
      !direccion_a_editar.cfdi == "" &&
      direccion_a_editar.tipo_persona == "MORAL"
    ) {
      const currentCfdi = cfdi_pm.find(
        (item) => item.CFDI === direccion_a_editar.cfdi,
      );
      if (currentCfdi) {
        rfOptions2 = rf.filter((item) =>
          currentCfdi.RF_PM.includes(Number(item.CLAVE)),
        );
        rfOptions = rfOptions2.map((item) => ({
          value: item.CLAVE,
          label: `${item.CLAVE} - ${item.DES}`,
        }));
      }
    }
    if (
      !direccion_a_editar.cfdi == "" &&
      direccion_a_editar.tipo_persona == "FISICA"
    ) {
      const currentCfdi = cfdi_pf.find(
        (item) => item.CFDI === direccion_a_editar.cfdi,
      );
      if (currentCfdi) {
        rfOptions2 = rf.filter((item) =>
          currentCfdi.RF_PF.includes(Number(item.CLAVE)),
        );
        rfOptions = rfOptions2.map((item) => ({
          value: item.CLAVE,
          label: `${item.CLAVE} - ${item.DES}`,
        }));
      }
    }
  }

  function handle_municipio_cambio() {
    direccion_a_editar.municipio = municipio_editable;
  }

  function solicitar_actualizacion_de_municipios() {
    actualizar_municipio = true;
  }

  function AsignarIdPais(id) {
    direccion_a_editar.idPais = id;
    direccion_a_editar.estado = '';
    direccion_a_editar.idEstado = '';
    direccion_a_editar.municipio = '';
    // console.log(id, "ddddddd");
  }

  function AsignarIdEstado(id) {
    direccion_a_editar.idEstado = id;
    direccion_a_editar.municipio = '';
    // console.log("esId", id);
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
      <div
        class="row-flex"
        style="flex:1; margin-left: 15px; margin-right: 15px"
      >
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
        <div class="tipo_persona">
          <Menu origin="top left" style="width:250px;">
            <div slot="activator">
              <Button
                color={direccion_a_editar.tipo_persona == undefined
                  ? "red"
                  : "primary"}
                raised
                ripple={false}
                style="padding-right: 4px;width:100%;"
              >
                <span>
                  {direccion_a_editar.tipo_persona === undefined
                    ? "FISICA/MORAL"
                    : direccion_a_editar.tipo_persona}
                </span>
                <i class="material-icons vertical-alineado icono_peque">
                  arrow_drop_down
                </i>
              </Button>
              <br />
              <span class="indice_row">Tipo de Persona</span>
            </div>

            <div>
              {#each tp as item}
                <!-- content here -->

                <Menuitem
                  on:click={() => {
                    direccion_a_editar.tipo_persona = item;
                    // isSelected = true; // Actualizar la variable booleana al seleccionar una opción
                    if (
                      direccion_a_editar.tipo_persona === "FISICA" ||
                      direccion_a_editar.tipo_persona === "MORAL"
                    ) {
                      direccion_a_editar.cfdi = "";
                      direccion_a_editar.rfiscal = "";
                      showCfdiMenu = true;
                      showRfisMenu = false;
                      updateCfdiOptions();
                    }
                  }}
                >
                  {item}
                </Menuitem>
              {/each}
            </div>
          </Menu>
        </div>
        {#if showCfdiMenu}
          <div class="uso_cfdi">
            <!-- Second menu for cfdi options -->
            <Menu origin="top left" style="width:auto;">
              <div slot="activator">
                <Button
                  color={direccion_a_editar.cfdi == "" ? "red" : "primary"}
                  raised
                  ripple={false}
                  style="padding-right: 4px;width:100%;"
                >
                  <span>
                    {direccion_a_editar.cfdi === ""
                      ? "CFDI"
                      : direccion_a_editar.cfdi}
                  </span>
                  <i class="material-icons vertical-alineado icono_peque">
                    arrow_drop_down
                  </i>
                </Button>
                <br />
                <span class="indice_row">Uso del CFDI</span>
              </div>

              <div class="scrollable">
                {#each cfdiOptions as item}
                  <!-- content here -->

                  <Menuitem
                    on:click={() => {
                      direccion_a_editar.cfdi = item.value;

                      if (!direccion_a_editar.cfdi == "") {
                        direccion_a_editar.rfiscal = "";
                        showRfisMenu = true;
                        updateRfisOptions();
                      }
                    }}
                  >
                    {item.label}
                  </Menuitem>
                {/each}
              </div>
            </Menu>
          </div>
        {/if}
        {#if showRfisMenu}
          <div class="regimen_fiscal">
            <Menu origin="top left" style="width:auto;">
              <div slot="activator">
                <Button
                  color={direccion_a_editar.rfiscal == "" ? "red" : "primary"}
                  raised
                  ripple={false}
                  style="padding-right: 4px;width:100%;"
                >
                  <span>
                    {direccion_a_editar.rfiscal === ""
                      ? "Regimen Fiscal"
                      : direccion_a_editar.rfiscal}
                  </span>
                  <i class="material-icons vertical-alineado icono_peque">
                    arrow_drop_down
                  </i>
                </Button>
                <br />
                <span class="indice_row">Regimen Fiscal</span>
              </div>

              <div class="scrollable">
                {#each rfOptions as item}
                  <!-- content here -->

                  <Menuitem
                    on:click={() => {
                      direccion_a_editar.rfiscal = item.value;
                    }}
                  >
                    {item.label}
                  </Menuitem>
                {/each}
              </div>
            </Menu>
          </div>
        {/if}
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
    <div class="pais" style="flex:1; display: flex; flex-direction: row; gap: 10px;">
      <SelectPais
      {activar}
      bind:pais={direccion_a_editar.pais}
      on:pais_cambio={(event) => AsignarIdPais(event.detail.id)}
      style="flex: 1;"
      />
      <SelectEstado
      {activar}
      bind:Pais={direccion_a_editar.pais}
      bind:estado={direccion_a_editar.estado}
      bind:IdPais={direccion_a_editar.idPais}
      on:estado_cambio={(event) => AsignarIdEstado(event.detail.id)}
      style="flex: 1;"
      />
      <SelectMunicipios
      {activar}
      bind:IdPais={direccion_a_editar.idPais}
      bind:Pais={direccion_a_editar.pais}
      bind:Estado={direccion_a_editar.estado}
      bind:municipio={direccion_a_editar.municipio}
      bind:IdEstado={direccion_a_editar.idEstado}
      style="flex: 1;"
      />
    </div>
    <!-- <div class="estado">
      <Estado
        {activar}
        on:estado_cambio={solicitar_actualizacion_de_municipios}
        bind:estado={direccion_a_editar.estado}
      />
    </div> -->
    <!-- <div class="municipio">
      <Municipio
        {activar}
        bind:estado={direccion_a_editar.estado}
        bind:municipio={direccion_a_editar.municipio}
        bind:actualizar={actualizar_municipio}
      />
    </div> -->
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

<style>
  .scrollable {
    /* overflow-y: auto; */
    height: 150px;
    /* width: 350px; */
  }

  .grid-container {
    display: grid;
  }

  .row-flex {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
</style>
