<script>
  import { createEventDispatcher } from "svelte";
  import { Dialog, Textfield, Button } from "svelte-mui";
  import {
    actualizar,
    seleccionando_padre_nuevo,
    padre_nuevo,
    categoria_nuevo_nombre
  } from "./store.js";
  import { postData, editar_store } from "./../../stores";
  let visible = false;
  let padre = "";
  let id_categoria = "";
  let nombre = "";
  let categoria_nueva = "";
  
  let nombre_fue_actualizado =false;

  const dispatch = createEventDispatcher();

  const cambiar_a_nuevo_padre_en_db = ()=>{


    postData("app/categorias/cambiar_padre_de_categoria", {
      id_categoria_a_mover: $editar_store.categoria._id,
      id_cat_padre_nueva: $padre_nuevo.id_categoria,
      
    })
      .then(res => {
       // console.log(res);

        if (res.ok) {
          dispatch("guardado");
        } else {
          dispatch("error_al_guardar");
        }
        //visible = false;
        //$editar_store.categoria.descripcion = $categoria_nuevo_nombre;
        $actualizar = true;
        //  dejar de seleccionar al padre
        cancelar_seleccion_de_padre_nuevo();
      })
      .catch(err => {
        console.log(err);
        dispatch("error_al_guardar");
        visible = false;
      });
  }


  const crear_nueva = () => {
    let nueva = {
      id_cat_padre: 'null',
      id_categoria: Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, ""),
      descripcion: categoria_nueva
    };
    return nueva;
    // console.log(nueva);
  };

  const subir_nueva = () => {
    if (categoria_nueva === "") {
      alert('Hace falta un nombre')
      return;
    }
    let categoria = crear_nueva();
    //console.log(categoria);
    postData("app/categorias/crear_categoria", { categoria: categoria })
      .then(res => {
        //console.log(res);

        if (res.ok) {
          dispatch("guardado");
        } else {
          dispatch("error_al_guardar");
        }
        visible = false;

        $actualizar = true;
      })
      .catch(err => {
        console.log(err);
        dispatch("error_al_guardar");
        visible = false;
      });
  };

  const handleKey = evt => {
    if (evt.key === "Enter") crear_nueva;
  };
</script>

<style>
  .selecta {
    font-weight: 700;
    padding-top: 20px;
  }
  .negro {
    color: black;
  }
</style>

<div class="centrado negro">Herramientas</div>

<!-- content here -->

<table>

  <tr>
    <td colspan="2" class="negro centrado">
      <hr />
      <br />
      Agregar una subcategría a
      <span class="selecta">Categorías</span>

    </td>

  </tr>
  <tr>
    <td>
      <Textfield
        bind:value={categoria_nueva}
        label="Subcategoría"
        Message="Escribe una subcategoría/categoría" />
    </td>
    <td>
      <Button on:click={subir_nueva}>Agregar sub/categoria</Button>
    </td>
  </tr>
  
</table>
