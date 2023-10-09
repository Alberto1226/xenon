<script>
  import { fly, fade } from "svelte/transition";
  import { onMount,createEventDispatcher } from "svelte";
  import { Textfield, Button } from "svelte-mui/src";
  import {
    lista_productos_en_pedido_nuevo,
    formato_precio
  } from "./../../../stores";
  import { usuario_db,mensajes_app } from "./../../../stores";
  export var item_pedido;
  export var indice;
  export var descuento_a_usar;
  export let id;
  const dispatch = createEventDispatcher();
  var producto;
  var imagen;
  var db;
  var ref_txt = "productos/1583181280094imagen187.jpg";
  var cantidad = 1;
  var actualizado = false;
  var precio_nuevo;
  let timeout_paso = false;
  $: producto = item_pedido.producto;
  $: cantidad = item_pedido.cantidad;
  $: if (cantidad) {
    actualizado = true;

    setTimeout(() => {
      actualizado = false;
    }, 1000);
  }
  onMount(() => {
    sumar_cantidades();
    precio_nuevo = producto.precio;
    setTimeout(()=>{
      timeout_paso = true;
    },1000)
    if (producto.galeria_imagenes == undefined) return;
    if (producto.galeria_imagenes.length == 0) {
      imagen = "imagenes/producto_generico.svg";
      return;
    } else {
      imagen = producto.galeria_imagenes[0];
    }

  });
  var mostrando_producto = true;
  var mouse_arriba = false;
  var total_reservado = 0;
  function ver_editar_precio() {
    mostrando_producto = false;
  }
  function ocultar_cantidad_agregar() {
    mouse_arriba = false;
    setTimeout(() => {
      if (mouse_arriba == false) mostrando_producto = true;
    }, 1000);
  }
  function evitar_cerrarse() {
    mouse_arriba = true;
  }

  function sumar_cantidades() {
    if (producto.carritos == undefined) {
      total_reservado = 0;
      return;
    }
    if (producto.carritos.length == 0 || producto.carritos == [""]) {
      total_reservado = 0;
      return;
    }
    total_reservado = producto.carritos.reduce((a, b) => +a + +b.cantidad, 0);
  }
  function quitar_de_pedido() {
    var indice_a_borrar = $lista_productos_en_pedido_nuevo.findIndex(
      element => element.producto.codigo == producto.codigo
    );
    $lista_productos_en_pedido_nuevo.splice(indice_a_borrar, 1);
    $lista_productos_en_pedido_nuevo = $lista_productos_en_pedido_nuevo;
  }

  function cambiar_precio() {
    if(isNaN(precio_nuevo) || precio_nuevo <0){
      $mensajes_app.push({tipo:'error',mensaje:'No es un valor válido'});
      $mensajes_app =$mensajes_app;
    }
    producto.precio = precio_nuevo;
    var prod_temp =$lista_productos_en_pedido_nuevo.find(element => element.producto.codigo == producto.codigo);
    prod_temp.precio = precio_nuevo;
    $lista_productos_en_pedido_nuevo=$lista_productos_en_pedido_nuevo;
    mostrando_producto =true;
    actualizado =true;
    setTimeout(()=>{
      actualizado =false;
      dispatch("actualizar_totales");
    },500)
  }

  function cambio_en_input(evt){
    if(evt.key=="Enter"){
      cambiar_precio();
    }
  }
</script>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: 0.6fr 1fr 1.4fr 1fr;
    grid-template-rows: 0.4fr;
    grid-template-areas: "uno dos tres cuatro";
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;
  }

  .tres {
    grid-area: tres;
  }

  .cuatro {
    grid-area: cuatro;
    text-align: right;
  }

  .row {
    height: 70px;
    overflow: hidden;
  }
  .row:hover {
    background: white;
  }
  .padding {
    padding-top: 23px;
  }

  .padding_2 {
    padding-top: 10px;
  }
  .padding_3 {
    padding-top: 2px;
  }
</style>

<div
  id={id}
  class="row"
  on:mouseout={ocultar_cantidad_agregar}
  on:mouseover={evitar_cerrarse}>

  <!-- Producto en lista -->
  <div class="grid-container pointer" class:row_actualizado={actualizado}>
    <div class="uno">
      <table>
        <tr>
          <td>
            <span class="indice_row">{indice + 1})</span>
          </td>
          <td>
            {#if timeout_paso}
               <!-- content here -->
               <div
              data-imagen={ref_txt}
              class="imagen_row_circular"
              style="background-image:url({imagen})" />
            {/if}
          </td>
        </tr>
      </table>
    </div>
    <div class="dos padding">{producto.nombre}</div>
    <div class:padding_2={mostrando_producto} class:padding_3={!mostrando_producto} class="tres " title="Precio con descuento ">
      {#if mostrando_producto}
        <table>
          <tr>
            <td>
              ${formato_precio(producto.precio)}
              x {cantidad}
            </td>
            {#if $usuario_db.rol != 'vendedor'}
              <!-- content here -->
              <td>
                <Button
                  icon
                  dense
                  color="green"
                  on:click={ver_editar_precio}
                  title="Editar precio">
                  <i class="material-icons vertical-alineado">create</i>
                </Button>
              </td>
            {/if}
          </tr>
        </table>
      {:else}
        <table style="width:200px">
          <tr>
            <td style="width:80%">
              <Textfield
                error={precio_nuevo < 0 ? 'Precio no puede ser menor a 0' : ''}
                min="0"
                style="background:white;width:100%;"
                outlined
                type="number"
                id="input_1"
                on:keyup={cambio_en_input}
                bind:value={precio_nuevo} />
            </td>
            <td>
              <Button
                icon
                dense
                color="#7575ff"
                on:click={cambiar_precio}
                title="Cambiar precio">
                <i class="material-icons">save</i>
              </Button>
            </td>
          </tr>
        </table>
      {/if}

    </div>
    <div class="cuatro padding2">
      <b>
        ${formato_precio(producto.precio  * cantidad)}
      </b>
      <Button
        icon
        dense
        color="darkorange"
        on:click={quitar_de_pedido}
        title="Borrar">
        <i class="material-icons">delete</i>
      </Button>
    </div>
  </div>

</div>
