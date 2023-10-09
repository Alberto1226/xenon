<script>
  import {
    pedido_publico_selecto,
    detalle_pedido_publico_es_visible,
    postData,
    mensajes_app,
    lista_productos_en_pedido_en_edicion,
    formato_precio
  } from "./../../../../stores";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import { onMount } from "svelte";
  import Row_Producto from "./_detalle/row_nuevo.svelte";
  let lista = [];
  let lista_compleja = [];
  var http_ocupado = false;
  var cliente_tiene_carrito = null;
  var folio = "";
  var estado_actual = "";
  var cliente = {
    nombre: "...",
    id: ""
  };
  var descuento = 0;
  var ficha_de_descuento = null;
  var direccion = "";

  var pedido_nuevo = {
    cliente_nombre: "",
    cliente_correo: "",
    cliente_direccion: "",
    moneda: "",
    folio: "",
    total_pedido: 0,
    descuento: 0,
    agente: {
      nombre: "",
      correo: "",
      comision: ""
    }
  };
  var id_carrito = "";

  var cliente_tiene_ficha_de_descuento = false;

  export var id = null;
  $: if ($pedido_publico_selecto.lista) {
    //lista = $pedido_publico_selecto.lista
    obtener_detalle_de_prodcutos();
  }

  onMount(() => {
    console.log($pedido_publico_selecto);
    cliente = $pedido_publico_selecto.cliente;
    arreglar_direccion();
    checar_si_tiene_carrito_pendiente(cliente.id);
    buscar_ficha_existente();
  });

  /*
$: if($pedido_publico_selecto){
    lista = $pedido_publico_selecto;
}
*/

  function cerrar_detalle() {
    $detalle_pedido_publico_es_visible = false;
  }

  function obtener_detalle_de_prodcutos() {
    var http_ocupado = true;
    const url_consulta = "/app/pedidos/lista_detalle_pedido_publico";

    postData(url_consulta, { id: $pedido_publico_selecto._id })
      .then(res => {
        console.log("----res");
        console.log(res);
        http_ocupado = false;
        if (res.ok) {
          console.log(res);
          lista = res.datos_combinados;
          console.log(lista);
          //total_paginas = Math.floor($pedidos.total_registros / limite_lista);
        }
      })
      .catch(err => {
        console.log(err);
        http_ocupado = false;
        //cargando = false;
      });
  }

  function checar_si_tiene_carrito_pendiente(id_cliente) {
    http_ocupado = true;
    console.log("id de cliente" + id_cliente);
    postData("app/pedidos/nuevo/ya_tiene_carrito", { id: id_cliente })
      .then(res => {
        http_ocupado = false;

        if (res.ok) {
          console.log(res);
          descuento = res.carrito.descuento;
          cliente_tiene_carrito = res.carrito != null;
          id_carrito = res.carrito._id;
          if (cliente_tiene_carrito) {
            //  Si tuvo carrito
            folio = res.carrito.folio;
          } else {
            //  No tuvo carrito
            arreglar_direccion();
          }
        }
      })
      .catch(err => {
        console.log(err);
        http_ocupado = false;
      });
  }

  function crear_carrito_nuevo() {
    console.log(pedido_nuevo);
    if (direccion === "") {
      console.log(cliente);
      alert("Hace falta escribir la dirección del cliente");
      return;
    }
    ////console.log(cliente);
    let arreglado_pedido = JSON.parse(JSON.stringify(pedido_nuevo));
    arreglado_pedido.cliente = cliente;
    arreglado_pedido.cliente.perfil =cliente.perfil;

    arreglado_pedido.cliente.porcentaje =descuento;
    arreglado_pedido.cliente_direccion = direccion;
    arreglado_pedido.cliente._id = cliente.id;
    console.log(arreglado_pedido);

    arreglado_pedido.moneda = "Pesos Mexicanos";
    arreglado_pedido.tipo_de_cambio = 1;

    arreglado_pedido.descuento = parseFloat(descuento);
    if (cliente_tiene_ficha_de_descuento)
      arreglado_pedido.descuento = formato_precio(ficha_de_descuento.descuento);
    //console.log(arreglado_pedido);

    http_ocupado = true;
    postData("app/pedidos/nuevo/crear_pedido_nuevo_v2", {
      pedido_nuevo: arreglado_pedido
    })
      .then(respuesta => {
        console.log(respuesta);

        //  Checar si se logro guardar el usuario
        if (respuesta.ok) {
          $mensajes_app.push({
            tipo: "exito",
            mensaje: "pedido creado !"
          });
          $mensajes_app = $mensajes_app;
          console.log(respuesta);

          //$editar_store.pedido = respuesta.carrito_creado.doc_nuevo;

          $lista_productos_en_pedido_en_edicion = [];
          $lista_productos_en_pedido_en_edicion = $lista_productos_en_pedido_en_edicion;

          //dispatch("ver_lista");
          //goto("/app/pedidos/editor_wrap");
          checar_si_tiene_carrito_pendiente(cliente.id);
          http_ocupado = false;
        } else {
          http_ocupado = false;
          $mensajes_app.push({
            tipo: "error",
            mensaje: respuesta
              ? respuesta.mensaje
              : "No se pudo crear el pedido."
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

  function buscar_ficha_existente() {
    //console.log("asdasasasasdas")
    let cliente_temp = JSON.parse(JSON.stringify(cliente));
    cliente_temp._id = cliente_temp.id;
    postData("app/clientes/leer_ficha_descuento_cliente", {
      cliente: cliente_temp
    }).then(res => {
      if (res.ok) {
        console.log(res);
        cliente_tiene_ficha_de_descuento = res.ficha !== null;
        ficha_de_descuento = res.ficha;
      } else {
        console.log(res);
        //mostrar_error("buscando ficha");
        ficha_de_descuento = null;
        cliente_tiene_ficha_de_descuento = false;
      }
    });
  }

  async function arreglar_direccion() {
    let cliente_proceso_tmp = await obtener_cliente();
    if (cliente_proceso_tmp.ok == false) {
      return (direccion = "");
    }
    const cliente_tmp = cliente_proceso_tmp.cliente;
    if (cliente_tmp.direcciones_asociadas.length === 0) {
      return;
    }

    const direccion_param = cliente_tmp.direcciones_asociadas[0];
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

  async function obtener_cliente() {
    //cargando = true;
    return postData("app/clientes/devolver_cliente", { cliente })
      .then(respuesta => {
        return respuesta;
      })
      .catch(err => {
        console.log(err);
      });
  }
</script>

<style>
  .nombre {
    text-transform: capitalize;
  }
  .barra_herramientas {
    display: flex;
    background-color: #222d32;
    color: white;
    height: 79px;
    padding-top: 2px;
  }

  .row {
    display: flex;
    height: 40px;
    padding: 11px;
    margin: 7px;
  }

  .indice {
    width: 100px;
  }
  .nombre {
    width: 100px;
  }
  .cantidad {
    width: 100px;
  }

  .nombre {
    text-transform: capitalize;
  }
  .existencias {
    width: 100px;
    text-align: center;
  }
  .nuevo_pedido_div {
    display: flex;
    position: absolute;
    right: 20px;
  }
  .existe_ficha {
    color: #0065ff;
    font-weight: 500;
  }
  .direccion_box {
    display: flex;
  }
  .label_direccion {
    vertical-align: middle;
  }
  .folio_publico {
    padding: 5px;
  }
  .label_direccion {
    padding-right: 2px;
  }

  .texto-folio-publico{
    font-size: .7em;
  }
  .titulo-detalle{
    font-size: 1.5em;
    padding-top: 5px;
  }
  .icono-izquierda{
    color:white;
    font-size: 3.1em;
  }
  .texto-nombre{
    font-size: 1.5em;
    font-weight: 700;
    text-transform: capitalize;
    margin-top: 24px;
  }

  .folio{
    font-weight: 700;
    padding: 3px;    
    font-size: 1.4em;
  }

  .descuento-div{
    margin:2px 5px;
  }

  .cuenta-con-pedido{
    margin: auto;
  }
  .regresar{
    margin-top: 20px;
  }
</style>

<!-- <div class="titulo centrado">
  

  

</div> -->
<div class="barra_herramientas">
  <div>
  <div class="titulo-detalle">Detalle</div>
<div class="folio_publico"><span class="texto-folio-publico">folio público:</span>{$pedido_publico_selecto._id.slice(-5)}</div>
  </div>

  <div class="regresar">
   <Button icon dense on:click={cerrar_detalle}>
    <i class="material-icons icono-izquierda">keyboard_arrow_left</i>

  </Button>
  
  </div>
 
  <div>
    <div class="texto-nombre">
      {$pedido_publico_selecto.cliente.nombre}
      
    </div>
    {#if cliente_tiene_ficha_de_descuento && !cliente_tiene_carrito}
      <!-- content here -->
      <div class="existe_ficha" title="Existe una ficha de descuento">
        <i style="vertical-align:middle;" class="material-icons">loyalty</i>
        Ficha de descuento de
        <b>{formato_precio(ficha_de_descuento.descuento)} %</b>
      </div>
    {/if}
  </div>
  {#if cliente_tiene_carrito}
    <!-- content here -->
    <div class="cuenta-con-pedido">
    Cuenta con un pedido: 
    <span class="folio" title="Folio de pedido">{folio}</span>
    <div class="descuento-div">
      Descuento de :
      <b>{formato_precio(descuento)}</b>
      %
    </div>
    </div>
  {:else}
    <!-- else content here -->
    <div class="nuevo_pedido_div ">
      <div style="margin-top: 28px;">Crea un pedido -{'>'}</div>

      <div class="direccion_box">
        <div class="label_direccion">
          <i class="material-icons" style="vertical-align: top;">location_on</i>
          Dirección
        </div>
        <div>
          <textarea
            bind:value={direccion}
            class="direccion-box"
            rows="4"
            style="width: 350px;" />
        </div>
      </div>

      <div>
      
      <div>
        Crear un carrito
        <br />
        {estado_actual}
      </div>
      <div style="width: fit-content;margin: 0 auto;">
        <Button
          on:click={() => {
            estado_actual = 'creando pedido';
            crear_carrito_nuevo();
          }}
          icon
          raised
          outlined
          title="crear pedido nuevo">
          <i class="material-icons">add</i>
        </Button>
      </div>
      </div>
    </div>
  {/if}

</div>

<div class="row">
  <div class="indice">#</div>
  <div class="nombre">Nombre</div>
  <div class="cantidad">
    <div class="">Cantidad</div>
  </div>

  <div class="existencias">
    Disponibles
    <br />
    (inventario)
  </div>
  <div class="existencias">
    Existencias
    <br />
    Total reservado
  </div>
</div>

{#each lista as item, i}
  <!-- content here -->
  <Row_Producto
    indice={i}
    {...item}
    bind:descuento={descuento}
    bind:folio
    bind:pedido_listo_para_recibir_productos={cliente_tiene_carrito}
    bind:id_carrito />
  <!-- <Row indice={i} bind:item={item.combinar_datos} {...item.combinar_datos.producto} bind:cantidad={item.cantidad} /> -->
{:else}
  <!-- empty list -->
  <div class="centrado">pedido vacío</div>
{/each}
