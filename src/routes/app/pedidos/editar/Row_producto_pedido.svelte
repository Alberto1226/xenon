<script>
  import { fly, fade } from "svelte/transition";
  import { onMount, createEventDispatcher } from "svelte";
  import Lista_de_folios from "./lista_de_folios.svelte";
  import { Textfield, Button } from "svelte-mui/src";
  import {
    lista_productos_en_pedido_en_edicion,
    formato_precio,
    productos,
    editar_store,
    pedidos,
  } from "./../../../stores";
  import { usuario_db, mensajes_app, postData } from "./../../../stores";
  export var item_pedido;
  export var indice;
  export var descuento_a_usar;
  export let id;
  export let id_carrito;
  export let id_registro;
  export let procesando_en_la_nube;
  const dispatch = createEventDispatcher();
  var producto;
  var imagen;
  var db;
  var ref_txt = "productos/1583181280094imagen187.jpg";
  var cantidad = 1;
  var actualizado = false;
  var folios = [];
  var precio_nuevo;
  let cliente;
  var es_par = false;
  var lista_de_folios_visible = false;
  var cantidad_selecta = 0;
  var folios_selectos = [];

  $: producto = item_pedido.producto;

  $: cantidad = item_pedido.cantidad;
  $: if (cantidad) {
    actualizado = true;

    setTimeout(() => {
      actualizado = false;
    }, 1000);
  }
  onMount(() => {
    //console.log(item_pedido);
    es_par = isOdd(indice + 1) == 0;
    //    SOLAMENTE NECESARIO POR CAMBIO DE VERSION
    if (item_pedido.promo == undefined) {
      item_pedido.promo.con_promo = false;
    }
    sumar_cantidades();
    if (item_pedido.folios) {
      folios_selectos = item_pedido.folios.map((elem) => {
        return {
          folio: elem,
          selecto: true,
        };
      });
    }

    //console.log({ losqueyatenia: item_pedido.folios });
    cliente = $editar_store.pedido.cliente;
    precio_nuevo = producto.precio;

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

  function toggle_visible_info_promo() {
    visible_info_promo = !visible_info_promo;
  }

  function isOdd(num) {
    return num % 2;
  }

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
    procesando_en_la_nube = true;
    producto.precio = precio_nuevo;
    let registro = { producto, cantidad: 0 };
    let donde = "eliminar";
    //console.log(registro);
    postData("/app/pedidos/editar/cambiar_cantidad", {
      registro,
      id_carrito,
      donde,
    })
      .then((respuesta) => {
        procesando_en_la_nube = false;
        //console.log(respuesta)
        if (respuesta.ok) {
          $mensajes_app.push({ tipo: "exito", mensaje: "Producto eliminado" });
          $mensajes_app = $mensajes_app;
          var indice_a_borrar = $lista_productos_en_pedido_en_edicion.findIndex(
            (element) =>
              JSON.stringify(element.producto._id) ==
              JSON.stringify(producto._id),
          );
          $lista_productos_en_pedido_en_edicion.splice(indice_a_borrar, 1);
          $lista_productos_en_pedido_en_edicion =
            $lista_productos_en_pedido_en_edicion;
          actualizar_apartado_local();
          borrar_de_pedido_actual();
        }
      })
      .catch((err) => {
        console.log(err);
        procesando_en_la_nube = false;
        $mensajes_app.push({
          tipo: "error",
          mensaje: "Precio no se pudo cambiar cambiado",
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function cambiar_precio() {
    if (isNaN(precio_nuevo) || precio_nuevo < 0) {
      $mensajes_app.push({ tipo: "error", mensaje: "No es un valor válido" });
      $mensajes_app = $mensajes_app;
    }
    procesando_en_la_nube = true;
    producto.precio = precio_nuevo;
    let registro = { producto, cantidad };
    //console.log(registro);
    postData("/app/pedidos/editar/cambiar_precio", { registro, id_carrito })
      .then((respuesta) => {
        procesando_en_la_nube = false;
        //console.log(respuesta)
        if (respuesta.ok) {
          $mensajes_app.push({ tipo: "exito", mensaje: "Precio cambiado" });
          $mensajes_app = $mensajes_app;
          var prod_temp = $lista_productos_en_pedido_en_edicion.find(
            (element) => element.producto.codigo == producto.codigo,
          );
          prod_temp.precio = precio_nuevo;
          $lista_productos_en_pedido_en_edicion =
            $lista_productos_en_pedido_en_edicion;
          mostrando_producto = true;
          actualizado = true;
          setTimeout(() => {
            actualizado = false;
            dispatch("actualizar_totales");
          }, 500);
        }
      })
      .catch((err) => {
        console.log(err);
        procesando_en_la_nube = false;
        $mensajes_app.push({
          tipo: "error",
          mensaje: "Precio no se pudo cambiar cambiado",
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function cambio_en_input(evt) {
    if (evt.key == "Enter") {
      cambiar_precio();
    }
  }

  function actualizar_apartado_local() {
    try {
      let lista_temp = $productos.lista;

      let producto_temp = lista_temp.find(
        (element) => element._id === producto._id,
      );
      producto_temp.carritos = producto_temp.carritos.filter(
        (element) => element.cliente.id !== cliente.id,
      );

      dispatch("actualizar_lista");

      $productos.lista = lista_temp;
      $productos = $productos;

      sumar_cantidades();
    } catch (err) {
      // console.log("");
    }
  }

  function borrar_de_pedido_actual() {
    let pedido_actual = $editar_store.pedido;

    let lista_temp = pedido_actual.lista.filter(
      (element) => element._id != producto._id,
    );
    //dispatch('actualizar_lista')
    $editar_store.pedido.lista = lista_temp;
    $editar_store = $editar_store;

    let lista_tmp = $pedidos.lista;

    let pedido_en_lista_stores = lista_tmp.find(
      (element) => element._id === $editar_store.pedido._id,
    );
    let lista_pedido_en_stores = pedido_en_lista_stores.lista;
    lista_pedido_en_stores = lista_pedido_en_stores.filter(
      (element) => element._id !== producto._id,
    );

    $pedidos.lista = lista_tmp;
    $pedidos = $pedidos;

    dispatch("se_borro_el_producto");
    //  sumar_cantidades()
  }

  async function obtener_folios() {
    postData("/app/pedidos/editar/regresar_folios", {
      id: producto._id,
    }).then((respuesta) => {
      //console.log({ respuesta });
      if (respuesta.ok == true) {
        //folios = respuesta.folios;
        let tmpfolios = [];
        tmpfolios = respuesta.folios.map((elem) => {
          return { folio: elem, selecto: false };
        });
        folios = tmpfolios;

        lista_de_folios_visible = true;
      }
    });
  }

  async function Insertar_Folios(cantidad) {
    // console.log("Cantidad de proiducto en el carrito", cantidad);
    lista_de_folios_visible = true;
    // obtener_folios();
  }
</script>

<Lista_de_folios
  bind:selectos={folios_selectos}
  bind:cantidad_selecta
  cantidad_total={cantidad}
  {id_carrito}
  {id_registro}
  {producto}
  bind:cantidad
  bind:visible={lista_de_folios_visible}
  bind:folios
/>

<div
  {id}
  class="row"
  class:back_par={es_par}
  on:mouseout={ocultar_cantidad_agregar}
  on:mouseover={evitar_cerrarse}
>
  <!-- Producto en lista -->
  <div class="grid-container no_select" class:row_actualizado={actualizado}>
    <div class="uno">
      <table>
        <tr>
          <td>
            <span class="indice_row">{indice + 1})</span>
          </td>
          <td>
            {#if producto.promo.tiene_promo == true}
              {#if item_pedido.promo.con_promo == true}
                <!-- SI FUE APLICADO  -->
                <div class="icono_promo">
                  <i class="material-icons" title="Promoción aplicada"
                    >new_releases</i
                  >
                </div>
              {:else}
                <!-- NO FUE APLICADO -->
                <div class="icono_promo_no_aplicada">
                  <i class="material-icons" title="Promoción no aplicada"
                    >new_releases</i
                  >
                </div>
              {/if}
            {/if}
            <div
              data-imagen={ref_txt}
              class="imagen_row_circular"
              style="background-image:url({imagen})"
            />
          </td>
        </tr>
      </table>
    </div>
    <div class="dos padding">
      <span title="Nombre">{producto.nombre} </span>
      <br />
      <span class="gris_pequeno" title="Marca">{producto.marca}</span>
    </div>
    <div
      class:padding_2={mostrando_producto}
      class:padding_3={!mostrando_producto}
      class="tres"
    >
      {#if mostrando_producto}
        <table>
          <tr>
            {#if item_pedido.promo.con_promo == true}
              <td title="Precio con promoción">
                <!-- content here -->
                <div class="precio_promo" title="Precio con promo">
                  $ {formato_precio(producto.precio)}
                  <!-- <i class="material-icons icono_pequeno " >new_releases</i>  -->

                  {#if $usuario_db.rol === "administrador"}
                    <Button
                      icon
                      style="width: 26px;height: 26px;"
                      color="white"
                      raised
                      on:click={ver_editar_precio}
                      title="Editar precio"
                    >
                      <i
                        class="material-icons vertical-alineado icono_pequeno verde"
                        >create</i
                      >
                    </Button>
                  {/if}
                </div>
                <div class="cantidad" title="Cantidad de unidades ">
                  X {cantidad}
                </div>
              </td>
            {:else}
              <td title="Precio con descuento aplicado ">
                $ {formato_precio(producto.precio)}
                {#if $usuario_db.rol === "administrador"}
                  <Button
                    icon
                    style="width: 26px;height: 26px;"
                    color="white"
                    raised
                    on:click={ver_editar_precio}
                    title="Editar precio"
                  >
                    <i
                      class="material-icons vertical-alineado icono_pequeno verde"
                      >create</i
                    >
                  </Button>
                {/if}
                <!-- <span class="indice_row">x</span> -->
                <div class="cantidad" title="Cantidad de unidades ">
                  X {cantidad}
                </div>
              </td>
            {/if}

            <!-- {#if $usuario_db.rol === 'administrador'}
         
              <td>
                <Button
                  icon
                  dense
                  color="white"
                  raised
                  on:click={ver_editar_precio}
                  title="Editar precio">
                  <i class="material-icons vertical-alineado icono_pequeno verde">create</i>
                </Button>
              </td>
            {/if} -->
          </tr>
          <tr>
            <td>
              <img
                src="imagenes/barras.png"
                alt=""
                class="folios"
                on:click={Insertar_Folios(cantidad)}
              />
            </td>
            <td title="Folios selectos">
              <br /> folios selectos:{folios_selectos.length}
            </td>
          </tr>
        </table>
      {:else}
        <table style="width:200px">
          <tr>
            <td style="width:80%">
              <Textfield
                error={precio_nuevo < 0 ? "Precio no puede ser menor a 0" : ""}
                min="0"
                style="background:white;width:100%;"
                outlined
                type="number"
                id="input_1"
                on:keyup={cambio_en_input}
                bind:value={precio_nuevo}
              />
            </td>
            <td>
              <Button
                icon
                disabled={procesando_en_la_nube}
                dense
                color="#7575ff"
                on:click={cambiar_precio}
                title="Cambiar precio"
              >
                <i class="material-icons">save</i>
              </Button>
            </td>
          </tr>
        </table>
      {/if}
      <div>
        {#if producto.aplicar_descuento_distribuidor}
          <!-- content here -->
          <span class="gris_pequeno">Si aplica descuento</span>
        {:else}
          <!-- else content here -->
          <span class="indice_row no_aplica"><b>No</b> aplica descuento</span>
        {/if}
      </div>
    </div>
    <div class="cuatro padding2">
      <b>${formato_precio(producto.precio * cantidad)}</b>
      <Button
        icon
        dense
        disabled={procesando_en_la_nube || $usuario_db.rol == "almacen"}
        color="darkorange"
        on:click={quitar_de_pedido}
        title="Borrar"
      >
        <i class="material-icons">delete</i>
      </Button>
    </div>
  </div>
</div>

<style>
  .folios {
    cursor: pointer;
  }
  .grid-container {
    display: grid;
    grid-template-columns: 0.6fr 1fr 1.4fr 1fr;
    grid-template-rows: 0.4fr;
    grid-template-areas: "uno dos tres cuatro";
  }

  .uno {
    grid-area: uno;
    margin: auto 0;
  }

  .dos {
    grid-area: dos;
    margin: auto 0;
  }

  .tres {
    grid-area: tres;
  }

  .cuatro {
    grid-area: cuatro;
    text-align: right;
    /* padding-top: 15px; */
    margin: auto 0;
  }

  .row {
    /* height: 70px; */
    overflow: hidden;
    position: relative;
    padding: 12px 0;
  }
  .row:hover {
    background: #cccccc;
    color: black;
  }
  .row:hover > div > div > div > .no_aplica {
    /* background: #212121; */
    color: #f44336;
  }
  .padding {
    padding-top: 15px;
  }

  .padding_2 {
    /*padding-top: 10px;*/
  }
  .padding_3 {
    padding-top: 2px;
  }
  .cantidad {
    font-size: 1.1em;
    font-weight: 800;
    padding: 4px;
    margin: 0 auto;
    background-color: #194d82;
    border: 1px solid #15416d;
    box-shadow: 0 0 3px #194d82;
    /* background-color: #19825c;
    border: 1px solid #004841;
    box-shadow: 0 0 3px #19825c; */
    color: white;
    border-radius: 20px;
    width: 33px;
    text-align: center;
  }
  .no_aplica {
    color: rgb(90, 0, 0);
  }
  .icono_promo {
    color: #4caf50;
    position: absolute;
    margin-left: 38px;
  }
  .icono_promo_no_aplicada {
    color: #ff9800;
    position: absolute;
    margin-left: 38px;
  }
  .icono_pequeno {
    font-size: 0.8em;
  }
  .precio_promo {
    background: #4caf50;
    padding: 5px;
    color: white;
    font-weight: 400;
    border-radius: 25px;
    border: 1px dashed #009206;
    /* box-shadow: 0 0 4px 0px #ffffff9e; */
    box-shadow:
      0 0 4px 0px #ffffff9e,
      inset 0 0 20px 0px #1447a769;
    margin-bottom: 5px;
    margin-top: 5px;
  }

  .back_par {
    background: #e6e6e6;
    color: #222d32;
  }

  .gris_pequeno {
    font-weight: 200;
    color: gray;
    font-size: 0.8em;
    margin-left: 10px;
  }
</style>
