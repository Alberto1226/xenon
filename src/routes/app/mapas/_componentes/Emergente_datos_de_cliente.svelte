<script>
  import {
    cliente_selecto_completo,
    mostrar_emergente_de_cliente_selecto
  } from "./../../../stores";
  import { fade } from "svelte/transition";
  import { Button } from "svelte-mui/src";
  import {onMount} from 'svelte';
  import Direccion from './Emergente_cliente/direccion.svelte'
  import Head from './Emergente_cliente/head.svelte'
  var direcciones_asociadas =[];

 




function actualiza_direccion() {
    //if($mostrar_emergente_de_cliente_selecto.cargando ==true) return;
    
    direcciones_asociadas = $cliente_selecto_completo.direcciones_asociadas;
    console.log(direcciones_asociadas)
}
  function ocultar(params) {
    $mostrar_emergente_de_cliente_selecto.mostrar = false;
  }
</script>

<style>
  .contenedor {
        position: absolute;
    height: 60vh;
    background: white;
    border-radius: 5px;
    width: 80vw;
    margin: 20vh 10vw;
    z-index: 2;
    top: 0px;
    left: 0px;
    box-shadow: 0 0 30px #080808;
  }

  .ocultar_div {
    width: max-content;
    margin: 0 auto;
    bottom: 10px;
  }
  .nombre{
    font-size: 1.5em;
    font-weight: 800;
    padding-top: 30px;
    padding-bottom: 5px;
    color: white;
    background: #2196F3;   
    box-shadow: inset -2px 3px 5px #ffffff66;
    border-radius: 5px 5px 0 0;
  }

  .cargando{
      font-size: 1.5em;
      font-weight: 800;
      margin: auto auto;
      
  }
  .direcciones{
    margin: 20px;
    padding: 0 50px;
    height: 18vh;
    min-height: 222px;
    max-height: 300px;
    overflow-y: auto;
  }
  .head{
    margin: 20px;
    padding: 4px 50px;
        border: 1px solid #c1c1c1;
    border-radius: 3px;
  }
  .nombre_agente{
      font-weight: 700;
  }
  .sin_agente{
      color:orangered;
  }
  .agente{
      margin-top: 10px;
  }
  .gris{
      color:gray
  }
  .id{
    color:white;
    font-size: 10px;
    font-weight: 400;
  }
</style>

<div class="contenedor" in:fade={{ duration: 300 }}>

{#if $mostrar_emergente_de_cliente_selecto.cargando == false}
    <div class="centrado">
  <div class="nombre ">
  {$cliente_selecto_completo.nombre}
  <div class="id">
  {$cliente_selecto_completo._id}
  </div>
  </div>
{#if $cliente_selecto_completo.agente}
     
  <div class="agente">
  {#if $cliente_selecto_completo.agente.nombre!=""}
       Agente : <span class="nombre_agente">{$cliente_selecto_completo.agente.nombre}</span>
  {:else}
       <span class="sin_agente">No cuenta con agente asignado</span>
  {/if}
  </div>
{/if}
<h4 class="centrado gris">Contacto:</h4>
<div class="agente">
Telefono : 
  {#if $cliente_selecto_completo.telefono!=""}
       <span class="nombre_agente">{$cliente_selecto_completo.telefono}</span>
  {/if}
  </div>

  <div class="agente">
   Correo : 
  {#if $cliente_selecto_completo.correo!=""}
      <span class="nombre_agente">{$cliente_selecto_completo.correo}</span>       
  {/if}
  </div>

{#if $cliente_selecto_completo.direcciones_asociadas.length>0}
     <h4 class="centrado gris">Direcciones:</h4>
     
      <div class="head">
     <Head/> 
      </div>
     
{/if}
  <div class="direcciones">
  {#each $cliente_selecto_completo.direcciones_asociadas as direccion,i}
       <!-- content here -->
        <Direccion bind:direccion indice={i}/>
  {:else}
       <div class="centrado">
       No cuenta con direcciones registradas
       </div>
  {/each}
  </div>
  
  </div>
{:else}
    <div class="centrado cargando">
    cargando...
    </div>
{/if}
  
  <div class="ocultar_div">
    <Button color="primary" on:click={ocultar}>ocultar</Button>
  </div>

</div>
