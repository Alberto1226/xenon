<script>

export var registro;
export var resumenPrevio;
export var resumenPosterior;
export var descuentoNuevo;
export var i;
import { formato_precio } from "./../../../stores";
import {onMount} from 'svelte';
var aplica_descuento = false;
var es_promo = false
onMount(()=>{
    if(registro.aplica_descuento ==true ){
        aplica_descuento = true;
        //      Logs nuevos que tienen este dato de es_promo
        if(registro.es_promo != undefined){
            if (registro.es_promo == true){
                aplica_descuento =false;
                es_promo  = true;
            }
        }
    }
})

</script>

<style>
.longhand {
    display: flex;
    border-bottom: gray solid 1px;
    padding: 5px 0px;
  }

  .no_aplica {
    color: brown;
    font-weight: 600;
  }
  .icono_promo{
      color: #4CAF50;
  }
</style>
<div
    class="longhand"
    title={registro.aplica_descuento ? 'Aplica descuento' : 'No aplica descuento'}>
    <div class="col10p">
      <span class="indice_rows">{i + 1})</span>

    </div>
    <div class="col20p" class:no_aplica={!registro.aplica_descuento}>
      {registro.nombre}
    </div>

    <div class="col20p">$ {formato_precio(resumenPrevio[i].precio)}</div>

    <div class="col20p">$ {formato_precio(registro.precio)}</div>

    <div class="col20p">$ {formato_precio(resumenPosterior[i].precio)}</div>
    <!-- Descuentos si se aplica -->
    
    {#if aplica_descuento}
      <div class="col20p">
      {#if registro.precio - (registro.precio * descuentoNuevo) / 100 === resumenPosterior[i].precio}
        <!-- correcta -->
        <i class="material-icons vertical-alineado verde">done</i>
      {:else}
        <!-- INcorrecta -->
        <i class="material-icons vertical-alineado rojo">close</i>

        descuentoNuevo={descuentoNuevo}
        <br />
        1={registro.precio - registro.precio * descuentoNuevo}
        <br />
        2={resumenPosterior[i].precio}
      {/if}
      </div>
      
      {:else}   <!-- Descuento no se aplica por ser promo o por que no aplica, no se debe d echecar -->
      <!-- {#if registro.precio=== resumenPosterior[i].precio}
             
        <i class="material-icons vertical-alineado verde">done</i>
      {:else}
           
        <i class="material-icons vertical-alineado rojo">close</i>
      {/if} -->
      
      
      {#if es_promo ==false}
           <!-- content here -->
           <div class="col20p">
           no se realizan cambios <br>
            no aplica
           </div>
      {:else}
            <div class="col20p">
            no se realizan cambios <br>
            es promo 
            <i class="material-icons icono_promo">new_releases</i>
            </div>
      {/if}

    {/if}


  </div>