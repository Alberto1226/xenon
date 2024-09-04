<script>
  import { Tabs, Tab, TabList, TabPanel } from "svelte-tabs";
  import Pancake from "./Pancake.svelte";
  import { Button, Ripple } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import { scale } from "svelte/transition";
  import Tarjeta from './Tarjeta.svelte';
</script>

<style>
  .imagen_grafico {
    height: 250px;
    border-radius: 5px;
  }
  .tarjeta {
    background: white;
    padding: 20px;
    width: 397px;
    margin: 25px;
    border-radius: 2px;
  }
  .tarjeta:hover {
    box-shadow: 0 0 10px gray;
  }
</style>


<svelte:head>
<title>Gráficos</title>
 </svelte:head>
<Tarjeta  url="app/graficos/Pancake" titulo="x Categorías"  tipo="Pancake" img="imagenes/pancake.webp"></Tarjeta>


<Tarjeta  url="app/graficos/BarrasProductos" titulo="x Producto"  tipo="Barras" img="imagenes/grafico_paginado_productos.png"></Tarjeta>


<Tarjeta  url="app/graficos/BarrasUsuarios" titulo="x Usuario"  tipo="Barras" img="imagenes/grafico_paginado_productos.png"></Tarjeta>


<Tarjeta  url="app/graficos/BarrasClientes" titulo="x Clientes"  tipo="Barras" img="imagenes/grafico_paginado_productos.png"></Tarjeta>

<!-- <Tarjeta  url="app/reporte/general" titulo="Reporte"  tipo="Tabla" img="imagenes/grafico_paginado_productos.png"></Tarjeta> -->


