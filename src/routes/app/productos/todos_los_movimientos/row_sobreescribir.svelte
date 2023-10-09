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
  var folio ="";
  var correcto = false;
  var cantidad_explicacion ="cam";
  var accion = "procesando..."
  let registro_producto_en_pedido = {
cantidad :0
  };
  var cliente_nombre="";
  
  onMount(() => {
      //registro_producto_en_pedido = item.lista.find((element)=>element.producto._id ==$producto_selecto._id );
      //if(!registro_producto_en_pedido) return;
      //cantidad_en_pedido = item.producto.cantidad;
      accion  = item.accion;
      fecha_humana = convertir_a_fecha_humana(item.fecha);
      //cliente_nombre= item.pedido.cliente.nombre;
      folio =item.pedido.folio;
      //precio_en_pedido = formato_precio( registro_producto_en_pedido.producto.precio);
      let d = new Date(item.fecha);
      fecha_formateada = d.toLocaleDateString('es-MX') + " "+ d.toLocaleTimeString('es-MX')
      //console.log(registro_producto_en_pedido);
    checar_correcto();
  });


function checar_correcto() {
   var cantidad_accion= item.cantidad;
  var cantidad_accion_anterior= item.cantidad_anterior;
  var apartado_antes= item.inventario_antes.apartados;
  var apartado_despues= item.inventario_despues.apartados;
  var existencias_antes= item.inventario_antes.existencias;
  var existencias_despues= item.inventario_despues.existencias;
  cantidad_explicacion = "->"+cantidad_accion;
  //    existencias
  correcto = cantidad_accion == existencias_despues;
  
}

  
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
.accion{
  padding: 4px;
    margin-left: 11px;
}

  .cantidad_anterior{
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
  .margen-vertical{
      margin: auto 0;
  }

  .nombre{
      font-weight: 800;
  }
  .derecha{
    text-align: right;
  }
  .escribir{
    color: #19825c;
  }

   .cantidad_sobre_flecha{
        margin-left: -21px;
            margin-top: -2px;
  }
  .cantidad_derecha_flecha{
    margin-left: 10px;
  }

  .span_cantidad_flecha{
    padding: 2px 5px;
    background-color: #194d82;
    border: 1px solid #15416d;
    box-shadow: 0 0 3px #194d82;
    border-radius: 15px;
    font-size: .8em;
    color: white;
    font-weight: 800;
  }
  .sin_importancia{
    color: #cecece;
  }

  .icono{
    font-size: smaller;
  }
</style>

<div class="row">

  <div class="indice col3 margen-vertical">{indice + 1 + (step*(pagina_actual-1))})</div>

  <div class="nombre col10 margen-vertical accion">
  Sobre-escribir existencias
  <i class="material-icons escribir">create</i>
  </div>

  <div class="col10 centrado folio" title="folio">
    
<br>

    
    <br />
    <div class="centrado fecha" title={"fecha :"+fecha_formateada}>{fecha_humana}</div>
  </div>


  <div class="col10 centrado " title="cantidad de unidades">
   <!-- <div class="cantidad_anterior" title="No aplica">
    NA
   </div> -->
  </div>


  <div class="col10 centrado " title="cantidad de unidades">
   <div class="cantidad">
    x{item.cantidad}
   </div>
  </div>


  <div class="col10 derecha margen-vertical no_select" title="Existencias antes">
    {item.inventario_antes.existencias}
    <i class="material-icons vertical-alineado">forward</i>
   
  </div>
   <div class="cantidad_sobre_flecha no_select" title="Cantidad">
    <span class="span_cantidad_flecha">{cantidad_explicacion}</span>
  </div>
  <div class="col10 izquierda  margen-vertical no_select" title="Existencias despues">
    {item.inventario_despues.existencias}
    
    {#if correcto==true}
     <!-- content here -->
     <i class="material-icons verde icono">check</i>
  {:else}
     <!-- else content here -->
     <i class="material-icons rojo icono">close</i>
  {/if}
  </div>


  <div class="col10 centrado margen-vertical no_select sin_importancia" title="">
    {item.inventario_antes.apartados}
    <!-- <i class="material-icons vertical-alineado">forward</i> -->
  </div>
  <div class="col10 centrado margen-vertical  no_select sin_importancia" title="">
    {item.inventario_despues.apartados}
  </div>

</div>
