<script>
  import { Button } from "svelte-mui/src";
  import { fly } from "svelte/transition";
  import {
    postData,
    editar_store,
    productos,
    mensajes_app
  } from "./../../../../stores";
  export var url_archivo;
  var mouse_arriba = false;
  var visible = false;
  let borrando = false;
  let borrado = false;
  let color_snackbar;
  let mensaje_borrar;
  function borrar_imagen() {
   //console.log(url_archivo);

    var producto_editado = JSON.parse(JSON.stringify($editar_store.producto));
   //console.log(producto_editado);

    producto_editado.galeria_imagenes = [];
   //console.log(producto_editado);
    var imagen_a_borrar = url_archivo;
    var data = { producto_editado, imagen_a_borrar };
    var url = "app/productos/editar/borrar_imagen_de_producto";
    borrando = true;
    postData(url, data)
      .then(res => {
        $mensajes_app.push({ tipo: "exito", mensaje: "Imagen borrada !" });
        $mensajes_app = $mensajes_app;
       // mensaje_borrar = "borrado ";
        borrando = false;
        producto_editado.fh_creado = new Date(producto_editado.fh_creado);
        $editar_store.producto = producto_editado;
        var producto_local_index = $productos.lista.findIndex(
          element => element._id === producto_editado._id
        );
        $productos.lista[producto_local_index] = $editar_store.producto;
        $productos = $productos;
      })
      .catch(err => {
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se ha podido realizar la acción deseada"
        });
        $mensajes_app = $mensajes_app;
        borrando = false;
      });
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
    background-color: #ffffff70;
    border-radius: 3px;
    padding: 4px;
  }
</style>

<td
  in:fly={{ x: 50, duration: 500 }}
  on:mouseover={mouse_arriba_fn}
  on:mouseout={mouse_fuera}
  on:click={preborrar}>

  <!-- else content here -->
  <img
    src={url_archivo}
    alt="previsualizacion"
    class="miniatura pointer "
    class:filtro_escala_grises={mouse_arriba} />

</td>

{#if visible}
  <!-- content here -->
  <div class="borrar_div">
    <Button id={url_archivo} raised color="red" on:click={borrar_imagen}>
      Borrar
    </Button>
    <br />
    <Button
      style="margin-top: 6px;"
      id={url_archivo}
      raised
      color="darkorange"
      on:click={cancelar}>
      Cancelar
    </Button>
  </div>
{/if}
