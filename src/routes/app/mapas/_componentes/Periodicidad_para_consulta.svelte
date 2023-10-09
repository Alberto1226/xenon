<script>
  import { Button, Dialog } from "svelte-mui/src";
  import { meses } from "./../../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  export let periodicidad;
  let visible = false;
  let unidad_de_tiempo = "Mes";
  let tipo_predefinido = "Actual";
  let resumen_fechas = "";
  let tipos_por_mes = ["Actual", "Previo", "Desde hasta"];
  let mouse_adentro = false;
  let year_desde_input = 2020;
  let year_hasta_input = 2020;
  let mes_desde_input = 0;
  let mes_hasta_input = 0;
  const dispatch = createEventDispatcher();
  onMount(() => {
    calcular_fechas();
    let hoy = new Date();
    year_desde_input = hoy.getFullYear();
    year_hasta_input = hoy.getFullYear();
    mes_desde_input = hoy.getMonth();
    let siguiente_mes = new Date();
    siguiente_mes.setMonth(siguiente_mes.getMonth() + 1);
    mes_hasta_input = siguiente_mes.getMonth();
    ///console.log(mes_hasta_input);
  });
  function ver_dialogo() {
    visible = !visible;
  }

  async function calcular_fechas() {
    await calcular_fecha_inicio();
    actualizar_resumen();
    periodicidad.listo = true;
    dispatch("fechas_cambiaron");
  }

  function calcular_fecha_inicio() {
    return new Promise(async (resolve, reject) => {
      if (unidad_de_tiempo === "Mes") {
        await calcular_fecha_inicio_mes();
        await calcular_fecha_fin_mes();
      }
      if (unidad_de_tiempo === "Año") {
        await calcular_fecha_inicio_year();
        await calcular_fecha_fin_year();
      }
      resolve();
    });
  }

  function calcular_fecha_inicio_mes() {
    return new Promise((resolve, reject) => {
      let hoy = new Date();
      if (tipo_predefinido === "Actual") {
        periodicidad.desde = fecha_desde_mes_y_year(
          hoy.getMonth(),
          hoy.getFullYear()
        );
      } else if (tipo_predefinido === "Previo") {
        periodicidad.desde = fecha_desde_mes_y_year(
          hoy.getMonth(),
          hoy.getFullYear()
        );
        periodicidad.desde.setMonth(periodicidad.desde.getMonth() - 1);
      }
      resolve();
    });
  }

  function calcular_fecha_fin_mes() {
    return new Promise((resolve, reject) => {
      let hoy = new Date();
      if (tipo_predefinido === "Actual") {
        periodicidad.hasta = fecha_desde_mes_y_year(
          hoy.getMonth(),
          hoy.getFullYear()
        );
        periodicidad.hasta.setMonth(periodicidad.hasta.getMonth() + 1);
      } else if (tipo_predefinido === "Previo") {
        periodicidad.hasta = fecha_desde_mes_y_year(
          hoy.getMonth(),
          hoy.getFullYear()
        );
      }
      resolve();
    });
  }

  function calcular_fecha_inicio_year() {
    return new Promise((resolve, reject) => {
      let hoy = new Date();
      if (tipo_predefinido === "Actual") {
        periodicidad.desde = fecha_desde_mes_y_year(0, hoy.getFullYear());
      } else if (tipo_predefinido === "Previo") {
        periodicidad.desde = fecha_desde_mes_y_year(0, hoy.getFullYear());
        periodicidad.desde.setYear(periodicidad.desde.getFullYear() - 1);
      }
      resolve();
    });
  }

  function calcular_fecha_fin_year() {
    return new Promise((resolve, reject) => {
      let hoy = new Date();
      if (tipo_predefinido === "Actual") {
        periodicidad.hasta = fecha_desde_mes_y_year(0, hoy.getFullYear());
        periodicidad.hasta.setYear(periodicidad.hasta.getFullYear() + 1);
      } else if (tipo_predefinido === "Previo") {
        periodicidad.hasta = fecha_desde_mes_y_year(0, hoy.getFullYear());
      }
      resolve();
    });
  }
  function actualizar_resumen() {
    let desde = "";
    let hasta = "";
    let hoy = new Date();
    let este_year = hoy.getFullYear();
    //  DESDE
    if (periodicidad.desde != null) {
      let desde_year = periodicidad.desde.getFullYear();
      desde = usar_mes_textual(periodicidad.desde.getMonth()) + "- ";
      if (desde_year != este_year)
        desde += " del año " + periodicidad.desde.getFullYear();
      else desde += " de " + periodicidad.desde.getFullYear();
    }
    //  HASTA
    if (periodicidad.hasta != null) {
      let hasta_year = periodicidad.hasta.getFullYear();
      hasta = usar_mes_textual(periodicidad.hasta.getMonth()) + "- ";
      if (hasta_year != este_year)
        hasta += " del año " + periodicidad.hasta.getFullYear();
      else hasta += " de " + periodicidad.hasta.getFullYear();
    }
    resumen_fechas = `, desde <b style="color:#1976d2">${desde}</b> -> hasta <b style="color:#1976d2">${hasta}</b>`;
  }

  //  el momento que inicia el mes
  function fecha_desde_mes_y_year(mes, year) {
    let nueva_fecha = new Date(year, mes, 1, 0, 0, 0, 0);
    return nueva_fecha;
  }

  function usar_mes_textual(indice) {
    return meses[indice];
  }

  function ocultar() {
    mouse_adentro = false;
    setTimeout(() => {
      if (mouse_adentro) return;
      visible = false;
    }, 1000);
  }
</script>

<style>
  .resumen {
    color: greenyellow;
  }
  .titulo {
    font-weight: 500;
    font-size: 1.2em;
  }
  .contenedor {
    z-index: 12;
    padding: 20px;
    border-radius: 5px;
    background: #222d32;
    color: white;
    border: 1px solid #0f668c;
    position: absolute;
    margin: -171px -150px;
  }
  .input_year{
    width:100px;
  }
</style>

<table>
<tr>
  <td class="indice_row">
  fechas:
  </td>
</tr>
  <tr>
    <td>
      <Button on:click={ver_dialogo}>
        <i class="material-icons">settings</i>
        <i class="material-icons">today</i>

      </Button>
    </td>
    <td class="no_select">{unidad_de_tiempo}</td>
    <td class="no_select">{tipo_predefinido}</td>
    <td  class="no_select">
      {@html resumen_fechas}
    </td>
  </tr>
</table>

{#if visible}
  <!-- content here -->

  <div
    class="contenedor"
    on:mouseout={ocultar}
    on:mouseover={() => {
      mouse_adentro = true;
    }}>

    <div class=" centrado ">
      Consulta
      <span class="resumen no_select" >
        {@html resumen_fechas}
      </span>
    </div>
    <div  class="centrado titulo">Por Mes</div>
    <table style="margin:0 auto;">
      <tr>

        {#if tipo_predefinido === 'Desde hasta' && unidad_de_tiempo === 'Mes'}
          <!-- content here -->
          <td>
            desde :
            <select
              name="mes"
              on:click={evt => {
               //console.log(evt.toElement.value);
                mes_desde_input = evt.toElement.value;
              }}>
              {#each meses as mes, i}
                <!-- content here -->
                <option value={i}>{mes}</option>
              {/each}
              <option value={mes_desde_input} selected>
                {usar_mes_textual(mes_desde_input)}
              </option>
            </select>
            <input class="input_year" type="number" bind:value={year_desde_input} />
          </td>
          <td>
            hasta :
            <select
              name="mes"
              on:click={evt => {
               //console.log(evt.toElement.value);
                mes_hasta_input = evt.toElement.value;
              }}>
              <option value={mes_hasta_input} selected>
                {usar_mes_textual(mes_hasta_input)}
              </option>
              {#each meses as mes, i}
                <!-- content here -->
                {#if i != mes_hasta_input}
                  <!-- content here -->
                  <option value={i}>{mes}</option>
                {/if}
              {/each}

            </select>
            <input class="input_year" type="number" bind:value={year_hasta_input} />
          </td>
          <td>
            <Button
              raised
              color="red"
              on:click={() => {
                tipo_predefinido = 'Actual';
              }}
              title="Usar predefinidos"
              icon>
              <i class="material-icons">cancel</i>
            </Button>
          </td>
          <td>
            <Button
              on:click={() => {
                periodicidad.desde = fecha_desde_mes_y_year(mes_desde_input, year_desde_input);
                periodicidad.hasta = fecha_desde_mes_y_year(mes_hasta_input, year_hasta_input);
                calcular_fechas();
              }}
              raised
              color="green"
              title="Ejecutar"
              icon>
              <i class="material-icons">check</i>
            </Button>
          </td>
        {:else}
          {#each tipos_por_mes as item}
            <!-- content here -->
            <td>
              <Button
                color={unidad_de_tiempo === 'Mes' && tipo_predefinido === item ? 'primary' : 'white'}
                raised={unidad_de_tiempo === 'Mes' && tipo_predefinido === item ? 'true' : 'false'}
                baseline={unidad_de_tiempo === 'Mes' && tipo_predefinido === item ? 'false' : 'true'}
                on:click={() => {
                  unidad_de_tiempo = 'Mes';
                  tipo_predefinido = item;
                  if (tipo_predefinido !== 'Desde hasta') calcular_fechas();
                }}>
                {item}
              </Button>
            </td>
          {/each}
        {/if}
      </tr>
    </table>
    <hr />
    <div style="padding-top:10px;" class="centrado titulo">Por Año</div>
    <table style="margin:0 auto;padding-top:10px;">
      <tr>
        {#if tipo_predefinido === 'Desde hasta' && unidad_de_tiempo === 'Año'}
          <td>desde:</td>
          <td>
            <input class="input_year" type="number" bind:value={year_desde_input} />
          </td>
          <td>hasta:</td>
          <td>
            <input class="input_year" type="number" bind:value={year_hasta_input} />
          </td>

          <td>
            <Button
              raised
              color="red"
              on:click={() => {
                tipo_predefinido = 'Actual';
              }}
              title="Usar predefinidos"
              icon>
              <i class="material-icons">cancel</i>
            </Button>
          </td>
          <td>
            <Button
              on:click={() => {
                periodicidad.desde = fecha_desde_mes_y_year(0, year_desde_input);
                periodicidad.hasta = fecha_desde_mes_y_year(0, year_hasta_input);
                calcular_fechas();
              }}
              raised
              color="green"
              title="Ejecutar"
              icon>
              <i class="material-icons">check</i>
            </Button>
          </td>
        {:else}
          {#each tipos_por_mes as item}
            <!-- content here -->
            <td>
              <Button
                color={unidad_de_tiempo === 'Año' && tipo_predefinido === item ? 'primary' : 'white'}
                raised={unidad_de_tiempo === 'Año' && tipo_predefinido === item ? 'true' : 'false'}
                baseline={unidad_de_tiempo === 'Año' && tipo_predefinido === item ? 'false' : 'true'}
                on:click={() => {
                  unidad_de_tiempo = 'Año';
                  tipo_predefinido = item;
                  if (tipo_predefinido !== 'Desde hasta') calcular_fechas();
                }}>
                {item}
              </Button>
            </td>
          {/each}
        {/if}

      </tr>
    </table>

  </div>
{/if}
