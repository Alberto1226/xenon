<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  export var marca;
   import {onMount} from "svelte";
  onMount(()=>{
   lista= marcas;
  })
  var lista =[] ;
  var busqueda ="";
var input;
  onMount(() => {
    input = document.getElementById("input_1");
   //seleccionar_input(input);
    //console.log(input);
  });
   function seleccionar_input(){
     setTimeout(()=>{
       input.select();
     },500)
   }
  var marcas = [
    "Puma Security",
    "Star Watt",
    "Carbon Audio",
    "Sixty",
    "CARBON LED",
    "KOMPAK",
    "ViSion2",
    "Osram",
    "Denka",
    "Sixty C6"
  ];
  var lista_visible = true;



  function filtrar_nuevo_arreglo() {
    if(busqueda==""){
      lista= marcas;
      return;
    }
    var lista_previa =marcas;
    var lista_temp = marcas.filter(state =>
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
  .scrollable {
    overflow-y: auto;
    height: 150px;
    width: 250px;
  }
</style>

{#if lista_visible}
  <!-- content here -->

  <Menu origin="top left" style="width:250px;")}>
    <div slot="activator">
      <Button
        color={marca == '' ? 'red' : 'primary'}
        raised
        ripple={false}
        style="padding-right: 4px;width:100%;height:67px;">
        <i class="material-icons vertical-alineado icono_peque">
          arrow_drop_down
        </i>

        <span>Marca : {marca == '' ? 'pendiente...' : marca}</span>

      </Button>
    </div>
    <div class="centrado">
      <input id="input_1" type="text" bind:value={busqueda} on:keyup={filtrar_nuevo_arreglo} /> <i class="material-icons vertical-alineado">search</i>
    </div>
    <div class="scrollable">
      {#each lista as item}
        <!-- content here -->

        <Menuitem
          on:click={() => {
            marca = item;
          }}>
          {item}
        </Menuitem>
      {/each}
    </div>

    <hr />
    <Menuitem
      on:click={() => {
        lista_visible = false;
      }}>
      otra...
    </Menuitem>
  </Menu>
{:else}
  <!-- else content here -->
  <table>
    <tr>
      <td>
        <Textfield
          bind:value={marca}
          placeholder="Marca personalizada"
          message="Marca personalizada" />
      </td>
      <td>
        <Button
          raised
          on:click={() => {
            lista_visible = true;
          }}>
          lista
        </Button>
      </td>
    </tr>
  </table>
{/if}
