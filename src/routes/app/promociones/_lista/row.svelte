<script>
  export var indice = 0;
  export var item = {
    nombre: "",
    precio: 100
  };
  import Imagen from "./imagen_producto.svelte";
  import { formato_precio, mensajes_app } from "./../../../stores";
  import { Button } from "svelte-mui/src";
  import { borrar_promo, recargar_lista } from "./../storez";
  import {onMount} from 'svelte';

  var confirmaciones = 0;
  var confirmaciones_conocidas = 0; //  para el timeuout
  //var ultima_confirmacion = Date.now();
  var http_ocupado = false;
  var es_par= false;

  onMount(()=>{
    es_par = isOdd(indice+1)==0;
  })

  async function borrar() {
    confirmaciones++;
    // ultima_confirmacion = Date.now();
    if (confirmaciones < 3) return;
    if (http_ocupado == true) return;
    http_ocupado = true;
    
    confirmaciones = 0;
    const resultado = await borrar_promo(item.promo.id_promocion, item._id);
    if (resultado.ok == true) {
      $mensajes_app.push({ tipo: "exito", mensaje: resultado.mensaje });
      $mensajes_app = $mensajes_app;
      $recargar_lista = true;
    } else {
      $mensajes_app.push({ tipo: "false", mensaje: resultado.err.mensaje });
      $mensajes_app = $mensajes_app;
    }
    http_ocupado = false;
    
  }

  function descartar() {
    confirmaciones = 0;
  }

  function isOdd(num) { return num % 2;}

</script>

<style>
  .row {
    display: flex;
    padding: 20px 10px;
  }
  .row:hover {
    background: rgb(194, 194, 194);
  }

  .back_par{
    background: #e6e6e68a;
  }
  .nombre {
    flex-grow: 1;
  }
  .precios {
    flex-grow: 1;
  }
  .herramientas {
    width: 170px;
  }
  .margen_arriba {
    margin-top: 10px;
  }
</style>

<div class="row no_select" class:back_par={es_par}>
  <div class="indice_row uno margen_vert_auto">{indice + 1})</div>
  <div class="imagen">
    <Imagen {item} />
  </div>
  <div class="centrado nombre margen_vert_auto">
    <b>{item.nombre}</b>
    <br />
    {item.marca}
    <br />
    {item.codigo}
  </div>
  <div class="precios margen_vert_auto">
    $ {formato_precio(item.precio)}
    <i class="material-icons vertical-alineado">forward</i>
    $ {formato_precio(item.promo.precio)}
  </div>
  <div class="herramientas margen_vert_auto centrado">
    {#if http_ocupado == false}
      <!-- MOSTRANDO BOTONES  -->
      <Button
        raised
        color="#f44336"
        icon={confirmaciones == 0}
        dense
        on:click={borrar}>
        {#if confirmaciones == 0}
          <!-- content here -->
          <i class="material-icons">delete</i>
        {:else}
          confirma {3 - confirmaciones} {3 - confirmaciones > 1 ? 'veces' : 'vez'}
          más
          <i class="material-icons">delete</i>
        {/if}
      </Button>

      {#if confirmaciones > 0}
        <!-- content here -->
        <div class="margen_arriba">
          <Button
            raised
            color="#FF9800"
            icon
            dense
            on:click={descartar}
            title="Cancelar 'borrar promoción' ">
            <i class="material-icons">cancel</i>
          </Button>
        </div>
      {/if}
    {:else}
      <!-- HTTP OCUPADO -->
      procesando...
    {/if}

  </div>

</div>
