<script>
  import { Button, Textfield, Menu, Menuitem } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { clientes, postData } from "./../../../stores";
  export var cliente;
  export var cliente_tiene_carrito;
  const dispatch = createEventDispatcher();
  onMount(() => {
   //console.log('montado de cliente');
   //console.log($clientes.lista.length);
    if($clientes.lista.length===0){
      obtener_clientes_por_pagina() ;
      return;
    }
    
    if ($clientes.lista.length > 0) {
      lista = $clientes.lista;
     //console.log('prellenado');
      
      return;
    }
    
  });
  var input_1;
  var busqueda = "";
  var lista = [];
  var lista_visible = true;
  var http_ocupado = false;
  var http_ultima_actividad_fecha =  Date.now();
  var pagina_actual=1;
  
  function obtener_clientes_por_pagina() {


    if (http_ocupado ) return;
    http_ocupado = true;
   //console.log("post a lista clientes");

    postData("app/clientes/lista_de_clientes_activos", { buscando:busqueda, pagina_actual })
      .then(res => {
        http_ultima_actividad_fecha = Date.now();
        setTimeout(() => {
          http_ocupado = false;
        }, 200);
       console.log(res);
        if (res.ok) {
          $clientes.lista = res.lista;
          $clientes.lista_actualizada = new Date(); //  cuando se actualizo la lista completa por ultima vez
          $clientes = $clientes;
          lista = $clientes.lista;
          $clientes.total_registros = res.numero_total;
          //total_paginas = Math.floor(res.lista.length / limite_lista);
        }
      })
      .catch(err => {
        console.log(err);

        http_ocupado = false;
      });
  }


  function Buscar(evt) {
    if(evt.key==='Enter' && http_ocupado ===false){
      obtener_clientes_por_pagina();
    }
  }


  function incluye_busqueda(cliente_selecto) {
    if (cliente_selecto.toLowerCase().indexOf(busqueda.toLowerCase()) >= 0) {
      return true;
    }
    return false;
  }

  function filtrar_nuevo_arreglo() {
    if (busqueda == "") {
      lista = $clientes.lista;
      return;
    }
    var lista_previa = $clientes.lista;
    var lista_temp = lista_previa.filter(cliente_tmp =>
      incluye_busqueda(cliente_tmp.nombre)
    );

    lista = lista_temp;
  }

  function handleKeydown(evt) {
    input_1 = document.getElementById("input_1");
    if (input_1 == null) return;
    input_1.focus();
  }
</script>

<style>
  .scrollable {
    overflow-y: auto;
    height: 350px;
    width: 350px;
  }
  .email {
    color: gray;
    font-size: 0.8em;
    font-weight: 200;
  }
  .nombre {
    text-align: left;
  }
</style>

<svelte:window on:keydown={handleKeydown} />
<Menu origin="top left" style="width:300px;">
  <div slot="activator">
    <Button
      color={cliente.nombre == '' || cliente_tiene_carrito ? 'red' : 'primary'}
      raised
      ripple={false}
      style="padding-right: 4px;width:100%;">
      <i class="material-icons vertical-alineado icono_peque">
        arrow_drop_down
      </i>

      <span>
        cliente : {cliente.nombre == '' ? 'pendiente...' : cliente.nombre}
      </span>

    </Button>
  </div>
  <div class="centrado">
  clientes registrados ({$clientes.total_registros}) 
  </div>
  <table style="width:100%">
  <tr>
    <td><input
    style="width: 260px;"
    id="input_1"
    type="text"
    bind:value={busqueda}
    on:keyup={Buscar} /></td>
    <td>
    
  <Button icon on:click={obtener_clientes_por_pagina}> <i class="material-icons vertical-alineado">search</i></Button>
    </td>
  </tr>
  </table>
  {#if http_ocupado}
     <!-- content here -->
     <div class="centrado indice_row">cargando...</div>
  {:else}
     <!-- else content here -->
     <span  class="indice_row">mostrando los primeros 10 resultados</span><br>
     <div class="scrollable">
    {#each lista as item}
      
        <Menuitem
          on:click={() => {
            cliente = item;
            dispatch('cliente_selecto');
          }}>
          <table>
            <tr>
              <td class="nombre">{item.nombre}</td>

            </tr>
          </table>
        </Menuitem>
     
    {/each}
  </div>
  {/if}

</Menu>
