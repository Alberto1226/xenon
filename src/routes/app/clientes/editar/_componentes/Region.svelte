<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var region;
  
  var regiones = [
    "Noroeste",
    "Noreste",
    "Occidente Bajío",
    "Centro",
    "Sureste",
  ];
  var lista_visible=true
  var otro = false;
  var region_txt = "";


  $: if(otro ==true){
    region =region_txt
  }


  function cancelar() {
    otro=false;
  }
</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 150px;
  width: 350px;
  
}
</style>

{#if otro==false}
<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={region==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>
      <span>region : {region == '' ? 'pendiente...' : region}</span>
    </Button>
  </div>
  <div class="scrollable">
  
     <!-- LISTA -->
     {#each regiones as item}
     <!-- content here -->
 
     <Menuitem
       on:click={() => {
         region = item;
       }}>
       {item}
     </Menuitem>
   {/each}
   <Menuitem
       on:click={() => {
         region = "";
         otro=true;
       }}>
       Otra...
     </Menuitem>

   
  </div>

</Menu>
{:else}
<div>Escribe el nombre de la región a usar</div>      
<div class="display-flex">

  <input placeholder="cdmex" type="text" bind:value={region_txt}>
  <Button icon dense on:click={cancelar}> <i class="material-icons">cancel</i></Button>
 </div>

{/if}