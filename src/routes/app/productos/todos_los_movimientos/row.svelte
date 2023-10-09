<script>
//    Este sirve para los tipos de movimientos
//    que solo incluyen cantidades apartadas
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
  var accion = "procesando...";
  var correcto = false;
  var cantidad_explicacion ="+0";
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
      cliente_nombre= item.pedido.cliente.nombre;
      folio =item.pedido.folio;
      //precio_en_pedido = formato_precio( registro_producto_en_pedido.producto.precio);
      let d = new Date(item.fecha);
      fecha_formateada = d.toLocaleDateString('es-MX') + " "+ d.toLocaleTimeString('es-MX')
      //console.log(registro_producto_en_pedido);
      checar_correcto();
  });

function checar_correcto() {
  //  agregar a peido (por primera vez)
  var cantidad_accion= item.cantidad;
  var cantidad_accion_anterior= item.cantidad_anterior;
  var apartado_antes= item.inventario_antes.apartados;
  var apartado_despues= item.inventario_despues.apartados;
  //console.log({cantidad_accion,apartado_antes,apartado_despues});
  if(accion=="4a"){
    cantidad_explicacion ="+"+cantidad_accion;
    correcto = (apartado_antes + cantidad_accion)==apartado_despues;
    return 
  }
  //    La cantidad cambio
  if(accion=="4b"){
    let diferencia = cantidad_accion- cantidad_accion_anterior;
    cantidad_explicacion = (diferencia<0?"":"+")+ diferencia;
    //if(cantidad_explicacion=="-0")cantidad_explicacion ="+0";
    correcto =  (diferencia+apartado_antes)==apartado_despues;
    return 
  }
  //  Se borro del pedido
  if(accion=="4c"){
    cantidad_explicacion = "-"+cantidad_accion_anterior;
    correcto = (apartado_antes- cantidad_accion_anterior )==apartado_despues;
    return 
  }
  //  Se borro del pedido por cancelacion
  if(accion=="4d"){
    cantidad_explicacion = "-"+cantidad_accion_anterior;
   correcto = (apartado_antes- cantidad_accion_anterior )==apartado_despues;
    return 
  }
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
  .a4{
        background-color: yellowgreen;
    color: white;
    padding: 5px;
    border-radius: 15px; 
  }
  .b4{
      background-color: rgb(0, 174, 255);
    color: white;
    padding: 5px;
    border-radius: 15px;
  }
  .c4{
        background-color:orangered;
    color: white;
    padding: 5px;
    border-radius: 15px; 
  }

  .d4{
        background-color:orangered;
    color: white;
    padding: 5px;
    border-radius: 15px; 
  }

  .flecha4a{
    color: yellowgreen;
  }
  .back_4a{
        background: yellowgreen;
  }
  .flecha4b{
     color: rgb(0, 174, 255);
  }
  .back_4b{
        background: #00aeff;
  }
  .flecha4c{        
    color: orangered;
  }
  .back_4c{
        background: orangered;
  }
  .flecha4d{        
    color: orangered;
  }
  .derecha{
    text-align: right;
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
    /* background: #19825c; */
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

  <div class="nombre col10 margen-vertical" class:a4={accion=="4a"} class:b4={accion=="4b"} class:c4={accion=="4c"} class:d4={accion=="4d"} >
  {#if accion=="4a"}
     <!-- content here -->
     Agregar a pedido (Nuevo) <i class="material-icons">new_releases</i>
  {:else if accion=="4b"}
     <!-- else content here -->
    Cambiar cantidad en pedido <i class="material-icons">published_with_changes</i>
   {:else if accion=="4c"}
     <!-- else content here -->
    Borrar de pedido <i class="material-icons">delete</i>
    {:else if accion=="4d"}
     <!-- else content here -->
    Borrado de pedido completo<i class="material-icons">delete</i>
  {/if}


  </div>

  <div class="col10 centrado folio" title="folio">
    {folio}
<br>
    {item.pedido.cliente.nombre}
    <br />
    <div class="centrado fecha" title={"fecha :"+fecha_formateada}>{fecha_humana}</div>
  </div>


  <div class="col10 centrado " title="cantidad de unidades">
   <div class="cantidad_anterior">
     x{item.cantidad_anterior}

   </div>
  </div>


  <div class="col10 centrado " title="cantidad de unidades">
   <div class="cantidad">
     x{item.cantidad}

   </div>
  </div>
  

  <div class="col10 centrado margen-vertical no_select sin_importancia" title="Existencias antes">
    {item.inventario_antes.existencias}
  </div>
  <div class="col10 centrado margen-vertical no_select sin_importancia" title="Existencias despues">
    {item.inventario_despues.existencias}
  </div>


  <div class="col10 derecha margen-vertical no_select" title="Apartados antes">
    {item.inventario_antes.apartados}
    <i class="material-icons vertical-alineado" class:flecha4a={accion=="4a"} class:flecha4b={accion=="4b"} class:flecha4c={accion=="4c"} class:flecha4d={accion=="4d"}  >forward</i>
   
  </div>
  
  <div class="cantidad_sobre_flecha no_select" title="Cantidad">
    <span class="span_cantidad_flecha" class:back_4a={accion=="4a"} class:back_4b={accion=="4b"} class:back_4c={accion=="4c" || accion=="4d"}  >{cantidad_explicacion}</span>
  </div>

  <div class="col10 izquierda margen-vertical  no_select" title="Apartados despues">
    {item.inventario_despues.apartados}
    {#if correcto==true}
     <!-- content here -->
     <i class="material-icons verde icono">check</i>
  {:else}
     <!-- else content here -->
     <i class="material-icons rojo icono">close</i>
  {/if}
  </div>
 

</div>
