<script>
  import { createEventDispatcher } from "svelte";
  import { Dialog, Textfield, Button } from "svelte-mui";
  import {
    actualizar,
    seleccionando_padre_nuevo,
    padre_nuevo,
    categoria_nuevo_nombre
  } from "./store.js";
  import { postData, editar_store ,mensajes_app} from "./../../stores";
  let visible = false;
  let padre = "";
  let id_categoria = "";
  let nombre = "";
  let categoria_nueva = "";
  let confirmaciones = 0;
  let nombre_fue_actualizado = false;

  const dispatch = createEventDispatcher();

  const borrar_selecta = () => {
    if(!$editar_store.categoria)return
    confirmaciones++;
    if (confirmaciones < 2) return;
    postData("app/categorias/borrar_categoria", {
      id: $editar_store.categoria._id
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
        
        confirmaciones = 0;
        //  dejar de seleccionar al padre
        $editar_store.categoria = null;
        cancelar_seleccion_de_padre_nuevo();
        $actualizar = true;
      })
      .catch(err => {
        console.log(err);
        dispatch("error_al_guardar");
        visible = false;
      });
  };

  const cambiar_a_nuevo_padre_en_db = () => {
    postData("app/categorias/cambiar_padre_de_categoria", {
      id_categoria_a_mover: $editar_store.categoria._id,
      id_cat_padre_nueva: $padre_nuevo.id_categoria
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
        
        //  dejar de seleccionar al padre
        cancelar_seleccion_de_padre_nuevo();
        $actualizar = true;
      })
      .catch(err => {
        console.log(err);
        dispatch("error_al_guardar");
        visible = false;
      });
  };

  //  Editar nombre
  const cambiar_nombre_de_categoria = () => {
    
    if( $categoria_nuevo_nombre ==""){
      $mensajes_app.push({ tipo:"error"  , mensaje:"No puede ir vacío el nuevo nombre."});
      $mensajes_app = $mensajes_app;
      return
    }
    
    postData("app/categorias/cambiar_nombre_categoria", {
      id: $editar_store.categoria._id,
      nuevo_nombre: $categoria_nuevo_nombre,
      nombre_anterior: $editar_store.categoria.descripcion
    })
      .then(res => {
         console.log(res);

        if (res.ok) {

          $mensajes_app.push({ tipo:"exito"  , mensaje:res.mensaje?res.mensaje:"Nombre de categoria cambiado."});
          $mensajes_app = $mensajes_app;
          dispatch("guardado");
        } else {
          $mensajes_app.push({ tipo:"error"  , mensaje:res.mensaje?res.mensaje:"No se pudo cambiar el nombre de la categoria."});
          $mensajes_app = $mensajes_app;
          dispatch("error_al_guardar");
        }
        visible = false;
        $editar_store.categoria.descripcion = $categoria_nuevo_nombre;
        $actualizar = true;
      })
      .catch(err => {
        console.log(err);
        dispatch("error_al_guardar");
        visible = false;
      });
  };

  const seleccionar_nuevo_padre = () => {
    $seleccionando_padre_nuevo = true;
  };

  const cancelar_seleccion_de_padre_nuevo = () => {
    $seleccionando_padre_nuevo = false;
  };

  const hacer_visible = () => {
    dispatch("expandir");
    visible = true;
  };

  const crear_nueva = () => {
    let nueva = {
      id_cat_padre: $editar_store.categoria.id_categoria,
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
      alert("Hace falta un nombre");
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
  .moverdiv{
        /* background: blueviolet; */
            margin-bottom: 6px;
    color: #9C27B0;
    padding: 37px;
        border: 1px solid #babbca;
    border-radius: 3px;
    margin: 8px;
  }
  .moverbtn{
    color: white;
  }
  table{
    width: 100%;
  }
</style>

{#if $editar_store.categoria !=null}
   


<div class="centrado negro">Herramientas</div>

<!-- content here -->
<div class="moverdiv">

<table>

  <tr>
    <td colspan="2" style="color:#9C27B0" class="negro centrado">
  
      Agregar una subcategría a
      <span style="color:#9C27B0" class="selecta">{$editar_store.categoria.descripcion}</span>

    </td>

  </tr>
  <tr>
    <td>
      <Textfield
      style="color:#9C27B0;background-color:white;"
      color="#9C27B0"
        bind:value={categoria_nueva}
        label="Subcategoría"
        disabled={$seleccionando_padre_nuevo==true}
        Message="Escribe una subcategoría/categoría" />
    </td>
  </tr>
  <tr>
    <td>
    <Button color="#9C27B0" on:click={subir_nueva} disabled={$seleccionando_padre_nuevo==true}>Agregar sub/categoria</Button>
    </td>
  </tr>
</table>

</div>
<div class="moverdiv" >
<table>
  <tr>
    <td colspan="2" class="negro centrado" style="font-weight:800;color:#9C27B0">
     
 
      Editar
    </td>

  </tr>

  <tr>
    <td>
      <Textfield
      style="color:#9C27B0;background-color:white;"
        bind:value={$categoria_nuevo_nombre}
        label="Nuevo nombre"
        disabled={$seleccionando_padre_nuevo==true}
        Message="Escribe una nuevo nombre para esta sucbategoría/categoría" />
    </td>
    
  </tr>
  <tr>
  <td>
      <Button disabled={$seleccionando_padre_nuevo==true} color="#9C27B0" on:click={cambiar_nombre_de_categoria}>Editar</Button>
    </td>
  </tr>
</table>
</div>


<div class="centrado moverdiv">
<!-- MOVER UNA CATEGORIA -->
  {#if $seleccionando_padre_nuevo ==true}
    <!-- content here -->
    {#if $padre_nuevo}
      <!-- content here -->
      <div class="negro">
        Nueva cat. padre:
        <b>{$padre_nuevo.descripcion}</b>
      </div>
    {:else}
      <div class="centrado">Selecciona la nueva categoría padre</div>
    {/if}

    <Button
      color="#9C27B0"
      on:click={cancelar_seleccion_de_padre_nuevo}
      title="Cancelar selección de padre nuevo">
      Cancelar
    </Button>
    {#if $padre_nuevo}
      <Button
        color="#9C27B0"
        raised
        on:click={cambiar_a_nuevo_padre_en_db}
        title="Mover a nueva categoría padre">
        Guardar
      </Button>
    {/if}
  {:else}
    <Button color="#9C27B0" on:click={seleccionar_nuevo_padre}>Mover</Button>
  {/if}

</div>
<hr>
<div class="centrado">
  <Button color="Red" on:click={borrar_selecta}>

    {#if confirmaciones > 0}
      borrar confirma 
    {:else if confirmaciones == 0}Borrar{/if}

  </Button>

</div>
{/if}