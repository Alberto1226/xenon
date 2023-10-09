<script>
  import Arbol from "./_componentes/Arbol.svelte";
  import { postData, editar_store,usuario_db } from "./../../stores";
  import { onMount } from "svelte";
  import { actualizar ,categoria_padre_maximo_selecto} from "./store.js";

  import { Dialog, Textfield, Button } from "svelte-mui";
  import Herramientas from "./Herramientas.svelte";
  import Herramientas_Categoria_Principal from "./Herramientas_categoria_principal.svelte";

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
</script>

<style>
  .contenedor {
    margin: 50px;
    max-height: calc(100vh - 150px);
    overflow-y: auto;
  }
  td {
    vertical-align: top;
    width: 50%;
  }
  table {
    width: 100%;
  }
  .herramientas {
    /* border: 1px solid gray; */
    padding: 20px;
    min-width: 300px;
    width: 344px;
    margin: 50px 0 0 0;
    /* -webkit-box-shadow: 6px 11px 24px -9px rgba(0, 0, 0, 0.75); */
    /* -moz-box-shadow: 6px 11px 24px -9px rgba(0, 0, 0, 0.75); */
    /* box-shadow: 3px 1px 18px -9px rgba(0, 0, 0, 0.75); */
  }
</style>

<svelte:head>
<title>Categorías</title>
 </svelte:head>
<table>
  <tr>
    <td>
      <div class="contenedor no_select" on:mousehover={en_cliente}>
        <Arbol bind:categorias />
      </div>
    </td>
    <td>
      {#if $editar_store.categoria !=null && $usuario_db.rol!="vendedor"}
        <div class="herramientas">

          <Herramientas />

        </div>
      {/if}
      {#if $categoria_padre_maximo_selecto && $editar_store.categoria !=null}
        <div class="herramientas">

          <Herramientas_Categoria_Principal />

        </div>
      {/if}
    </td>
  </tr>

</table>
