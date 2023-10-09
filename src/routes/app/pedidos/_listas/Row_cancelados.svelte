<script>
  export var pedido = {
    folio: "",
    fecha: "",
    moneda: "",
    usuario_que_registro: "",
    fecha_de_cancelacion: "",
    total_pedido: "",
    descuento: 0,
    agente: {
      nombre: "",
      correo: "",
      comision: 0,
    },
    cliente: {
      nombre: "",
      correo: "",
    },
    activo: true,
  };
  import {
    formato_precio,
    pedido_selecto,
    mensajes_app,
    pedidos,
    cargando_mensajes_app,
    postData,
    convertir_a_fecha_humana,
  } from "./../../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ButtonGroup, Snackbar } from "svelte-mui/src";
  import Cambio_status from "./_Cambio_status.svelte";
  import Lista from "./Lista_emergente.svelte";
  let visible_cancelar = false;

  let message =
    '<i  class="material-icons vertical-alineado">delete</i> Cancelar el pedido <b>' +
    pedido.folio +
    "</b> ?";
  let message_email =
    `<i  class="material-icons vertical-alineado">email</i> Enviar PDF a "${pedido.cliente.correo}" de pedido <b>` +
    pedido.folio +
    "</b> ?";
  const dispatch = createEventDispatcher();
  let mandando_correo = false;
  let visible_status = false;
  let status_cambiando = false;
  let procesando = false;
  let visible_enviar_email = false;
  let lista_visible = false;
  onMount(() => {});

  function ver_lista() {
    console.log(lista_visible);
    lista_visible = true;
  }

  function mostrar_cargando(razon) {
    let mensaje = `Se esta mandando el pdf por email <br> <span class="indice_row">El proceso puede tardar de 5 segundos a 1 minuto.</span>`;
    if (razon == "email")
      mensaje = `Se esta mandando el pdf por email <i  class="material-icons vertical-alineado">email</i>  
      <br> <span class="indice_row">El proceso puede tardar de 5 segundos a 1 minuto.</span>`;
    if (razon == "cancelar")
      mensaje = `Se esta cancelando <i  class="material-icons vertical-alineado">delete</i> el pedido y se borrarán 
      los apartados del mismo. <br> <span class="indice_row">El proceso puede tardar de 5 segundos a 1 minuto.</span>`;
    if (razon == "envio")
      mensaje = `Se ha solicitado un cambio de status a <b>"Envío"</b> <i  class="material-icons vertical-alineado">flight_takeoff</i> en el pedido con folio
       <b>${pedido.folio}</b>. <br> <span class="indice_row">El proceso puede tardar de 5 segundos a 1 minuto.</span>`;
    $cargando_mensajes_app.push({
      tipo: "info",
      mensaje: mensaje,
    });
    $cargando_mensajes_app = $cargando_mensajes_app;
  }

  function quitar_cargando() {
    $cargando_mensajes_app = [];
    $cargando_mensajes_app = $cargando_mensajes_app;
  }

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  function editar() {
    //  //console.log($pedido_selecto);

    dispatch("editar_pedido");
  }

  function mandar_email() {
    if (pedido.cliente.correo === "") return;
    mostrar_cargando("email");
    mandando_correo = true;
    postData("/app/pedidos/emails/mandar_pdf_email_carrito", { id: pedido._id })
      .then((respuesta) => {
        //console.log(respuesta);
        quitar_cargando();
        if (respuesta.ok) {
          $mensajes_app.push({
            tipo: "exito",
            mensaje: "PDF enviado a cliente " + status,
          });
          $mensajes_app = $mensajes_app;
          mandando_correo = false;
          //visible =false;
        } else {
          //  ver razon por la cual no se puede cancelar
          mandando_correo = false;
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta.mensaje,
          });
          $mensajes_app = $mensajes_app;
        }
        quitar_cargando();
      })
      .catch((err) => {
        quitar_cargando();
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo hacer el cambio a " + status,
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }

  function cancelar_pedido() {
    // mensaje_envio = 'CAncelado...';
    dispatch("procesando_cambio_status_a_envio");
    procesando = true;
    postData("/app/pedidos/cancelar_carrito", { id: pedido._id })
      .then((respuesta) => {
        //console.log(respuesta);

        if (respuesta.ok) {
          $mensajes_app.push({
            tipo: "exito",
            mensaje: "Status cambiado a " + status,
          });
          $mensajes_app = $mensajes_app;
          procesando = false;
          //visible =false;
          actualizar_local();
          //dispatch("recargar_lista");
        } else {
          //  ver razon por la cual no se puede cancelar
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta.mensaje,
          });
          $mensajes_app = $mensajes_app;
        }
      })
      .catch((err) => {
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo hacer el cambio a " + status,
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }
  function actualizar_local() {
    let lista_temp = JSON.parse(JSON.stringify($pedidos.lista));
    lista_temp = lista_temp.filter((element) => element._id !== pedido._id);
    $pedidos.lista = lista_temp;
    $pedidos = $pedidos;
    dispatch("recargar_lista");
  }

  $: if (pedido.status) {
    status_cambiando = true;
    setTimeout(() => {
      status_cambiando = false;
    }, 1000);
  }

  function procesando_cambio_status_a_envio(evt) {
    mostrar_cargando("envio");
  }

  function cambio_a_status_envio(evt) {
    quitar_cargando();
  }
</script>

<Lista bind:visible={lista_visible} {pedido} />
<div class="grid-container row">
  <div class="uno">
    <i style="vertical-align:middle;" class="material-icons">shopping_cart</i>
    {pedido.folio}
    <br />
    {pedido.usuario_que_registro.usuario}
  </div>
  <div class="dos">
    <span title="Fecha de cancelación">
      {pedido.fecha_de_cancelacion == undefined
        ? ""
        : new Date(pedido.fecha).toLocaleDateString("es-MX", options)}
      a las {pedido.fecha_de_cancelacion == undefined
        ? ""
        : new Date(pedido.fecha_de_cancelacion).toLocaleTimeString("es-MX")}
    </span> <br />
    <hr />
    <span title="Fecha de ultima modificación">
      {pedido.fecha == undefined
        ? ""
        : new Date(pedido.fecha).toLocaleDateString("es-MX", options)}
      a las {pedido.fecha == undefined
        ? ""
        : new Date(pedido.fecha).toLocaleTimeString("es-MX")}
    </span>
  </div>

  <div class="cuatro" class:color_ficha_descuento={pedido.tenia_ficha}>
    {#if pedido.tenia_ficha}
      <!-- content here -->
      <i class="material-icons vertical-alineado">loyalty</i>
    {/if}
    {formato_precio(pedido.descuento)} %
  </div>
  <div class="cinco">
    <span title="Moneda nacional"
      >$ {formato_precio(pedido.total_pedido)}
    </span>
    <br />
    {#if pedido.moneda != "Pesos Mexicanos" && pedido.total_pedido != 0}
      <!-- content here -->
      <span class="indice_row" title={pedido.moneda}>
        $ {formato_precio(pedido.total_pedido / pedido.tipo_de_cambio)} ( {formato_precio(
          pedido.tipo_de_cambio
        )})
      </span>
    {/if}
    <div class="indice_row">{pedido.moneda}</div>
  </div>

  <div class="seis  ">
    {pedido.cliente == undefined ? "" : pedido.cliente.nombre}
    <br />
    <div class="indice_row">
      {pedido.cliente == undefined ? "" : pedido.cliente.correo}
    </div>
  </div>
  <div class="siete">
    {pedido.agente.nombre}
    <br />
    <div class="indice_row">{pedido.agente.correo}</div>
  </div>
  <div class="ocho centrado" class:status_cambiado={status_cambiando}>
    {pedido.status}
  </div>
  <div class="nueve">
    <table>
      <tr>
        <td>
          <ButtonGroup>
            <!-- content here -->
            <Button
              icon
              dense
              title="Ver lista del pedido"
              on:click={ver_lista}
            >
              <i class="material-icons">list</i>
            </Button>
            <Button icon dense>
              <a
                icon
                dense
                color="#2B78FE"
                href={"app/pedidos/exportar/pdfsindescarga?id=" +
                  pedido._id +
                  "&origen=pedidos3"}
                target="_blank"
                on:click={() => {}}
                title="Ver PDF de pedido, sin descarga"
              >
                <i class="material-icons">picture_as_pdf</i>
              </a>
            </Button>
          </ButtonGroup>
        </td>
      </tr>
    </table>
  </div>
</div>
<Snackbar bind:visible={visible_cancelar} bg="black">
  {@html message}
  <span slot="action">
    <Button
      color="white"
      on:click={() => {
        visible_cancelar = false;
        cancelar_pedido();
      }}
    >
      <i class="material-icons">delete</i> Aceptar
    </Button>
  </span>
</Snackbar>

<Snackbar bind:visible={visible_enviar_email} bg="black">
  {@html message_email}
  <span slot="action">
    <Button
      color="white"
      on:click={() => {
        mandar_email();
      }}
    >
      Mandar
    </Button>
  </span>
</Snackbar>

<Cambio_status
  on:procesando_cambio_status_a_envio={procesando_cambio_status_a_envio}
  on:cambio_a_status_envio={cambio_a_status_envio}
  on:recargar_lista
  bind:pedido
  bind:visible={visible_status}
/>

<style>
  .row {
    height: 76px;
    overflow: hidden;
    padding: 8px;
    border-bottom: 1px solid #e1e1e1;
  }
  .row:hover {
    background-color: rgb(235, 235, 235);
  }
  .grid-container {
    font-weight: 200;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos  cuatro cinco seis siete ocho nueve";
  }

  .uno {
    grid-area: uno;
  }

  .dos {
    grid-area: dos;
  }

  .tres {
    grid-area: tres;
  }

  .cuatro {
    grid-area: cuatro;
  }

  .cinco {
    grid-area: cinco;
  }

  .seis {
    grid-area: seis;
  }

  .siete {
    grid-area: siete;
  }

  .ocho {
    grid-area: ocho;
    margin: 0 auto;
  }

  .nueve {
    grid-area: nueve;
  }

  .reactivo:hover {
    font-weight: 500;
  }
  .color_ficha_descuento {
    color: rgb(0, 101, 255);
  }
  .status_cambiado {
    animation-duration: 0.5s;
    animation-name: status;
  }

  @keyframes status {
    from {
      background-color: green;
      color: white;
    }
    to {
      background-color: white;
      color: black;
    }
  }
</style>
