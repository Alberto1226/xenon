<script>
  export var item;
  export var i;
  export var step = 50;
  export var pagina_actual=0;
  import { postData, convertir_a_fecha_humana } from "./../../stores";
  import Cambiar_Descuento_Pedido from "./cambiar_descuento_pedido.svelte";
  import Cambiar_Status_a_Envio from "./cambiar_status_a_envio.svelte";
  import JSONTree from "svelte-json-tree";
  import {onMount} from 'svelte';
  import Cambiar_cantidad_v2 from './cambiar_cantidad_productov2.svelte';
  import Cambiar_cantidad_v2_1 from './cambiar_cantidad_productov2_1.svelte';
  import Modificacion_admin_de_inventario from './modificar_existencias_en_inventario.svelte';


let body= "{}";
onMount(()=>{
  //console.log(item.body)
    try {
      body = JSON.parse(item.body);
    } catch (err) {
      body = {}
    }
    //console.log(body)

})

  function formato_fecha(fecha) {
    const d = new Date(fecha);
    let resultado = {
      dia: d.toLocaleString("es-MX"),
      tiempo: d.toTimeString()
    };
    return resultado;
  }
</script>

<style>
  .row {
    width: 94%;
    margin: 19px;
    border: 1px solid gray;
    border-radius: 9px;
    padding: 10px;
  }
  .fecha {
    width: 50%;
  }

  .usuario {
    width: 50%;
  }
  .body {
    width: 100%;
  }
</style>

<div class="row">
  <table style="width:100%">
    <tr>

      <td class="fecha">
        <span class="indice_row">{i + 1 + ((pagina_actual-1)*step)}) {item._id}</span>
        <b>{convertir_a_fecha_humana(item.fecha)}</b>
        {formato_fecha(item.fecha).dia}
      </td>
      <td class="usuario" title={item.usuario.id}>
        <i class="material-icons vertical-alineado">assignment_ind</i>
        {item.usuario.nombre}
      </td>
    </tr>
    <tr>
      <td class="accion">{item.accion}</td>
      <td class="ip">{item.client.ip} {item.client.browser}</td>
    </tr>

{#if item.accion == "productos/editar/modificar_existencias_desde_listas"}
   <!-- content here -->
   <Modificacion_admin_de_inventario bind:item />
{/if}

{#if item.accion == "carrito/cambiar_cantidad_v2/"}
   <tr>
        <td>
          <Cambiar_cantidad_v2 bind:item />
        </td>
      </tr>
{/if}
{#if item.accion == "carrito/cambiar_cantidad_v2.1/"}
   <tr>
        <td>
          <Cambiar_cantidad_v2_1 bind:item />
        </td>
      </tr>
{/if}
    
    {#if item.accion === 'pedidos/cambiar_descuento_de_pedido'}
      <tr>
        <td>
          <Cambiar_Descuento_Pedido bind:item />
        </td>
      </tr>
    {/if}

    {#if item.accion === 'pedidos/cambiar_status_a_envio' && body !=null}
      <!-- content here -->
 
     {#if body.accion=="descuento de productos en inventario"}
          <!-- content here -->
           <tr>
        <td>

          <Cambiar_Status_a_Envio bind:item />
        </td>
      </tr>
     {/if}
    {/if}

    {#if item.body.length > 4}
      <tr>
        <td>
          <JSONTree value={body} />
          <!-- {item.body} -->
        </td>
      </tr>
    {/if}
  </table>
</div>
