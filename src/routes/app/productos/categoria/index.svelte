<script>
  import Arbol from "./_componentes/Arbol.svelte";
  import { postData, editar_store ,mensajes_app} from "./../../../stores";
  import { onMount } from "svelte";
  import { actualizar, categoria_padre_maximo_selecto } from "./store.js";
  import {goto} from '@sapper/app';
  import { Dialog, Textfield, Button } from "svelte-mui";
  let categorias = [];

  $: if ($actualizar) {
    $actualizar = false;
    obtener_arbol_categorias();
  }

  onMount(() => {
    setTimeout(() => {
      obtener_arbol_categorias();
    }, 100);
  });

  const obtener_arbol_categorias = () => {
    postData("devolver_arbol_de_categorias", {})
      .then(res => {
        //console.log(res);
        if (res.ok === false) return;
        //if(res.categorias)
        categorias = res.categorias.children;
      })
      .catch(err => {
        console.log(err);
      });
  };

  function en_cliente() {
    en_cliente_app = true;
  }

  //  Editar nombre
  const cambiar_categoria_de_producto = () => {
    postData("app/productos/categoria/seleccionar_categoria_producto", {
      producto_id: $editar_store.producto._id,
      categoria_nueva: $editar_store.categoria
    })
      .then(res => {
        // console.log(res);
        if (res.ok ==true) {
       //   dispatch("guardado");
        } else {
         // dispatch("error_al_guardar");
        $mensajes_app.push({ tipo:"error"  , mensaje:res.mensaje?res.mensaje:"No se pudo cambiar la categoria"});
        $mensajes_app = $mensajes_app;
        }
        //visible = false;
        $editar_store.categoria = null;
        $actualizar = true;
        goto('app/productos')
      })
      .catch(err => {
        console.log(err);
       // dispatch("error_al_guardar");
      //  visible = false;
      });
  };


  const ir_a_productos=()=>{
    goto('app/productos');
  }
</script>

<style>
  .contenedor {
    margin: 50px;
  
    overflow-y: auto;
        max-height: calc(100vh - 258px);
  }
  td {
    vertical-align: top;
    width: 50%;
  }
  table {
    width: 100%;
  }
  .herramientas {
    border: 1px solid gray;
    padding: 20px;
    min-width: 300px;
    width: 344px;
    margin: 50px 0 0 0;
    -webkit-box-shadow: 6px 11px 24px -9px rgba(0, 0, 0, 0.75);
    -moz-box-shadow: 6px 11px 24px -9px rgba(0, 0, 0, 0.75);
    box-shadow: 3px 1px 18px -9px rgba(0, 0, 0, 0.75);
  }
</style>

<div class="centrado">Selecciona una categoría</div>
{#if $editar_store.categoria}
  <!-- content here -->
  <div>
  <Button color="darkorange" on:click={ir_a_productos}> <i class="material-icons">backwards</i> cancelar</Button>
  </div>
  <div class="centrado">
    Cambiar la categoría padre de
    <b>{$editar_store.producto.nombre}</b>
    a
    <b>{$editar_store.categoria.descripcion}</b>
    <Button raised color="primary" on:click={cambiar_categoria_de_producto}>Cambiar</Button> <br>
    
  </div>
{/if}
<table>
  <tr>
    <td>
      <div class="contenedor no_select" on:mousehover={en_cliente}>
        <Arbol bind:categorias />
      </div>
    </td>
  </tr>

</table>
