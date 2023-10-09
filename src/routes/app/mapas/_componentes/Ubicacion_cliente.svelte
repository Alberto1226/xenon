<script>
  import { Button } from "svelte-mui/src";
  import { mensajes_app, postData } from "./../../../stores";
  //export var geocoder;
  export let map;
 // export let zoom;
  //export let center;
  export let location;
  export let cliente;
  export let marcadores_clientes;
  export let mostrar_guardar_btn;
  let guardando = false;
  let cliente_ya_cuenta_con_locacion = false;
  let contentString = "<div>Nueva ubicación</div>";

  $: if (location.lat != 0 && location.lng != 0) {
    borrar_anteriores_y_agregar_nuevo_pin();
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
      content: contentString
    });

    var marker = new google.maps.Marker({
      position: location,
      map: map,
      title: cliente.nombre,
      
      color: "#daf5f4",
      draggable: true,
      icon:'imagenes/pin_cliente.png',
      animation: google.maps.Animation.DROP
    });
    marcadores_clientes.push(marker);
    marker.addListener("drag", handle_inicia_drag);
    marker.addListener("dragend", handle_termina_drag);
  }


  function handle_inicia_drag(evt) {
    //console.log("inicia");
    //console.log(evt);
  }


  function handle_termina_drag(evt) {
    //console.log("termina");
   // console.log(evt.latLng.lat());
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

  function editar_en_DB() {
    guardando = true;
    let cliente_tmp = {
      _id: cliente._id,
      location: location
    };
    postData("app/clientes/editar/editar_cliente", cliente_tmp)
      .then(respuesta => {
        guardando = false;

        //  Checar si se logro guardar el cliente
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "cliente editado !"
            });
            $mensajes_app = $mensajes_app;
            cliente.location = location;
            mostrar_guardar_btn = false;
          }
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: "No se pudo crear el cliente."
          });
          $mensajes_app = $mensajes_app;
        }

        ////console.log(respuesta);
      })
      .catch(err => {
        guardando = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo crear el cliente."
        });
        $mensajes_app = $mensajes_app;
      });
  }
</script>

{#if mostrar_guardar_btn}
  <table>
    <tr>

      <td>
        <Button
          raised
          color="primary"
          disabled={guardando}
          on:click={editar_en_DB}>
          {cliente.location.lat === 0 ? ' Guardar ubicación' : 'Editar ubicación'}
          <i class="material-icons">save</i>
        </Button>
      </td>

    </tr>
  </table>
{/if}
