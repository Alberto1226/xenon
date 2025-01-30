<script>
  import {
    Textfield,
    Button,
    Datefield,
    Checkbox,
    Menuitem,
    Menu,
  } from "svelte-mui/src";

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
    telefono: "",
    correo: "",
    cp: "",
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

  let props = {
    color: "primary",
    name: "direccion_predeterminada",
    value: "predeterminada",
  };
  let checked = true;

  $: if (showCfdiMenu) {
    updateCfdiOptions();
  }

  $: if (showRfisMenu) {
    updateRfisOptions();
  }

  function updateCfdiOptions() {
    if (direccion_nueva.tipo_persona === "FISICA") {
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
      !direccion_nueva.cfdi == "" &&
      direccion_nueva.tipo_persona == "MORAL"
    ) {
      const currentCfdi = cfdi_pm.find(
        (item) => item.CFDI === direccion_nueva.cfdi,
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
      !direccion_nueva.cfdi == "" &&
      direccion_nueva.tipo_persona == "FISICA"
    ) {
      const currentCfdi = cfdi_pf.find(
        (item) => item.CFDI === direccion_nueva.cfdi,
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
    direccion_nueva.municipio = "";
    direccion_nueva.idEstado = id;
    // console.log("esId", id);
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
      <div
        class="row-flex"
        style="flex:1; margin-left: 15px; margin-right: 15px"
      >
        <div class="rfc">
          <Textfield
            error={direccion_nueva.rfc == ""
              ? "El rfc no puede estar vacío"
              : ""}
            disabled={!activar}
            bind:value={direccion_nueva.rfc}
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
                color={direccion_nueva.tipo_persona == undefined
                  ? "red"
                  : "primary"}
                raised
                ripple={false}
                style="padding-right: 4px;width:100%;"
              >
                <span>
                  {direccion_nueva.tipo_persona === undefined
                    ? "FISICA/MORAL"
                    : direccion_nueva.tipo_persona}
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
                    direccion_nueva.tipo_persona = item;
                    // isSelected = true; // Actualizar la variable booleana al seleccionar una opción
                    if (
                      direccion_nueva.tipo_persona === "FISICA" ||
                      direccion_nueva.tipo_persona === "MORAL"
                    ) {
                      direccion_nueva.cfdi = "";
                      direccion_nueva.rfiscal = "";
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
                  color={direccion_nueva.cfdi == "" ? "red" : "primary"}
                  raised
                  ripple={false}
                  style="padding-right: 4px;width:100%;"
                >
                  <span>
                    {direccion_nueva.cfdi === ""
                      ? "CFDI"
                      : direccion_nueva.cfdi}
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
                      direccion_nueva.cfdi = item.value;

                      if (!direccion_nueva.cfdi == "") {
                        showRfisMenu = true;
                        direccion_nueva.rfiscal = "";
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
                  color={direccion_nueva.rfiscal == "" ? "red" : "primary"}
                  raised
                  ripple={false}
                  style="padding-right: 4px;width:100%;"
                >
                  <span>
                    {direccion_nueva.rfiscal === ""
                      ? "Regimen Fiscal"
                      : direccion_nueva.rfiscal}
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
                      direccion_nueva.rfiscal = item.value;
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
        error={direccion_nueva.nombre == ""
          ? "El Nombre no puede estar vacío"
          : ""}
        disabled={!activar}
        bind:value={direccion_nueva.nombre}
        placeholder="Nombre"
        label="Nombre"
        type="text"
      />
    </div>
    <div class="telefono" style="flex:1;">
      <Textfield
        error={direccion_nueva.telefono == ""
          ? "El telefono no puede estar vacío"
          : ""}
        disabled={!activar}
        bind:value={direccion_nueva.telefono}
        placeholder="Teléfono"
        label="Teléfono"
        type="tel"
      />
    </div>
    <div class="correo" style="flex:1;">
      <Textfield
        error={direccion_nueva.correo == ""
          ? "El correo no puede estar vacío"
          : ""}
        disabled={!activar}
        bind:value={direccion_nueva.correo}
        placeholder="Correo"
        label="Correo"
        type="email"
      />
    </div>
  </div>
  <div class="row-flex">
    <div
      class="pais"
      style="flex:1; display: flex; flex-direction: row; gap: 10px;"
    >
      <SelectPais
        {activar}
        bind:pais={direccion_nueva.pais}
        on:pais_cambio={(event) => AsignarIdPais(event.detail.id)}
        style="flex: 1;"
      />
      <SelectEstado
        {activar}
        bind:Pais={direccion_nueva.pais}
        bind:estado={direccion_nueva.estado}
        bind:IdPais={direccion_nueva.idPais}
        on:estado_cambio={(event) => AsignarIdEstado(event.detail.id)}
        style="flex: 1;"
      />
      <SelectMunicipios
        {activar}
        bind:IdPais={direccion_nueva.idPais}
        bind:Pais={direccion_nueva.pais}
        bind:Estado={direccion_nueva.estado}
        bind:municipio={direccion_nueva.municipio}
        bind:IdEstado={direccion_nueva.idEstado}
        style="flex: 1;"
      />
    </div>
    <!-- <div class="pais" style="flex:1;">
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
    </div> -->
  </div>
  <div class="row-flex">
    <div class="cp" style="flex:1;">
      <Textfield
        error={direccion_nueva.cp == "" ? "El cp no puede estar vacío" : ""}
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
          error={direccion_nueva.localidad_nombre == ""
            ? "La Localidad no puede estar vacía"
            : ""}
          disabled={!activar}
          bind:value={direccion_nueva.localidad_nombre}
          placeholder="Localidad"
          label="Localidad"
          type="text"
        />
      </div>
      <div class="colonia" style="flex:1">
        <Textfield
          error={direccion_nueva.colonia == ""
            ? "La colonia no puede estar vacía"
            : ""}
          disabled={!activar}
          bind:value={direccion_nueva.colonia}
          placeholder="Colonia"
          label="Colonia"
          type="text"
        />
      </div>

      <div class="calle" style="flex:1">
        <Textfield
          error={direccion_nueva.calle == ""
            ? "La calle no puede estar vacía"
            : ""}
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
          error={direccion_nueva.numero_exterior == ""
            ? "El numero exterior no puede estar vacío"
            : ""}
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
          error={direccion_nueva.entre_calle == ""
            ? "La calle no puede estar vacía"
            : ""}
          disabled={!activar}
          bind:value={direccion_nueva.entre_calle}
          placeholder="Entre calle"
          label="Entre calle"
          type="text"
        />
      </div>
      <div class="y_calle" style="flex: 1">
        <Textfield
          error={direccion_nueva.y_calle == ""
            ? "La calle no puede estar vacía"
            : ""}
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
