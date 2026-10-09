<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import { ui, usuarios ,postData } from "./../../stores";
  import Row from "./_Row.svelte";
  import Heading from "./_Heading_tablar.svelte";
  import Paginacion from "./../componentes/paginacion/index.svelte";
  import {onMount} from 'svelte';
  export var buscando='';
  onMount(()=>{
   obtener_usuarios();
  })

  var ancho_side_panel = 250;
  var limite_lista = 10;
  var pagina_actual = 1;
  var indice_inicio = 0;
  var indice_final = 6;
  let lista =[];
  var viendo_carritos_reservados =false;
  $: indice_final = indice_inicio + limite_lista;
  var total_paginas = 1;
  var total_registros = 0;
  var ha_cambiado_pagina_actual = false;

  $: if (ha_cambiado_pagina_actual == true) {
    ha_cambiado_pagina_actual = false;
    obtener_usuarios();
  }
  //$: total_paginas = Math.round($usuarios.lista.length / limite_lista) - ($usuarios.lista.length % limite_lista >5 ?1:0);

  // Al cambiar la búsqueda se vuelve a la primera página.
  $: {
    buscando;
    pagina_actual = 1;
    obtener_usuarios();
  }
function obtener_usuarios() {
   postData('app/usuarios/lista_de_usuarios',{buscando,pagina_actual})
    .then((res)=>{
      if(res.ok){
        $usuarios.lista = res.lista;
        $usuarios.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
        $usuarios = $usuarios;
        lista= $usuarios.lista;
        total_registros = res.numero_total || 0;
        total_paginas = Math.max(1, Math.ceil((res.numero_total || 0) / limite_lista));
        // console.log("ar");
      }
    })
    .catch((err)=>{
      console.log(err);
      
    })
}


  function siguiente(params) {
    if (pagina_actual < total_paginas) {
      pagina_actual++;
      obtener_usuarios();
    }
  }

  function anterior(params) {
    if (pagina_actual > 1) {
      pagina_actual--;
      obtener_usuarios();
    }
  }


  async function handle_buscar(evt){
    if(evt.key==='Enter'){
      obtener_usuarios();
    }
  }

</script>

<style>

</style>


<div class="contenedor_ventana"  style="overflow-y: auto;" in:fly={{ x: -10, duration: 500 }}>


    {#if $usuarios.lista.length == 0}No existen usuarios ...
    
    {:else}
    <Heading />
    {/if}
    
    {#each lista as usuario, i}
      
        <!-- content here -->
        <Row {usuario} on:usuario_seleccioando on:editar_usuario indice={i} />
      
      <!-- ID: <em>{usuario.ref.id}</em> -->
    {/each}


</div>

<div style="width: 100%; position: absolute;bottom: 30px;">
  <div class="centrado" style="width: fit-content; margin: 0 auto;">
    <Paginacion
      bind:total_paginas
      bind:ha_cambiado_pagina_actual
      bind:pagina_actual />
  </div>
  <div style="position: absolute; right: 30px; bottom: 0;">Usuarios : {total_registros}</div>
</div>
