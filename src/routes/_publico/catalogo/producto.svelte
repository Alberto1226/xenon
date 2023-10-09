<script>
  import {
    producto_seleccionado,
    formato_precio,
    mostrando_producto
  } from "./../../stores";
  import { scale } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { goto } from "@sapper/app";
  import { Button } from "svelte-mui/src";
  import { onMount } from "svelte";

  onMount(() => {
    if ($producto_seleccionado === null) goto("publico/catalogo");
    $mostrando_producto = true;
    console.log($producto_seleccionado);
  });

  var cantidad = 0;

  function incrementar() {
    cantidad++;
  }

  function decrecrementar() {
    if (cantidad === 0) return;
    cantidad--;
  }
  function cerrar(evt) {
    console.log("cerrando");

    console.log(evt);
    console.log(evt.explicitOriginalTarget);
    console.log(evt.explicitOriginalTarget);

    // console.log(evt.explicitOriginalTarget[0].id);
    let contenedor_hijo = evt.path
      ? evt.path[0].id
      : evt.explicitOriginalTarget.id;

    if (contenedor_hijo === "fondo_de_emergente") {
      $mostrando_producto = false;
      regresar();
    }
  }

  function regresar() {
    goto("publico/catalogo");
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      regresar();
    }
  }
</script>

<style>
  .grid-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 2.4fr 34.1px 2.1fr;
    grid-template-areas: "imagen barra_derecha" "margen_medio margen_medio" "descripcion descripcion";
  }

  .imagen {
    grid-area: imagen;
  }

  .barra_derecha {
    grid-area: barra_derecha;
  }

  .margen_medio {
    grid-area: margen_medio;
  }

  .descripcion {
    grid-area: descripcion;
  }

  .fondo_base {
    cursor: pointer;
    box-shadow: 5px 5px 5px gray;
    background: rgba(22, 22, 22, 0.425);
    height: 80%;
    width: 100%;
    z-index: 2;
    position: absolute;
    top: 68px;
    left: 0px;
  }

  .fondo_producto {
    cursor: initial;
    box-shadow: 5px 5px 5px gray;
    background: white;
    height: 80%;
    width: 90%;
    margin: 2px 0px 0px 5%;
  }

  .imagen2 {
    max-width: 96%;
    width: 96%;
    margin: 0px;
    float: left;
    /* margin-top: -120px; */
  }
  .titulo {
    text-align: center;
    width: 100%;
    height: 14%;
    margin: 0px;
    float: left;

    font-size: 1.6em;
    padding-top: 27px;
    font-weight: 700;
    color: rgb(42, 42, 42);
  }

  .descripcion {
    text-align: justify;
    font-size: 0.7em;
    font-weight: 100;
  }

  .barra_superior {
    position: absolute;
    width: 100vw;
    height: 54px;
    padding-top: 16px;
    top: 0px;
    left: 0px;
    z-index: 3;
    background: red;
    color: white;
  }
  .precio {
    font-size: 1.2em;
    font-weight: 700;
  }
  .medio-alto {
    z-index: 2;
    height: 52vh;
  }
  .sub-titulo {
    font-size: 0.8em;
  }
  .controles-carrito {
    display: flex;
  }

  .iconos {
    color: red;
  }

  .boton-carrito {
    cursor: pointer;
    border-radius: 29px;
    height: 45px;
    width: 45px;
  }

  .cantidad {
    padding-top: 11px;
    width: 50px;
  }

  .texto-obscuro {
    color: rgb(42, 42, 42);
  }
  .precio {
    font-size: 1.3em;
    font-weight: 300;
  }
  .poligono-background {
    position: absolute;
    top: 150px;
    z-index: 1;
    transform: rotate(45deg); /* Equal to rotateZ(45deg) */
    background-color: rgb(255, 0, 43);
    width: 50vw;
    height: 50vw;
  }
</style>

<svelte:window on:keydown={handleKeydown} />
{#if $producto_seleccionado}
  <!-- content here -->
  <div class="poligono-background" />
  <div
    id="fondo_de_emergente"
    class="fondo_base"
    on:click|stopPropagation={cerrar}>

    <div
      class="fondo_producto texto-obscuro"
      in:scale={{ duration: 400, opacity: 0.5, start: 0.5, easing: quintOut }}>

      <div class="grid-container">
        <div class="imagen centrado">

          <img
            class="medio-alto imagen2"
            src={$producto_seleccionado.galeria_imagenes.length > 0 ? $producto_seleccionado.galeria_imagenes[0] : ''}
            alt="Fotografía" />
          <br />

          <div class="precio">
            mostrando_producto = {$mostrando_producto} $ {formato_precio($producto_seleccionado.precio)}
          </div>
        </div>
        <div class="barra_derecha">
          <div class="titulo">
            {$producto_seleccionado.nombre}
            <div class="sub-titulo">{$producto_seleccionado.marca}</div>
            <div class="controles-carrito">
              <button class="boton-carrito pointer" on:click={incrementar}>
                <i class="material-icons iconos">add_circle_outline</i>
              </button>

              <div class="cantidad">{cantidad}</div>

              <button class="boton-carrito pointer" on:click={decrecrementar}>
                <i class="material-icons iconos">remove_circle_outline</i>
              </button>
            </div>
            <div class="descripcion">{$producto_seleccionado.descripcion}</div>
          </div>
          <div class="precio" />

        </div>
        <div class="margen_medio" />

      </div>

    </div>
  </div>
{/if}
<div class="barra_superior">
  <Button on:click={regresar} color="white">
    <i class="material-icons vertical-alineado">keyboard_backspace</i>
    regresar
  </Button>
</div>
