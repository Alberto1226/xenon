<script>
  export var item;
  export var pagina_actual;
  export var indice;
  export var step =0;
  import { producto_selecto,convertir_a_fecha_humana,formato_precio } from "./../../../stores";
  import { onMount } from "svelte";
  var producto = {
    nombre: $producto_selecto.nombre
  };
  var cantidad_en_pedido = 0;
  var precio_en_pedido = 0;
  var fecha_humana = "procesando...";
  var fecha_formateada ="";
  let registro_producto_en_pedido = {
cantidad :0
  };
  var cliente_nombre="";
  
  onMount(() => {
      registro_producto_en_pedido = item.lista.find((element)=>element.producto._id ==$producto_selecto._id );
      if(!registro_producto_en_pedido) return;
      cantidad_en_pedido = registro_producto_en_pedido.cantidad;
      fecha_humana = convertir_a_fecha_humana(item.fecha);
      cliente_nombre= item.cliente.nombre;
      precio_en_pedido = formato_precio( registro_producto_en_pedido.producto.precio);
      let d = new Date(item.fecha);
      fecha_formateada = d.toLocaleDateString('es-MX') + " "+ d.toLocaleTimeString('es-MX')
      //console.log(registro_producto_en_pedido);
  });



  
</script>

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
  .col10 {
    width: 10%;
    min-width: 80px;
  }
  .col20 {
    width: 20%;
    min-width: 80px;
  }
  .col3{
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

  .cantidad{
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


  .margen-vertical{
      margin: auto 0;
  }

  .nombre{
      font-weight: 800;
  }
</style>

<div class="row">

  <div class="indice col3 margen-vertical">{indice + 1 + (step*(pagina_actual-1))})</div>

  <div class="nombre col10 margen-vertical">
  {cliente_nombre}
  </div>

  <div class="col10 centrado folio" title="folio">
    {item.folio}
    <br />
    <div class="centrado fecha" title={"fecha :"+fecha_formateada}>{fecha_humana}</div>
  </div>

  <div class="col10 centrado " title="cantidad de unidades">
   <div class="cantidad">
    x{cantidad_en_pedido}
   </div>
  </div>


  <div class="col10 centrado margen-vertical" title="precio en pedido">
    $ {precio_en_pedido}
  </div>

</div>
