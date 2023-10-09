<script>
  import Header from "./header.svelte";
  import Menu_bajo_header from "./menu_bajo_header.svelte";
  import Catalogo from "./_catalogo.svelte";
  import Primer_articulo from "./primer_articulo.svelte";
  import Segundo_articulo from "./segundo_articulo.svelte";
  import Segunda_seccion from "./segunda_seccion.svelte";
  import Footer from "./footer_tienda.svelte";
</script>

<style>
  .fondo_gris {
    background-color: #e2e2e2;
    padding: 50px 0;
  }
  .ver_galeria {
    background-color: red;
    width: 230px;
    height: 60px;
    color: white;
    padding: 5px;
    border-radius: 4px;
  }

  .ver_galeria:active {
    background: rgb(212, 0, 0);
  }
  .ver_galeria:hover {
    background: rgb(255, 27, 27);
  }
</style>

<Header />
<!-- <Menu_bajo_header /> -->
<Primer_articulo />
<Segundo_articulo />
<Segunda_seccion />
<Catalogo />
<div class="centrado fondo_gris">
  <button class="ver_galeria pointer">Ver todos</button>
</div>

<Footer />
