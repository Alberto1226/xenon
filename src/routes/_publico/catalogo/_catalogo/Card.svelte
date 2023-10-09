<script>
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { onMount } from "svelte";
  import { Ripple } from "svelte-mui/src";
  import { producto_seleccionado, formato_precio,mostrando_producto } from "./../../../stores";
  import { goto } from "@sapper/app";
  import Puntuacion from "../puntuacion.svelte";

  export const imagen_url = "";
  export let nombre;
  export let descripcion;
  export let _id;
  export let galeria_imagenes;
  export let precio;
  export let producto;

  onMount(() => {
    //console.log(galeria_imagenes);
  });

  const abrir = () => {
    setTimeout(() => {
      //  $mostrando_producto = true;
      $producto_seleccionado = producto;
      goto("publico/catalogo/producto");
    }, 10);
  };

  let minimizado = true;
</script>

<style>
  .contenedor {
    display: flex;
    margin: 10px 1vw;
    color: #282828;
  }

  .tarjeta:hover {
    box-shadow: 0px 0px 5px 4px #25252529;
  }

  .header {
    background: gray;
    color: white;
    font-weight: 700;
    height: 24px;
    padding-top: 9px;
  }
  .hijo {
    padding: 5px;
  }
  .imagen {
    height: 210px;
  }

  .imagen_div {
    border-radius: 200px;
    background: white;
    height: 150;
  }
  .mitad_ancho {
    width: 50%;
  }

  .precio {
    font-weight: 700;
  }
  .col50 {
    width: 50%;
  }
  .flex {
    display: flex;
  }

  .imagen_div {
    margin: 0 auto;
    width: fit-content;
  }
  .imagen_producto {
    height: 40vh;
  }

  .tarjeta {
    background-color: white;
    box-shadow: 0px 1px 8px #cecece;
    padding: 17px;
    margin-top: 24px;
    border-radius: 3px;
  }
</style>

<div class="contenedor no_select" on:click|stopPropagation={abrir} id="{_id}">

  <div class="tarjeta pointer">
    <Ripple />
    <!-- <Tarjeta_puntuada/> -->
    <div class="imagen_div">
      <img
        class="imagen_producto"
        src={galeria_imagenes[0]}
        alt="Foto de producto" />

    </div>
    <div class="nombre-producto">{nombre}</div>
    <div class="row-puntuacion">

      <div class="base_puntos">
        <Puntuacion puntuacion={4.5} />
      </div>
      <div class="precio">$ {formato_precio(precio)}</div>
    </div>
  </div>


</div>
