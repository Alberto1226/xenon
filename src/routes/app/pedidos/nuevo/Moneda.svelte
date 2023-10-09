<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var moneda;
  
  var monedas = [
    "Pesos Mexicanos",
    "Dolares USA"
  ];
  var lista_visible=true
</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 100px;
  width: 350px;
  
}
</style>
   <!-- content here -->

<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={moneda==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>moneda : {moneda == '' ? 'pendiente...' : moneda}</span>

    </Button>
  </div>
  <div class="scrollable">
  {#each monedas as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        moneda = item;
      }}>
      {item}
    </Menuitem>
  {/each}
  </div>
</Menu>