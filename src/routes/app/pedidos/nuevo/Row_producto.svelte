<script>
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { Textfield, Button } from "svelte-mui/src";
  import {
    lista_productos_en_pedido_nuevo,
    formato_precio,
    mensajes_app,
    productos
  } from "./../../../stores";
  export var producto;
  export var indice;
  export var descuento_a_usar;
  var imagen;
  var db;
  var ref_txt = "productos/1583181280094imagen187.jpg";
  var cantidad = 1;
  var ya_fue_agregado = false;
  var precio_menos_decuento = 0;
  let input_1;
  let virgen = true;
  let timeout;
  onMount(() => {
    sumar_cantidades();

    if (producto.aplicar_descuento_distribuidor)
      precio_menos_decuento =
        "Precio con descuento $ " +
        (producto.precio - (producto.precio * descuento_a_usar) / 100);
    else
      precio_menos_decuento =
        "Precio NO APLICA DESCUENTO $ " + formato_precio(producto.precio) + " ";
    //db =firebase.firestore() ;
    /*
    if (producto.galeria_imagenes == undefined) return;
    if (producto.galeria_imagenes.length > 0) {
      ref_txt = producto.galeria_imagenes[0];
    }
    var pathReference = firebase
      .storage()
      .ref(ref_txt)
      .getDownloadURL()
      .then(function(url) {
        imagen = url;
      });
   */
  });
  $: if (mostrando_producto == false) {
    setTimeout(() => {
      let input = document.getElementById(producto._id);
      // console.log(input)
      if (input === null || input === undefined) return;
      input.select();
    }, 100);
  }

  $: if (descuento_a_usar) {
    precio_menos_decuento =
      "Precio con descuento $ " +
      (producto.precio - (producto.precio * descuento_a_usar) / 100);
  }
  var mostrando_producto = true;
  var mouse_arriba = false;
  var total_reservado = 0;
  var disponible = 0;
  $: disponible =
    parseFloat(producto.existencia.actual) - parseFloat(total_reservado);

  function click() {
    if (disponible > 0) mostrando_producto = false;
  }
  function ocultar_cantidad_agregar() {
    mouse_arriba = false;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (mouse_arriba == false) mostrando_producto = true;
    }, 800);
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

  function agregar() {
    //console.log($lista_productos_en_pedido_nuevo);
    ////console.log(producto.codigo);
    if (cantidad > disponible) {
      $mensajes_app.push({ tipo: "error", mensaje: "No existen suficientes" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (isNaN(cantidad) || cantidad === "") {
      $mensajes_app.push({ tipo: "error", mensaje: "Valor incorrecto" });
      $mensajes_app = $mensajes_app;
      return;
    }
    var existente = $lista_productos_en_pedido_nuevo.find(
      element => element.producto._id == producto._id
    );
    ////console.log(existente);

    if (existente == undefined) {
      var temp = JSON.parse(JSON.stringify(producto));
      if (producto.aplicar_descuento_distribuidor)
        temp.precio = temp.precio - (temp.precio * descuento_a_usar) / 100;
      else temp.precio = temp.precio;
      $lista_productos_en_pedido_nuevo.push({ producto: temp, cantidad });
      $lista_productos_en_pedido_nuevo = $lista_productos_en_pedido_nuevo;
    } else {
      existente.cantidad = cantidad;
      $lista_productos_en_pedido_nuevo = $lista_productos_en_pedido_nuevo;
    }
    ya_fue_agregado = true;
    mostrando_producto = true;
  }
  function handleKeydown(evt) {
    if (mostrando_producto) return;
    if (evt.key == "Enter") {
      agregar();
      return;
    }

    input_1 = document.getElementById("input_1");
    if (input_1 == null) return;
    input_1.focus();
    if (virgen === true) input_1.select();
    virgen = false;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (mouse_arriba == false) mostrando_producto = true;
    }, 500);
  }

  ///     CARRITOS EN STORES DE PRODUCTO>LISTA
  function actualizar_apartado_local() {
    let lista_temp = $productos.lista;
    //console.log(cliente);

    let producto_temp = lista_temp.find(
      element => element._id === producto._id
    );

    ///   CARRITOS
    let producto_en_apartado = producto_temp.carritos.find(
      element => element.cliente.id === cliente.id
    );
    //console.log(producto_en_apartado);

    if (producto_en_apartado === undefined) {
      producto_temp.carritos.push({
        cantidad,
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          correo: cliente.correo
        }
      });
      producto.carritos = producto_temp.carritos;
    }
    /// SI YA EXISTE CAMBIAR CANTIDAD
    else {
      producto_en_apartado.cantidad = cantidad;
      producto.carritos = producto_temp.carritos;
      //console.log(producto_en_apartado);
      //console.log(producto.carritos);
    }
    dispatch("actualizar_lista");

    $productos.lista = lista_temp;
    $productos = $productos;

    sumar_cantidades();
  }
</script>

<style>
  .row {
    height: 95px;
    overflow: hidden;
    padding: 20px;
    border: 1px solid #dedede;
  }

  .row:hover {
    background: rgb(115, 181, 251);
    color: white;
  }
  .row:hover .indice_row {
    color: white;
  }
  .precio_ancho {
    font-weight: 500;
    padding-left: 10px;
  }

  .marca {
    color: rgb(0, 0, 43);
    font-size: 0.8em;
  }

  .categoria {
    color: rgb(21, 0, 32);
    font-size: 0.8em;
    text-align: center;
  }

  .disponibles {
    background: #e0e0e0;
    color: #969696;
    font-weight: 500;
    padding: 5px;
    border-radius: 9px;
    text-align: center;
    margin: 9px;
  }

  .insuficientes:hover {
    background: red;
    color: white;
    cursor: default;
  }


  .insuficientes_componente:hover {
    background: rgb(252, 194, 194);
    color: white;
    cursor: default;
  }
</style>

<svelte:window on:keydown={handleKeydown} />

<div
  class="row"
  on:click={click}
   class:insuficientes_componente={!disponible>0}
  on:mouseout={ocultar_cantidad_agregar}
  on:mouseover={evitar_cerrarse}>
  {#if mostrando_producto}
    <!-- Producto en lista -->
    <div class="pointer ">
      <table style="width:100%; text-align: center;">
        <tr>
        
          <td class="indice_row">{indice})</td>

          <td style="width: 51%;    font-weight: 800;">
            {producto.nombre}
            <br />

            <span class="indice_row" title="disponibles ">
              <div class="disponibles" class:insuficientes={!disponible>0}>{disponible}</div>
            </span>

          </td>
          <td title={precio_menos_decuento} class="precio_ancho">
            ${formato_precio(producto.precio)}
          </td>
          
        </tr>
        <tr>
          <td class="marca" title="marca">{producto.marca}</td>

          <td class="categoria" title="categoría">
           
            {producto.subcategoria.nombre ? producto.subcategoria.nombre : ''}
          </td>
          <td style="text-align:left;" class="indice_row" title="codigo">{producto.codigo}</td>
        </tr>
      </table>
      
    </div>
  {:else}
    <div out:fly={{ x: -10, duration: 100 }} class="pointer ">
      <table style="width:100%">
        <tr>
          <td class="indice_row">{indice})</td>
          <td style="width:75%">
            <Textfield
              error={cantidad < 1 ? 'Cantidad no puede ser menor a 1' : ''}
              max={disponible}
              min="1"
              style="background:white;width:100%;"
              outlined
              type="number"
              id={producto._id}
              bind:value={cantidad} />
          </td>

          <td class="precio_ancho">${formato_precio(producto.precio)}</td>
          <td>
            {#if disponible > 0}
              <!-- content here -->
              <Button
                title="Agregar (Enter)"
                disabled={disponible <= 0}
                color="#7575ff"
                raised
                icon
                on:click={agregar}>
                <i class="material-icons">add_circle</i>
              </Button>
            {/if}

          </td>
        </tr>
      </table>
    </div>
  {/if}
</div>
