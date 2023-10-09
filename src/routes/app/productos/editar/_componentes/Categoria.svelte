<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var categoria;
 import {onMount} from "svelte";
  onMount(()=>{
   lista= categorias;
  })
  var lista =[] ;
  var busqueda ="";
  var categorias = [
    "Accesorios",
    "Amplificadores y modulares",
    "Autoestereos y multimedia",
    "Kit de cables y rollos",
    "Material acústico y aislante",
    "Tweeter, altavoces y sub woofer",
    "Iluminacion LED",
    "Accesorios de led",
    "Barras de led",
    "Led Headlight",
    "Mini led",
    "Miniled Osram",
    "Tira de led",
    "Unidades de led",
    "Iluminacion Xenon",
    "Kit 55 W",
    "Medidas especiales",
    "Seguridad",
    "Accesorios Seguridad",
    "Alarmas",
    "Camara de Reversa",
    "GPS",
    "Sensores de reversa",
    "TPMS",
    "Carbon Led",
    "Sixty",
    "Vision Dual",
    "Vision"
  ];
  var lista_visible=true
  var input_1;
  function handleKeydown(evt) {
    input_1 = document.getElementById("input_categoria")
    if(input_1 ==null)return;
    input_1.focus();
  }



  function filtrar_nuevo_arreglo() {
    if(busqueda==""){
      lista= categorias;
      return;
    }
    var lista_previa =categorias;
    var lista_temp = categorias.filter(state =>
      incluye_busqueda(state)
    );
    
    lista = lista_temp;
  }

  function incluye_busqueda(estado_selecto) {
    if (estado_selecto.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

</script>

<style>
.scrollable{
  overflow-y: auto;
  height: 150px;
  width: 350px;
  
}
</style>
<svelte:window on:keydown={handleKeydown}/>
{#if lista_visible}
   <!-- content here -->

<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={categoria==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>categoria : {categoria == '' ? 'pendiente...' : categoria}</span>

    </Button>
  </div>
  <input id="input_categoria" type="text" bind:value={busqueda} on:keyup={filtrar_nuevo_arreglo} /> <i class="material-icons vertical-alineado">search</i>
  <div class="scrollable">
  {#each lista as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        categoria = item;
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
     <td><Textfield bind:value={categoria} placeholder="categoria personalizada" message="categoria personalizada" /> 
   </td>
     <td><Button raised on:click={()=>{lista_visible=true;}} > lista </Button></td>
   </tr>
   </table>
{/if}
