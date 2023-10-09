<script>
  import { onMount } from "svelte";
  import { formato_precio } from "./../../stores";
  export var item;
  var detalles = null;
  var registro_nuevo = null;
  var registro_anterior = null;
  var inventario = null;
  var precios = null;
  var folio = "";
  var aplica = true;
  var correcto = false;
  var nuevo_en_pedido = false;
  var borrado_de_pedido = false;
  onMount(() => {
    const body = JSON.parse(item.body);
    if (body.folio) folio = body.folio;
    if (body.registro_cantidades) {
      registro_nuevo = body.registro_cantidades;
      aplica = registro_nuevo.producto.aplicar_descuento_distribuidor;
    }
    if (body.registro_previo) registro_anterior = body.registro_previo;
    nuevo_en_pedido = registro_anterior ==="El producto no existia previamente en pedido"
    borrado_de_pedido = registro_nuevo.cantidad ==0 ||  registro_nuevo.cantidad =="0";
    if (body.precios) precios = body.precios;

    if (aplica === false) {
      correcto = precios.precio_original == precios.precio_despues_de_descuento;
    } else {
      correcto =
        precio_con_descuento(precios.precio_original, precios.descuento) ==
        precios.precio_despues_de_descuento;
    }
    if(body.inventario){
      inventario=body.inventario
    }
  });

  function precio_con_descuento(precio, descuento) {
    return precio - (precio * descuento) / 100;
  }
</script>

<style>
  .folio {
    font-size: 1.5em;
    font-weight: 800;
  }
  .no_aplica {
    color: brown;
    font-weight: 600;
  }

  .row {
    display: flex;
    text-align: center;
  }

  .margen {
    margin: 10px;
  }

  .rojo {
    color: red;
  }
  .verde {
    color: green;
  }
  .col20 {
    width: 20%;
    border-right: 1px solid #4a6673;
    padding: 6px;
    border-bottom: 1px solid #4a6673;
  }

  .nuevo_en_pedido{
      background-color: yellowgreen;
      color:white;
      padding: 5px;
      border-radius: 15px;
  }
  .borrado_de_pedido{
      background-color: orangered;
      color:white;
      padding: 5px;
      border-radius: 15px;
  }
  .cambio_cantidad_en_pedido{
      background-color: rgb(0, 174, 255);
      color:white;
      padding: 5px;
      border-radius: 15px;
  }
.espacio_reservado{
  height: 50px;
}
</style>

<div class="folio">folio:{folio}</div>

<div
  class="producto-nombre margen"
  class:no_aplica={aplica == false}
  title={aplica ? 'Si aplica descuento' : 'No aplica descuento'}>
  Producto : {registro_nuevo ? registro_nuevo.producto.nombre : ''}

  {#if nuevo_en_pedido}
       <div class="nuevo_en_pedido">
       Nuevo en pedido <i class="material-icons vertical-alineado">new_releases</i>
       </div>
  {/if}

  {#if borrado_de_pedido}
       <div class="borrado_de_pedido">
       Borrado de pedido <i class="material-icons vertical-alineado">delete</i>
       </div>
  {/if}

  {#if borrado_de_pedido ==false && nuevo_en_pedido ==false }
       <div class="cambio_cantidad_en_pedido">
       Cambio de cantidad en pedido <i class="material-icons vertical-alineado">published_with_changes</i>
       </div>
  {/if}
</div>
{#if precios}
 <div class="row">

    <div class="descuento col20">Descuento</div>

    <div class="original col20">P. Original</div>

    <div class="despues_de_descuento col20">
     P. con descuento
    </div>

    <div class="autocheck_live col20">
      live check
    </div>

  </div>

  <div class="row">

    <div class="descuento col20"> {formato_precio(precios.descuento)} %</div>

    <div class="original col20">$ {formato_precio(precios.precio_original)}</div>

    <div class="despues_de_descuento col20">
      $ {formato_precio(precios.precio_despues_de_descuento)}
    </div>

    <div class="autocheck_live col20">

      {#if correcto}
        <i class="material-icons verde">check</i>
      {:else}
        <i class="material-icons rojo">cancel</i>
      {/if}
    </div>

  </div>

{/if}


{#if inventario}
 <div class="row">

    <div class="descuento col20">Cantidad en pedido antes</div>

    <div class="original col20">Cantidad en pedido despues</div>


 

  </div>

  <div class="row">

    <div class="descuento col20"> 
    {registro_anterior.cantidad?registro_anterior.cantidad:"0"}
    </div>

    <div class="descuento col20"> 
    {registro_nuevo.cantidad}
    </div>
    

  </div>
<div class=" espacio_reservado">


</div>
  <div class="row">
  
    <div class="descuento col20">Cantidad reservada antes</div>

    <div class="original col20">Cantidad reservada despues</div>
    <div class="descuento col20">Existencias</div>
    <div class="descuento col20">Disponibles despues</div>
  
  </div>

  <div class="row">
  <div class="descuento col20"> 
    {inventario.total_reservado_previo}
    </div>

    <div class="descuento col20"> 
    {inventario.total_reservado_despues}
    </div>

    <div class="descuento col20"> {inventario.existencias_antes}</div>

 
    <div class="autocheck_live col20">

       {inventario.existencias_despues - inventario.total_reservado_despues}
    </div>
  </div>
  
{/if}
