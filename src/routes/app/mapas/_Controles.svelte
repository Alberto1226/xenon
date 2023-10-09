<script>
  import Estado from "./_componentes/Estado.svelte";
  import Municipio from "./_componentes/Municipio.svelte";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import estados from "./_jsons/estados";
  import Localizar_cliente from "./_Localizar_cliente.svelte";
  import Todos_los_estados from "./_Todos_estados.svelte";
  import Por_estado from "./_Por_Estado.svelte";
  import Por_estado_productos from "./_Por_Estado_Productos.svelte";

  import { mensajes_app, postData, formato_precio } from "./../../stores";
  export var geocoder;
  export let map;
  export let zoom;
  export let center;
  export let marcadores_clientes;

  let estado;
  let municipio;
  let actualizar_municipio = false;
  let accion_actual = "Analizar Productos por Estado";
  let obteniendo_total_ventas = false;
  let resultado_ventas = {
    resultado_listo: false,
    count: 0,
    total_ventas: 0,
    lista_pedidos: []
  };

  $: if (estado != "" && estado != undefined) {
    centrar_estado();
  }

  function ver_cliente_en_mapa() {
    accion_actual = "localizar_cliente";
  }

  function solicitar_actualizacion_de_municipios() {
    total_ventas_estado();
    actualizar_municipio = true;
  }

  function inclinar() {
    map.setTilt(45);
  }

  function encontrar_registro_estado(nombre) {
    let resultado = estados.find(element =>
      element.nombre.toLowerCase().includes(nombre.toLowerCase())
    );
    return resultado;
  }

  function centrar_estado() {
    let estado_obj = encontrar_registro_estado(estado);

    //console.log(estado_obj);
    if (estado_obj === null || estado_obj === undefined)
      return//console.log("No se encontro");
    // console.log();

    center = { lat: Number(estado_obj.lat), lng: Number(estado_obj.lng) };
    map.setCenter(center);
    zoom = 8;
    map.setZoom(zoom);
  }
  function accion_cambio(accion) {
    accion_actual = accion;
  }

  function total_ventas_estado() {
    obteniendo_total_ventas = true;

    resultado_ventas.lista_pedidos = [];
    postData("app/pedidos/consultas/total_ventas_estado_desde_fecha", {
      estado
    })
      .then(respuesta => {
        //console.log(respuesta);
        obteniendo_total_ventas = false;
        return;

        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          if (respuesta.ok) {
            if (respuesta.respuesta.length === 0) return;
            resultado_ventas.count = respuesta.respuesta[0].count;
            resultado_ventas.total_ventas = respuesta.respuesta[0].total_ventas;
            resultado_ventas.lista_pedidos =
              respuesta.respuesta[0].lista_pedidos;
            resultado_ventas.resultado_listo = true;
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

<style>
  .selector_padre {
    position: absolute;
    bottom: 30px;
    left: 10px;
    z-index: 3;
  }
  .selector {
    cursor: pointer;
    background: #f7f0f0;
    border-radius: 8px;
    color: #222d32;
    font-size: 1.2em;
  }
</style>

<div class="selector_padre">
  <table>
    <tr>
      <td>
        <span style="color:white;font-weight:500;font-size:.8em;">
          Usos de Mapa
        </span>
      </td>
    </tr>
    <tr>
      <td>

        <select
          class="selector"
          name="accion"
          id="accion_select"
          bind:value={accion_actual}
          on:click={evt => {
            console.log(evt);
            
            //accion_cambio(evt.toElement.value);
          }}>
          <option value="localizar_cliente">{accion_actual=='localizar_cliente'?'-':''}  Localizar cliente</option>
          <option value="Analizar Ventas por Estado" >
           {accion_actual=='Analizar Ventas por Estado'?'-':''} Analizar ventas por estado
          </option>
          <option value="Todos los estados">
          {accion_actual=='Todos los estados'?'-':''}
          Todos los estados</option>
          <option value="Analizar Productos por Estado" selected>
           {accion_actual=='Analizar Productos por Estado'?'-':''} Analizar productos por estado 
          </option>
        </select>
      </td>
    </tr>
  </table>

</div>

<div style="padding-left:20px;">

  {#if accion_actual === 'localizar_cliente'}
    <!-- LOCALIZAR POR ESTADOS -->
    <Localizar_cliente  bind:geocoder bind:map bind:marcadores_clientes />
  {:else if accion_actual === 'Analizar Ventas por Estado'}
    <!-- VENTAS POR ESTADO -->
    <Por_estado
      on:ver_cliente_en_mapa={ver_cliente_en_mapa}
      bind:geocoder
      bind:map
      bind:marcadores_clientes
      bind:center />
  {:else if accion_actual === 'Todos los estados'}
    <!-- else content here -->
    <Todos_los_estados bind:center bind:geocoder bind:map bind:marcadores_clientes />
 {:else if accion_actual === 'Analizar Productos por Estado'}
    <!-- else content here -->
    <Por_estado_productos bind:center bind:geocoder bind:map bind:marcadores_clientes />
  {/if}

</div>
