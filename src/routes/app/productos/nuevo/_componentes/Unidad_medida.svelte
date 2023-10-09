<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var unidad;
  
  var unidades = [
    "Pieza",
    "Caja",
    "Par",
    "Paquetería",
    "Millar"
  ];
  var lista_visible=true
</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 150px;
  width: 250px;
  
}
</style>

{#if lista_visible}
   <!-- content here -->

<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={unidad==""?"red":"primary"} raised ripple={false} style="padding:4px;width:100%;height:67px;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>Unidad : {unidad == '' ? 'pendiente...' : unidad}</span>

    </Button>
  </div>
  <div class="scrollable">
  {#each unidades as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        unidad = item;
      }}>
      {item}
    </Menuitem>
  {/each}
  </div>

  <hr />
  <Menuitem  on:click={() => {
       lista_visible =false;
      }}>otra...</Menuitem>
</Menu>
{:else}
   <!-- else content here -->
   <table>
   <tr>
     <td><Textfield bind:value={unidad} placeholder="Unidad personalizada" message="Unidad personalizada" /> 
   </td>
     <td><Button raised on:click={()=>{lista_visible=true;}} > lista </Button></td>
   </tr>
   </table>
{/if}
