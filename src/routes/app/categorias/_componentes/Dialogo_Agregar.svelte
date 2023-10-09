<script>
  export let visible = false;
  export let padre = "";
  //export let id_cat_padre='';
  export let id_categoria = "";
  import { createEventDispatcher } from "svelte";
  import { Dialog, Textfield, Button } from "svelte-mui";
  import { actualizar } from "../store.js";
  import {postData} from './../../../stores';
  let nombre='';

  const dispatch = createEventDispatcher();

  function hacer_visible() {
      dispatch('expandir');
    visible = true;
  };

  const crear_nueva = () => {
    let nueva = {
      id_cat_padre: id_categoria,
      id_categoria: Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, ""),
      descripcion: nombre
    };
    return nueva;
   // console.log(nueva);
  };

  const subir_nueva =()=>{
      let categoria = crear_nueva();
      //console.log(categoria)
      postData('app/categorias/crear_categoria',{categoria:categoria})
      .then((res)=>{
          //console.log(res);
          
          if(res.ok){
              dispatch('guardado')
          }
          else {
              dispatch('error_al_guardar')
          }
          visible =false

    $actualizar = true;
          
      })
      .catch((err)=>{
          console.log(err);
          dispatch('error_al_guardar')
          visible =false
      })
  }



  const handleKey = evt => {
    if (evt.key === "Enter") crear_nueva;
  };
</script>

<style>
  .footer {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 13px;
  }
  .footer a {
    color: #f50057;
    padding-left: 1rem;
  }
</style>

<Button on:click={hacer_visible} icon>
  <i class="material-icons">add_circle</i>
</Button>

<Dialog width="290" bind:visible>
  <div slot="title">Agregar subcategoría</div>
  Agregar una subcategría a:
  <b>{padre}</b>
  <Textfield
    name="nombre"
    autocomplete="off"
    required
    on:keyup={handleKey}
    bind:value={nombre}
    label="Subcategoría"
    message="Nombre de la subcategoría" />

  <div slot="actions" class="actions center">

    <Button color="primary" title="crear subcategoria" on:click={subir_nueva}>
      Guardar
    </Button>
  </div>

  <div slot="footer" class="footer" />
</Dialog>
