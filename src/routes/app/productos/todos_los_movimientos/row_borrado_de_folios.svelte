<script>
  export var item;
  export var pagina_actual;
  export var indice;
  export var step = 0;

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
  var correcto = false;
  var cantidad_explicacion = "cam";
  var accion = "procesando...";
  let registro_producto_en_pedido = {
    cantidad: 0,
  };
  var cliente_nombre = "";
  export var visor_de_folios_visible = false;

  onMount(() => {
    //registro_producto_en_pedido = item.lista.find((element)=>element.producto._id ==$producto_selecto._id );
    //if(!registro_producto_en_pedido) return;
    //cantidad_en_pedido = item.producto.cantidad;
    accion = item.accion;
    fecha_humana = convertir_a_fecha_humana(item.fecha);
    //cliente_nombre= item.pedido.cliente.nombre;
    folio = item.pedido.folio;
    folios = item.folios;
    console.log({ folios });
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
    cantidad_explicacion = "->" + cantidad_accion;
    //    existencias
    correcto = cantidad_accion + existencias_antes == existencias_despues;
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
    Borrado de folios <br />

    <img
      class="borrado_de_folios"
      src="imagenes/borrado_de_folios.svg"
      alt=""
    />
  </div>

  <div class="col10 centrado folio" title="folio">
    <br />

    <br />
    <div class="centrado fecha" title={"fecha :" + fecha_formateada}>
      {#if folios.length > 0}
        <img
          class="boton-folios"
          src="imagenes/registro-codigos-borrado.svg"
          alt=""
          on:click={mostrar_folios}
        />
        <br />
      {/if}
      {fecha_humana}
    </div>
  </div>

  <div class="col10 centrado " title="cantidad de unidades" />

  <div class="col10 centrado centrado-vertical" title="cantidad de unidades">
    <div class="" />
  </div>

  <div
    class="col10 derecha margen-vertical no_select"
    title="Existencias antes"
  />
  <div class="cantidad_sobre_flecha no_select" title="Cantidad">
    <span class="" />
  </div>
  <div
    class="col10 izquierda  margen-vertical no_select"
    title="Existencias despues"
  />

  <div
    class="col10 centrado margen-vertical no_select sin_importancia"
    title=""
  >
    <!-- <i class="material-icons vertical-alineado">forward</i> -->
  </div>
  <div
    class="col10 centrado margen-vertical  no_select sin_importancia"
    title=""
  />
</div>

<style>
  .borrado_de_folios {
    height: 38px;
  }
  .boton-folios {
    height: 70px;
    cursor: pointer;
    transition: all 150ms ease-out;
  }
  .boton-folios:hover {
    transform: scale(1.3) rotate(5deg);
    filter: drop-shadow(2px 4px 6px black);
  }
  .centrado-vertical {
    margin: auto 0px;
  }
  .marca {
    position: absolute;
    transform: translate(14px, 5px);
    height: 16px;
    transition: ease-in-out transform 50ms;
  }
  .marca:hover {
    transform: translate(14px, 5px) scale(1.1);
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
  .escribir {
    color: #19825c;
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
    background-color: #194d82;
    border: 1px solid #15416d;
    box-shadow: 0 0 3px #194d82;
    border-radius: 15px;
    font-size: 0.8em;
    color: white;
    font-weight: 800;
  }
  .sin_importancia {
    color: #cecece;
  }

  .icono {
    font-size: smaller;
  }
</style>
