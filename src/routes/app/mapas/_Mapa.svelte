<script>
	import Controles from "./_Controles.svelte"					
     import mapStyles from './map-styles'; // optional
     import {ui} from './../../stores';
    import { onMount } from 'svelte';
	let container;
    let map;
    let geocoder;
	let zoom = 6;
    let center = {lat: 21.4606009, lng: -101.9792135};
    let xenon_san_juan = {lat: 20.395422, lng: -99.999039};
    let marcadores_clientes =[];
    var iconBase = 'imagenes/';
    
	onMount(async () => {
        geocoder = new google.maps.Geocoder();

		map = new google.maps.Map(container, {
            zoom,
			center,
			styles: mapStyles // optional
        });
        var marker = new google.maps.Marker({
          position: xenon_san_juan,
          map: map,
          icon:iconBase+'pin_xenon.png',
          title: 'Xenon Central'
        });

    });
    
  
</script>

<style>
.full-screen {
    width: 80vw;
    height: calc(100vh - 200px);
}
</style>

<div style={`width: calc(100vw - ${$ui.side_panel_minimizado?'100':'250'}px);height: calc(100vh - 370px);`} bind:this={container}></div>
<Controles bind:map bind:zoom bind:center bind:geocoder bind:marcadores_clientes/>