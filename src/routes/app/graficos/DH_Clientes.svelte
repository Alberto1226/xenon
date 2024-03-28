<script>
    import { Datefield, Button, Dialog, Icon } from "svelte-mui/src";
    import { meses } from "./../../stores";
    export let desde;
    export let hasta;
  
    let mostrar = "fechas";
  
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    const cambio_fecha = () => {
      dispatch("cambio_fecha");
    };
  
    let format = "D.MM.YYYY";
    let desde_texto = '';
    let hasta_texto = '';
  
    const acualizar_textos =()=>{
  desde_texto = desde.getDate()+'-' + meses[desde.getMonth()] + ' ' + desde.getFullYear();
  hasta_texto = hasta.getDate()+'-' + meses[hasta.getMonth()] + ' ' + hasta.getFullYear();
    }
    function click_semana() {
      //console.log('asdss');
  
      mostrar = "semana";
      acualizar_textos()
    }
    function click_mes() {
      mostrar = "mes";
      acualizar_textos()
    }
    function click_year() {
      mostrar = "año";
      acualizar_textos()
    }
    function salio_mouse() {
      mostrar = "fechas";
      acualizar_textos()
    }
  
    function este_mes(params) {
      desde = new Date();
      hasta = new Date();
      desde.setDate(1);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function esta_semana(params) {
      desde = new Date();
      hasta = new Date();
      desde = getMonday(desde);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function este_year(params) {
      desde = new Date();
      hasta = new Date();
      desde.setDate(1);
      desde.setMonth(0);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function anterior_mes(params) {
      desde.setDate(1);
      hasta.setDate(1);
      desde.setMonth(desde.getMonth() - 1);
      hasta.setMonth(desde.getMonth() + 1);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function siguiente_mes(params) {
      desde.setDate(1);
      hasta.setDate(1);
      desde.setMonth(desde.getMonth() + 1);
      hasta.setMonth(desde.getMonth() + 1);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function anterior_semana(params) {
      desde.setDate(desde.getDate()-1);
      desde = getMonday(desde);
      hasta.setDate(desde.getDate() + 7);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function siguiente_semana(params) {
      desde.setDate(desde.getDate()+7);
      desde = getMonday(desde);
      hasta.setDate(desde.getDate() + 7);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function anterior_year(params) {
      desde.setDate(1);
      hasta.setDate(1);
      desde.setMonth(0);
      hasta.setMonth(0);
      desde.setFullYear(desde.getFullYear() - 1);
      hasta.setFullYear(desde.getFullYear() + 1);
      acualizar_textos()
      dispatch("cambio_fecha");
    }
  
    function siguiente_year(params) {
      desde.setDate(1);
      hasta.setDate(1);
      desde.setMonth(0);
      hasta.setMonth(0);
      desde.setFullYear(desde.getFullYear() + 1);
      hasta.setFullYear(desde.getFullYear() + 1);
      acualizar_textos()
  
      dispatch("cambio_fecha");
    }
  
    function getMonday(d) {
      d = new Date(d);
      var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
      return new Date(d.setDate(diff));
    }
  </script>
  
  {#if desde && hasta}
    <!-- OPCIONES RAPIDAS-->
  
    <table>
      <tr>
        <td>
  
          <Button on:click={salio_mouse} dense>fechas 
          {#if mostrar === 'fechas'} <i class="material-icons">check</i> {/if}
          </Button>
          <br />
          <Button on:click={click_semana} dense>semana 
          {#if mostrar === 'semana'} <i class="material-icons">check</i> {/if}</Button>
          <br />
        </td>
        <td>
  
          <Button on:click={click_mes} dense>mes 
          {#if mostrar === 'mes'} <i class="material-icons">check</i> {/if}</Button>
          <br />
          <Button on:click={click_year} dense>año 
          {#if mostrar === 'año'} <i class="material-icons">check</i> {/if}</Button>
        </td>
        <td>
          {#if mostrar === 'semana'}
            <!-- SEMANA -->
            <table>
              <tr>
                <td>
                  <Button on:click={esta_semana} title="esta semana" dense icon>
                    <i class="material-icons">insert_invitation</i>
                  </Button>
                </td>
                <td>
                  <Button
                    on:click={anterior_semana}
                    title="semana anterior"
                    dense
                    icon>
                    <i class="material-icons">arrow_left</i>
                  </Button>
                </td>
                <td>
                  <Button
                    on:click={siguiente_semana}
                    title="semana siguiente"
                    dense
                    icon>
                    <i class="material-icons">arrow_right</i>
                  </Button>
                </td>
  
                <td>{desde_texto}</td>
  
                <td>{hasta_texto}</td>
  
              </tr>
            </table>
          {:else if mostrar === 'mes'}
            <!-- MES -->
            <table>
              <tr>
                <td>
                  <Button on:click={este_mes} title="este mes" dense icon>
                    <i class="material-icons">insert_invitation</i>
                  </Button>
                </td>
                <td>
                  <Button on:click={anterior_mes} title="mes anterior" dense icon>
                    <i class="material-icons">arrow_left</i>
                  </Button>
                </td>
                <td>
                  <Button
                    on:click={siguiente_mes}
                    title="mes siguiente"
                    dense
                    icon>
                    <i class="material-icons">arrow_right</i>
                  </Button>
                </td>
                <td>{desde_texto}</td>
  
                <td>{hasta_texto}</td>
  
              </tr>
            </table>
          {:else if mostrar === 'año'}
            <!-- AÑO -->
            <table>
              <tr>
                <td>
                  <Button on:click={este_year} title="este año" dense icon>
                    <i class="material-icons">insert_invitation</i>
                  </Button>
                </td>
                <td>
                  <Button
                    on:click={anterior_year}
                    title="año anterior"
                    dense
                    icon>
                    <i class="material-icons">arrow_left</i>
                  </Button>
                </td>
                <td>
                  <Button
                    on:click={siguiente_year}
                    title="año siguiente"
                    dense
                    icon>
                    <i class="material-icons">arrow_right</i>
                  </Button>
                </td>
  
                <td>{desde_texto}</td>
  
                <td>{hasta_texto}</td>
  
              </tr>
            </table>
          {:else if mostrar === 'fechas'}
            <td>
              <Datefield
                icon
                bind:value={desde}
                label="Desdeee"
                on:click={cambio_fecha}
                {format}
                message={format} />
            </td>
            <td>
              <Datefield
                icon
                bind:value={hasta}
                label="Hastsa"
                {format}
                on:click={cambio_fecha}
                message={format} />
            </td>
          {/if}
  
        </td>
      </tr>
    </table>
  {:else}
    <!-- else content here -->
    ---
  {/if}
  