<script>
  export var producto;
  export var indice;
  import { scale, fade } from "svelte/transition";
  import {
    formato_precio,
    producto_selecto,
    mensajes_app,
    productos,
    usuario_db,
    postData,
    paginas_actuales,
    mensaje_bueno,
    mensaje_error,
  } from "./../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import { Button } from "svelte-mui/src";
  import { goto } from "@sapper/app";

  const dispatch = createEventDispatcher();

  // Get a reference to the storage service, which is used to create references in your storage bucket
  var storage;
  var path;
  var viendo_folios;
  // Create a storage reference from our storage service
  var storageRef;
  var spaceRef;
  var imagen = "";
  var total_reservado = 0;
  var procesando = false;
  var carritos_visibles = false;
  let http_ocupado = false;
  let cambio_existencia_visible = false;
  let cantidad_existente = 0;
  let cantidad_a_ingresar = 1;
  let visible_borrar = false;
  var folios = [];
  var promo = { tiene_promo: false };
  var viendo_masterbox_inyector = false;

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  onMount(() => {
    // Points to the root reference
    imagen = "imagenes/producto_generico.svg";
    sumar_cantidades();
    promo = producto.promo;
    folios = producto.existencia.folios.map((elem) => {
      return {
        folio: elem,
        selecto: false,
      };
    });
    //console.log(promo);
    cantidad_existente = producto.existencia.actual;
    if (producto.galeria_imagenes == undefined) return;
    if (producto.galeria_imagenes.length > 0) {
      imagen = producto.galeria_imagenes[0];
    }

    ////console.log(pathReference);
  });

  function ir_a_movimientos_por_producto() {
    $producto_selecto = producto;
    goto("app/productos/movimientos_por_producto");
  }
  function ir_a_todos_movimientos_por_producto() {
    $producto_selecto = producto;
    goto("app/productos/todos_los_movimientos");
  }

  function teclado_escribir_existencias(evt) {
    if (evt.key === "Enter") {
      sobreescribir_existencias_producto();
    }
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
    //console.lo(producto.nombre);

    //console.lo(producto.carritos);

    total_reservado = producto.carritos.reduce((a, b) => +a + +b.cantidad, 0);
  }

  function cambiar_status_activo(status) {
    procesando = true;
    postData("app/productos/status_activo", {
      id: producto._id,
      activo: status,
    })
      .then((respuesta) => {
        if (respuesta.ok) {
          //console.lo(respuesta);
          let adjetivo = !status ? "desactivado" : "activado";
          $mensajes_app.push({
            tipo: "exito",
            mensaje: `producto ${producto.nombre} ${adjetivo} .`,
          });
          $mensajes_app = $mensajes_app;
          var producto_tmp = $productos.lista.find(
            (producto_t) => producto_t._id == producto._id
          );
          producto.activo = status;
          producto_tmp.activo = status;
          $productos = $productos;
          procesando = false;
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: `No se pudo cambiar su status de activación .`,
          });
          $mensajes_app = $mensajes_app;
        }
      })
      .catch((err) => {
        console.log(err);

        let accion = producto.activo ? "desactivar" : "activar";
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo ${accion} al producto.`,
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }

  function sobreescribir_existencias_producto(evt) {
    if (isNaN(cantidad_existente) || cantidad_existente < 0) return;
    if (http_ocupado) return;
    http_ocupado = true;
    console.log("-*----");
    console.log(evt);
    console.log(evt.detail.cantidad_existente);

    postData("app/productos/sobreescribir_existencias_producto", {
      id: producto._id,
      existencia: cantidad_existente,
    })
      .then((doc) => {
        cambio_existencia_visible = false;
        http_ocupado = false;
        //console.log(doc.data())
        //console.log(doc);
        if (doc.ok) {
          //producto.existencia.actual = cantidad_existente;
          //console.log(producto.existencia)
          mensaje_bueno(
            `Existencias de <b>${producto.nombre}</b> actualizadas a ${cantidad_existente}.`
          );
          var lista_temp = $productos.lista;
          var producto_temp = lista_temp.find(
            (prod) => prod._id == producto._id
          );
          producto_temp.existencia.actual = cantidad_existente;
          producto.existencia.actual = cantidad_existente;
          $productos.lista = lista_temp;
          $productos = $productos;
          setTimeout(() => {
            //dar chance que pase por la cadena el nuevo producto via binding
            sumar_cantidades();
          }, 500);
        }
      })
      .catch((error) => {
        http_ocupado = false;

        mensaje_error("No se pudo actualizar las existencias del producto.");
        cambio_existencia_visible = false;
      });
  }

  function inyectar_ingresar_existencias(evt) {
    if (isNaN(cantidad_existente) || cantidad_existente < 0) return;
    if (http_ocupado) return;
    http_ocupado = true;
    var folios = evt.detail.folios;

    postData("app/productos/inyectar_ingresar_existencias", {
      id: producto._id,
      existencia: cantidad_existente,
      cantidad_a_inyectar: cantidad_a_ingresar,
      folios,
    })
      .then((doc) => {
        cambio_existencia_visible = false;
        http_ocupado = false;
        //console.log(doc.data())
        if (doc.ok) {
          mensaje_bueno(
            `Ingreso nuevo en existencias de <b>${producto.nombre}</b> actualizadas a ${cantidad_existente}.`
          );
          var lista_temp = $productos.lista;
          var producto_temp = lista_temp.find(
            (prod) => prod._id == producto._id
          );
          producto_temp.existencia.actual =
            +cantidad_existente + +cantidad_a_ingresar;
          producto.existencia.actual =
            +cantidad_existente + +cantidad_a_ingresar;
          $productos.lista = lista_temp;
          $productos = $productos;
          cantidad_existente += cantidad_a_ingresar;
          setTimeout(() => {
            //dar chance que pase por la cadena el nuevo producto via binding
            sumar_cantidades();
          }, 500);
        }
      })
      .catch((error) => {
        http_ocupado = false;

        mensaje_error("No se pudo actualizar las existencias del producto.");
        cambio_existencia_visible = false;
      });
  }

  function solicitar_producto_actual() {
    if (http_ocupado) return;
    http_ocupado = true;
    postData("app/productos/regresar_producto", {
      id: producto._id,
    })
      .then((doc) => {
        http_ocupado = false;
        //console.log(doc.data())
        //console.log(doc);
        if (doc.ok) {
          $mensajes_app.push({
            tipo: "exito",
            mensaje: `Existencias y reservados de  <b>${producto.nombre}</b> actualizado.`,
          });
          $mensajes_app = $mensajes_app;
          var lista_temp = $productos.lista;
          var producto_temp = lista_temp.find(
            (prod) => prod._id == producto._id
          );
          producto_temp.existencia = doc.producto.existencia;
          producto_temp.carritos = doc.producto.carritos;

          producto.existencia = producto_temp.existencia;
          producto.carritos = producto_temp.carritos;
          $productos.lista = lista_temp;
          $productos = $productos;
          setTimeout(() => {
            //dar chance que pase por la cadena el nuevo producto via binding
            sumar_cantidades();
          }, 500);
        }
      })
      .catch((error) => {
        http_ocupado = false;
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo actualizar las existencias del producto.`,
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function borrar_para_siempre(status) {
    procesando = true;
    postData("app/productos/borrar_producto", {
      id: producto._id,
    })
      .then((respuesta) => {
        console.log(respuesta);
        if (respuesta.ok) {
          //console.lo(respuesta);
          visible_borrar = false;
          procesando = false;
          dispatch("recargar_lista");
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: `No se pudo borrar el producto.`,
          });
          $mensajes_app = $mensajes_app;
        }
      })
      .catch((err) => {
        console.log(err);

        let accion = producto.activo ? "desactivar" : "activar";
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo borrar el producto.`,
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }
</script>

<div
  class="grid-container row"
  class:row_activo={producto.activo === true}
  class:cliente_inactivo={producto.activo === false}
>
  <div class="uno">
    <table>
      <tr>
        <td>
          <span class="indice_row">
            {10 * $paginas_actuales.productos + indice + 1 - 10})
          </span>
        </td>
        <td>
          {#if promo.tiene_promo == true}
            <div in:scale={{ duration: 200, delay: 500 }} class="icono_promo">
              <i class="material-icons" title="Promoción ">new_releases</i>
            </div>
          {/if}
          {#if producto.galeria_imagenes != undefined && producto.galeria_imagenes.length > 0}
            <!-- content here -->

            <div
              class="imagen_row pointer"
              style="background-image:url({imagen ? imagen : ''})"
            />
          {/if}
        </td>
      </tr>
    </table>
    <div class="id pointer">
      {producto._id}
    </div>
  </div>
  <div class="dos">{producto.codigo}</div>
  <div class="tres">{producto.nombre}</div>
  <div class="cuatro">{producto.marca}</div>
  <div class="cinco centrado no_select">
    <span class="precio">$</span>
    {formato_precio(producto.precio)} <br />
    {#if promo.tiene_promo == true}
      <div class="precio_promo">
        <span>$</span>
        {formato_precio(promo.precio)}
        <i class="material-icons icono_pequeno" title="Promoción "
          >new_releases</i
        >
      </div>
    {/if}
  </div>
  <div class="seis centrado">
    {producto.subcategoria.nombre ? producto.subcategoria.nombre : "--"}
  </div>

  <div class="siete">
    <div class="display-flex">
      <div class="pointer reactivo centrado-margen">
        {producto.existencia.actual}
      </div>
      <div class="centrado-margen">
        {total_reservado}
      </div>
    </div>

    <div class="disponible centrado">
      {Number(producto.existencia.actual) - Number(total_reservado)}
    </div>
  </div>
  <!-- <div>
        {producto.descripcion}
    </div> -->
</div>

<style>
  .id {
    color: gray;
    font-size: 8px;
    position: absolute;
    transform: translateY(33px);
  }
  .disponible {
    font-size: 20px;
    margin-top: 8px;
  }
  .centrado-margen {
    margin: auto;
  }
  .cliente_inactivo {
    background-color: rgb(148 148 148);
    color: white;
    font-weight: 600;
  }
  .cliente_inactivo:hover {
    background-color: rgb(173 173 173);
  }

  .row {
    position: relative;
    height: 76px;
    overflow: hidden;
    padding: 8px;
    border-bottom: 1px solid #e1e1e1;
  }
  .row_activo:hover {
    background-color: rgb(235, 235, 235);
  }
  .grid-container {
    /* font-weight: 200; */
    padding: 1px 0px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis siete";
  }

  .uno {
    grid-area: uno;
    position: relative;
  }

  .dos {
    grid-area: dos;
    margin: auto 0;
    font-family: "Cutive Mono", monospace;
  }

  .tres {
    grid-area: tres;
    margin: auto 0;
  }

  .cuatro {
    grid-area: cuatro;
    margin: auto 0;
  }

  .cinco {
    grid-area: cinco;
    margin: auto 0;
  }

  .seis {
    grid-area: seis;
    margin: auto 0;
  }

  .siete {
    grid-area: siete;
    margin: auto 0;
  }

  .precio {
    color: gray;
    font-size: 0.8em;
  }
  .reactivo:hover {
    font-weight: 500;
  }

  .icono_bloqueado {
    color: #ff0000;
    z-index: 2;
    font-size: 74px;
    position: absolute;
    margin: -5px 0px 0px 9px;
  }
  .icono_promo {
    color: #4caf50;
    z-index: 2;
    font-size: 20px;
    position: absolute;
    margin: -5px 0px 0px 40px;
  }
  .precio_promo {
    background: #4caf50;
    padding: 5px;
    color: white;
    font-weight: 400;
    border-radius: 13px;
    border: 1px dashed #009206;
  }

  .icono_pequeno {
    font-size: 0.8em;
  }

  .icono_15px {
    font-size: 15px;
  }
</style>
