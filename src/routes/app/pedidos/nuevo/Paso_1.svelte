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
    editar_store
  } from "./../../../stores";
  export var pedido_nuevo;
  export var cliente;
  export var ficha_de_descuento;
  let http_ocupado = false;
  const dispatch = createEventDispatcher();
  onMount(() => {
    //if($clientes.lista.length ===0) obtener_clientes_por_pagina();
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
  var cliente_tiene_carrito = true; //  false es lo que se busca para poder hacer el pedido
  var cliente_tiene_ficha_de_descuento = false;
  let cargando = false;
  let http_ultima_actividad_fecha = Date.now();
  let tipo_de_cambio_correcto = true;
  // var ficha_de_descuento =null;
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
    checar_si_tiene_carrito_pendiente(cliente._id);
    buscar_ficha_existente(cliente);
    if (cliente.direcciones_asociadas.length > 0) {
      arreglar_direccion(cliente.direcciones_asociadas[0]);
    }
  }

  function arreglar_direccion(direccion_param) {
    direccion = direccion_param.calle;
    direccion += ", #" + direccion_param.numero_exterior;
    direccion +=
      direccion_param.numero_interior == ""
        ? ""
        : ", Interior: " + direccion_param.numero_interior;
    direccion += ", Colonia :" + direccion_param.colonia;
    direccion += ", CP: " + direccion_param.cp;
    direccion += ", Localidad: " + direccion_param.localidad;
    direccion += ", Municipio: " + direccion_param.municipio;
    direccion += ", Estado: " + direccion_param.estado;
  }

  function checar_si_tiene_carrito_pendiente(id_cliente) {
    cargando = true;
    postData("app/pedidos/nuevo/ya_tiene_carrito", { id: id_cliente })
      .then(res => {
        cargando = false;
        //console.log(res);

        if (res.ok) {
          //console.log(res);
          cliente_tiene_carrito = res.carrito != null;
        }
      })
      .catch(err => {
        console.log(err);
        cargando = false;
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo saber si ya tiene un carrito en proceso"
        });
        $mensajes_app = $mensajes_app;
      });
  }

  function buscar_ficha_existente() {
    postData("app/clientes/leer_ficha_descuento_cliente", { cliente }).then(
      res => {
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
      }
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
    if (evt.key ===  "Enter") {
      crear_ficha_descuento_temporal();
    }
  };
  


  function handleKeydown(evt) {
    if (evt.key == "+") {
      evt.preventDefault();
      if(cliente_tiene_carrito == false && direccion != '' && tipo_de_cambio_correcto) dispatch('continuar');
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
    if(http_ocupado) return;
    let arreglado_pedido = JSON.parse(JSON.stringify(pedido_nuevo));
    arreglado_pedido.cliente = cliente;
    if (arreglado_pedido.moneda === "Pesos Mexicanos")
      arreglado_pedido.tipo_de_cambio = 1;
    else arreglado_pedido.tipo_de_cambio = pedido_nuevo.tipo_de_cambio;
    arreglado_pedido.descuento =parseFloat(cliente.perfil.porcentaje);
    if(cliente_tiene_ficha_de_descuento )arreglado_pedido.descuento =formato_precio(ficha_de_descuento.descuento);
    //console.log(arreglado_pedido);

    http_ocupado = true;
    postData("app/pedidos/nuevo/crear_pedido_nuevo_v2", {
      pedido_nuevo: arreglado_pedido
    })
      .then(respuesta => {
        //console.log(respuesta);

        //  Checar si se logro guardar el usuario
        if (respuesta.ok) {
          if (respuesta.ok) {
            $mensajes_app.push({
              tipo: "exito",
              mensaje: "pedido creado !"
            });
            $mensajes_app = $mensajes_app;
            console.log(respuesta);
            
            $editar_store.pedido = respuesta.carrito_creado.doc_nuevo;

            $lista_productos_en_pedido_en_edicion = [];
            $lista_productos_en_pedido_en_edicion = $lista_productos_en_pedido_en_edicion;

            //dispatch("ver_lista");
            goto("/app/pedidos/editor_wrap");
          }
          http_ocupado = false;
        } else {
          http_ocupado = false;
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta?respuesta.mensaje: "No se pudo crear el pedido."
          });
          $mensajes_app = $mensajes_app;
        }

        ////console.log(respuesta);
      })
      .catch(err => {
        http_ocupado = false;
        console.log(err);
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo crear el pedido."
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

<style>
  .grid-container {
    height: calc(100vh - 158px);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    grid-template-areas: "cliente direccion_de_envio perfil_del_cliente" "buscar_producto buscar_producto buscar_producto";
  }

  .cliente {
    grid-area: cliente;
  }

  .direccion_de_envio {
    grid-area: direccion_de_envio;
  }

  .perfil_del_cliente {
    grid-area: perfil_del_cliente;
  }

  .buscar_producto {
    grid-area: buscar_producto;
  }

  .padding {
    padding: 19px 0;
    text-align: right;
  }

  .direccion-box {
    padding: 21px;
    margin: 20px;
    border-radius: 10px;
    box-shadow: 3px 3px 10px #222d324f;
    border: 1px solid darkcyan;
  }

  .existe_ficha {
    color: #0065ff;
    font-weight: 500;
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
    border: 1px solid;
    margin: 18px;
    overflow-x: auto;
    text-align: center;
    padding: 4% 7% 10% 10%;
    border-radius: 2px;
  }

  .tiene_notas{
        color: blueviolet;
  }
  .rojo{
      color: red;
    font-weight: 700;
  }
  .borde_rojo{
    border:1px solid red;
  }
</style>

<div class="izquierda" style="padding-left: 5px;">
  <table>
    <tr>
      <td>
        <Button
          on:click={() => {
            goto('/app/pedidos');
          }}
          raised
          outlined
          title="ver lista">
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
<div class="grid-container ">
  <div class="cliente con_borde">

    <div class="padding">
      <Cliente
        bind:cliente
        on:cliente_selecto={handle_cliente_selecto}
        {cliente_tiene_carrito} />
    </div>
    <div class="padding ">

      {#if cliente_tiene_carrito && cliente.nombre != ''}
        <!-- content here -->
        <span style="color:red">
          El cliente
          <b>{cliente.nombre}</b>
          , ya tiene un pedido pendiente
        </span>
        <br />
      {/if}
      {#if cliente.agente == '' && cliente.nombre != ''}
        <!-- content here -->
        <span style="color:red">
          El cliente
          <b>{cliente.nombre}</b>
          , no tiene un agente asignado
        </span>
        <br />
      {/if}
      {direccion == '' ? '--' : 'Perfil de cliente: ' + cliente.perfil.perfil}
      <br />
      {cliente.agente == '' ? '--' : ' Agente : ' + cliente.agente.nombre}
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

      {#if moneda != 'Pesos Mexicanos'}
        <!--TIPO DE CAMBIO-->
        <Textfield
          on:change={validar_tipo_cambio}
          error={tipo_de_cambio_correcto ? '' : 'Valor incorrecto'}
          label="Tipo de cambio"
          type="number"
          min=".1"
          bind:value={pedido_nuevo.tipo_de_cambio}
          style="width: 215px;margin: 0 0px 0 calc(23vw - 250px);" />
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
    <i class="material-icons" style="vertical-align: top;">location_on</i>
    Dirección editable
    <textarea
      class="direccion-box"
      class:borde_rojo={direccion==""}
      cols="30"
      rows="20"
      bind:value={direccion} />
  </div>
  <div class="perfil_del_cliente">
    <i
      class="material-icons"
      style="vertical-align: middle;font-size: 5em;color:#222d32;padding-top:
      50px;">
      local_shipping
    </i>
    <br />
    {#if cliente_tiene_carrito == false && direccion != '' && tipo_de_cambio_correcto}
      <!-- content here -->
      <div in:fade={{ duration: 400, delay: 400 }}>

        <Button
          disabled={cliente_tiene_carrito || direccion == '' || !tipo_de_cambio_correcto}
          raised
          color="primary"
          title="Presiona el boton + "
          on:click={() => {
            guardar_en_DB();
          }}>
          Continuar
          <i class="material-icons">chevron_right</i>
        </Button>
      </div>

      {:else}
      <div class=" rojo">
      Escribe una dirección manualmente, <br> Tip: Agrega una dirección al cliente.
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
            }}>
            <table>
              <tr>

                <td class="color_azul td_estilo">
                  <span class="indice_row">{i + 1})</span>
                  {direccion.tipo}
                </td>
                <td >
                <span class="td_estilo">Calle:</span>
                
                <b>{direccion.calle}</b></td>
                
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
                    {direccion.correo != '' ? direccion.correo : cliente.correo}
                  </b>
                </td>

                <td class="td_estilo">
                <span class="td_estilo">, Notas: </span>
                  
                  <b class:tiene_notas={direccion.notas!=''}>{direccion.notas!=''?direccion.notas:'-sin notas-'}</b>
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

