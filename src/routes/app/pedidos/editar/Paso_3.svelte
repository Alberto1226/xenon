<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import {
    productos,
    lista_productos_en_pedido_en_edicion,
    formato_precio,
    mensajes_app
  } from "./../../../stores";

  export var pedido_nuevo;
  export var lista_productos;
  const dispatch = createEventDispatcher();
  onMount(() => {
    $lista_productos_en_pedido_en_edicion =lista_productos;
  });

 function capturar_nuevo() {
   dispatch("capturar_nuevo");
 }
</script>

<style>
  .mensaje_terminado{
    font-size: 1.5em;
    color: #222d32;
  }
  .tabla{
    width: 35%;
  margin: 0 auto;
  font-size: 1.1em;
  }
  .comentario{
    color:gray;
    font-size: .9em;
    font-weight:200;
  }
</style>

<div class="centrado">
<div class="mensaje_terminado">
El pedido ha sido guardado con éxito.
 </div>
<div class="centrado comentario">
Aún no se descuenta de inventario, solo se <br> han apartado los productos que contiene.
</div>
<div class="centrado">
<Button on:click={capturar_nuevo} >
capturar nuevo
</Button>
<h3 class="centrado">Información de pedido</h3>
{#each $lista_productos_en_pedido_en_edicion as producto}
   <!-- Productos de pedido -->
   <table class="tabla">
   <tr>
     <td>{producto.producto.codigo}</td>
     <td>{producto.producto.nombre}</td>
     <td>X <b>{producto.cantidad}</b></td>
   </tr>
   </table>
{/each}
</div>


</div>
