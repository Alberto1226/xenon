<script>
  export var cliente;
  import {
    formato_precio,
    cliente_selecto,
    mensajes_app,
    clientes,
    usuario_db,
    postData,
    editar_store,
  } from "./../../stores";
  import { onMount, createEventDispatcher } from "svelte";
  import { Button, ButtonGroup, Dialog, Textfield } from "svelte-mui/src";
  import { goto } from "@sapper/app";
  import Dialogo_agente from "./dialogos/Dialogo_cambiar_agente.svelte";
  import Dialogo_password from "./dialogos/dialogo_cambiar_password.svelte";

  const dispatch = createEventDispatcher();
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

  onMount(() => {
    // fecha_nacimiento = cliente.fecha_nacimiento.toDate();
    fecha_nacimiento =
      cliente.fecha_nacimiento === null
        ? "-"
        : new Date(cliente.fecha_nacimiento).toLocaleDateString(
            "es-MX",
            options,
          );
    crear_lista_telefonos();
  });

  $: if (visible || visible_info) {
    buscar_ficha_existente();
  }

  function ver_pedidos_de_cliente() {
    $cliente_selecto = cliente;
    goto("app/clientes/pedidos");
  }

  function crear_lista_telefonos() {
    ////console.log(cliente.direcciones_asociadas);

    if (cliente.direcciones_asociadas.length === 0)
      return (telefonos_lista = "");
    cliente.direcciones_asociadas.forEach((element, i) => {
      if (element.telefono != "") {
        telefonos_lista.push(element.telefono);
        //console.log(element.telefono);
      }
      //console.log(telefonos_lista);
      if (i + 1 === cliente.direcciones_asociadas.length) {
        telefonos_lista = telefonos_lista;
      }
    });
  }

  function buscar_ficha_existente() {
    postData("app/clientes/leer_ficha_descuento_cliente", { cliente }).then(
      (res) => {
        if (res.ok) {
          //console.log(res.ficha);
          ficha_descuento_existente = res.ficha;
        } else {
          mostrar_error("buscando ficha");
        }
      },
    );
  }

  function cambiar_status_activo(status) {
    //console.log(status);

    procesando = true;
    postData("app/clientes/status_activo", { id: cliente._id, activo: status })
      .then((respuesta) => {
        if (respuesta.ok) {
          //console.log(respuesta);
          let adjetivo = !status ? "desactivado" : "activado";
          $mensajes_app.push({
            tipo: "exito",
            mensaje: `cliente ${cliente.nombre} ${adjetivo} .`,
          });
          $mensajes_app = $mensajes_app;
          var cliente_tmp = $clientes.lista.find(
            (cliente_t) => cliente_t._id == cliente._id,
          );
          cliente_tmp.activo = status;
          $clientes = $clientes;
          cliente.activo = status;
          procesando = false;
        } else {
          $mensajes_app.push({
            tipo: "error",
            mensaje: `No se pudo cambiar su status de activación .`,
          });
          $mensajes_app = $mensajes_app;
        }
      })
      .catch((err) => {
        console.log(err);
      })

      .catch((error) => {
        let accion = usuario.activo ? "desactivar" : "activar";
        $mensajes_app.push({
          tipo: "error",
          mensaje: `No se pudo ${accion} al usuario.`,
        });
        $mensajes_app = $mensajes_app;
        procesando = false;
      });
  }

  function mostrar_error(error) {
    $mensajes_app.push({ tipo: "error", mensaje: "Error " + error });
    $mensajes_app = $mensajes_app;
  }

  function mostrar_exito(mensaje) {
    $mensajes_app.push({ tipo: "exito", mensaje: mensaje });
    $mensajes_app = $mensajes_app;
  }

  function sumar_cantidades() {
    if (cliente.carritos == undefined) {
      total_reservado = 0;
      return;
    }
    if (cliente.carrito.length == 0 || cliente.carrito == [""]) {
      total_reservado = 0;
      return;
    }
    total_reservado = cliente.carritos.reduce((a, b) => +a + +b.cantidad, 0);
  }

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

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

  function refrescar_lista(evt) {
    //console.log(evt)
    cliente.agente = evt.detail.agente;
    dispatch("refrescar_lista");
  }

  const handle_key_up = (evt) => {
    if (evt.key === "Enter") {
      crear_ficha_descuento_temporal();
    }
  };
</script>

<div
  class="grid-container row"
  class:row_activo={cliente.activo == true}
  class:inactivo={cliente.activo === false}
>
  <div class="uno">
    <i style="vertical-align:middle;" class="material-icons">account_circle</i>
    {#if cliente.activo === false}
      <i
        class="material-icons icono_bloqueado no_select"
        title="Cliente no activo para ser seleccionado por usuarios para pedidos"
        >block</i
      >
    {/if}
    {cliente.alias}
  </div>
  <div class="dos">
    {cliente.nombre}
    <br />
    <span class="info">{cliente.correo}</span>
    <span class="info">
      {cliente.direcciones_asociadas[0]
        ? cliente.direcciones_asociadas[0].municipio
        : ""},
    </span>

    <span class="info">
      <b
        >{cliente.direcciones_asociadas[0]
          ? cliente.direcciones_asociadas[0].estado
          : ""}</b
      ></span
    >
    <span class="info"
      >, <b
        >{cliente.direcciones_asociadas[0]
          ? cliente.direcciones_asociadas[0].cp
          : ""}</b
      ></span
    >
    <br />
  </div>
  <div class="tres">
    {#each telefonos_lista as telefono, i}
      <!-- content here -->
      - {telefono}
      <br />
    {/each}
  </div>
  <div class="cuatro">{fecha_nacimiento}</div>
  <div class="cinco">{cliente.perfil.perfil}</div>
  <div class="seis">{cliente.region == null ? `-` : cliente.region}</div>
  <div class="siete">{cliente.plataforma}</div>
  <div class="ocho pointer reactivo">
    <table>
      <tr>
        <td>
          <ButtonGroup>
            {#if cliente.activo && $usuario_db.rol == "administrador"}
              <!-- content here -->
              <Button
                icon
                dense
                color="accent"
                on:click={() => {
                  cambiar_status_activo(false);
                }}
                title="desactivar para pedidos"
              >
                <i class="material-icons">cancel</i>
              </Button>
            {/if}
            {#if cliente.activo == false && $usuario_db.rol == "administrador"}
              <Button
                icon
                dense
                color="green"
                on:click={() => {
                  cambiar_status_activo(true);
                }}
                title="activar para pedidos"
              >
                <i class="material-icons">check</i>
              </Button>
            {/if}
            {#if ($usuario_db.rol == "administrador" || $usuario_db.edit)}
              <Button
                icon
                dense
                color="green"
                on:click={() => {
                  $editar_store.cliente = cliente;
                  goto("/app/clientes/editar");
                }}
                title="editar"
              >
                <i class="material-icons">create</i>
              </Button>
            {/if}
            {#if $usuario_db.rol == "administrador"}
              <!-- content here -->
              <Button
                icon
                dense
                color="darkorange"
                title="movimientos"
                on:click={ver_pedidos_de_cliente}
              >
                <i class="material-icons">history</i>
              </Button>
            {/if}
          </ButtonGroup>
        </td>
      </tr>
      <tr>
        <td>
          <ButtonGroup>
            {#if $usuario_db.rol != "vendedor" && cliente.agente}
              <!-- Edicion de agente -->

              <!-- AGENTE si -->
              <Button
                icon
                dense
                color={cliente.agente.nombre != "" ? "black" : "darkorange"}
                on:click={() => {
                  dialogo_agente = true;
                }}
                title="Editar el agente"
              >
                <i class="material-icons">accessibility</i>
              </Button>
            {/if}

            {#if $usuario_db.rol != "vendedor"}
              <!-- content here -->
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
            {/if}
            {#if $usuario_db.rol === "vendedor"}
              <!-- content here -->
              <Button
                icon
                dense
                color="#0065ff"
                on:click={() => {
                  visible_info = true;
                }}
                title="Ver si tiene ficha de descuento para el siguiente pedido"
              >
                <i class="material-icons">loyalty</i>
              </Button>
            {/if}
            {#if $usuario_db.rol == "administrador"}
              <!-- content here -->

              <Button
                icon
                dense
                color="green"
                on:click={() => {
                  if ($usuario_db.rol != "administrador") {
                    return;
                  }
                  //$usuario_selecto = usuario;
                  dialogo_pass_visible = true;
                }}
                title="Cambiar Password"
              >
                <i class="material-icons">vpn_key</i>
              </Button>
            {/if}
          </ButtonGroup>
        </td>
      </tr>
    </table>
  </div>
</div>

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

<Dialogo_agente
  on:refrescar_lista={refrescar_lista}
  bind:visible={dialogo_agente}
  bind:agente={cliente.agente}
  bind:cliente
/>

<Dialogo_password
  bind:cliente
  id={cliente._id}
  bind:visible={dialogo_pass_visible}
/>

<style>
  .row {
    height: 97px;
    overflow: hidden;
    padding: 8px;
    border-bottom: 1px solid #e1e1e1;
    position: relative;
  }

  .grid-container {
    /* font-weight: 200; */
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
    grid-template-rows: 1fr;
    grid-template-areas: "uno dos tres cuatro cinco seis siete ocho  ";
    padding: 23px 1px;
  }

  .uno {
    grid-area: uno;
    text-align: left;
    padding-top: 29px;
  }

  .dos {
    grid-area: dos;
    margin: auto 0;
    width: 13vw;
  }

  .tres {
    grid-area: tres;
    margin: auto 0;
  }

  .cuatro {
    grid-area: cuatro;
    margin: auto 0;
  }

  .cinco {
    grid-area: cinco;
    margin: auto 0;
  }

  .seis {
    grid-area: seis;
    margin: auto 0;
  }

  .siete {
    grid-area: siete;
    margin: auto 0;
  }

  .ocho {
    grid-area: ocho;
  }

  .reactivo:hover {
    font-weight: 500;
  }

  .info {
    color: gray;
    font-size: 0.8em;
    font-weight: 200;
    margin-top: 20px;
  }
  .ficha_actual {
    font-weight: 200;
    margin-top: 20px;
  }

  .cliente_inactivo {
    background-color: rgb(221, 221, 41);
    border: 1px solid brown;
    border-radius: 10px;
  }
  .row_activo:hover {
    background-color: rgb(235, 235, 235);
  }
  .icono_bloqueado {
    color: #ff0000;
    font-size: 36px;
    position: absolute;
    margin: -6px 0px 0px -30px;
  }
  .inactivo {
    background-color: rgb(101 101 101);
    color: white;
    font-weight: 600;
  }
</style>
