<script>
  //import Tarjeta_puntuada from './_tarjeta_puntuada/index.svelte';
  import Puntuacion from "./puntuacion.svelte";
  import { formato_precio } from "./../../stores";
  export var nombre = "Led C6";
  export var precio = 0.0;
  export var titulo = "Lorem";
  export var contenido = `Lorem ipsum dolor sit amet consectetur adipisicing elit. Aperiam eos et
    animi debitis. Autem facere, error earum vero eum eaque ullam nesciunt, sed
    repellendus dignissimos dolorum. Maiores asperiores rem doloremque. Lorem
    ipsum dolor sit, amet consectetur adipisicing elit. Totam vitae quos nisi
    quam modi eveniet, perspiciatis minima sunt dolore dignissimos explicabo
    repellendus saepe dolores incidunt mollitia? Earum ea debitis architecto.`;
</script>

<style>
  .col50 {
    width: 48%;
    padding: 0 10px;
  }

  .contenedor {
    display: flex;
    margin: 0 3vw;
    color:#282828;
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
  .row-puntuacion {
    display: flex;
    width: 100%;
  }
  .base_puntos {
    width: 50%;
  }
  .precio {
    width: 50%;
    text-align: right;
  }
  .nombre-producto {
    margin-bottom: 9px;
  }
  .contenido {
    text-align: justify;
    font-weight: 300;
    font-size: 1.15em;
  }
  .titulo {
    font-size: 40px;
  }

  @media only screen and (max-width: 750px) {
    .contenedor {
      display: block;
    }

    .col50 {
      width: 100%;
    }

    .titulo {
      text-align: center;
      font-size: 40px;
    }
  }
</style>

<div class="contenedor">
  <div class="col50">

    <div class="tarjeta">

      <!-- <Tarjeta_puntuada/> -->
      <!-- <Tarjeta_puntuada/> -->
      <div class="imagen_div">
        <img src="productos/1181.png" class="imagen_producto" alt="" />
      </div>
      <div class="nombre-producto">{nombre}</div>
      <div class="row-puntuacion">

        <div class="base_puntos">
          <Puntuacion puntuacion={5} />
        </div>
        <div class="precio">$ {formato_precio(precio)}</div>
      </div>
    </div>
  </div>
  <div class="col50">
    <h1 class="titulo">{titulo}</h1>
    <div class="contenido">{contenido}</div>
  </div>

</div>
