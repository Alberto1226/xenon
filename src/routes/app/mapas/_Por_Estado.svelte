<script>
  import Estado from "./_componentes/Estado.svelte";
  import Municipio from "./_componentes/Municipio.svelte";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import estados from "./_jsons/estados";
  import Localizar_cliente from "./_Localizar_cliente.svelte";
  import Lista_de_clientes from "./_componentes/Lista_de_clientes.svelte";
  import Lista_de_clientes_totales from "./_componentes/Lista_de_clientes_totales.svelte";
  import Periodicidad from "./_componentes/Periodicidad_para_consulta.svelte";
  import Resumen from "./_componentes/Resumen_totales_por_cliente.svelte";
  import Ubicaciones_clientes from "./_componentes/Ubicaciones_clientes.svelte";
  import { mensajes_app, postData, formato_precio ,actualizar_pines_clientes_en_mapa} from "./../../stores";
  export var geocoder;
  export let map;
  export let zoom;
  export let center;
  export let marcadores_clientes;
  

  let estado;
  let municipio;
  let actualizar_municipio = false;
  let accion_actual = "localizar_cliente";
  let obteniendo_total_ventas = false;
  let clientes_en_estado = {
    resultado_listo: false,
    count: 0,
    total_ventas: 0,
    lista_de_clientes_en_estado: [],
    lista_de_clientes_en_estado_totales: []
  };
  let pedidos_en_estado = [];
  let periodicidad = {
    desde: null,
    hasta: null,
    unidad: "mes",
    listo: false
  };
  let actualizar_ubicaciones_en_mapa = false;

  $: if (estado != "" && estado != undefined) {
    centrar_estado();
  }

  function fechas_cambiaron() {
    //console.log("asdasd");

    total_ventas_estado();
  }

  function solicitar_actualizacion_de_municipios() {
    total_ventas_estado();
    actualizar_municipio = true;
    
  }

  //   busca en un array de estados con lat y lng
  function encontrar_registro_estado(nombre) {
    let resultado = estados.find(element =>
      element.nombre.toLowerCase().includes(nombre.toLowerCase())
    );
    return resultado;
  }

  //  accion principal para localizar un estado en el mapa
  function centrar_estado() {
    let estado_tmp = corregir_nombre_de_estado(estado);
    let estado_obj = encontrar_registro_estado(estado_tmp);

    //console.log(estado_obj);
    if (estado_obj === null || estado_obj === undefined) return; //console.log("No se encontro");
    // console.log();

    center = { lat: Number(estado_obj.lat), lng: Number(estado_obj.lng) };
    map.setCenter(center);
    zoom = 8;
    map.setZoom(zoom);
  }

  function accion_cambio(accion) {
    accion_actual = accion;
  }

  function corregir_nombre_de_estado(nombre) {
    let estado_tmp = JSON.parse(JSON.stringify(nombre));
    estado_tmp =
      estado_tmp === "Coahuila" ? "Coahuila de Zaragoza" : estado_tmp;
    estado_tmp = estado_tmp === "Estado de México" ? "México" : estado_tmp;
    estado_tmp =
      estado_tmp === "Michoacán" ? "Michoacán de Ocampo" : estado_tmp;
    estado_tmp =
      estado_tmp === "Veracruz"
        ? "Veracruz de Ignacio de la Llave"
        : estado_tmp;
    return estado_tmp;
  }

  function total_ventas_estado() {
    if (periodicidad.listo === false || estado === undefined) return;
    //console.log(periodicidad);
    let estado_tmp = corregir_nombre_de_estado(estado);
    obteniendo_total_ventas = true;
    clientes_en_estado.lista_de_clientes_en_estado = [];
    postData("app/pedidos/consultas/total_ventas_estado_desde_fecha", {
      estado: estado_tmp,
      periodicidad
    })
      .then(respuesta => {
        //console.log(respuesta);
        obteniendo_total_ventas = false;

        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          if (respuesta.ok) {
            if (respuesta.clientes_en_estado.length === 0) return;
            clientes_en_estado.count = respuesta.clientes_en_estado[0].count;
            clientes_en_estado.total_ventas =
              respuesta.clientes_en_estado[0].total_ventas;
            clientes_en_estado.lista_de_clientes_en_estado =
              respuesta.clientes_en_estado[0].lista_clientes;
            clientes_en_estado.lista_de_clientes_en_estado.sort((a, b) =>
              a.nombre > b.nombre ? 1 : -1
            );

            pedidos_en_estado = respuesta.pedidos_en_estado;
            // pedidos_en_estado = pedidos_en_estado;
            clientes_en_estado.resultado_listo = true;
            //  Actualizar los pines
            actualizar_ubicaciones_en_mapa = true;
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
        obteniendo_total_ventas = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo obtener sus pedidos"
        });
        $mensajes_app = $mensajes_app;
      });
  }
</script>

<!-- else if content here -->

<div class="">
  <table>
    <tr>
      <td>
        <Estado
          on:estado_cambio={solicitar_actualizacion_de_municipios}
          bind:estado />

      </td>
      <td>
        <Periodicidad
          bind:periodicidad
          on:fechas_cambiaron={fechas_cambiaron} />
      </td>
      <td hidden>

        <Municipio
          bind:estado
          bind:municipio
          bind:actualizar={actualizar_municipio} />
      </td>
    </tr>

  </table>
</div>
{#if obteniendo_total_ventas}
  <!-- content here -->
  <div class="centrado">cargando...</div>
{/if}
{#if estado == undefined}
  <table>
    <tr>
      <td>
        <img src="imagenes/promo_maps.png" alt="" />
      </td>
      <td>
        <div class="centrado no_select" style="padding-top: 10px;">
          Analiza las ventas por estado
          <br />

          Existen dos variables : <b> Estado</b> y <b>Fecha</b> , para comenzar únicamente selecciona un <b>estado</b>

          <div class="indice_row centrado no_select">
            El primer listado muestra los clientes en el estado
            <br />
            En el segundo muestra las ventas totales y la cantidad de pedidos
            realizados en el periodo de tiempo seleccionado.
          </div>
        </div>
      </td>
    </tr>
  </table>
{:else if estado != undefined}
  <div>
    <table>
      <tr>
        <td>
          <Lista_de_clientes
            bind:ubicacion={estado}
            
            bind:lista={clientes_en_estado.lista_de_clientes_en_estado}
            on:ver_cliente_en_mapa />
        </td>
        <td>
          <Lista_de_clientes_totales
            bind:ubicacion={estado}
            bind:lista={pedidos_en_estado} />
        </td>
        <td>
          <Resumen bind:pedidos_en_estado bind:ubicacion={estado} />
        </td>
      </tr>
    </table>
  </div>
{/if}

<!--El siguiente no se muestra en ui solo en mapa pone los pines de cada cliente-->
<Ubicaciones_clientes
  bind:actualizar_ubicaciones_en_mapa
  bind:map
  bind:zoom
  bind:center
  bind:marcadores_clientes
  bind:lista_clientes={clientes_en_estado.lista_de_clientes_en_estado} />
