<script>
  import { Button, Dialog, Textfield } from "svelte-mui/src";
  import { postData, mensajes_app } from "./../../../stores";
  import {createEventDispatcher} from 'svelte';
  export let estado;
  export let municipio;
  export let actualizar;
  const dispatch = createEventDispatcher();
  let lista = [];

  let visible = false;
  let manual = false;
  $: if (actualizar) {
    //console.log("obteniendo");
    setTimeout(()=>{
      actualizar =false;
      lista=[];
    municipio ='';    
    obtener_municipio();
    },100)
    
  }
  function obtener_municipio() {
    postData("/app/clientes/lista_de_municipios_por_estado", {
      estado: { nombre: estado }
    })
      .then(resultado => {
        //console.log(resultado);

        if (resultado.ok) {
          lista = resultado.lista;
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: "No se pudo obtener los municipios de " + estado
          });
          $mensajes_app = $mensajes_app;
          lista = [];
          municipio = "";
        }
      })
      .catch(err => {
        lista = [];
        municipio = "";
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo obtener los municipios de " + estado
        });
        $mensajes_app = $mensajes_app;
      });
  }
</script>

<style>
  .contenedor_lista {
    height: 250px;
    overflow-y: auto;
  }
  .row {
    font-weight: 200;
    padding: 2px 0;
    height: 1.5em;
  }
  .row:hover {
    font-weight: 400;
     box-shadow: 2px 2px 4px rgba(31, 82, 192, 0.5);
  }

 
</style>

<table>
<tr>
    <td style="height:38px;">
{#if manual == false}
  <!-- CON LISTA -->
  <Button
    on:click={() => {
      visible = true;
    }}>
    {#if lista.length > 0}
      <!-- content here -->
      {municipio === '' ? 'Selecciona de lista...' : municipio}
    {:else}{municipio === '' ? '---' : municipio}{/if}
  </Button>
{:else}

  <Textfield
    disbled
    outlined
    bind:value={municipio}
    placeholder="Municipio"
    message="Municipio"
    type="text" />
  
{/if}</td>
    <td>
   
   {#if estado!=''}
        <!-- content here -->
         <Button title={manual===false?"Escribir uno":"Cambiar a lista"} on:click={()=>{manual = !manual;}} icon> <i class="material-icons">{manual===false?'toggle_off':'toggle_on'}</i></Button>
   {/if}
    
    </td>
</tr>


</table>



<Dialog width="450" bind:visible>
  <div class="centrado titulo_formulario">Municipios de {estado}</div>
  <div class="contenedor_lista">

    {#each lista as item, i}
      <!-- content here -->
      <div
        class="row pointer"
        on:click={() => {
          dispatch('municipio_cambio')
          municipio = item.nombre;
          visible = false;
        }}>
        <table>
          <tr>
            <td>
              <span class="indice_row">{i+1})</span>
            </td>
            <td>{item.nombre}</td>
          </tr>

        </table>
      </div>
    {/each}
  </div>


  <div slot="footer" class="footer">
  
  </div>
</Dialog>
