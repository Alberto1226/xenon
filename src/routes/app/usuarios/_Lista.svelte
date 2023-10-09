<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import { ui, usuarios ,postData } from "./../../stores";
  import Row from "./_Row.svelte";
  import Heading from "./_Heading_tablar.svelte";
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
  var total_paginas = $usuarios.lista.length + limite_lista -1 / limite_lista ;
  //$: total_paginas = Math.round($usuarios.lista.length / limite_lista) - ($usuarios.lista.length % limite_lista >5 ?1:0);

  $: if(buscando.length ===0){
    obtener_usuarios();
  }
$: if(buscando.length >0){
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
        total_paginas= Math.ceil($usuarios.lista.length/limite_lista)  
      }
    })
    .catch((err)=>{
      console.log(err);
      
    })
}


  function siguiente(params) {
    if (pagina_actual < total_paginas) {
      pagina_actual++;
      indice_inicio += limite_lista;
    }
  }

  function anterior(params) {
    if (pagina_actual > 1) {
      pagina_actual--;
      indice_inicio -= limite_lista;
      if (indice_inicio <= 0) indice_inicio = 0;
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
  <div class="centrado " style="width: 200px;margin: 0 auto; display:none">

    <Button on:click={anterior}>
      <i class="material-icons">keyboard_arrow_left</i>
    </Button>
    {pagina_actual} / {total_paginas}
    <Button disabled={pagina_actual == total_paginas} on:click={siguiente}>
      <i class="material-icons">keyboard_arrow_right</i>
    </Button>

  </div>

</div>


