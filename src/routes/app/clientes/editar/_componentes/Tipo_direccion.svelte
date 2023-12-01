<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import {onMount} from "svelte";
  export var tipo_direccion;
  export let isSelected = false; // Variable booleana para indicar si se seleccionó una opción
  onMount(()=>{
   lista= tipo_direccions;
  })
  var input_1;
  var busqueda = ""
  var lista =[] ;
  
  var tipo_direccions = [
    "envio",
    "envio\/facturacion",
    "facturacion"
  ];

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
    <Button  color={tipo_direccion==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i  class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span> {tipo_direccion == '' ? 'pendiente...' : tipo_direccion}</span>

    </Button>
    <br>
    <span class="indice_row">Tipo de dirección</span>
  </div>
 
  <div class="scrollable">
  {#each lista as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        tipo_direccion = item;
        isSelected = true; // Actualizar la variable booleana al seleccionar una opción
      }}>
      {item}
    </Menuitem>
  {/each}
  </div>

 
</Menu>
