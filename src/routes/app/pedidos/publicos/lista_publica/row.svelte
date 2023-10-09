<script>
  import { convertir_a_fecha_humana ,formato_precio ,pedido_publico_selecto,detalle_pedido_publico_es_visible} from "./../../../../stores";
  import { Button, ButtonGroup } from "svelte-mui/src";
  import {onMount} from 'svelte'
  import Boton_borrar from './boton_borrar.svelte';
  export var item;
  export var _id = "";
  export var indice = 0;
  export var cliente = "";
  export var origen = "";
  export var pagina_actual = 1;
  export var descuento = 0;
  export var fecha = new Date();
  export var total_pedido = 0;
  export var total_pedido_sin_descuento = 0;
  export var notas = "";
  export var notas_usuarios = [];
  export var status = "...";
  export var lista = [];
  export var viendo = "Pendientes"

  var ocupado = false;
  var es_par= false;

  $: folio = _id.slice(-5);
  $: fecha_en_fecha = new Date(fecha);

  const options = {
    day: "numeric",
    month: "long",
    year: "numeric"
  };

  

  onMount(()=>{
    es_par = isOdd(indice+1)==0;
  })

  function isOdd(num) { return num % 2;}



  function seleccionar_pedido(item) {
    console.log(item)
      $pedido_publico_selecto =item;
      $detalle_pedido_publico_es_visible = true;
  }


</script>

<style>
  .row {
    display: flex;
        padding: 33px 11px;
    /* border: solid 1px; */
    margin: 7px;
    border-radius: 3px;
    transition: background-color 50ms ease-out;
  }

  .row:hover{
    background: rgb(194, 194, 194);
  }

  .folio {
    color: #0065ff;
    font-weight: 800;
    font-size: 1.1em;
  }

  .fecha {
    width: 160px;
    color: #2b78fe;
  }
  .cliente {
    text-transform: capitalize;
    width: 100px;
  }

  .pdl-10px {
    padding-left: 10px;
  }

  .indice {
    width: 60px;
  }
  .descuento{
      width: 100px;
      overflow-x: hidden;
  }

  .status{
      width:120px;
  }

  .herramientas{
      width:150px;
  }
  .nombre{
    text-transform: capitalize;
  }
  .margen-auto{
    margin: 0 auto;
  }
  .back_par {
    background: #e6e6e68a;
}

</style>

<div class="row no_select" class:back_par={es_par}>

  <div class="indice" title={_id}>
    {indice + 1 +((pagina_actual-1)*10)} )
    <br />
    <div class="folio">{folio}</div>

  </div>

  <div
    class="fecha cursor-context "
    title={fecha_en_fecha.toLocaleDateString('es-MX', options)}>
   <i class="material-icons cursor-context vertical-alineado"  title={fecha_en_fecha.toLocaleDateString('es-MX', options)} >event_note</i>
   
    {convertir_a_fecha_humana(fecha)}
  </div>
  <div class="cliente pdl-10px nombre margen-auto">
  {cliente.nombre}
  
  </div>

  <div class="descuento pdl-10px margen-auto">
  {cliente.perfil}
  <br>
  {formato_precio(descuento)} %</div>

  <div class="status margen-auto">
  {status}
  </div>

  <div class="herramientas">
    {#if viendo =="Pendientes"}
      <ButtonGroup>
        <Button icon dense on:click={()=>{seleccionar_pedido(item)}} >
        <i class="material-icons vertical-alineado">keyboard_arrow_right</i>
        </Button>
        <Boton_borrar bind:_id />

      </ButtonGroup>
  
    {/if}
  </div>

</div>
