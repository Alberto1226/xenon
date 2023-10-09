<script>

</script>

<style>
  .titulo_div {
    /* position: absolute; */
    margin: 0 auto;
    color: white;
    font-size: 3em;
    left: 40vw;
    top: 75px;
    position: absolute;
    background-image: url(imagenes/header_tienda_online.png);
    height: 250px;

    background-size: contain;
  }
  .backheaderpic {
    background-color: red;
  }
  .headerpic {
    background-image: url(imagenes/header_tienda_online.png);
    width: 100vw;
    height: 100px;
    background-size: contain;
    opacity: 13%;
  }
  .titulo {
    font-size: 1.1em;
  }

  .sub-titulo {
    font-size: 0.4em;
    margin-left: 4.5em;
  }

  .x {
    color: rgb(27, 27, 27);
    font-weight: bold;
    font-size: 1.2em;
    vertical-align: middle;
  }

  @media only screen and (max-width: 750px) {
    .headerpic {
      background-size: 826px;
    }

    .titulo_div {
      left: 29vw;
    }
  }

  @media only screen and (max-width: 450px) {
    .titulo_div {
      left: 22vw;
    }
    .sub-titulo {
      display: none;
    }
    .titulo {
      font-size: 0.9em;
    }
  }
</style>

<div class="backheaderpic">
  <div
    class="headerpic"
    style="background-image:
    url(imagenes/header_tienda_online.png);height:250px;" />
</div>

<div class="">
  <div class="titulo_div">
    <span class="titulo">
      <span class="x">X</span>enon y más
    </span>
    <br />

    <span class="sub-titulo">Tienda en línea</span>
  </div>
</div>
