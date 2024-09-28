<script>
  import {
    formato_precio,
    pedido_selecto,
    mensajes_app,
    pedidos,
    cargando_mensajes_app,
    postData,
    editar_store,
    usuario_db,
    convertir_a_fecha_humana,
  } from "./../../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ButtonGroup, Snackbar } from "svelte-mui/src";
  import Cambio_status from "./_Cambio_status.svelte";
  import Paqueteria from "./Paqueteria.svelte";
  import { goto } from "@sapper/app";
  import Cambiar_descuento from "./Nuevo_Descuento.svelte";
  import Lista from "./Lista_emergente.svelte";
  export var indice = 0;
  export var pedido = {
    folio: "",
    fecha: "",
    moneda: "",
    usuario_que_registro: "",
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
  let fecha_detallada = false;

  let lista_visible = false;
  var es_par = false;

  onMount(() => {
    es_par = isOdd(indice + 1) == 0;
  });
  function isOdd(num) {
    return num % 2;
  }

  function ver_lista() {
    console.log(lista_visible);
    lista_visible = true;
  }

  function toggle_fecha_detallada() {
    fecha_detallada = !fecha_detallada;
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
    //console.log('quitar cargando')
    $cargando_mensajes_app = [];
    $cargando_mensajes_app = $cargando_mensajes_app;
    //console.log($cargando_mensajes_app);
  }

  const options = {
    day: "numeric",
    month: "long",

    year: "numeric",
  };
  /*


  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  };
*/
  function editar() {
    //  //console.log($pedido_selecto);
    $editar_store.pedido = pedido;
    //console.log('**')
    //console.log($editar_store.pedido)
    setTimeout(() => {
      goto("/app/pedidos/editar");
    }, 100);
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

  async function preparar_texto(cb) {
    let generar_pdf_de_pedido = firebase
      .functions()
      .httpsCallable("generar_pdf_de_pedido");
    generar_pdf_de_pedido({
      email_cliente: pedido.cliente.correo,
    })
      .then((resultado) => {
        //console.log(resultado);
        let archivo = new Blob(JSON.parse(resultado.data.archivo_blob), {
          type: "application/pdf",
        });
        // for each carrito
        cb(archivo);
      })
      .catch((err) => {
        let archivo = `"Producto","SKU","Cantidad"`;
        console.log(err);

        // for each carrito
        cb(archivo);
      });
  }

  function procesando_cambio_status_a_envio(evt) {
    //console.log("procesando_cambio_status_a_envio ")
    mostrar_cargando("envio");
  }

  function cambio_a_status_envio(evt) {
    //console.log("cambio a status envio")
    // quitar_cargando();
    visible_status = false;
    dispatch("recargar_lista");
  }

  const handle_descuento_cambiado = (evt) => {
    //console.log(evt.detail)
    pedido.lista = evt.detail.nueva_lista;
    pedido.total_pedido = evt.detail.total_pedido;
    pedido.descuento = evt.detail.descuento_nuevo;
  };
</script>

<Lista bind:visible={lista_visible} {pedido} />
<div class="grid-container row no_select" class:back_par={es_par}>
  <div class="uno centrado no_select">
    <i style="vertical-align:middle;" class="material-icons">shopping_cart</i>

    <span class="folio">{pedido.folio}</span>
  </div>
  <div class="dos no_select" />
  <div
    class="tres no_select pointer"
    title="Haz click para ver la fecha y hora"
    on:click={toggle_fecha_detallada}
  >
    {#if fecha_detallada == false}
      <!-- FECHA SIMPLE -->
      <span class="fecha" title="Fecha de creación"
        >{convertir_a_fecha_humana(pedido.fecha_creado)}</span
      >
      <br />
    {:else}
      <!-- FECHA DETALLADA -->

      <div>
        <span class="fecha" title="Fecha de creación"
          >{convertir_a_fecha_humana(pedido.fecha_creado)}</span
        > <br />
        {pedido.fecha_creado == undefined
          ? ""
          : new Date(pedido.fecha_creado).toLocaleDateString("es-MX", options)}
        <br />
        {pedido.fecha_creado == undefined
          ? ""
          : new Date(pedido.fecha_creado).toLocaleTimeString("es-MX")}
        <br />
        <hr />
        <span class="fecha" title="Fecha de última modificación"
          >{convertir_a_fecha_humana(pedido.fecha)}</span
        > <br />
      </div>
    {/if}

    <span
      class="indice_row no_select"
      title="Usuario de sistema que crea el pedido"
    >
      {pedido.usuario_que_registro.usuario}
    </span>
  </div>
  <!-- <div class="cuatro no_select" class:color_ficha_descuento={pedido.tenia_ficha}>
    {#if pedido.tenia_ficha}
      
      <i class="material-icons vertical-alineado">loyalty</i>
    {/if}
    {formato_precio(pedido.descuento)} %
  </div> -->
  <div class="cinco centrado no_select">
    {#if pedido.tenia_ficha}
      <!-- content here -->
      <i class="material-icons vertical-alineado">loyalty</i>
    {/if}
    {formato_precio(pedido.descuento)} %
    <span title="Moneda nacional">
      <div class="fuente-ancha no_select" title={pedido.moneda} />
      $ {formato_precio(pedido.total_pedido)}
    </span>
    <br />
    {#if pedido.moneda != "Pesos Mexicanos" && pedido.total_pedido != 0}
      <!-- content here -->
      <div class="fuente-ancha no_select" title={pedido.moneda}>
        $ {formato_precio(pedido.total_pedido / pedido.tipo_de_cambio)} ( {formato_precio(
          pedido.tipo_de_cambio
        )})
      </div>
    {/if}
    <div class="indice_row">{pedido.moneda}</div>
  </div>

  <div class="seis ">
    <div class="sobresaltar no_select">
      {pedido.cliente == undefined ? "" : pedido.cliente.nombre}
      <br />
      <div class="indice_row ">
        {pedido.cliente == undefined ? "" : pedido.cliente.correo}
      </div>
    </div>
  </div>
  <div class="siete no_select centrado">
    {pedido.agente.nombre}
    <br />
    <div class="indice_row no_select">{pedido.agente.correo}</div>
  </div>
  <div class="ocho centrado" class:status_cambiado={status_cambiando}>
    {#if pedido.total_pedido > 0}
      <div class="pill no_select" class:pill_envio={pedido.status == "Envío"}>
        {pedido.status}
        {#if $usuario_db.rol == "administrador"}
          <Button
            icon
            dense
            color="black"
            on:click={() => {
              visible_status = true;
            }}
            title="Cambiar status"
          >
            {#if pedido.status === "Envío"}
              <!-- content here -->
              <i class="material-icons">flight_takeoff</i>
            {:else}
              <!-- else content here -->
              <i class="material-icons">card_travel</i>
            {/if}
          </Button>
        {:else if pedido.status === "Envío"}
          <!-- content here -->
          <i class="material-icons">flight_takeoff</i>
        {:else}
          <!-- else content here -->
          <i class="material-icons">card_travel</i>
        {/if}
      </div>
    {:else}
      <!-- Caso con pedido vacío -->
      <span class="indice_row" />
    {/if}
  </div>
  <div class="nueve">
    <table>
      <tr>
        <td>
          <ButtonGroup>
            <Button
              icon
              dense
              title="Ver lista del pedido"
              on:click={ver_lista}
            >
              <i class="material-icons">list</i>
            </Button>
            {#if pedido.activo}
              <!-- content here -->
              <Button
                icon
                dense
                color="accent"
                on:click={() => {}}
                title="desactivar para pedidos"
              >
                <i class="material-icons">cancel</i>
              </Button>
            {:else}
              <!-- else content here -->
              <!-- <Button
                icon
                dense
                disabled={mandando_correo || pedido.cliente.correo === ''}
                color="#2B78FE"
                on:click={() => {
                  visible_enviar_email = true;
                }}
                title="Mandar email a cliente">
                <i class="material-icons">email</i>
              </Button> -->
            {/if}

            {#if pedido.status != "Envío"}
              <Button
                icon
                dense
                color={pedido.status !== "Envío" ? "green" : "gray"}
                disabled={pedido.status === "Envío"}
                on:click={editar}
                title="editar"
              >
                <i class="material-icons">create</i>
              </Button>
              <Button
                icon
                dense
                color={pedido.status !== "Envío" ? "darkorange" : "gray"}
                disabled={pedido.status === "Envío" || $usuario_db.rol == "almacen"}
                hidden={$usuario_db.rol == "almacen"}
                on:click={() => {
                  visible_cancelar = true;
                }}
                title="cancelar"
              >
                <i class="material-icons">delete</i>
              </Button>
            {/if}
          </ButtonGroup>
        </td>
      </tr>
      <tr>
        <td>
          <ButtonGroup>
            <!-- content here -->
            <!-- <Button
              icon
              dense
              color="#2B78FE"
              on:click={() => {
                dispatch('ver_un_pdf', { pedido });
              }}
              title="Ver PDF de pedido">
              <i class="material-icons">picture_as_pdf</i>
            </Button> -->
            <Button icon dense>
              <a
                icon
                dense
                color="#2B78FE"
                href={"app/pedidos/exportar/pdf?id=" + pedido._id}
                target="_blank"
                on:click={() => {}}
                title="Ver PDF de pedido, Descargando"
              >
                <i class="material-icons">picture_as_pdf</i>
              </a>
            </Button>
            <Button icon dense>
              <a
                icon
                dense
                color="#2B78FE"
                href={"app/pedidos/exportar/pdfsindescarga?id=" +
                  pedido._id +
                  "&origen=pedidos1"}
                target="_blank"
                on:click={() => {}}
                title="Ver PDF de pedido, sin descarga"
              >
                <i class="material-icons">picture_as_pdf</i>
              </a>
            </Button>

            {#if pedido.status === "Envío"}
              <!-- content here -->
              <Paqueteria bind:pedido bind:mensajeria={pedido.mensajeria} />
            {/if}

            {#if ($usuario_db.rol === "administrador" || $usuario_db.rol === "gerente") && pedido.status != "Envío"}
              <Cambiar_descuento
                bind:pedido
                on:descuento_cambiado={handle_descuento_cambiado}
              />
            {/if}
          </ButtonGroup>
        </td>
      </tr>
    </table>
    <!-- <div class="editar">
      <Button
                
                color={pedido.status !== 'Envío' ? 'green' : 'gray'}
                disabled={pedido.status === 'Envío'}
                on:click={editar}
                title="editar">
                <i class="material-icons">create</i>
              </Button>
    </div> -->
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
      <i class="material-icons">delete</i>
      Aceptar
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
  on:recargar_lista={() => {
    visible_status = false;
    dispatch("recargar_lista");
  }}
  bind:pedido
  bind:visible={visible_status}
/>

<style>
  .sobresaltar {
    background: #e0e0e0;
    color: #969696;
    font-weight: 500;
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    margin: 9px;
  }

  .row {
    height: 76px;
    overflow: hidden;
    padding: 8px;
    border-bottom: 1px solid #e1e1e1;
  }
  .row:hover {
    background-color: rgb(194, 194, 194);
  }
  .grid-container {
    /* font-weight: 200; */
    padding: 34px 4px;
    display: grid;
    grid-template-columns: 0.5fr 0px 1fr 1fr 200px 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cinco seis siete ocho nueve";
  }

  .uno {
    grid-area: uno;
    /* padding-top: 14px; */

    margin: auto 0;
  }

  .dos {
    grid-area: dos;
    margin: auto 0;
  }

  .tres {
    grid-area: tres;
    margin: auto 0;
    padding-left: 10px;
  }
  .tres:hover {
    font-weight: 700;
  }

  .cuatro {
    grid-area: cuatro;

    margin: auto 0;
    text-align: center;
  }

  .cinco {
    grid-area: cinco;
    margin: auto 0;
  }

  .seis {
    grid-area: seis;
    margin: auto auto;
  }

  .siete {
    grid-area: siete;
    margin: auto 0;
  }

  .ocho {
    grid-area: ocho;
    /* margin: 0 auto; */

    margin: auto 0;
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

  .folio {
    color: #0065ff;
    font-weight: 800;
    font-size: 1.1em;
  }

  .fecha {
    color: #2b78fe;
  }

  .fuente-ancha {
    font-weight: 600;
    text-align: center;
    width: 100%;
  }

  .pill {
    padding: 3px;
    border-radius: 50px;
    border: solid 1px #dedede;
  }

  .back_par {
    background: #e6e6e6;
  }

  .pill_envio {
    background: #2b78fe;
    color: white;
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
