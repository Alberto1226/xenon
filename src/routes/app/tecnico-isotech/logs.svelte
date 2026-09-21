<script>
  import JSONTree from "svelte-json-tree";
  import { storage } from "./../../stores";
  import Buscador from './buscador.svelte';
  import Log from './Log.svelte';

  var lista = [];
  var step = 50;
  var pagina_actual = 1;
  var paginas = 1;
  var accion = "todos";
</script>

<style>
  .contenedor {
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
    height: 80vh;
  }
</style>

<h3>
  Mostrando
  <b>{lista ? lista.length : "0"}</b>
  logs (db={$storage})
</h3>

<Buscador bind:paginas bind:pagina_actual bind:accion bind:lista />

<div class="contenedor">
  {#each lista as item, i (item._id)}
    <Log {item} i={i} {pagina_actual} {step} />
  {/each}
</div>
