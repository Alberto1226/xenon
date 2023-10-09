<script>
  import { Dialog, Button, Menu, Menuitem, Textfield } from "svelte-mui/src";
  import { createEventDispatcher } from "svelte";
  import { postData, mensajes_app } from "./../../../stores";
  export let mensajeria;
  export let pedido;

  $: if (visible_paqueteria) {
    corregir_lista();
  }
  function corregir_lista() {
    if (mensajeria.empresa === "") {
      codigo_de_rastreo = "";
      notas = "";
      empresa_paqueteria.nombre = "";
      iniciar_lista();
    }
  }
  /*
   empresa:{type:String,default:''},
        codigo_de_rastreo:{type:String,default:''},
        notas:{type:String,default:''},
  */
  const dispatch = createEventDispatcher();
  let visible_paqueteria = false;

  let codigo_de_rastreo = "";
  let notas = "";
  let empresa_paqueteria = {
    nombre: ""
  };

  function depachar_cambio_en_paqueteria(params) {
    dispatch("Cambio en paquetería");
  }

  let empresas_paqeuteria = [
    { nombre: "Paquete express", imagen_url: "imagenes/paquete_express.svg" },
    { nombre: "Federal express", imagen_url: "imagenes/fedex.jpg" },
    { nombre: "DHL", imagen_url: "imagenes/dhl.jpeg" },
    { nombre: "UPS", imagen_url: "imagenes/ups.png" }
  ];

  function guardar_mensajeria() {
   //console.log(empresa_paqueteria.nombre);

    if (empresa_paqueteria.nombre == "" || codigo_de_rastreo === "") {
      alert(" No has escrito en todos los campos obligatorios");
      return;
    }
    mensajeria.empresa = empresa_paqueteria.nombre;
    mensajeria.notas = notas;
    mensajeria.codigo_de_rastreo = codigo_de_rastreo;
    postData("app/pedidos/actualizar_paqueteria", {
      id: pedido._id,
      mensajeria
    })
      .then(respuesta => {
        $mensajes_app.push({
          tipo: "exito",
          mensaje: "Paquetería actualizada"
        });
        $mensajes_app = $mensajes_app;
        visible_paqueteria =false;
      })

      .catch(err => {
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo cambiar el tipo de Paqueteria"
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function borrar() {
    mensajeria.empresa = "";
    mensajeria.notas = "";
    mensajeria.codigo_de_rastreo = "";
    postData("app/pedidos/actualizar_paqueteria", {id:pedido._id ,mensajeria});
  }

  function iniciar_lista() {
    empresas_paqeuteria = [
      { nombre: "Paquete express", imagen_url: "imagenes/paquete_express.svg" },
      { nombre: "Federal express", imagen_url: "imagenes/fedex.jpg" },
      { nombre: "DHL", imagen_url: "imagenes/dhl.jpeg" },
      { nombre: "UPS", imagen_url: "imagenes/ups.png" }
    ];
  }
</script>

<style>
  .contenedor_lista {
    height: 180px;
    overflow-y: auto;
  }
  .row:hover {
    background: rgb(219, 219, 219);
    cursor: pointer;
  }
  .row {
    padding: 5px;
    height: 2em;
  }
  .marca_empresa {
    height: 50px;
  }
  .tabla {
    margin: 0 auto;
  }
  td {
    padding: 2px;
  }
</style>

<Dialog width="350" bind:visible={visible_paqueteria}>
  <div class="titulo_formulario centrado" style="padding-bottom:30px;">Paquetería:</div>
  <!--  NAda guardado en DB -->
  {#if mensajeria.empresa === ''}
    <!-- content here -->
    <!-- 
    NO tiene algo guardado
 -->
    {#if empresa_paqueteria.nombre === ''}
      <!-- LOCALMENTE NO SE HA SELECCIONADO -->
      <div class="contenedor_lista">
        {#each empresas_paqeuteria as empresa}
          <div
            on:click={() => {
              empresa_paqueteria = empresa;
            }}
            class="row">
            {empresa.nombre}
          </div>
        {/each}
      </div>
      
    {:else}<!-- LOCALMENTE SE HA SELECCIONADO DE LISTA-->
      <img
        class="marca_empresa"
        src={empresa_paqueteria.imagen_url}
        alt="Paqueteria" />
    {/if}
     <Textfield
          bind:value={codigo_de_rastreo}
          label="Código de rastreo"
          required
          message="Código de rastreo"
          placeholder="Código de rastreo" /> <br>
        <Textfield
          bind:value={notas}
          label="Notas"
          message="Notas"
          placeholder="Notas" />
  {:else}
    <!-- else content here -->
    <table class="tabla">
      <tr>
        <td>Empresa</td>
        <td>
          <b>{mensajeria.empresa}</b>
        </td>
      </tr>
      <tr>
        <td>Código de rastreo</td>
        <td>
          <b>{mensajeria.codigo_de_rastreo}</b>
        </td>
      </tr>
      <tr>
        <td>Notas</td>
        <td>
          <b>{mensajeria.notas}</b>
        </td>
      </tr>
    </table>
  {/if}

  <div slot="actions" class="actions center">

    {#if mensajeria.empresa !== ''}
      <!-- content here -->
      <Button on:click={borrar} color="darkorange" raised> <i class="material-icons">delete</i> Borrar</Button>
    {:else}
    
      <Button
        on:click={guardar_mensajeria}
        color="primary"
        raised
        disabled={codigo_de_rastreo === '' || empresa_paqueteria.nombre === ''}>
        Guardar
      </Button>
    {/if}
  </div>

  <div slot="footer" class="footer" />
</Dialog>

<Button
  icon
  dense
  color="#2B78FE"
  title={mensajeria.empresa === '' ? 'pendiente' : mensajeria.empresa}
  on:click={() => {
    visible_paqueteria = true;
  }}>
  <i class="material-icons">local_shipping</i>
</Button>
