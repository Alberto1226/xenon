<script>
  import Cliente from "./Cliente.svelte";
  import Moneda from "./Moneda.svelte";
  import { fade } from "svelte/transition";
  import { clientes } from "./../../../stores";
  import { Button, Textfield } from "svelte-mui/src";
  import { onMount, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import { goto } from "@sapper/app";
  import {
    mensajes_app,
    formato_precio,
    postData,
    editar_store,
    pedidos
  } from "./../../../stores";
  export var pedido_selecto;
  export var cliente;
  export var ficha_de_descuento;
  let tipo_de_cambio_correcto = true;
  let cliente_completo = {
    direcciones_asociadas: []
  };
  const dispatch = createEventDispatcher();
  let arrancado = false; //  sirve para evitar el reactivo de cliente.direccion = direcicon
  let moneda_original;
  var tipo_de_cambio_original;
  var notas;
  var obs = "";
  var tipo_de_cambio ;
  onMount(() => {

    notas =pedido_selecto.notas?pedido_selecto.notas:$editar_store.pedido.notas;
    //console.log('notas='+notas);
    tipo_de_cambio =pedido_selecto.tipo_de_cambio?pedido_selecto.tipo_de_cambio:$editar_store.pedido.tipo_de_cambio;
    moneda_original = JSON.parse(JSON.stringify($editar_store.pedido.moneda));
    tipo_de_cambio_original = JSON.parse(
      JSON.stringify(pedido_selecto.tipo_de_cambio)
    );
    cliente_completo = $clientes.lista.find(
      element => element._id === cliente.id
    );
    if (cliente_completo === undefined) {
      // bajar cliente completo
      obtener_cliente();
    }
    direccion = cliente.direccion;
    moneda = pedido_selecto.moneda;

    arrancado = true;
    //handle_cliente_selecto()
  });

  var moneda;
  var direccion = "";
  var cliente_tiene_carrito = true; //  false es lo que se busca para poder hacer el pedido
  var cliente_tiene_ficha_de_descuento = false;
  let cargando = false;
  // var ficha_de_descuento =null;
  $: if (arrancado) cliente.direccion = direccion;

  $: if (direccion) {
    pedido_selecto.cliente_correo = cliente.correo;
    pedido_selecto.cliente_nombre = cliente.nombre;
    pedido_selecto.cliente_direccion = cliente.direccion;
  }

  $: if (moneda) {
    pedido_selecto.moneda = moneda;
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

  ///   solo se usa si no se tien la lista de clientes
  function obtener_cliente() {
    cargando = true;
    postData("app/clientes/devolver_cliente", { cliente })
      .then(respuesta => {
        if (respuesta.ok) {
          $clientes.lista.push(respuesta.cliente);
          $clientes = $clientes;
          cliente_completo = respuesta.cliente;
          console.log(cliente_completo.observaciones);
          obs = cliente_completo.observaciones;
          if(cliente_completo.observaciones == ""){
            obs = "Sin observaciones";
          }
        } else {
          //console.log("No se encontro al cliente ");
        }
      })
      .catch(err => {
        console.log(err);
      });
  }

  function actualizar_moneda_y_direccion_y_continuar(id_pedido) {
    cargando = true;
    postData("app/pedidos/editar/cambiar_direccion_moneda_carrito", {
      id: id_pedido,
      moneda,
      direccion,
      notas,
      tipo_de_cambio: moneda != "Pesos Mexicanos" ?  tipo_de_cambio : 1
    })
      .then(res => {
        cargando = false;
        //console.log(res);

        if (res.ok) {
          //console.log(res);

          $mensajes_app.push({
            tipo: "exito",
            mensaje: "Se actualizó moneda , tipo de cambio ,notas y dirección"
          });
          $mensajes_app = $mensajes_app;
          let lista_temp = $pedidos.lista;
          let pedido_en_lista = lista_temp.find(
            element => element._id === $editar_store.pedido._id
          );
          pedido_en_lista.moneda = moneda;
          pedido_en_lista.cliente.direccion = direccion;
          $pedidos.lista = lista_temp;
          $pedidos = $pedidos;
          setTimeout(() => {
            $pedidos.actualizar_variable = true;
            dispatch("continuar");
          }, 500);
        }
        else{
           $mensajes_app.push({
            tipo: "error",
            mensaje: res.mensaje
          });
          goto('app/pedidos')
        }
      })
      .catch(err => {
        console.log(err);
        cargando = false;
        $mensajes_app.push({
          tipo: "error",
          mensaje: "No se pudo actualizar moneda y dirección"
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
        } else {
          mostrar_error("buscando ficha");
          ficha_de_descuento = null;
          cliente_tiene_ficha_de_descuento = false;
        }
      }
    );
  }

  function checar_si_tiene_ficha_de_descuento(correo_cliente) {
    return;
    var docRef = db.collection("fichas_descuento").doc(correo_cliente);
    docRef
      .get()
      .then(function(doc) {
        cliente_tiene_ficha_de_descuento = doc.exists;
        if (cliente_tiene_ficha_de_descuento) {
          ficha_de_descuento = doc.data();
        }
      })
      .catch(function(error) {
        //console.log("Error getting document:", error);
        ficha_de_descuento = null;
        cliente_tiene_ficha_de_descuento = false;
      });
  }

  function validar_tipo_cambio() {
    if (isNaN(pedido_selecto.tipo_de_cambio))
      return (tipo_de_cambio_correcto = false);
    if (pedido_selecto.tipo_de_cambio < 0.1)
      return (tipo_de_cambio_correcto = false);
    tipo_de_cambio_correcto = true;
  }
</script>

<style>
  .grid-container {
    height: calc(100vh - 146px);
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 0.4fr 2.2fr;
    grid-template-areas: "cliente direccion_de_envio perfil_del_cliente" "buscar_producto buscar_producto buscar_producto";
  }

  .cliente {
    grid-area: cliente;

    margin: 18px;
    overflow-x: auto;
    text-align: center;
    padding: 4% 7% 10% 10%;
    border-radius: 2px;
  }

  .observaciones {
    word-wrap: break-word;
    
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

  .lista_de_productos {
    grid-area: lista_de_productos;
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
  }
  .borde_rojo {
    border: 1px solid red;
  }
  .rojo {
    color: red;
    font-weight: 700;
  }
</style>

<div class="izquierda" style="padding-left: 5px;">
  <table>
    <tr>
      <td>
        <Button
        dense
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
        Editar pedido
      </td>
    </tr>
  </table>
</div>
<div class="grid-container">
  <div class="cliente">
    <div class="padding" />
    <div class="padding">

      <!-- content here -->
      <div>
        Pedido de
        <b>{cliente.nombre}</b>
       
      </div>

      {#if cliente.agente == '' && cliente.nombre != ''}
        <!-- content here -->
        <span style="color:darkorange">
          <i class="material-icons vertical-alineado">info</i>
          El cliente
          <b>{cliente.nombre}</b>
          , no tiene un agente asignado
        </span>
        <br />
      {/if}
      {direccion == '' ? '--' : 'Perfil de cliente: ' + cliente.perfil.perfil + ' ' } <b>{formato_precio(cliente.perfil.porcentaje)}</b>
      <br />
      {$editar_store.pedido.agente.nombre == '' ? '--' : ' Agente: ' } <b>{cliente.agente}</b>
      <br />
      {#if obs == ""}
        {obtener_cliente()}
      {/if}
      <p class="observaciones">{obs == '' ? 'Sin Observaciones' : 'Observaciones: ' } <b>{obs}</b></p>

      {#if $editar_store.pedido.tenia_ficha}
        <!-- content here -->
        <div class="existe_ficha">
          <i style="vertical-align:middle;" class="material-icons">loyalty</i>
          Existe una ficha de descuento de
          <b>
            {formato_precio($editar_store.pedido.descuento)} % para este pedido
          </b>
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
          bind:value={tipo_de_cambio}
          style="width: 215px;margin: 0 0px 0 calc(32vw - 250px);" />
      {/if}
    </div>
  </div>
  <div class="direccion_de_envio">
    <table>
      <tr>
        <td>
          <i class="material-icons" style="vertical-align: top;">location_on</i>
          Dirección
          <textarea
            style="width: 468px;max-width: 30vw;"
            class="direccion-box"
            class:borde_rojo={direccion == ""}
            cols="30"
            rows="3"
            bind:value={direccion} />
        </td>
      </tr>
      <tr>
        <td>
          <i class="material-icons" style="vertical-align: top;">speaker_notes</i>
          Notas
          <textarea
            style="width: 468px;max-width: 30vw;"
            class="direccion-box"
            cols="30"
            maxlength="480"
            rows="10"
            bind:value={notas} />
        </td>
      </tr>
    </table>
  </div>
  <div class="perfil_del_cliente">
    <i
      class="material-icons"
      style="vertical-align: middle;font-size: 5em;color:#222d32;padding-top:
      50px;">
      local_shipping
    </i>
    <br />
    <!-- <Button
      raised
      style="height: 50px;margin-top: 22px;"
      color="green"
      disabled={cliente_tiene_carrito === false || direccion == ''}
      on:click={() => {
        if (moneda_original != moneda || tipo_de_cambio_original != pedido_selecto.tipo_de_cambio || notas != $editar_store.pedido.notas) actualizar_moneda_y_direccion_y_continuar($editar_store.pedido._id);
        else dispatch('continuar');
      }}>
      Continuar
      <i class="material-icons">create</i>
      <i class="material-icons">chevron_right</i>
    </Button> -->
    {#if direccion != ""}
      <!-- content here -->
      <div in:fade={{ duration: 400, delay: 400 }}>
        <Button
          disabled={cliente_tiene_carrito === false || direccion == ''}
          raised
          style="height: 50px;margin-top: 22px;"
          color="green"
          title="Presiona el boton + "
          on:click={() => {
            // guardar_en_DB();
            if (moneda_original != moneda || tipo_de_cambio_original != pedido_selecto.tipo_de_cambio || notas != $editar_store.pedido.notas) actualizar_moneda_y_direccion_y_continuar($editar_store.pedido._id);
            else dispatch('continuar');
          }}
        >
          Continuar
          <i class="material-icons">chevron_right</i>
        </Button>
      </div>
    {:else}
      <div class="rojo">
        Escribe una dirección manualmente, <br /> Tip: Agrega una dirección al cliente.
      </div>
    {/if}
  </div>
  <div class="buscar_producto">
    {#if cliente_completo !== undefined && cliente_completo !== null}
      <!-- content here -->
      <div class="centrado titulo_formulario">
        Lista de direcciones ({cliente_completo.direcciones_asociadas.length})
      </div>
      <div class="scrollable">
        {#each cliente_completo.direcciones_asociadas as direccion, i}
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
                <td class="td_estilo">{direccion.calle}</td>
                <td class="td_estilo">
                  Num. exterior {direccion.numero_exterior}
                </td>
                <td class="td_estilo">
                  Num. interior {direccion.numero_interior}
                </td>

              </tr>
              <tr>
                <td class="td_estilo">
                  Colonia
                  <b>{direccion.colonia}</b>
                </td>
                <td class="td_estilo">
                  ,C.P.
                  <b>{direccion.cp}</b>
                </td>
                <td class="td_estilo">
                  ,Estado
                  <b>{direccion.estado}</b>
                </td>
                <td class="td_estilo">
                  ,Municipio
                  <b>{direccion.municipio}</b>
                </td>
              </tr>
              <tr>
                <td class="td_estilo">
                  Telefono
                  <b>{direccion.telefono}</b>
                </td>
                <td class="td_estilo">
                  RFC
                  <b>{direccion.rfc}</b>
                </td>
                <td class="td_estilo">
                  Correo
                  <b>{direccion.correo}</b>
                </td>
                <td class="td_estilo" />
              </tr>
            </table>

          </div>
        {/each}
      </div>
    {/if}
  </div>
  <div class="lista_de_productos" />
</div>
