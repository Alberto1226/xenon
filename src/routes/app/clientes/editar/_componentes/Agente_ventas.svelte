<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import {onMount,onDestroy} from "svelte";
  //import firebase from "firebase/app";
  import {usuarios,postData} from "./../../../../stores";
  export var agente;
  
onMount(() => {

    if($usuarios.lista.length>0){
      lista =$usuarios.lista;
      return
    };
    //var db = firebase.database;
    
    postData('app/usuarios/lista_de_usuarios')
    .then((res)=>{
      if(res.ok){
        $usuarios.lista = res.lista;
        $usuarios.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
        $usuarios = $usuarios;
        lista= $usuarios.lista;
      }
    })
    .catch((err)=>{
      console.log(err);
      
    })
    // var ref = firebase.database().ref("usuarios/bodega_1/usuarios")
  });
  onDestroy(()=>{
    busqueda="";
  })
  var input_1;
  var busqueda = ""
  var lista =[];
  
  var agentes = [];
  var lista_visible=true

  function incluye_busqueda(agente_selecto) {
    if (agente_selecto.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function filtrar_nuevo_arreglo() {
    if(busqueda==""){
      lista= agentes;
      return;
    }
    var lista_previa =agentes;
    var lista_temp = agentes.filter(state =>
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
  height: 150px;
  width: 350px;
  
}
</style>



<Menu origin="top left" style="width:250px;">
  <div slot="activator">
    <Button  color={agente.nombre==""?"red":"primary"} raised ripple={false} style="padding-right: 4px;width:100%;">
      <i  class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>agente : {agente.nombre == '' ? 'pendiente...' : agente.nombre}</span>

    </Button>
  </div>
  <input id="input_1" type="text" bind:value={busqueda} on:keyup={filtrar_nuevo_arreglo} /> <i class="material-icons vertical-alineado">search</i>
  <div class="scrollable">
  {#each lista as item}
    <!-- content here -->

    <Menuitem
      on:click={() => {
        agente = {
          nombre :item.nombre,
          id :item._id,
          correo :item.correo,
         }
      }}>
      {item.nombre} {item.correo}
    </Menuitem>
  {/each}
  </div>

  
</Menu>
