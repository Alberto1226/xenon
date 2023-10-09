<script>
export var registro=null;
export var indice= 0;
import {formato_precio} from './../../../../stores';
import {onMount} from 'svelte';
var es_par= false;
onMount(()=>{
     es_par = isOdd(indice+1)==0;
})
function isOdd(num) { return num % 2;}
</script>

<style>
  .back_par {
    background: #e6e6e6;
    color: black;
}
.cantidad{
     font-size: 1.1em;
    font-weight: 800;
    padding: 4px;
    margin: 0 auto;
    background-color: #194d82;
    border: 1px solid #15416d;
    box-shadow: 0 0 3px #194d82;
    color: white;
    border-radius: 20px;
    width: 33px;
    text-align: center;
}

.padding{
     padding: 17px 0;
}
.hilera:hover{
     background: gray;
}

.indice_row {
    color: gray;
    font-weight: 500;
    font-size: .8em;
    padding-right:10px
}
.hilera:hover > .indice_row {
 color:white
}
</style>

<div class="display-flex padding hilera" class:back_par={es_par}>
<div class="indice_row margen_vert_auto">
{indice+1}.-
</div>
{#if registro}
     <div class="col20p margen_vert_auto">
     {registro.producto.nombre}
     </div>
     <div class="col20p ">
     <div class="cantidad ">
     x{registro.cantidad}
     </div>
     </div>
     <div class="col20p margen_vert_auto">
     {formato_precio(registro.producto.precio)}
     </div>
     <div class="col20p margen_vert_auto">
     {formato_precio(registro.producto.precio * registro.cantidad)}
     </div>
{/if}

</div>