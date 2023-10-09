<script>
import {buscadores} from './../../../stores';
import {createEventDispatcher} from 'svelte';
  const dispatch = createEventDispatcher();
  export var lista = [];
  export let ubicacion;


  function buscar_cliente(cliente) {
      $buscadores.clientes = cliente.nombre;
      dispatch('ver_cliente_en_mapa');
  }
</script>

<style>
  .contenedor_lista {
    height: 177px;
    overflow-y: auto;
    background-color: #222d32;
    color: white;
    border-radius: 5px;
    width: 500px;
    padding: 14px;
  }
  .row {
    cursor: pointer;
    height: 33px;
    border-radius: 5px;
    padding-top: 7px;
    padding-left: 4px;
    border-bottom: 1px solid #313131;
  }
  .row:hover {
    background-color: rgb(44, 14, 71);
  }
 
</style>

<div class="titulo_lista">
  Lista de clientes en :
  <b>{ubicacion}</b>
  ({lista.length})
</div>
<div class="contenedor_lista">

  {#each lista as item, i}
    <!-- content here -->
    <div class="row" on:click={()=>{buscar_cliente(item)}}>
      <talbe>
        <tr>
          <td class="indice_row">{i + 1})</td>
          <td>{item.nombre}</td>
          <td title="Cantidad total de ventas del producto">x <b>{item.cantidad_total}</b></td>
        </tr>
      </talbe>
    </div>
  {:else}
    <!-- empty list -->
    <div>No se encontraron productos vendidos</div>
  {/each}
</div>
