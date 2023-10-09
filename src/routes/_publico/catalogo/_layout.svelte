<script>
  import Herramienta from "./_catalogo/buscador.svelte";
  import {mostrando_producto} from './../../stores';
  import {onMount} from 'svelte';
  onMount(()=>{
    $mostrando_producto = false
  })
</script>

<style>
main main:parent{
  height: 50vh;
}
  main {
    position: relative;
    height: 100%;
    max-width: 100vw;
    overflow-x: hidden;
    background-color: white;
    /*
    max-width: 56em;
    padding: 0.8em 0em 0em 0em;
    */
    margin: 0 auto;
    box-sizing: border-box;
  }

  .grid-container {
    height: 100vh;
    max-height: 100vh;
    width: 100vw;
    max-width: 100vw;
    display: grid;
    grid-template-rows: 42px 2.8fr 0.1fr;
    grid-template-areas: "area_uno area_dos" "area_tres area_cuatro" "area_cinco area_seis";
  }

  .area_uno {
    grid-area: area_uno;

    background-color: #222d32;
    box-shadow: 2px 0px 6px #222d32;
    z-index: 2;
  }

  .area_dos {
    grid-area: area_dos;
    color: #40f;
    background: white;
    /* background: rgb(255,194,0);
background: linear-gradient(351deg, rgba(255,194,0,1) 5%, rgba(230,255,0,1) 100%); */
    box-shadow: 2px 0px 4px #222d32;
    z-index: 2;
  }

  .area_tres {
    grid-area: area_tres;
    background-color: #222d32;
    box-shadow: 2px 0px 6px #222d32;
    z-index: 2;
  }

  .area_cuatro {
    grid-area: area_cuatro;
    background: #f0f1ff;
    font-size: 0.85em;
  }

  .area_cinco {
    grid-area: area_cinco;
    background-color: black;
  }

  .area_seis {
    grid-area: area_seis;
    background-color: black;
  }

  .logo_mini {
    height: 50px;
    padding-top: 4px;
  }

  .usuario {
    color: #0065ff;
  }

  .rol {
    font-weight: 500;
    font-size: 0.9em;
  }

.limitado_verticalmente{
  overflow-y: hidden;

}

  .contenedor_no_logueado {
    height: 100%;
    
    /* background: white;
    height: 90vh;
    width: 90vw;
    margin: 5vh auto; */
  }
</style>

<main class:limitado_verticalmente={$mostrando_producto}>

  <div class="contenedor_no_logueado" >
    <!-- <Herramienta /> -->
    <slot />
  </div>

</main>
