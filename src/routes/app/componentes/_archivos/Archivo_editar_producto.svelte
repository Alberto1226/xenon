<script>
  import { Button } from "svelte-mui/src";
  import { lista_archivos_uploads_edicion } from "../stores_admon";
  import {fly } from "svelte/transition";
  export var archivo;
  var mouse_arriba = false;
  var visible = false;
  function borrar_imagen() {
   //console.log(archivo.name);
   //console.log($lista_archivos_uploads_edicion);
    var lista_temp = $lista_archivos_uploads_edicion.filter(
      element => element.name != archivo.name
    );
    $lista_archivos_uploads_edicion = lista_temp;
  }

  function mouse_arriba_fn(params) {
    ////console.log("arriba");
    mouse_arriba = true;
  }
  function mouse_fuera(params) {
    mouse_arriba = false;
  }
  function preborrar() {
    visible = true;
  }
  function cancelar() {
    visible = false;
  }
</script>

<style>
  .miniatura {
    height: 100px;
    border-radius: 0px 0px 10px 10px;
    border: blueviolet solid 1px;
  }
  .miniatura:hover {
    border: blueviolet dashed 1px;
  }

  .filtro_escala_grises {
    filter: grayscale(60%);
  }
  .borrar_div {
    position: absolute;

    margin-bottom: 49px;

    padding-bottom: 11px;

    margin-top: 10px;

    margin-left: -136px;

    text-align: center;
    background-color:
#ffffff70;
border-radius: 3px;
padding: 4px;
  }
</style>

<td in:fly={{ x: 50, duration: 500  }}
  on:mouseover={mouse_arriba_fn}
  on:mouseout={mouse_fuera}
  on:click={preborrar}>

  <!-- else content here -->
  <img
    src={archivo.base64}
    alt="previsualizacion"
    class="miniatura pointer "
    class:filtro_escala_grises={mouse_arriba} />

</td>

{#if visible}
  <!-- content here -->
  <div class="borrar_div">
    <Button id={archivo.name} raised color="red" on:click={borrar_imagen}>Borrar</Button>
    <br />
    <Button  style="margin-top: 6px;" id={archivo.name} raised color="darkorange" on:click={cancelar}>Cancelar</Button>
  </div>
{/if}
