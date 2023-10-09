<script>
  import { Button, ButtonGroup } from "svelte-mui/src";
  import { onMount } from "svelte";
  import {actualizar_pines_clientes_en_mapa , cliente_selecto} from './../../../stores'

  onMount(() => {
      agregar_los_pins();
  });
  
  export var geocoder;
  export let map;
  export let zoom;
  export let center;
  export let marcadores_clientes;
  export let lista_clientes = [];
  export let actualizar_ubicaciones_en_mapa;

let localizando = false;

$: if(actualizar_ubicaciones_en_mapa){
    actualizar_ubicaciones_en_mapa = false;
  // console.log('actualizar_ubicaciones_en_mapa');
    deleteMarkers();
    agregar_los_pins();
    
}


$: if($actualizar_pines_clientes_en_mapa){
  $actualizar_pines_clientes_en_mapa = false;
 // console.log("apretates")
  deleteMarkers();
  //console.log($cliente_selecto);
  agregar_los_pins();
}

function agregar_los_pins() {
 // console.log(lista_clientes);
    lista_clientes.forEach((element)=>{
        //console.log(element);
        
          if(element.location !=undefined) {
              agregar_pin(element);
             //console.log(element);
              
          }
      })
}

  function agregar_pin(cliente) {
    //console.log(cliente.id===$cliente_selecto.id)
    //console.log(cliente.id)
    //console.log($cliente_selecto.id)

    var marker = new google.maps.Marker({
      position: cliente.location,
      map: map,
      title: cliente.nombre,
      color: "#daf5f4",
      draggable: true,
      icon:cliente.id===$cliente_selecto.id?'imagenes/pin_cliente_selecto.png':'imagenes/pin_cliente.png',
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
   //console.log(evt);
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
