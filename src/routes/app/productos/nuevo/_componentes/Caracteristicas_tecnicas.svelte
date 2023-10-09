<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import Caracteristica from "./_caracteristica_tecnica.svelte";
  export var caracteristicas_tecnicas = [];
 
  var carateristica_nueva = "";
  function agregar() {
       if(carateristica_nueva=="")return;
       caracteristicas_tecnicas.push(carateristica_nueva);
       caracteristicas_tecnicas = caracteristicas_tecnicas;
       carateristica_nueva="";
      //console.log(caracteristicas_tecnicas);
       var input =document.getElementById("input_caracteristica_nueva");
       seleccionar_input(input);
  }
   function seleccionar_input(input){
     setTimeout(()=>{
       input.select();
     },500)
   }
  function handleBorrar(evt) {
       var indice =evt.detail.indice;
       caracteristicas_tecnicas.splice(indice,1);
       caracteristicas_tecnicas =caracteristicas_tecnicas;
  }
  function checar_tecla_enter(evt) {
       if(evt.key=="Enter")agregar();
  }
</script>
<style>


.contenedor_lista{
     height: 250px;
      max-height: 250px;
     overflow: auto;
}
</style>
<table>
  <tr>
    <td>
      <Textfield
      id="input_caracteristica_nueva"
        outlined
        on:keypress={checar_tecla_enter}
        placeholder="Ingrese una característica"
        message="Ingrese una característica"
        bind:value={carateristica_nueva} />
    </td>
    <td>
      <Button on:click={agregar}>
        Agregar
        <i class="material-icons">add</i>
      </Button>
    </td>
  </tr>
</table>
<div class="contenedor_lista">
{#each caracteristicas_tecnicas as caracteristica,i}
  <!-- content here -->
 
  <Caracteristica indice={i} {caracteristica} on:borrar={handleBorrar} />
{:else}
  <!-- empty list -->
  <div class="centrado">[ Lista vacía ]</div>
{/each}
</div>

