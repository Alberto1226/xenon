<script>
  //            LISTA EMERGENTE PARA VER productos de fomra alternativa a pdf

  //import Imagen from "./imagen_producto.svelte";
  import { onMount } from "svelte";
  import { Button } from "svelte-mui/src";
  import { fade } from "svelte/transition";
  import { formato_precio } from "./../../../stores";
  import Row from "./lista_emergente/row.svelte";

  export var visible = false;
  export var pedido = null;
  var carritoDB = {
    folio: "---",
  };

  var lista = [];

  onMount(() => {
    //carritoDB = $editar_store.pedido;
    lista = pedido.lista;
  });

  function cerrar() {
    visible = false;
  }

  function handleKeydown(event) {
    let key = event.key;
    if (key == "Escape") cerrar();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if visible}
  <div class="contenedor no_select" transition:fade={{ duration: 250 }}>
    <div class="cerrar" on:click={cerrar}>X</div>
    <!-- <Button color="white" on:click={cerrar} raised><i class="material-icons vertical-alineado blanco" >keyboard_backspace</i> regresar</Button> -->
    <div class="display-flex width-auto-centrado-horizontal">
      <h3 class="centrado div_folio">
        {pedido.folio}
        <div class="centrado">
          {pedido.status}
        </div>
      </h3>

      <div>
        <i class="material-icons">person</i><b>{pedido.cliente.nombre}</b><br />
        <i class="material-icons">map</i>{pedido.cliente.direccion} <br />
        <i class="material-icons">email</i>{pedido.cliente.correo}
      </div>
    </div>

    <div class="lista">
      {#each lista as registro, i}
        <Row {registro} indice={i} />
      {/each}
    </div>
    <div class="centrado">
      Total $ {formato_precio(pedido.total_pedido)} <br />
      Descuento {formato_precio(pedido.descuento)} %
    </div>
  </div>
{/if}

<style>
  .contenedor {
    background: white;
    background: linear-gradient(30deg, #4caf50 7%, rgba(74, 102, 115, 1) 100%);
    color: white;
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0vh;
    left: 0vw;
    z-index: 2;
  }
  .lista {
    background: rgba(255, 255, 255, 0.404);
    border-radius: 5px;
    overflow-y: auto;
    height: 80vh;
    width: 66vw;
    margin: 0 auto;
    max-width: 1100px;
    padding: 5px;
  }

  .cerrar {
    position: absolute;
    height: 100px;
    width: 100px;
    border-radius: 70px;
    right: 50px;
    top: 50px;
    font-size: 6.5em;
    padding-left: 0.5em;
    font-weight: 200;
    cursor: pointer;
    transition: padding-left 50ms ease-in, border 100ms ease-in,
      padding-top 50ms ease-in, font-size 50ms ease-in, font-size 50ms ease-in,
      background-color 50ms ease-in;
  }
  .cerrar:hover {
    border: 1px solid white;
    transition: border 350ms ease-out;
  }
  .cerrar:active {
    font-size: 5.5em;
    padding-top: 10px;
    padding-left: 10px;
  }

  .div_folio {
    margin-left: max(5vw, 55px);
    padding: 18px;
    border-radius: 4px;
    border: 1px solid #8bc34a;
    margin-right: 22px;
  }
</style>
