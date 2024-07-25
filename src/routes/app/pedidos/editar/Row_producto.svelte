<script>
  import Info_promos from "./_promos/info_promos.svelte";
  import { fly, fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { Textfield, Button } from "svelte-mui/src";
  import {
    lista_productos_en_pedido_en_edicion,
    formato_precio,
    mensajes_app,
    postData,
    productos,
    editar_store,
  } from "./../../../stores";
  import { createEventDispatcher } from "svelte";
  export var producto;
  export var id;
  export var indice;
  export var descuento_a_usar;
  export let procesando_en_la_nube;
  export let id_carrito;
  let cliente;
  var imagen;
  var db;
  var ref_txt = "productos/1583181280094imagen187.jpg";
  var cantidad = 1;
  var ya_fue_agregado = false;
  var precio_menos_decuento = 0;
  let input_1;
  let virgen = true;
  let timeout;
  let visible_info_promo = false;
  const dispatch = createEventDispatcher();

  onMount(() => {
    sumar_cantidades();
    cliente = $editar_store.pedido.cliente;
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

  $: if (visible_info_promo == false) {
    mostrando_producto = true;
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

  function toggle_visible_info_promo() {
    visible_info_promo = !visible_info_promo;
  }

  function click() {
    mostrando_producto = false;
  }

  function ocultar_cantidad_agregar() {
    mouse_arriba = false;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (mouse_arriba == false) mostrando_producto = true;
    }, 2000);
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

  function agregar(promo_solicitada) {
    //console.log($lista_productos_en_pedido_en_edicion);
    ////console.log(producto.codigo);
    if (producto.activo === false) {
      alert("Producto deshabilitado por administración");
      return;
    }

    if (cantidad < 1) {
      $mensajes_app.push({ tipo: "error", mensaje: "Cantidad incorrecta" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (cantidad > disponible) {
      $mensajes_app.push({ tipo: "error", mensaje: "No existen suficientes" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (isNaN(cantidad) || cantidad === "" || cantidad === null) {
      $mensajes_app.push({ tipo: "error", mensaje: "Valor incorrecto" });
      $mensajes_app = $mensajes_app;
      return;
    }
    if (cantidad <= 0) return;
    let producto_temp = JSON.parse(JSON.stringify(producto));
    //    APLICA O NO APLICA DESCUENTO
    if (producto.aplicar_descuento_distribuidor)
      producto_temp.precio =
        producto_temp.precio - (producto_temp.precio * descuento_a_usar) / 100;
    else producto_temp.precio = producto_temp.precio;
    //   SI TIENE PROMO PONERLO EN REGISTRO EL SERVIDOR DEBE VERIFICARLO

    procesando_en_la_nube = true;
    var promo = { con_promo: promo_solicitada };
    var registro = { producto: producto_temp, cantidad, promo };
    //console.log(registro);
    let donde = "agregar";
    postData("/app/pedidos/editar/cambiar_cantidad", { registro, id_carrito, donde })
      .then((respuesta) => {
        if (respuesta.ok) {
          console.log(respuesta);
          $mensajes_app.push({ tipo: "exito", mensaje: "Producto agregado" });
          $mensajes_app = $mensajes_app;
          var existente = $lista_productos_en_pedido_en_edicion.find(
            (element) => element.producto._id == producto._id
          );
          ////console.log(existente);

          if (existente == undefined) {
            $lista_productos_en_pedido_en_edicion.push({
              producto: respuesta.registro_agregado.producto,
              cantidad,
              promo: respuesta.registro_agregado.promo,
            });
            $lista_productos_en_pedido_en_edicion = $lista_productos_en_pedido_en_edicion;
          } else {
            existente.cantidad = cantidad;
            existente.promo = respuesta.registro_agregado.promo;
            //existente = respuesta.registro_agregado;
            existente.producto.precio =
              respuesta.registro_agregado.producto.precio;
            $lista_productos_en_pedido_en_edicion = $lista_productos_en_pedido_en_edicion;
          }
          ya_fue_agregado = true;
          mostrando_producto = true;
          actualizar_apartado_local();
        } else {
          $mensajes_app.push({ tipo: "error", mensaje: respuesta.mensaje });
          $mensajes_app = $mensajes_app;
        }
        procesando_en_la_nube = false;
      })
      .catch((err) => {
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo agregar el producto",
        });
        $mensajes_app = $mensajes_app;
        procesando_en_la_nube = false;
      });
  }

  function actualizar_pedido_en_store() {
    $editar_store.pedido.lista = $lista_productos_en_pedido_en_edicion;
  }

  ///     CARRITOS EN STORES DE PRODUCTO>LISTA
  function actualizar_apartado_local() {
    let lista_temp = $productos.lista;
    //console.log(cliente);

    let producto_temp = lista_temp.find(
      (element) => element._id === producto._id
    );

    ///   CARRITOS
    let producto_en_apartado = producto_temp.carritos.find(
      (element) => element.cliente.id === cliente.id
    );
    //console.log(producto_en_apartado);

    if (producto_en_apartado === undefined) {
      producto_temp.carritos.push({
        cantidad,
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          correo: cliente.correo,
        },
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
    actualizar_pedido_en_store();
    sumar_cantidades();
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
    }, 2000);
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<Info_promos {producto} bind:visible={visible_info_promo} />
<div
  {id}
  class="row"
  on:click={click}
  class:insuficientes_componente={!disponible > 0}
  on:mouseout={ocultar_cantidad_agregar}
  on:mouseover={evitar_cerrarse}
>
  {#if mostrando_producto}
    <!-- Producto en lista -->
    <div class="pointer ">
      <table style="width:100%; text-align: center;">
        <tr>
          <td class="indice_row">{indice})</td>

          <td
            style="width: 51%;    font-weight: 800;"
            title={producto.aplicar_descuento_distribuidor
              ? "Si aplicará descuento"
              : "No aplicará descuento"}
          >
            <span
              class:no_aplicar_descuento={producto.aplicar_descuento_distribuidor ==
                false}>{producto.nombre}</span
            >
            {#if producto.promo}
              {#if producto.promo.tiene_promo == true}
                <Button
                  style="width: 24px;height: 24px;"
                  raised
                  color="white"
                  icon
                  dense
                  on:click={toggle_visible_info_promo}
                >
                  <i
                    class="material-icons icono_promo vertical-alineado icono_pequeno"
                    title="Checar promoción ">new_releases</i
                  >
                </Button>
              {/if}
            {/if}
            {@html producto.activo
              ? ""
              : "<span class='producto-inactivo-texto'>Producto inactivo</span>"}
            <br />

            <span class="indice_row" title="disponibles ">
              <div class="disponibles" class:insuficientes={!disponible > 0}>
                {disponible}
              </div>
            </span>
          </td>
          <td
            title={producto.aplicar_descuento_distribuidor
              ? precio_menos_decuento
              : producto.precio + " Producto no aplica descuento"}
            class="precio_ancho"
          >
            ${formato_precio(producto.precio)}

            {#if producto.promo.tiene_promo == true}
              <!-- content here -->
              <div class="precio_promo" title="Precio con promo">
                $ {formato_precio(producto.promo.precio)}
                <!-- <i class="material-icons icono_pequeno svelte-x2i8nw" >new_releases</i> -->
              </div>
            {/if}
          </td>
        </tr>
        <tr>
          <td class="marca" title="marca">{producto.marca}</td>

          <td class="categoria" title="categoría">
            {producto.subcategoria.nombre ? producto.subcategoria.nombre : ""}
          </td>
          <td style="text-align:left;" class="indice_row codigo" title="codigo"
            >{producto.codigo}</td
          >
        </tr>
      </table>
    </div>
  {:else}
    <div out:fly={{ x: -10, duration: 100 }} class="pointer ">
      <table style="width:100%">
        <tr>
          <td class="indice_row">{indice})</td>
          <td style="width:50%">
            <input
              class="input centrado"
              type="number"
              max={disponible}
              min="1"
              bind:value={cantidad}
              id={producto._id}
              class:rojo={cantidad < 1 || cantidad > disponible}
            />
            <!-- <Textfield
              error={cantidad < 1 ? 'Cantidad no puede ser menor a 1' : ''}
              max={disponible}
              min="1"
              style="background:white;"
              outlined
              type="number"
              id={producto._id}
              bind:value={cantidad} /> -->
          </td>

          <td class="precio_ancho">
            <div class="display-flex ">
              <div class="margen_vert_auto div_boton">
                ${formato_precio(producto.precio)}
              </div>

              {#if disponible > 0}
                <div class="div_boton">
                  <!-- content here -->
                  <Button
                    title="Agregar (Enter)"
                    disabled={disponible <= 0}
                    color="#7575ff"
                    raised
                    icon
                    on:click={agregar}
                  >
                    <i class="material-icons">add_circle</i>
                  </Button>
                </div>
              {/if}
            </div>
            {#if producto.promo.tiene_promo == true}
              <!-- content here -->

              <div class="display-flex">
                <div class="precio_promo div_boton" title="Precio con promo">
                  $ {formato_precio(producto.promo.precio)}
                  <!-- <i class="material-icons icono_pequeno svelte-x2i8nw" >new_releases</i> -->
                </div>

                {#if disponible > 0}
                  <!-- content here -->
                  <div class="div_boton margen_vert_auto">
                    <Button
                      title="Agregar con promoción"
                      disabled={disponible <= 0}
                      color="rgb(72 169 84)"
                      raised
                      icon
                      on:click={() => agregar(true)}
                    >
                      <i class="material-icons">add_circle</i>
                    </Button>
                  </div>
                {/if}
              </div>
            {/if}
          </td>
        </tr>
      </table>
    </div>
  {/if}
</div>

<style>
  .row {
    height: 110px;
    overflow: hidden;
    padding-top: 10px;
    margin-top: 10px;
    padding-bottom: 1px;
    border: 1px solid #dedede;
    border-radius: 5px;
  }

  .row:hover {
    background: rgb(115, 181, 251);
    box-shadow: inset 0 0 20px 0px #418ad8;
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

  .no_aplicar_descuento {
    color: rgb(90, 0, 0);
  }

  .insuficientes_componente:hover {
    background: rgb(252, 194, 194);
    color: white;
    cursor: default;
  }
  .icono_promo {
    /* color: #673AB7; */
    color: black;
  }

  .precio_promo {
    background: #4caf50;
    padding: 5px;
    color: white;
    font-weight: 400;
    border-radius: 13px;
    border: 1px dashed #009206;
    /* box-shadow: 0 0 4px 0px #ffffff9e; */
    box-shadow: 0 0 4px 0px #ffffff9e, inset 0 0 20px 0px #1447a769;
    margin-top: 5px;
  }
  .icono_pequeno {
    font-size: 1em;
  }
  .input {
    font-size: 3em;
    border-radius: 13px;
    padding: 4px;
    /* color: #222d32; */
    max-width: 350px;
    min-width: 150px;
    margin: auto 0;
    color: #7575ff;
  }

  .div_boton {
    width: 50%;
    text-align: right;
  }

  .codigo {
    font-family: "Cutive Mono", monospace;

    font-size: 12px;
  }
</style>
