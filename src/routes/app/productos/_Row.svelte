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
    editar_store,
    paginas_actuales,
    mensaje_bueno,
    mensaje_error,
  } from "./../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import {
    Button,
    ButtonGroup,
    Dialog,
    Textfield,
    Snackbar,
  } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import Lista_de_folios from "./componentes/Lista_de_folios.svelte";
  import Dialogo_existencias from "./componentes/Dialogo_cambiar_existencias.svelte";
  import Dialogo_masterbox from "./componentes/Folios_por_masterbox.svelte";

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
            (producto_t) => producto_t._id == producto._id,
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
            `Existencias de <b>${producto.nombre}</b> actualizadas a ${cantidad_existente}.`,
          );
          var lista_temp = $productos.lista;
          var producto_temp = lista_temp.find(
            (prod) => prod._id == producto._id,
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
            `Ingreso nuevo en existencias de <b>${producto.nombre}</b> actualizadas a ${cantidad_existente}.`,
          );
          var lista_temp = $productos.lista;
          var producto_temp = lista_temp.find(
            (prod) => prod._id == producto._id,
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
            (prod) => prod._id == producto._id,
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

<Dialogo_masterbox
  {producto}
  bind:folios
  bind:visible={viendo_masterbox_inyector}
/>
<Lista_de_folios {producto} bind:folios bind:visible={viendo_folios} />
<div
  class="grid-container row"
  class:row_activo={producto.activo === true}
  class:cliente_inactivo={producto.activo === false}
>
  <div class="uno">
    {#if producto.activo === false}
      <i
        class="material-icons icono_bloqueado no_select"
        title="Producto no activo para ser seleccionado por usuarios para pedidos"
        in:fade={{ duration: 350 }}>block</i
      >
    {/if}
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
              on:click={() => (viendo_folios = !viendo_folios)}
            />
          {/if}
        </td>
      </tr>
    </table>
    <div class="id pointer" on:click={() => (viendo_folios = !viendo_folios)}>
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
    <Button
      icon
      dense
      color="green"
      on:click={solicitar_producto_actual}
      title="recargar existencias y reservados"
    >
      <i class="material-icons icono_15px">refresh</i>
    </Button>

    {#if $usuario_db.rol === "administrador"}
      <!-- content here -->

      <Button
        icon
        dense
        color="green"
        on:click={() => (cambio_existencia_visible = true)}
        title="Admin- Cambiar existencias"
      >
        <i class="material-icons icono_15px">create</i>
      </Button>
    {/if}
    {#if $usuario_db.rol != "diseñador"}
      <Button
        icon
        dense
        color="green"
        on:click={() => (viendo_masterbox_inyector = true)}
        title="Inyectar usando Master-Box "
      >
        <img src="imagenes/masterbox.svg" alt="" class="masterbox" />
      </Button>
    {/if}
  </div>
  <div>
    <div class="display-flex">
      <div
        class="pointer reactivo centrado-margen"
        on:click={() => {
          if ($usuario_db.rol === "administrador") {
            carritos_visibles = true;
          } else {
            alert("Necesitas ser administrador para ver este dato.");
          }
        }}
      >
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

  {#if $usuario_db.rol != "vendedor" && $usuario_db.rol != "almacen"}
    <!-- content here -->
    <div class="once">
      <ButtonGroup>
        {#if $usuario_db.rol != "diseñador"}
          {#if producto.activo}
            <!-- content here -->
            <Button
              icon
              dense
              color="accent"
              on:click={() => {
                cambiar_status_activo(false);
              }}
              title="desactivar para pedidos"
            >
              <i class="material-icons">cancel</i>
            </Button>
          {:else}
            <!-- else content here -->
            <Button
              icon
              dense
              color="green"
              on:click={() => {
                cambiar_status_activo(true);
              }}
              title="activar para pedidos"
            >
              <i class="material-icons">check</i>
            </Button>
          {/if}
        {/if}

        {#if $usuario_db.rol != "vendedor"}
          {#if $usuario_db.rol != "diseñador"}
            <Button
              icon
              dense
              color="green"
              on:click={() => {
                $editar_store.producto = producto;
                goto("/app/productos/editar");
              }}
              title="editar"
            >
              <i class="material-icons">create</i>
            </Button>

            <Button
              icon
              dense
              color="darkorange"
              title="movimientos"
              on:click={ir_a_movimientos_por_producto}
            >
              <i class="material-icons">history</i>
            </Button>
            <Button
              icon
              dense
              color="darkorange"
              title="movimientos"
              on:click={ir_a_todos_movimientos_por_producto}
            >
              <i class="material-icons">details</i>
            </Button>
          {/if}
          {#if $usuario_db.rol == "diseñador"}
            <Button
              icon
              dense
              color="green"
              on:click={() => {
                $editar_store.producto = producto;
                goto("/app/productos/editar");
              }}
              title="editar"
            >
              <i class="material-icons">create</i>
            </Button>
          {/if}
        {/if}
      </ButtonGroup>
      <br />

      <ButtonGroup>
        {#if $usuario_db.rol != "vendedor" && $usuario_db.rol != "diseñador"}
          <Button
            icon
            dense
            color="#8c19d2"
            on:click={() => {
              $editar_store.producto = producto;
              goto("/app/productos/categoria");
            }}
            title="editar categoría"
          >
            <i class="material-icons">account_tree</i>
          </Button>
        {/if}
        {#if $usuario_db.rol === "administrador"}
          <Button
            icon
            dense
            color="#8c19d2"
            on:click={() => {
              visible_borrar = true;
            }}
            title="Borrar producto para siempre"
          >
            <i class="material-icons">delete</i>
          </Button>
        {/if}
      </ButtonGroup>

      <!--<button on:click={() => producto.ref.delete()}>Borrar</button>-->
    </div>
  {/if}
</div>

<Dialog width="750" bind:visible={carritos_visibles}>
  <div class="centrado">Apartados de producto</div>
  <div class="contenedor_lista">
    <table class="letra_chica">
      <tr>
        <td class=" col10">#</td>
        <td class="  col10">cantidad</td>
        <td class="  col10">folio</td>
        <td class=" col40">cliente</td>
        <td class=" col30">fecha</td>
      </tr>
      {#each producto.carritos as item, i}
        <!-- content here -->
        <tr>
          <td class="indice col10">{i + 1})</td>
          <td class="cantidad col10">{item.cantidad}</td>
          <td class="folio col10">{item.folio}</td>
          <td class="nombre col40">{item.cliente.nombre}</td>
          <td class="fecha col40"
            >{new Date(item.fecha).toLocaleDateString("es-MX", options)}</td
          >
        </tr>
      {:else}
        <div class="centrado">[lista vacía]</div>
      {/each}
    </table>
  </div>

  <div slot="actions" class="actions center">
    <Button color="primary" on:click={() => (carritos_visibles = false)}
      >ok</Button
    >
  </div>
</Dialog>

<Dialogo_existencias
  {producto}
  on:sobreescribir_existencias_producto={sobreescribir_existencias_producto}
  on:nuevos_ingresos_producto={inyectar_ingresar_existencias}
  bind:cantidad_existente
  bind:cantidad_a_ingresar
  bind:visible={cambio_existencia_visible}
/>

<Snackbar bind:visible={visible_borrar} bg="#f44336">
  Borrar para siempre el producto {producto.nombre}
  <span slot="action">
    <Button color="#ff0" on:click={() => (visible_borrar = false)}>
      Cancelar
    </Button>
    <Button color="primary" raised on:click={borrar_para_siempre}>
      Borrar
    </Button>
  </span>
</Snackbar>

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

  .folio {
    font-weight: 700;
  }
  .cantidad {
    font-weight: 700;
  }

  .col10 {
    width: 10%;
  }
  .col40 {
    width: 40%;
  }
  .col30 {
    width: 30%;
  }
  .indice {
    color: gray;
    font-weight: 200;
    font-size: 0.8em;
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
    padding: 36px 0px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis siete ocho  once";
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

  .ocho {
    grid-area: ocho;
    margin: auto 0;
  }

  .nueve {
    grid-area: nueve;
    margin: auto 0;
  }

  .once {
    grid-area: once;
  }
  .precio {
    color: gray;
    font-size: 0.8em;
  }
  .reactivo:hover {
    font-weight: 500;
  }
  .letra_chica {
    font-size: 0.8em;
    margin: 0 auto;
  }

  .contenedor_lista {
    height: 250px;
    overflow-y: auto;
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
