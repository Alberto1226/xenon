<script>
export var puntuacion =5;
 var puntuacion_lista = ["completo","completo","completo","completo","completo"];
import {onMount} from 'svelte';

onMount(()=>{
    if(puntuacion ===5) puntuacion_lista = ["completo","completo","completo","completo","completo"];
    if(puntuacion ===4.5) puntuacion_lista = ["completo","completo","completo","completo","medio"];
    if(puntuacion ===4) puntuacion_lista = ["completo","completo","completo","completo","vacío"];
    if(puntuacion ===3.5) puntuacion_lista = ["completo","completo","completo","medio","vacío"];
    if(puntuacion ===3) puntuacion_lista = ["completo","completo","completo","vacío","vacío"];
    if(puntuacion ===2.5) puntuacion_lista = ["completo","completo","medio","vacío","vacío"];
    if(puntuacion ===2) puntuacion_lista = ["completo","completo","vacío","vacío","vacío"];
    if(puntuacion ===1.5) puntuacion_lista = ["completo","medio","vacío","vacío","vacío"];
    if(puntuacion ===1) puntuacion_lista = ["completo","vacío","vacío","vacío","vacío"];
    if(puntuacion ===0.5) puntuacion_lista = ["medio","vacío","vacío","vacío","vacío"];
    if(puntuacion ===0) puntuacion_lista = ["vacío","vacío","vacío","vacío","vacío"];
})

</script>

{#each puntuacion_lista as item}
     <!-- Completo -->
     {#if item==="completo"}
          <i class="material-icons">
          star
          </i>
     {:else if  item==="medio"}
          <!-- Medio -->
          <i class="material-icons">
          star_half
          </i>
     {:else if  item==="vacío"}
          <!-- Vacío -->
          <i class="material-icons">
          star_outline
          </i>
     {/if}
{/each}
