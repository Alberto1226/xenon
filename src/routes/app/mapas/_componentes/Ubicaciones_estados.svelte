<script>
  import { Button, ButtonGroup } from "svelte-mui/src";
  import { onMount } from "svelte";

  onMount(() => {
      agregar_los_pins();
  });
  
  export var geocoder;
  export let map;
  export let zoom;
  export let center;
  export let marcadores_clientes;
  export let lista_estados = [];
  export let actualizar_ubicaciones_en_mapa;  
  export let estado_selecto;

let localizando = false;
var iconBase = 'imagenes/';


$: if(actualizar_ubicaciones_en_mapa){
    actualizar_ubicaciones_en_mapa = false;
   //console.log('actualizar_ubicaciones_en_mapa');
  //console.log('Selecto -' +estado_selecto);
   
    deleteMarkers();
    agregar_los_pins();
    
}

function agregar_los_pins() {
    lista_estados.forEach((element)=>{
       //console.log(element);
        
          //if(element.location !=undefined) {
              agregar_pin(element);
             //console.log(element);
              
          //}
      })
}

  function agregar_pin(estado) {
    

    var marker = new google.maps.Marker({
      position: {
        lat:parseFloat(estado.lat),lng:parseFloat(estado.lng)
      },
      map: map,
      title: estado.nombre,
      draggable: false,
      
      icon:estado_selecto!=estado.nombre ?iconBase+'/pin_verde.png':iconBase+'/pin_selecto_amarillo.png'
    });
    marcadores_clientes.push(marker);
    
   // marker.addListener("drag", handle_inicia_drag);
  //  marker.addListener("dragend", handle_termina_drag);
  }

  /*
  
  function handle_inicia_drag(evt) {
   //console.log("inicia");
   //console.log(evt);
  }
  function handle_termina_drag(evt) {
   //console.log("termina");
   //console.log(evt);
  }

  */

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
