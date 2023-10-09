<script>
  import { Button } from "svelte-mui";
  import Periodicidad from "./_componentes/Periodicidad_para_consulta.svelte";
  import Resumen from "./_componentes/Resumen_totales_por_estado.svelte";
  import Ubicaciones_estados from "./_componentes/Ubicaciones_estados.svelte";
  import estados_archivo from "./_jsons/estados";
  import { mensajes_app, postData, formato_precio } from "./../../stores";
  export var geocoder;
  export let map;
  export let zoom;
  export let center;
  export let marcadores_clientes;

  let haciendo_consulta_larga = false;
  let estado_en_consulta = "";
  let la_consulta_concluyo = false;
  let actualizar_ubicaciones_en_mapa = false;
  let estado_selecto = '';
  let periodicidad = {
    desde: null,
    hasta: null,
    unidad: "mes",
    listo: false
  };
  let lista_totales_por_estado = [];
  var estados = [
    "Aguascalientes",
    "Baja California Sur",
    "Baja California",
    "Campeche",
    "Chiapas",
    "Chihuahua",
    "Coahuila",
    "Colima",
    "Ciudad de México",
    "Durango",
    "Guanajuato",
    "Guerrero",
    "Hidalgo",
    "Jalisco",
    "Estado de México",
    "Michoacán",
    "Morelos",
    "Nayarit",
    "Nuevo León",
    "Oaxaca",
    "Puebla",
    "Querétaro",
    "Quintana Roo",
    "San Luis Potosí",
    "Sinaloa",
    "Sonora",
    "Tabasco",
    "Tamaulipas",
    "Tlaxcala",
    "Veracruz",
    "Yucatán",
    "Zacatecas"
  ];
  //   busca en un array de estados con lat y lng

  async function ciclo() {
    la_consulta_concluyo = false;
    let republica = [];
    haciendo_consulta_larga = true;
    for (let i = 0; i < estados.length; i++) {
      let element = estados[i];
      element = element === "Coahuila" ? "Coahuila de Zaragoza" : element;
      element = element === "Estado de México" ? "México" : element;
      element = element === "Michoacán" ? "Michoacán de Ocampo" : element;
      element =
        element === "Veracruz" ? "Veracruz de Ignacio de la Llave" : element;
      // console.log(element);
      estado_en_consulta = element;
      const total_ventas = await total_ventas_estado(element);

      if (total_ventas != null) republica.push(total_ventas);
      lista_totales_por_estado = republica;
      if (i + 1 === estados.length) {
        // console.log(republica);
        haciendo_consulta_larga = false;
        lista_totales_por_estado = republica;
        sortear_de_mas_a_menos_ventas();
        la_consulta_concluyo = true;
        actualizar_ubicaciones_en_mapa = true;
      }
    }
  }

  function sortear_de_mas_a_menos_ventas() {
    lista_totales_por_estado.sort(function(a, b) {
      if (a.total_ventas > b.total_ventas) {
        return -1;
      }
      if (a.total_ventas < b.total_ventas) {
        return 1;
      }
      // a debe ser igual b
      return 0;
      return a.total_ventas - b.total_ventas;
    });
  }

  function total_ventas_estado(estado_actual) {
    return new Promise((resolve, reject) => {
     // console.log(estado_actual);

      //obteniendo_total_ventas = true;
      // clientes_en_estado.lista_de_clientes_en_estado = [];
      postData("app/pedidos/consultas/total_ventas_estados_desde_fecha", {
        estado: estado_actual,
        periodicidad
      })
        .then(respuesta => {
          // console.log(respuesta);
          //obteniendo_total_ventas = false;

          //  Checar si se logro guardar el cliente
          if (respuesta.ok) {
            if (respuesta.ok) {
              if (respuesta.clientes_en_estado.length === 0) {
               //console.log("sin resultado");

                return resolve();
              }

              let resultado = {
                estado: respuesta.clientes_en_estado[0]._id,
                count_clientes: respuesta.clientes_en_estado[0].count,
                total_ventas:
                  respuesta.pedidos_en_estado.length > 0
                    ? respuesta.pedidos_en_estado[0].total_ventas
                    : 0
              };

              setTimeout(() => {
                resolve(resultado);
              }, 100);
            }
          } else {
            $mensajes_app.push({
              tipo: "error",
              mensaje: "No se pudo obtener sus pedidos."
            });
            $mensajes_app = $mensajes_app;
          }

          ////console.log(respuesta);
        })
        .catch(err => {
          //obteniendo_total_ventas = false;
          console.log(err);
          $mensajes_app.push({
            tipo: "error",
            mensaje: "No se pudo obtener sus pedidos"
          });
          $mensajes_app = $mensajes_app;
          reject(err);
        });
    });
  }

  function fechas_cambiaron() {
    //console.log("asdasd");
    //total_ventas_estado();
  }
</script>

<style>
  .contenedor_lista {
    height: 177px;
    overflow-y: auto;
    background-color: #222d32;
    color: white;
    border-radius: 5px;
    width: 500px;
    padding: 14px;
  }
  .row {
    cursor: pointer;
    height: 33px;
    border-radius: 5px;
    padding-top: 7px;
    padding-left: 4px;
    border-bottom: 1px solid #313131;
  }
  .row:hover {
    background-color: rgb(44, 14, 71);
  }
  .grid-container {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres";
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
</style>

<table>
  <tr>

    <td>
      <Periodicidad bind:periodicidad on:fechas_cambiaron={fechas_cambiaron} />

    </td>
    <td>
      <Button
        color="primary"
        raised={!haciendo_consulta_larga}
        disabled={haciendo_consulta_larga}
        on:click={ciclo}>
        hacer consulta larga
        <i class="material-icons vertical-alineado">double_arrow</i>
      </Button>

    </td>

  </tr>
  <tr>
    {#if haciendo_consulta_larga}
      <!-- MIENTRAS SE HACE LA CONSULTA -->
      <td>Consultando :{estado_en_consulta}</td>
    {/if}
    <td>
      {#if la_consulta_concluyo}
        <!-- LISTA DE ESTADOS CONSULTADOS-->
        <div class="contenedor_lista">
          {#each lista_totales_por_estado as item, i}
          
            <div class="row" on:click={()=>{estado_selecto = item.estado;  actualizar_ubicaciones_en_mapa=true; }}>
              <div class="grid-container">
                <div class="uno">
                  <span class="indice_row">{i + 1})</span>

                  {#if estado_selecto===item.estado}
                       <!-- content here -->
                       <i class="material-icons vertical-alineada" style="color:yellow;">keyboard_arrow_right</i>
                  {/if}
                  {item.estado}
                </div>
                <div title="No. de clientes" class="dos indice_row">
                  {item.count_clientes}
                </div>
                <div class="tres">$ {formato_precio(item.total_ventas)}</div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </td>
    <td>
      {#if lista_totales_por_estado.length > 0}
        <!-- RESUMEN TOTAL -->
        <Resumen
          bind:totales_por_estado={lista_totales_por_estado}
          ubicacion="Todo México" />
      {/if}
    </td>
  </tr>
</table>
{#if estados_archivo.length > 0}
  <!-- content here -->

  <Ubicaciones_estados
    lista_estados={estados_archivo}
    bind:estado_selecto
    bind:actualizar_ubicaciones_en_mapa
    bind:marcadores_clientes
    bind:map
    bind:zoom />
{/if}
