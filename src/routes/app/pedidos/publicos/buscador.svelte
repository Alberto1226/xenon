<script>

import { Button, ButtonGroup } from "svelte-mui/src";
import Cliente from "./Cliente.svelte";
  export var http_ocupado = false;
  export var total_paginas = 0;
  export var coincidencias = 0;
  export var buscando = "";
  export var pagina_actual = 1;

  export var buscar= false;

  var cliente = {nombre:''};
  var cliente_tiene_carrito  = false;
  var input1 = null;

  function handle_cliente_selecto(evt) {
      console.log(cliente);
  }

</script>

<style>
.barra_herramientas{
    display:flex;
}
.input_buscador{
    width:250px;
}
</style>
<!-- 
<div class="barra_herramientas">

  <Cliente
        bind:cliente
        on:cliente_selecto={handle_cliente_selecto}
        {cliente_tiene_carrito} />

</div>
 -->
