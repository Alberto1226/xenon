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
  import Lista from "./Lista_emergente.svelte";
  import { Button } from "svelte-mui/src";
  var producto = {
    nombre: $producto_selecto.nombre,
  };
  var cantidad_en_pedido = 0;
  var total_pedido = 0;
  var descuento = 0;
  var fecha_humana = "procesando...";
  var fecha_formateada = "";
  let registro_producto_en_pedido = {
    cantidad: 0,
  };
  var cliente_nombre = "";
  let lista_visible = false;

  onMount(() => {
    // cantidad_en_pedido = registro_producto_en_pedido.cantidad;
    fecha_humana = item.fecha_entregado
      ? convertir_a_fecha_humana(item.fecha_entregado)
      : "snfecha";
    cliente_nombre = item.cliente.nombre;
    total_pedido = formato_precio(item.total_pedido);
    descuento = formato_precio(item.descuento);
    let d = new Date(item.fecha);
    fecha_formateada =
      d.toLocaleDateString("es-MX") + " " + d.toLocaleTimeString("es-MX");
    //console.log(registro_producto_en_pedido);
  });

  function ver_lista() {
    console.log(lista_visible);
    lista_visible = true;
  }
</script>

<Lista bind:visible={lista_visible} pedido={item} />
<div class="row">
  <div class="indice col3 margen-vertical">
    {indice + 1 + step * (pagina_actual - 1)})
  </div>

  <div class="nombre ancho-disponible margen-vertical">
    {item.folio}
  </div>

  <div class="ancho-disponible centrado folio" title="folio">
    <div class="centrado fecha" title={"fecha :" + fecha_formateada}>
      {fecha_humana}
    </div>
  </div>

  <div class="ancho-disponible centrado " title="cantidad de unidades">
    <div class="centrado">
      <Button icon dense title="Ver lista del pedido" on:click={ver_lista}>
        <i class="material-icons">list</i>
      </Button>
    </div>
  </div>

  <div
    class="ancho-disponible centrado margen-vertical"
    title="precio en pedido"
  >
    {descuento} %
  </div>

  <div
    class="ancho-disponible centrado margen-vertical"
    title="precio en pedido"
  >
    $ {total_pedido}
  </div>
</div>

<style>
  .indice {
    color: gray;
  }
  .row {
    display: flex;
    background: white;
    border: 1px solid #dadada;
    margin: 1px;
    padding: 5px;
    margin-left: 4px;
    margin-right: 4px;
    border-radius: 4px;
  }
  .ancho-disponible {
    width: -webkit-fill-available;
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
    background-color: #19825c;
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
</style>
