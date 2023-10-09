<script>
  import { get_promocion } from "./consultar_una_promo";
  import { onMount } from "svelte";
  import { Button } from "svelte-mui/src";
  import { fade } from "svelte/transition";
  import { formato_precio, editar_store } from "./../../../../stores";
  import Head_basico from './head_basico.svelte';
  import Head_condiciones_complejas from './head_condiciones_complejas.svelte';
  import Imagen from "./imagen_producto_simple.svelte";
  export var visible = false;
  export var analisis = null;
  var carritoDB = {
    folio: "---"
  };
  
  var http_ocupado = false;
  var obtenido = false;
  var promocion;
  var error = false;
  var condiciones_ok = undefined;
//  siguiente variable para caso de minimo del mismo producto =2
  var minimo_del_mismo ={
    minimo:0,
    cantidad_actual:0
  }
  //  siguientes dos para condiciones complejas
  var check_complejo_listo = false;
  var check_complejo_lista = [];
  var lista = [];


  onMount(() => {
    carritoDB = $editar_store.pedido;
  });

  $: if(analisis){
    alistar_con_analisis();
  }

  function  alistar_con_analisis() {
    condiciones_ok = analisis.todo_bien;
    lista = analisis.lista_de_feedbacks;
  }


  function cerrar() {
  setTimeout(()=>{
      visible = false;
      obtenido = false;
  },100)
  }
</script>

<style>
  .contenedor {
    background: white;
    background: linear-gradient(
      309deg,
      rgb(72 59 105) 7%,
      rgba(74, 102, 115, 1) 100%
    );
    color: white;
    position: fixed;
    width: 100vw;
    height: 100vh;
    top: 0vh;
    left: 0vw;
    z-index: 2;
  }

  .max-width {
    max-width: 900px;
    margin: 0 auto;
  }

  .fuente_negra {
    font-weight: 200;
    color: black;
    height: 8vh;
    padding-right: 15px;
  }

  .fuente1_5 {
    font-size: 1.5em;
  }
  .tachado {
    text-decoration-line: line-through;
  }

  .cerrar {
    position: absolute;
    height: 100px;
    width: 100px;
    border:1px solid transparent;
    border-radius: 70px;
    right: 50px;
    top: 50px;
    font-size: 6.5em;
    padding-left: 0.5em;
    font-weight: 200;
    cursor: pointer;
     transition: padding-left 50ms ease-in,border 100ms ease-in,padding-top 50ms ease-in,font-size 50ms ease-in,font-size 50ms ease-in,background-color 50ms ease-in;
  }
  .cerrar:hover {
    border: 1px solid white;
   
  }
  .cerrar:active {
    font-size: 5.5em;
    padding-top: 10px;
    padding-left: 10px;
    background: rgba(255, 255, 255, 0.308);
    /* transition: font-size 150ms ease-out; */
  }

  .lista_productos {
    height: 20vh;
    overflow-y: auto;
    color: #ffeb3b;
    background: #ffffff0d;
    padding: 17px;
    border-radius: 14px;
  }

  .indice_row {
    color: white;
    font-weight: 100;
    font-size: 0.5em;
  }
  .row_lista_condiciones {
    padding: 10px 5px;
    font-weight: 300;
  }
  .row_lista_condiciones:hover {
    background-color: rgba(10, 10, 10, 0.377);
  }

  .nombre {
    text-align: left;
    padding-left: 9px;
        width: 35%;
  }

  .folio {
    font-size: 2em;
    font-weight: 600;
    color: white;
  }
  .div_folio {
    margin-left: max(5vw, 55px);
    padding: 18px;
    border-radius: 4px;
  }
  .si {
    color: rgb(140, 199, 255);
  }
  .no {
    color: rgb(255, 140, 140);
  }

  .promo_siok_div {
    border: 1px solid #8bc34a;
  }
  .promo_nook_div {
    border: 1px solid #f44336;
  }
  .falta {
    color: #f44336;
  }

  .borde_inferior_faltan {
    border-bottom: 1px dashed #f44336;
  }
  .lista{
    background: rgba(255, 255, 255, 0.404);
    border-radius: 5px;
    overflow-y: auto;
    height: 80vh;
    width: 66vw;
    margin: 0 auto;
    max-width: 1100px;
    padding: 5px;
  }
  .row{
    /* height: 150px; */
        padding: 10px 5px;
    position: relative;
    height: 66px;
    position: relative;
    transition: background-color 80ms ease-out;
  }
  .row:hover{
    background: rgba(0, 0, 0, 0.479);
    border-radius: 3px;
  }
</style>

{#if visible}
  <div class="contenedor no_select" transition:fade={{ duration: 250 }}>
    <div class="cerrar" on:click={cerrar}>X</div>
    <!-- <Button color="white" on:click={cerrar} raised><i class="material-icons vertical-alineado blanco" >keyboard_backspace</i> regresar</Button> -->

    
    <div class="centrado ">

      <div class="width-auto-centrado-horizontal display-flex">
      
        <div
          class="div_folio"
          class:promo_siok_div={condiciones_ok == true}
          class:promo_nook_div={condiciones_ok == false}>
          <div class="folio ">
            <!-- CONDICIONES OK -->
            {carritoDB.folio}
          </div>
          <div>
            todas las condiciones:
            {#if condiciones_ok == true}
              <span class="si">"si"</span>
            {:else if condiciones_ok==false}
              <span class="no">"no"</span>
            {:else}
              procesando
            {/if}
          </div>
        </div>
      </div>
      <div class="centrado fuente1_5">
       

        {#if error == true}
        <!-- ERROR  -->
          <h3 class="rojo">
            Ha ocurrido un error al obtener la información de las promos
          </h3>
        {:else}
          <!-- RESUMEN -->
          {#if analisis }
            {#if analisis.error_mayor==0}
               <!-- SIN ERRORES MAYORES EN SERVIDOR -->
                <!-- LISTA -->
                <div class="lista">
                
                  {#each lista as resumen,i}
                    <!-- content here -->
                    <div class="display-flex row">
                    <Imagen item={resumen} />
                    <div class="col30p margen_vert_auto" class:con_promo_texto={resumen.con_promo}>
                      {resumen.nombre} 
                      {#if resumen.con_promo}
                         <i class="material-icons verde">new_releases</i>
                      {/if}
                    </div>
                    {#if resumen.con_promo==true}
                    <div class="col30p margen_vert_auto">
                      {#if resumen.feedback.tipo_condicion==1}
                          Sin condiciones
                      {:else if  resumen.feedback.tipo_condicion==2}
                        Mínimo del mismo producto
                      {:else if resumen.feedback.tipo_condicion==3}
                        Mínimo compuesto
                      {/if}
                    </div>

                      <div class="col10p margen_vert_auto">
                        {#if resumen.feedback.cumple==true}
                          <i class="material-icons green">check</i>
                        {:else}
                        <i class="material-icons rojo">cancel</i>
                        {/if}
                      </div>
                    {:else}
                      <div class="col30p"></div>
                      <div class="col10p" title="No aplica">N/A</div>
                    {/if}
                    </div>
                  {:else}
                    <div class="centrado blanco">Sin productos</div>
                  {/each}
                </div>
               {:else}
               <!-- ERROR EN SERIVDOR  -->
               <div class="centrado fuente1_5 rojo">Error en el sericio, favor de reportarlo</div>
            {/if}
          {:else}
            <div class="centrado">
            <h3>cargando...</h3>
            </div>
          {/if}

          <!-- RESUMEN -->
        {/if}

      </div>
    </div>
  </div>
{/if}

