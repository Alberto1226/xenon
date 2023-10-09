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
</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 150px;
  width: 350px;
  
}
</style>


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
  {#each regiones as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        region = item;
      }}>
      {item}
    </Menuitem>
  {/each}
  </div>

</Menu>
