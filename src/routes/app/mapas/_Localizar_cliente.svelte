<script>
  import Cliente from "./_componentes/Cliente.svelte";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import Ubicacion_cliente from "./_componentes/Ubicacion_cliente.svelte";
  import { mensajes_app, postData, formato_precio } from "./../../stores";
  export var geocoder;
  export let map;
  export let zoom;
  export let center;
  export let marcadores_clientes;

  let estado;
  let cliente = { nombre: "" };
  let municipio;
  let actualizar_municipio = false;
  let accion_actual = "localizar_cliente";
  let direccion = "";
  let direccion_en_uso_index = 0;
  let location = { lat: 0, lng: 0 };
  let contenido_info_window = "cargando...";
  let mostrar_guardar_btn = false;
  let localizando = false;
  let obteniendo_total_ventas = false;
  let resultado_ventas = {
    resultado_listo: false,
    count: 0,
    total_ventas: 0,
    lista_pedidos:[]
  };

  function cliente_selecto() {
    resultado_ventas.resultado_listo = false;
    total_ventas();
    deleteMarkers();
    if (
      cliente.direcciones_asociadas.length == 0 ||
      cliente.direcciones_asociadas[0].estado === ""
    )
      return;
    direccion = arreglar_direccion(cliente.direcciones_asociadas[0]);
    if (cliente.location.lat != 0) {
      contenido_info_window = describir_cliente();
      centrar_locacion(cliente.location);
      borrar_anteriores_y_agregar_nuevo_pin();
    }
  }

  function anterior() {
    if (direccion_en_uso_index == 0) return;
    direccion_en_uso_index--;
    direccion = arreglar_direccion(
      cliente.direcciones_asociadas[direccion_en_uso_index]
    );
  }
  function siguiente() {
    if (direccion_en_uso_index + 1 == cliente.direcciones_asociadas.length)
      return;
    direccion_en_uso_index++;
    direccion = arreglar_direccion(
      cliente.direcciones_asociadas[direccion_en_uso_index]
    );
  }

  function describir_cliente() {
    let contenido = "";
    contenido = `
    <div class="centrado titulo_formulario">${cliente.nombre}</div>
    <div class="">${cliente.correo} <i class="material-icons">email</i> </div>
    <div class="">${cliente.telefono} <i class="material-icons">phone</i></div>
    <div class="">creado el ${cliente.fecha_creacion}</div>
    `;
    return contenido;
  }
  /*
  $:if(cliente.nombre!=''){
      if(cliente.location.lat !=0 && cliente.location.lng !=0){
          cliente_ya_cuenta_con_locacion = true;
      }
      
  }
*/

  function borrar_anteriores_y_agregar_nuevo_pin() {
    deleteMarkers();
    agregar_pin();
  }

  function agregar_pin() {
    var infowindow = new google.maps.InfoWindow({
      content: contenido_info_window
    });

    var marker = new google.maps.Marker({
      position: cliente.location,
      map: map,
      title: cliente.nombre,
      draggable: true,
      icon:'imagenes/pin_cliente.png',
      animation: google.maps.Animation.DROP
    });
    marcadores_clientes.push(marker);
    marker.addListener("click", function() {
      infowindow.open(map, marker);
    });
  //  marker.addListener('drag', handle_inicia_drag);
    marker.addListener('dragend', handle_termina_drag);
  }

 
  function handle_termina_drag(evt) {
 
    location.lat = evt.latLng.lat();
    location.lng =evt.latLng.lng();
    mostrar_guardar_btn =true;
  }

  function solicitar_actualizacion_de_municipios() {
    actualizar_municipio = true;
  }

  function centrar_locacion(location_tmp) {
    center = { lat: Number(location_tmp.lat), lng: Number(location_tmp.lng) };
   //console.log(center);

    map.setCenter(center);
    zoom = 11;
    map.setZoom(zoom);
  }

  function arreglar_direccion(direccion_param) {
    direccion = direccion_param.calle;
    direccion += ", #" + direccion_param.numero_exterior;
    direccion +=
      direccion_param.numero_interior == ""
        ? ""
        : ", Interior: " + direccion_param.numero_interior;
    direccion += ", Colonia :" + direccion_param.colonia;
    direccion += ", CP: " + direccion_param.cp;
    direccion += ", Localidad: " + direccion_param.localidad;
    direccion += ", Municipio: " + direccion_param.municipio;
    direccion += ", Estado: " + direccion_param.estado;
    direccion += ", País: " + direccion_param.pais;
    return direccion;
  }

  async function solicitar_ubicaciones() {
    localizando = true;
    geocoder.geocode(
      {
        address: direccion
      },
      resultados => {
        setTimeout(()=>{
          localizando = false;
        },5000);
        //console.log(resultados);

        if (resultados.length > 0) {
          location = {
            lat: resultados[0].geometry.location.lat(),
            lng: resultados[0].geometry.location.lng()
          };
          mostrar_guardar_btn = true;
          borrar_anteriores_y_agregar_nuevo_pin();
          centrar_locacion(location);
        }
      }
    );
  }

  function total_ventas() {
    obteniendo_total_ventas = true;
    let cliente_tmp = {
      _id: cliente._id,
      location: location
    };
    resultado_ventas.lista_pedidos = [];
    postData("app/pedidos/consultas/total_ventas", { id: cliente._id })
      .then(respuesta => {
       //console.log(respuesta);
        obteniendo_total_ventas = false;

        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          if (respuesta.ok) {
            if(respuesta.respuesta.length===0) return;
            resultado_ventas.count = respuesta.respuesta[0].count;
            resultado_ventas.total_ventas = respuesta.respuesta[0].total_ventas;
            resultado_ventas.lista_pedidos = respuesta.respuesta[0].lista_pedidos;
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

  // Sets the map on all markers in the array.
  function setMapOnAll(map) {
    for (var i = 0; i < marcadores_clientes.length; i++) {
      marcadores_clientes[i].setMap(map);
    }
  }

  // Removes the markers from the map, but keeps them in the array.
  function clearMarkers() {
    setMapOnAll(null);
  }

  // Shows any markers currently in the array.
  function showMarkers() {
    setMapOnAll(map);
  }

  // Deletes all markers in the array by removing references to them.
  function deleteMarkers() {
    clearMarkers();
    marcadores_clientes = [];
  }
</script>

<style>
  .location {
    color: rgb(83, 2, 177);
        font-weight: 500;
    font-size: .8em;
  }
  .location_container{
    padding-top: 5px;
  }

  .contenedor_lista{
    background-color: black;
    color: white;
    height: 100px;
    overflow-y: auto;
  }
  .tabla_ventas{
    border: 1px solid darkgrey;
    border-radius: 5px;
    padding: 1px;
  }

  .input{
        width: 50vw;
  }
</style>

<Cliente bind:cliente on:cliente_selecto={cliente_selecto} />
{#if cliente.nombre != ''}
<div class="location_container">
 <i class="material-icons vertical-alineado">map</i>
  lat:
  <span class="location">
    {cliente.nombre != '' ? cliente.location.lat : ''}
  </span>
  lng:
  <span class="location">
    {cliente.nombre != '' ? cliente.location.lng : ''}
  </span>
 
</div>
 
  <table>
    <tr>
      <td>

        <!-- content here -->
        <table>
          <tr>
          <td>
           Direcciones :
          </td>
            <td>
              <Button
                on:click={anterior}
                disabled={cliente.direcciones_asociadas.length == 0 || direccion_en_uso_index == 0}
                icon>
                <i class="material-icons">chevron_left</i>
              </Button>
            </td>
            <td>
              {direccion_en_uso_index + 1} /{cliente.direcciones_asociadas.length}
            </td>
            <td>
              <Button
                on:click={siguiente}
                disabled={cliente.direcciones_asociadas.length == 0}
                icon>
                <i class="material-icons">chevron_right</i>
              </Button>
            </td>
          </tr>
        </table>

      </td>
      <td>
        <div>
        <input class="input" type="text" bind:value={direccion}>
        </div>
      </td>

      <td>
        <Button
          color={localizando?'gray':"rgb(83, 2, 177)"}
          title="Obtener localización usando esta dirección, con google"
          disabled={localizando}
          on:click={solicitar_ubicaciones}
          icon>
          <i class="material-icons">add_location</i>
        </Button>
      </td>
      <td>
        <Ubicacion_cliente
          bind:map
          bind:zoom
          bind:center
          bind:geocoder
          bind:location
          bind:cliente
          bind:marcadores_clientes
          bind:mostrar_guardar_btn />
      </td>
    </tr>
  </table>

  {#if resultado_ventas.resultado_listo}
    <table class="tabla_ventas">
      <tr>
        <td>No. de pedidos</td>
        <td>
          <b>{resultado_ventas.count}</b>
        </td>
      </tr>
      <tr>
        <td>Total</td>
        <td>
          <b>$ {formato_precio(resultado_ventas.total_ventas)}</b>
        </td>
      </tr>
      <tr>
      <td>
        <div class="contenedor_lista">
        {#each resultado_ventas.lista_pedidos as pedido,i}
         <!-- content here -->
         <div class="row">
         <table>
           <tr>
             <td>{i+1}</td>
             <td class="indice_row">{pedido.fecha}</td>
             <td>$ {formato_precio(pedido.total_pedido)}</td>
           </tr>
         </table>
         </div>
      {/each}
        </div>
      </td>
      </tr>

    </table>
  {/if}
{/if}
