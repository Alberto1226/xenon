<script>
//  PAgina que se encarga de editar la categoria de el producto seleccionado
import {onMount} from 'svelte';
  import Arbol from "./_componentes/Arbol.svelte";
  import { postData, editar_store,usuario_db } from "./../../../../stores";
let categorias = [];



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
</script>