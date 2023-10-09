<script>
  export var item;
  export var pagina_actual;
  export var indice;
  export var step = 0;
  export var visor_de_folios_visible = false;
  import {
    producto_selecto,
    convertir_a_fecha_humana,
    formato_precio,
  } from "./../../../stores";
  import { onMount } from "svelte";
  import { evento_selecto } from "./store";
  var producto = {
    nombre: $producto_selecto.nombre,
  };
  var cantidad_en_pedido = 0;
  var precio_en_pedido = 0;
  var fecha_humana = "procesando...";
  var fecha_formateada = "";
  var folio = "";
  var folios = [];
  var accion = "procesando...";
  var cantidad_explicacion = "cam";
  let registro_producto_en_pedido = {
    cantidad: 0,
  };
  var cliente_nombre = "";
  var correcto = false;
  var correcto2 = false;

  onMount(() => {
    //registro_producto_en_pedido = item.lista.find((element)=>element.producto._id ==$producto_selecto._id );
    //if(!registro_producto_en_pedido) return;
    //cantidad_en_pedido = item.producto.cantidad;
    accion = item.accion;
    fecha_humana = convertir_a_fecha_humana(item.fecha);
    cliente_nombre = item.pedido.cliente.nombre;
    folio = item.pedido.folio;
    folios = item.folios;
    //precio_en_pedido = formato_precio( registro_producto_en_pedido.producto.precio);
    let d = new Date(item.fecha);
    fecha_formateada =
      d.toLocaleDateString("es-MX") + " " + d.toLocaleTimeString("es-MX");
    //console.log(registro_producto_en_pedido);
    checar_correcto();
  });

  function checar_correcto() {
    var cantidad_accion = item.cantidad;
    var cantidad_accion_anterior = item.cantidad_anterior;
    var apartado_antes = item.inventario_antes.apartados;
    var apartado_despues = item.inventario_despues.apartados;
    var existencias_antes = item.inventario_antes.existencias;
    var existencias_despues = item.inventario_despues.existencias;
    cantidad_explicacion = "-" + cantidad_accion;
    //    existencias
    correcto = existencias_antes - cantidad_accion == existencias_despues;
    correcto2 = apartado_antes - cantidad_accion == apartado_despues;
  }
  function mostrar_folios() {
    $evento_selecto.fecha = fecha_humana;
    $evento_selecto.folios = folios;
    $evento_selecto.id = item._id;
    $evento_selecto.usuario = item.usuario.nombre;
    visor_de_folios_visible = true;
  }
</script>

<div class="row">
  <div class="indice col3 margen-vertical">
    {indice + 1 + step * (pagina_actual - 1)})
  </div>

  <div class="nombre col10 margen-vertical accion">
    Descuento de inventario Inyectar existencias <br />
    <i class="material-icons escribir persona">emoji_people</i>
    <img class="marca" src="favicon.png" alt="" />
    <i class="material-icons escribir flecha">arrow_forward</i>
    <i class="material-icons escribir ">local_shipping</i>
  </div>

  <div class="col10 centrado folio" title="folio">
    {folio}
    <br />
    {#if folios.length > 0}
      <img
        class="boton-folios"
        src="imagenes/registro-codigos.svg"
        alt=""
        on:click={mostrar_folios}
      />
      <br />
    {/if}
    {cliente_nombre}

    <br />
    <div class="centrado fecha" title={"fecha :" + fecha_formateada}>
      {fecha_humana}
    </div>
  </div>

  <div class="col10 centrado " title="cantidad de unidades">
    <!-- <div class="cantidad_anterior" title="No aplica">
    NA
   </div> -->
  </div>

  <div class="col10 centrado centrado-vertical" title="cantidad de unidades">
    <div class="cantidad">
      x{item.cantidad}
    </div>
  </div>

  <div
    class="col10 derecha margen-vertical no_select"
    title="Existencias antes "
  >
    {item.inventario_antes.existencias}
    <i class="material-icons vertical-alineado">forward</i>
  </div>
  <div class="cantidad_sobre_flecha no_select" title="Cantidad">
    <span class="span_cantidad_flecha">{cantidad_explicacion}</span>
  </div>
  <div
    class="col10 izquierda margen-vertical no_select"
    title="Existencias despues"
  >
    {item.inventario_despues.existencias}
    {#if correcto == true}
      <!-- content here -->
      <i class="material-icons verde icono">check</i>
    {:else}
      <!-- else content here -->
      <i class="material-icons rojo icono">close</i>
    {/if}
  </div>

  <div class="col10 derecha margen-vertical no_select" title="Apartados antes">
    {item.inventario_antes.apartados}
    <i class="material-icons vertical-alineado">forward</i>
  </div>

  <div class="cantidad_sobre_flecha no_select" title="Cantidad">
    <span class="span_cantidad_flecha">{cantidad_explicacion}</span>
  </div>

  <div
    class="col10 izquierda margen-vertical  no_select"
    title="Apartados despues"
  >
    {item.inventario_despues.apartados}
    {#if correcto2 == true}
      <!-- content here -->
      <i class="material-icons verde icono">check</i>
    {:else}
      <!-- else content here -->
      <i class="material-icons rojo icono">close</i>
    {/if}
  </div>
</div>

<style>
  .boton-folios {
    height: 70px;
    cursor: pointer;
    transition: all 150ms ease-out;
  }
  .boton-folios:hover {
    transform: scale(1.3) rotate(5deg);
  }
  .centrado-vertical {
    margin: auto 0px;
  }
  .marca {
    position: absolute;
    transform: translate(-37px, 5px);
    height: 16px;
    transition: ease-in-out transform 50ms;
  }
  .marca:hover {
    transform: translate(-37px, 5px) scale(1.1);
  }

  .indice {
    color: gray;
  }
  .row {
    position: relative;
    display: flex;
    background: white;
    border: 1px solid #dadada;
    margin: 1px;
    padding: 5px;
    margin-left: 4px;
    margin-right: 4px;
    border-radius: 4px;
  }
  .col10 {
    width: 10%;
    min-width: 80px;
  }
  .col20 {
    width: 20%;
    min-width: 80px;
  }
  .col3 {
    width: 3%;
    min-width: 23px;
  }
  .fecha {
    color: orange;
    cursor: context-menu;
  }
  .folio {
    font-weight: 800;
  }

  .cantidad {
    font-size: 1.1em;
    font-weight: 800;
    padding: 4px;
    margin-left: 11px;
    background-color: #194d82;
    border: 1px solid #15416d;
    box-shadow: 0 0 3px #194d82;
    color: white;
    border-radius: 20px;
    width: 60px;
    text-align: center;
    padding-top: 7px;
    margin: 0 auto;
  }
  .accion {
    padding: 4px;
    margin-left: 11px;
  }

  .cantidad_anterior {
    font-size: 1.1em;
    font-weight: 800;
    padding: 4px;
    margin-left: 11px;
    background-color: #747474;
    color: white;
    border-radius: 20px;
    width: 60px;
    text-align: center;
    padding-top: 7px;
    margin: 0 auto;
  }
  .margen-vertical {
    margin: auto 0;
  }

  .nombre {
    font-weight: 800;
  }
  .derecha {
    text-align: right;
  }

  .cantidad_sobre_flecha {
    margin-left: -21px;
    margin-top: -2px;
  }
  .cantidad_derecha_flecha {
    margin-left: 10px;
  }

  .span_cantidad_flecha {
    padding: 2px 5px;
    background: #4a6673;
    border-radius: 15px;
    font-size: 0.8em;
    color: white;
    font-weight: 800;
  }

  .icono {
    font-size: smaller;
  }
</style>
