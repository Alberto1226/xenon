<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import {onMount,createEventDispatcher} from "svelte";
  export var estado;
  export var activar;
  export var actualizar;
  const dispatch = createEventDispatcher();
  onMount(()=>{
   lista= estados;
  })
  var input_1;
  var busqueda = ""
  var lista =[] ;
  
  var estados = [
    "Aguascalientes",
    "Baja California Sur",
    "Baja California",
    "Campeche",
    "Chiapas",
    "Chihuahua",
    "Coahuila",
    "Colima",
    "Ciudad de México",
    "Durango",
    "Guanajuato",
    "Guerrero",
    "Hidalgo",
    "Jalisco",
    "Estado de México",
    "Michoacán",
    "Morelos",
    "Nayarit",
    "Nuevo León",
    "Oaxaca",
    "Puebla",
    "Querétaro",
    "Quintana Roo",
    "San Luis Potosí",
    "Sinaloa",
    "Sonora",
    "Tabasco",
    "Tamaulipas",
    "Tlaxcala",
    "Veracruz",
    "Yucatán",
    "Zacatecas",
    "Alabama",
    "Alaska",
    "Arizona",
    "California",
    "Carolina del Norte",
    "Carolina del Sur",
    "Colorado",
    "Connecticut",
    "Dakota del Norte",
    "Dakota del sur",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawai",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Luisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Minnesota",
    "Misisipi",
    "Misuri",
    "Montana",
    "Nebraska",
    "Nevada",
    "Nueva Jersey",
    "Nueva York",
    "Nuevo Hampshire",
    "Nuevo México",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pensilvania",
    "Rhode Island",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Virginia Occidental",
    "Washington",
    "Wisconsin",
    "Wyoming"
  ];
  var lista_visible=true

  function incluye_busqueda(estado_selecto) {
    if (estado_selecto.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function filtrar_nuevo_arreglo() {
    if(busqueda==""){
      lista= estados;
      return;
    }
    var lista_previa =estados;
    var lista_temp = estados.filter(state =>
      incluye_busqueda(state)
    );
    
    lista = lista_temp;
  }

  function handleKeydown(evt) {
    input_1 = document.getElementById("input_1")
    if(input_1 ==null)return;
    input_1.focus();
  }

</script>

<svelte:window on:keydown={handleKeydown}/>
<style>
.scrollable{
  overflow-y: auto;
  height: 250px;
  width: 350px;
  
}
</style>

{#if lista_visible}
   <!-- content here -->

<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={estado==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;"disabled={!activar}>
      <i  class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>estado {actualizar} : {estado == '' ? 'pendiente...' : estado}</span>

    </Button>
  </div>
  <input style="margin-left:20px;" id="input_1" type="text" bind:value={busqueda} on:keyup={filtrar_nuevo_arreglo} /> <i class="material-icons vertical-alineado">search</i>
  <div class="scrollable">
  {#each lista as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        estado = item;
        actualizar = true;
        dispatch('estado_cambio')
      }}>
      {item}
    </Menuitem>
  {/each}
  </div>

  <hr />
  <Menuitem  on:click={() => {
       lista_visible =false;
      }}>otro...</Menuitem>
</Menu>
{:else}
   <!-- else content here -->
   <table>
   <tr>
     <td><Textfield bind:value={estado} placeholder="estado personalizado" message="estado personalizado" /> 
   </td>
     <td><Button title="Volver a ver lista" raised on:click={()=>{lista_visible=true;}} > lista </Button></td>
   </tr>
   </table>
{/if}
