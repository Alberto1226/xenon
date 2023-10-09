<script>
  import Producto from "./Producto.svelte";
  import Dialog_Agregar from "./Dialogo_Agregar.svelte";
  import { editar_store } from "./../../../../stores";
  import { seleccionando_padre_nuevo, padre_nuevo,categoria_nuevo_nombre,categoria_padre_maximo_selecto } from "./../store";
  import { goto } from "@sapper/app";
  export let expanded = false;
  export let descripcion;
  export let children;
  export let _id;
  export let id_cat_padre;
  export let id_categoria;
  let selecto = false;
  let selecto_padre_segundo = false;

  $: if ($editar_store.categoria) {
    selecto = $editar_store.categoria.id_categoria === id_categoria;
  }

  function toggle() {
    expanded = !expanded;
    if(descripcion==="Categorias")return seleccionar_categoria_padre();
    $categoria_padre_maximo_selecto = false;
    if ($seleccionando_padre_nuevo === false) {
      $editar_store.categoria = {
        descripcion,
        id_categoria,
        _id
      };
      //    poner de una vez el nombre de la categoria seleccioanda para poder editarse facilmente
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

const seleccionar_categoria_padre = ()=>{
    $categoria_padre_maximo_selecto= true
        if($seleccionando_padre_nuevo){
            $padre_nuevo = {
                id_categoria:'null',
                descripcion:'Categorias'
            }
            return;
        }
        else{
            $editar_store.categoria =null;
        $seleccionando_padre_nuevo = false;
        $padre_nuevo = null;
        console.log('sdas')
        }
    }


  const expandir = () => {
    expanded = true;
  };
</script>

<style>
  span {
    padding: 0 0 0 1.5em;
    background: url(../imagenes/folder_cerrado.png) 0 0.1em no-repeat;
    background-size: 1em 1em;
    font-weight: bold;
    font-size: 2em;
    cursor: pointer;
  }

  .expanded {
    background-image: url(../imagenes/folder_abierto.png);
  }

  ul {
    padding: 0.2em 0 0 0.5em;
    margin: 0 0 0 0.5em;
    list-style: none;
    border-left: 1px solid #eee;
  }

  li {
    padding: 0.2em 0;
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

<div>

  <span
    class:selecto
    class:selecto_padre_segundo={$padre_nuevo ? $padre_nuevo.id_categoria === id_categoria : false}
    class:herramientas={selecto}
    class:expanded
    on:click={toggle}>
    {descripcion}
  </span>

  {#if expanded}
    <ul>
      {#each children as producto}
        <li>
          {#if producto.children.length > 0}
            <svelte:self {...producto} />
          {:else}
            <Producto {...producto} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
