<script>
  import Ayuda from "./Ayuda_paso1.svelte";
  import { fade } from "svelte/transition";
  import Cliente from "./Cliente.svelte";
  import Moneda from "./Moneda.svelte";
  import { Button, Textfield, Dialog } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import { goto } from "@sapper/app";
  import {
    mensajes_app,
    formato_precio,
    postData,
    clientes,
    lista_productos_en_pedido_en_edicion,
    usuario_db,
    editar_store,
  } from "./../../../stores";
  export var pedido_nuevo;
  export var cliente;
  export var ficha_de_descuento;
  let http_ocupado = false;
  const dispatch = createEventDispatcher();
  onMount(() => {
    if (cliente && (cliente._id || cliente.id)) {
      checar_si_tiene_carrito_pendiente(cliente._id || cliente.id);
    }
  });

  var fecha_nacimiento;
  let descuento_nuevo = 0;
  let visible = false;
  let visible_info = false;
  let ficha_descuento_existente = null;
  let subiendo_ficha = false;
  let procesando = false;
  let telefonos_lista = [];
  let dialogo_agente = false; //visibilidad
  let dialogo_pass_visible = false;

  var moneda = "Pesos Mexicanos";
  var direccion = "";
  var obs = "Sin Observaciones";
  // var cliente_tiene_carrito = true; //  false es lo que se busca para poder hacer el pedido
  var cliente_tiene_carrito = false; //  false es lo que se busca para poder hacer el pedido
  var cliente_tiene_ficha_de_descuento = false;
  let cargando = false;
  let http_ultima_actividad_fecha = Date.now();
  let tipo_de_cambio_correcto = true;
  // var ficha_de_descuento =null;
  let datos_completos = true;
  let campos_faltantes = [];
  let cotizaciones_con_datos_incompletos = 0;
  let cotizaciones_disponibles = 3;
  let bloqueado_por_datos_incompletos = false;
  let pedidos_abiertos = [];
  let total_pedidos_abiertos = 0;
  $: cliente.direccion = direccion;

  $: if (moneda || cliente || direccion) {
    pedido_nuevo.cliente_correo = cliente.correo;
    pedido_nuevo.cliente_nombre = cliente.nombre;
    pedido_nuevo.cliente_direccion = cliente.direccion;
    pedido_nuevo.moneda = moneda;
  }

  function validar_tipo_cambio() {
    if (isNaN(pedido_nuevo.tipo_de_cambio))
      return (tipo_de_cambio_correcto = false);
    if (pedido_nuevo.tipo_de_cambio < 0.1)
      return (tipo_de_cambio_correcto = false);
    tipo_de_cambio_correcto = true;
  }

  $: if (visible || visible_info) {
    buscar_ficha_existente();
  }

  function handle_cliente_selecto() {
    /**/

    //direccion += ", Nombre: " + cliente.direccion_envio.nombre;
    checar_si_tiene_carrito_pendiente(cliente._id || cliente.id);
    buscar_ficha_existente(cliente);
    if (cliente.direcciones_asociadas.length > 0) {
      arreglar_direccion(cliente.direcciones_asociadas[0]);
    }
  }

  function arreglar_direccion(direccion_param) {
    // // if (
    // //   !direccion_param.calle ||
    // //   !direccion_param.numero_exterior ||
    // //   !direccion_param.colonia ||
    // //   !direccion_param.cp ||
    // //   !direccion_param.localidad_nombre ||
    // //   !direccion_param.municipio ||
    // //   !direccion_param.estado
    // // ) {
    // //   $mensajes_app.push({
    // //     tipo: "error",
    // //     mensaje: "Todos los campos de la dirección deben estar completos",
    // //   });
    // //   $mensajes_app = $mensajes_app;
    // //   direccion = "";
    // // } else {
      direccion = direccion_param.calle;
      direccion += ", #" + direccion_param.numero_exterior;
      direccion +=
        direccion_param.numero_interior == ""
          ? ""
          : ", Interior: " + direccion_param.numero_interior;
      direccion += ", Colonia :" + direccion_param.colonia;
      direccion += ", CP: " + direccion_param.cp;
      direccion += ", Localidad: " + direccion_param.localidad_nombre;
      direccion += ", Municipio: " + direccion_param.municipio;
      direccion += ", Estado: " + direccion_param.estado;
    // }
  }

  function checar_si_tiene_carrito_pendiente(id_cliente) {
    cargando = true;
    postData("app/pedidos/nuevo/ya_tiene_carrito", { id: id_cliente })
      .then((res) => {
        cargando = false;
        //console.log(res);

        if (res.ok) {
          //console.log(res);
          // cliente_tiene_carrito = res.carrito != null;
          cliente_tiene_carrito = false;
          pedidos_abiertos = res.pedidos_abiertos || [];
          total_pedidos_abiertos = res.total_pedidos_abiertos || 0;
          datos_completos = res.datos_completos;
          campos_faltantes = res.campos_faltantes || [];
          cotizaciones_con_datos_incompletos = res.cotizaciones_con_datos_incompletos || 0;
          cotizaciones_disponibles = res.cotizaciones_disponibles;
          bloqueado_por_datos_incompletos = res.bloqueado_por_datos_incompletos;
        }
      })
      .catch((err) => {
        console.log(err);
        cargando = false;
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo saber si ya tiene un carrito en proceso",
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function buscar_ficha_existente() {
    postData("app/clientes/leer_ficha_descuento_cliente", { cliente }).then(
      (res) => {
        if (res.ok) {
          //console.log(res.ficha);
          cliente_tiene_ficha_de_descuento = res.ficha !== null;
          ficha_de_descuento = res.ficha;
          ficha_descuento_existente = res.ficha;
        } else {
          //mostrar_error("buscando ficha");
          ficha_de_descuento = null;
          cliente_tiene_ficha_de_descuento = false;
          ficha_descuento_existente = res.ficha;
        }
      },
    );
  }

  function crear_ficha_descuento_temporal() {
    if (isNaN(descuento_nuevo) || descuento_nuevo <= 0) {
      $mensajes_app.push({
        tipo: "error",
        mensaje: "Valor de descuento incorrecto",
      });
      $mensajes_app = $mensajes_app;
      return;
    }
    subiendo_ficha = true;
    postData("app/clientes/crear_ficha_descuento_cliente", {
      autorizo: {
        usuario: $usuario_db.usuario,
        id: $usuario_db._id,
      },
      descuento: parseFloat(descuento_nuevo),
      fecha: new Date(),
      cliente: {
        nombre: cliente.nombre,
        id: cliente._id,
      },
    })
      .then((res) => {
        if (res.ok) {
          // console.log(res);
          ficha_descuento_existente = res.ficha;
          visible = false;
          mostrar_exito("Se creado la ficha");
        } else {
          mostrar_error("creando ficha");
          visible = false;
        }
        subiendo_ficha = false;
      })
      .catch((err) => {
        console.log(err);
        subiendo_ficha = false;
      });
  }

  function borrar_descuento() {
    subiendo_ficha = true;
    postData("app/clientes/borrar_descuento", {
      id: cliente._id,
    })
      .then((res) => {
        if (res.ok) {
          // console.log(res);
          ficha_descuento_existente = res.ficha;
          visible = false;
          mostrar_exito("Se ha borrado la ficha");
        } else {
          mostrar_error("borrado ficha");
          visible = false;
        }
        subiendo_ficha = false;
      })
      .catch((err) => {
        console.log(err);
        subiendo_ficha = false;
      });
  }

  const handle_key_up = (evt) => {
    if (evt.key === "Enter") {
      crear_ficha_descuento_temporal();
    }
  };

  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();
      if (
        cliente_tiene_carrito == false &&
        direccion != "" &&
        tipo_de_cambio_correcto
      )
        dispatch("continuar");
      return;
    }
    if (evt.key == "Escape") {
      //  estado_actual = "viendo listas"
      goto("/app/pedidos/");
    }
  }

  function guardar_en_DB() {
    ////console.log(pedido_nuevo);
    ////console.log(cliente);
    if (http_ocupado) return;
    let arreglado_pedido = JSON.parse(JSON.stringify(pedido_nuevo));
    arreglado_pedido.cliente = cliente;
    if (arreglado_pedido.moneda === "Pesos Mexicanos")
      arreglado_pedido.tipo_de_cambio = 1;
    else arreglado_pedido.tipo_de_cambio = pedido_nuevo.tipo_de_cambio;
    arreglado_pedido.descuento = parseFloat(cliente.perfil.porcentaje);
    if (cliente_tiene_ficha_de_descuento)
      arreglado_pedido.descuento = formato_precio(ficha_de_descuento.descuento);
    //console.log(arreglado_pedido);

    http_ocupado = true;
    postData("app/pedidos/nuevo/crear_pedido_nuevo_v2", {
      pedido_nuevo: arreglado_pedido,
    })
      .then((respuesta) => {
        //console.log(respuesta);

        //  Checar si se logro guardar el usuario
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "pedido creado !",
            });
            $mensajes_app = $mensajes_app;
            console.log(respuesta);

            $editar_store.pedido = respuesta.carrito_creado.doc_nuevo;

            $lista_productos_en_pedido_en_edicion = [];
            $lista_productos_en_pedido_en_edicion =
              $lista_productos_en_pedido_en_edicion;

            //dispatch("ver_lista");
            goto("/app/pedidos/editor_wrap");
          }
          http_ocupado = false;
        } else {
          http_ocupado = false;
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta
              ? respuesta.mensaje
              : "No se pudo crear el pedido.",
          });
          $mensajes_app = $mensajes_app;
        }

        ////console.log(respuesta);
      })
      .catch((err) => {
        http_ocupado = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo crear el pedido.",
        });
        $mensajes_app = $mensajes_app;
      });
  }
</script>

<Dialog width="350" bind:visible>
  <div
    slot="title"
    style="background:rgb(0, 101, 255);color:white;padding:10px"
  >
    Ficha de descuento temporal
  </div>

  <div class="ficha_actual">
    {#if ficha_descuento_existente != null}
      <b>{cliente.nombre}</b>
      ya cuenta con una ficha de decuento de
      <b>{formato_precio(ficha_descuento_existente.descuento)} %</b>
      deseas cambiar la cantidad ?
    {:else}
      <div class="centrado info">
        Crea una ficha de descuento que será utilizada
        <br />
        No se encontro ficha de descuento
      </div>
      <br />
      <div class="centrado">Se aceptan valores de 1 a 99</div>
    {/if}
  </div>
  <table style="margin:0 auto;width: 63%;">
    <tr>
      <td>
        <Textfield
          name="username"
          autocomplete="off"
          min="1"
          max="99"
          style=""
          error={isNaN(descuento_nuevo) ||
          descuento_nuevo <= 0 ||
          descuento_nuevo > 99
            ? "El valor no es correcto"
            : ""}
          type="number"
          bind:value={descuento_nuevo}
          on:keyup={handle_key_up}
          message="Descuento a aplicar"
        />
      </td>
      <td>%</td>
    </tr>
  </table>

  <div slot="footer" class="footer centrado">
    <Button
      style="margin-bottom:10px;"
      on:click={crear_ficha_descuento_temporal}
      color="primary"
      raised={!isNaN(descuento_nuevo) && descuento_nuevo > 0}
      disabled={isNaN(descuento_nuevo) || descuento_nuevo <= 0}
    >
      {#if ficha_descuento_existente == null}
        <!-- content here -->
        Crear Ficha
      {:else}Actualizar{/if}
    </Button>

    {#if ficha_descuento_existente != null}
      <!-- content here -->

      <Button
        on:click={borrar_descuento}
        color="red"
        icon
        title="borrar ficha"
        raised={!isNaN(descuento_nuevo) && descuento_nuevo > 0}
      >
        <i class="material-icons">delete</i>
      </Button>
    {/if}
  </div>
</Dialog>

<Dialog width="350" bind:visible={visible_info}>
  <div
    slot="title"
    style="background:rgb(0, 101, 255);color:white;padding:10px"
  >
    Ficha de descuento temporal
  </div>

  <div class="ficha_actual">
    {#if ficha_descuento_existente != null}
      <b>{cliente.nombre}</b>
      cuenta con una ficha de decuento de
      <b>{formato_precio(ficha_descuento_existente.descuento)} %</b>
    {:else}
      <div class="centrado info">No se encontro ficha de descuento</div>
    {/if}
  </div>

  <div slot="footer" class="footer" />
</Dialog>

<svelte:window on:keydown={handleKeydown} />

<div class="izquierda" style="padding-left: 5px;">
  <table>
    <tr>
      <td>
        <Button
          on:click={() => {
            goto("/app/pedidos");
          }}
          raised
          outlined
          title="ver lista"
        >
          <i class="material-icons">arrow_back</i>
          Ver lista
        </Button>
      </td>
      <td class="centrado titulo_formulario" style="width: 63vw;">
        Pedido Nuevo
      </td>
    </tr>
  </table>
</div>

<Ayuda />
<div class="grid-container">
  <div class="cliente con_borde">
    <div class="padding">
      <Cliente
        bind:cliente
        on:cliente_selecto={handle_cliente_selecto}
        {cliente_tiene_carrito}
      />
    </div>
    <div class="padding">
      {#if cliente.nombre != ""}
        <div class="pedidos-abiertos-container">
          <span class="pedidos-abiertos-badge">
            <i class="material-icons badge-icon">shopping_cart</i>
            Pedidos abiertos: <b>{total_pedidos_abiertos}</b>
            
            <div class="pedidos-tooltip">
              <div class="tooltip-header">
                Pedidos Abiertos ({total_pedidos_abiertos})
              </div>
              {#if pedidos_abiertos && pedidos_abiertos.length > 0}
                <div class="tooltip-body">
                  {#each pedidos_abiertos as ped}
                    <div class="tooltip-row">
                      <span class="tooltip-folio">Folio: #{ped.folio || 'S/F'}</span>
                      <span class="tooltip-status">{ped.status || 'Pendiente'}</span>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="tooltip-empty">
                  Sin pedidos abiertos
                </div>
              {/if}
            </div>
          </span>
        </div>
        <br />
      {/if}
      {#if cliente_tiene_carrito && cliente.nombre != ""}
        <!-- content here -->
        <span style="color:red">
          El cliente
          <b>{cliente.nombre}</b>
          , ya tiene un pedido pendiente
        </span>
        <br />
      {/if}
      {#if cliente.agente == "" && cliente.nombre != ""}
        <!-- content here -->
        <span style="color:red">
          El cliente
          <b>{cliente.nombre}</b>
          , no tiene un agente asignado
        </span>
        <br />
      {/if}
      {#if !datos_completos && cliente.nombre != "" && !bloqueado_por_datos_incompletos}
        <span style="color:darkorange">
          El cliente <b>{cliente.nombre}</b> tiene información pendiente ({campos_faltantes.join(", ")}).
          <span style="color: red; font-weight: bold;">
            Te quedan {cotizaciones_disponibles} cotización(es) antes de requerir completarla.
          </span>
        </span>
        <br />
      {/if}
      {#if bloqueado_por_datos_incompletos && cliente.nombre != ""}
        <span style="color:red">
          El cliente <b>{cliente.nombre}</b> alcanzó el límite de cotizaciones con información
          incompleta. Completa antes de continuar: {campos_faltantes.join(", ")}.
        </span>
        <br />
      {/if}
      {direccion == "" ? "--" : "Perfil de cliente: " + cliente.perfil.perfil}
      <br />
      {cliente.agente == "" ? "--" : " Agente : " + cliente.agente.nombre}
      <br />
      <b class="observaciones">Observaciones: {cliente.observaciones}</b>
      <br />
      {#if cliente_tiene_ficha_de_descuento}
        <!-- content here -->
        <div class="existe_ficha">
          <i style="vertical-align:middle;" class="material-icons">loyalty</i>
          Existe una ficha de descuento de
          <b>{formato_precio(ficha_de_descuento.descuento)} %</b>
        </div>
      {/if}
    </div>
    <div class="padding">
      <Moneda bind:moneda />
      <br />

      {#if moneda != "Pesos Mexicanos"}
        <!--TIPO DE CAMBIO-->
        <Textfield
          on:change={validar_tipo_cambio}
          error={tipo_de_cambio_correcto ? "" : "Valor incorrecto"}
          label="Tipo de cambio"
          type="number"
          min=".1"
          bind:value={pedido_nuevo.tipo_de_cambio}
          style="width: 215px;margin: 0 0px 0 calc(23vw - 250px);"
        />
      {/if}

      <Button
        icon
        dense
        color="#0065ff"
        on:click={() => {
          visible = true;
        }}
        title="Crear un a ficha de descuento para el siguiente pedido"
      >
        <i class="material-icons">loyalty</i>
      </Button>
    </div>
  </div>
  <div class="direccion_de_envio">
    <div style="text-align: center; font-weight: 500; margin-top: 10px;">
      <i class="material-icons" style="vertical-align: middle;">location_on</i>
      Dirección
    </div>
    <textarea
      class="direccion-box"
      class:borde_rojo={direccion == ""}
      cols="30"
      rows="4"
      bind:value={direccion}
    />
  </div>
  <div class="perfil_del_cliente">
    <i
      class="material-icons"
      style="vertical-align: middle;font-size: 4em;color:#222d32;padding-top: 15px;"
    >
      local_shipping
    </i>
    <br />
    {#if cliente_tiene_carrito == false && direccion != "" && tipo_de_cambio_correcto && !bloqueado_por_datos_incompletos}
      <!-- content here -->
      <div in:fade={{ duration: 400, delay: 400 }}>
        <Button
          disabled={cliente_tiene_carrito ||
            direccion == "" ||
            !tipo_de_cambio_correcto ||
            bloqueado_por_datos_incompletos}
          raised
          color="primary"
          title="Presiona el boton + "
          on:click={() => {
            guardar_en_DB();
          }}
        >
          Continuar
          <i class="material-icons">chevron_right</i>
        </Button>
      </div>
    {:else}
      <div class=" rojo">
        <!-- Escribe una dirección manualmente, <br /> Tip: Agrega una dirección al cliente. -->
        Debe registrar la direccion del cliente antes <br /> de proceder con un
        pedido<br /> Tip: Agrega una dirección en la configuracion del cliente.
      </div>
    {/if}
  </div>

  <div class="buscar_producto" style="padding-left:17px;">
    {#if cliente.direcciones_asociadas !== undefined && cliente.direcciones_asociadas !== null}
      <!-- content here -->
      <div class="centrado titulo_formulario">
        Lista de direcciones ({cliente.direcciones_asociadas.length})
      </div>
      <div class="scrollable">
        {#each cliente.direcciones_asociadas as direccion, i}
          <!-- content here -->
          <div
            class="row pointer"
            on:click={() => {
              arreglar_direccion(direccion);
            }}
          >
            <table>
              <tr>
                <td class="color_azul td_estilo">
                  <span class="indice_row">{i + 1})</span>
                  {direccion.tipo}
                </td>
                <td>
                  <span class="td_estilo">Calle:</span>

                  <b>{direccion.calle}</b></td
                >

                <td class="td_estilo">
                  <span class="td_estilo">, #ext:</span>

                  <b> {direccion.numero_exterior}</b>
                </td>
                <td class="td_estilo">
                  <span class="td_estilo">, #int: </span>
                  <b>{direccion.numero_interior}</b>
                </td>
              </tr>
              <tr>
                <td class="td_estilo">
                  <span class="td_estilo">, Colonia:</span>

                  <b>{direccion.colonia}</b>
                </td>
                <td class="td_estilo">
                  <span class="td_estilo">, C.P.:</span>

                  <b>{direccion.cp}</b>
                </td>
                <td class="td_estilo">
                  <span class="td_estilo">, Estado:</span>

                  <b>{direccion.estado}</b>
                </td>
                <td class="td_estilo">
                  <span class="td_estilo">, Municipio:</span>

                  <b>{direccion.municipio}</b>
                </td>
              </tr>
              <tr>
                <td class="td_estilo">
                  <span class="td_estilo">, Telefono:</span>

                  <b>{direccion.telefono}</b>
                </td>
                <td class="td_estilo">
                  <span class="td_estilo">, RFC:</span>

                  <b>{direccion.rfc}</b>
                </td>

                <td class="td_estilo">
                  <span class="td_estilo">, Correo:</span>

                  <b>
                    {direccion.correo != "" ? direccion.correo : cliente.correo}
                  </b>
                </td>

                <td class="td_estilo">
                  <span class="td_estilo">, Notas: </span>

                  <b class:tiene_notas={direccion.notas != ""}
                    >{direccion.notas != ""
                      ? direccion.notas
                      : "-sin notas-"}</b
                  >
                </td>
                <td class="td_estilo" />
              </tr>
            </table>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .grid-container {
    height: calc(100vh - 158px);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas: "cliente direccion_de_envio perfil_del_cliente" "buscar_producto buscar_producto buscar_producto";
  }

  .cliente {
    grid-area: cliente;
  }

  .direccion_de_envio {
    grid-area: direccion_de_envio;
    text-align: center;
  }

  .perfil_del_cliente {
    grid-area: perfil_del_cliente;
    text-align: center;
  }

  .buscar_producto {
    grid-area: buscar_producto;
  }

  .padding {
    padding: 6px 0;
    text-align: center;
  }

  .direccion-box {
    padding: 12px;
    margin: 10px auto;
    border-radius: 8px;
    box-shadow: 2px 2px 8px #222d324f;
    border: 1px solid darkcyan;
    width: 90%;
    height: 120px;
    resize: none;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 0.95rem;
  }

  .existe_ficha {
    color: #0065ff;
    font-weight: 500;
  }

  .observaciones {
    word-wrap: break-word;
  }

  .color_azul {
    color: dodgerblue;
    font-weight: 500;
  }

  .row {
    padding: 5px;
    border-radius: 2px;
  }

  .row:hover {
    box-shadow: 2px 2px 4px gray;
  }

  .scrollable {
    height: 39vh;
    overflow-y: auto;
  }
  .td_estilo {
    padding-left: 10px;
    width: 15vw;
    font-weight: 200;
    font-size: 0.8em;
  }
  .con_borde {
    border: 1px solid #ccc;
    margin: 10px;
    overflow: visible;
    text-align: center;
    padding: 10px 15px;
    border-radius: 4px;
    background: #fff;
  }

  .tiene_notas {
    color: blueviolet;
  }
  .rojo {
    color: red;
    font-weight: 700;
  }
  .borde_rojo {
    border: 1px solid red;
  }

  .pedidos-abiertos-container {
    display: inline-block;
    margin: 8px 0;
    position: relative;
  }

  .pedidos-abiertos-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #eef2ff;
    color: #1e40af;
    border: 1px solid #c7d2fe;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  }

  .pedidos-abiertos-badge:hover {
    background: #e0e7ff;
    border-color: #a5b4fc;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  }

  .badge-icon {
    font-size: 1.15rem;
    color: #3b82f6;
    vertical-align: middle;
  }

  .pedidos-tooltip {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 250px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    padding: 12px;
    text-align: left;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .pedidos-tooltip::before {
    content: "";
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 7px;
    border-style: solid;
    border-color: transparent transparent #ffffff transparent;
  }

  .pedidos-abiertos-badge:hover .pedidos-tooltip {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }

  .tooltip-header {
    font-weight: 700;
    font-size: 0.85rem;
    color: #1e293b;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }

  .tooltip-body {
    max-height: 180px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #f1f5f9;
    font-size: 0.82rem;
  }

  .tooltip-folio {
    font-weight: 600;
    color: #0f172a;
  }

  .tooltip-status {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    background: #0065ff;
    color: #ffffff;
    font-weight: 600;
  }

  .tooltip-empty {
    font-size: 0.82rem;
    color: #64748b;
    font-style: italic;
    text-align: center;
    padding: 6px 0;
  }
</style>
