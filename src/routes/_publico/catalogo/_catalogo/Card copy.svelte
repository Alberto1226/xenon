<script>
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";
  import { onMount } from "svelte";
  import { Ripple } from "svelte-mui/src";
  import { producto_seleccionado,formato_precio } from "./../../../stores";
  import { goto } from "@sapper/app";

  export const imagen_url = "";
  export let nombre;
  export let descripcion;
  export let _id;
  export let galeria_imagenes;
  export let precio;

  onMount(() => {
    console.log(galeria_imagenes);
  });

  const abrir = () => {
    setTimeout(() => {
      $producto_seleccionado = {
        _id,
        nombre,
        descripcion,
        galeria_imagenes
      };
      goto("publico/catalogo/producto");
    },200);
  };

  let minimizado = true;
</script>

<style>
  .contenedor {
    background: white;
    height: 310px;
    width: 42%;
    margin: 13px;
    overflow: hidden;
    cursor: pointer;
    border-radius: 4px;
    padding-bottom: 15px;
  }

  .contenedor:hover {
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

  .precio{
    font-weight: 700;
    
  }
  .col50{
    width: 50%;
  }
  .flex{
    display :flex;
  }
</style>

<div class="contenedor no_select" on:click={abrir}>
  <Ripple />


    <div class="tarjeta">

      <!-- <Tarjeta_puntuada/> -->
      <div class="imagen_div">
        <img src="productos/1181.png" class="imagen_producto" alt="" />
      </div>
      <div class="nombre-producto">{nombre}</div>
      <div class="row-puntuacion">

        <div class="base_puntos">
          <Puntuacion puntuacion={4.5} />

        </div>
        <div class="precio">$ {formato_precio(precio)}</div>
      </div>
    </div>

    
  
  <table>
    <tr>
      <td class="mitad_ancho">
        <div class="imagen_div">
          <img
            class="imagen"
            src={galeria_imagenes[0]}
            alt="Foto de producto" />
        </div>
      </td>
      <td class="mitad_ancho">

        <div class="hijo">{descripcion}</div>
      </td>
    </tr>

  </table>
  <div class=" flex">

  <div class="izquierda col50">
  {nombre}
  </div>
  <div class="precio col50">
  $ {formato_precio(precio)}
  </div>
  </div>

</div>
