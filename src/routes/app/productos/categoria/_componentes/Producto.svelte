<script>
  export let descripcion;
  export let id_categoria;
  export let _id;
  export let children;
  import { fly } from "svelte/transition";
  import Dialog_Agregar from "./Dialogo_Agregar.svelte";
  import { editar_store } from "./../../../../stores";
  import {
    seleccionando_padre_nuevo,
    padre_nuevo,
    categoria_nuevo_nombre,
    categoria_padre_maximo_selecto
  } from "./../store";
  let selecto = false;

  $: if ($editar_store.categoria) {
    selecto = $editar_store.categoria.id_categoria === id_categoria;
  }

  function seleccion() {
    // expanded = !expanded;
    $categoria_padre_maximo_selecto = false;
    if ($seleccionando_padre_nuevo === false) {
      $editar_store.categoria = {
        descripcion,
        id_categoria,
        _id
      }; //    poner de una vez el nombre de la categoria seleccioanda para poder editarse facilmente
      $categoria_nuevo_nombre = $editar_store.categoria.descripcion;
      $padre_nuevo = null;
    } else {
        
      if ($editar_store.categoria.descripcion === descripcion) return;

      $padre_nuevo = {
        descripcion,
        id_categoria,
        _id
      };
    }
  }

  //$: type = descripcion.slice(descripcion.lastIndexOf('.') + 1);
</script>

<style>
  span {
    padding: 0 0 0 1.5em;
    background: 0 0.1em no-repeat;
    background-size: 1em 1em;
    font-size: 2em;
    cursor: pointer;
  }
  span:hover {
    color: gray;
  }

  .selecto {
    text-decoration-line: underline;
  }
  .selecto:hover {
    color: #40f;
  }

  .selecto_padre_segundo {
    text-decoration-line: underline;
    color: rgb(28, 141, 0);
  }
  .selecto_padre_segundo:hover {
    color: rgb(28, 141, 0);
  }
</style>

<span
  class:selecto
  class:selecto_padre_segundo={$padre_nuevo ? $padre_nuevo.id_categoria === id_categoria : false}
  class:herramientas={selecto}
  style=""
  data-id={_id}
  in:fly={{ x: -10, duration: 450 }}
  on:click={seleccion}>
  {descripcion}
</span>
