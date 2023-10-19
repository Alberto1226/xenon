<script>
  import { Button, Textfield } from "svelte-mui/src";
  import { blur } from "svelte/transition";
  import { onMount, createEventDispatcher } from "svelte";
  import { mensajes_app, postData } from "./../../../stores";
  export let pedido;
  const dispatch = createEventDispatcher();

  let visible = false;
  let descuento_nuevo = 1;
  let input;
  let http_ocupado = false;

  onMount(() => {
    descuento_nuevo = pedido.descuento;
  });

  function cambiar_descuento() {
    if (http_ocupado ) return;
    if (descuento_nuevo > 99 || descuento_nuevo < 0) return;
  
    http_ocupado = true;
    postData("/app/pedidos/cambiar_descuento_de_pedido", {
      id: pedido._id,
      descuento_nuevo
    })
      .then(respuesta => {
        //console.log(respuesta);
        http_ocupado = false;
        if (respuesta.ok) {
          $mensajes_app.push({
            tipo: "exito",
            mensaje:
              "Pedido " + pedido.folio + " ha cambiado el descuento " + status
          });
          $mensajes_app = $mensajes_app;
          const { nueva_lista, total_pedido, descuento_nuevo } = respuesta;
          pedido.lista = nueva_lista;
          pedido.total_pedido = total_pedido;
          pedido.lista = descuento_nuevo;

          dispatch("descuento_cambiado", respuesta);
          visible =false;
        }
        else{

          $mensajes_app.push({
            tipo: "error",
            mensaje:
              "Pedido " + pedido.folio + " no pudo cambiar el descuento " 
          });
          $mensajes_app = $mensajes_app;
        }
      })
      .catch(err => {
        http_ocupado = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "Ups, no se pudo hacer el cambio de descuento, intalo de nuevo."
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }

  function handleKeyup(event) {
    //console.log(event.key == "Enter");
    if (event.key === "Enter") {
      cambiar_descuento();
    }
  }

  const mover_a_mouse = event => {
    
    visible = true;
  };
</script>

<style>
  .flotante {
    position: relative;
    /* se modifico la posision a relativa para correjir el bug del div que se posicionaba fuera de pantalla */
    margin: -47px 0px 0px -259px;
    background-color: white;
    box-shadow: 0px 0px 20px #b3b3b3;
    z-index: 2;
    border-radius: 19px;
    padding: 4px 17px;
    width: 250px;

    animation-name: borde_animado;
    animation-duration: 450ms;
  }

  .fondo {
    top: 0px;
    left: 0px;
    position: absolute;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 255, 255, 0.301);
    z-index: 1;
  }

  @keyframes borde_animado {
    from {
      border-radius: 14px;
    }
    to {
      border-radius: 19px;
    }
  }
</style>

<!-- content here -->
{#if visible === false}
  <!-- content here -->
  <Button
    icon
    dense
    color="#2B78FE"
    on:click={mover_a_mouse}
    title="Cambiar descuento de un pedido">
    <i class="material-icons">local_atm</i>
  </Button>
{:else}
  <!-- else content here -->

  <div id={pedido._id} class="flotante" in:blur={{ amount: 3, duration: 450 }}  out:blur={{ amount: 3, duration: 450 ,delay:500}}>
    <table style="width:100%" class="no_select">
      <tr>
        <td style="width:50px;font-weight:900;">

          <table>
            <tr>
              <td style="width:150px;font-weight:900;">
                folio: {pedido.folio}
              </td>
            </tr>
            <tr>
              <td
                style="width:50px;font-weight:900;"
                title="descuento aplicado">
                {pedido.descuento} %
              </td>
            </tr>
          </table>
        </td>

        <td style="width:250px">
          <Textfield
          style="text-align:center"
            min="0"
            max="99"
            bind:this={input}
            outlined
            type="number"
            bind:value={descuento_nuevo}
            message="Nuevo descuento"
            autofocus
            on:keyup={handleKeyup}
            placeholder="Aplicar un descuento distinto" />
        </td>
        <td style="width: 50px;">%</td>
        <td style="width:50px">

          <Button
            style="border-radius:25px"
            raised
            color="primary"
            title="Cambiar el descuento actual"
            on:click={cambiar_descuento}>
            <i class="material-icons">save</i>
          </Button>
        </td>
        <td style="width:50px" title="Cerrar dialogo">
          <Button
            icon
            on:click={() => {
              visible = false;
            }}
            color="red">
            <i class="material-icons">cancel</i>
          </Button>
        </td>
      </tr>
    </table>
  </div>
{/if}
