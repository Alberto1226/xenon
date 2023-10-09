
<script>
import {onMount} from "svelte";

import {producto_selecto,formato_precio} from './../../../stores';
import {promocion_nueva} from './../storez';
import {Button} from 'svelte-mui/src';
export var correcto =true;
export var precio_promo_nueva =0;
export var instrucciones ="";
var corresponde_a = 100;
var input = null;

$: if($producto_selecto.precio){
    corresponde_a = ($promocion_nueva.precio_promo*100 )/$producto_selecto.precio ;
}

onMount(()=>{
    input.focus();
    if($promocion_nueva.precio_promo!=0)return;
    $promocion_nueva.precio_promo = $producto_selecto.precio;
    correcto =true
})

function handlekeydown(evt) {
    console.log(evt);
    correcto = validar_valor(precio_promo_nueva);
}


function validar_valor(valor) {
    if(isNaN(valor)) return false;
    if(valor<0)return false;
    if(valor>=0)return true;
    return false
}
</script>
<style>
.row{
    display:flex;
}
.contenedor{
   height: 57vh;
}

.precio-original{
    font-size: 1.5em;
    font-weight: 700;
}

.porcentaje{
    font-weight: 700;
    margin: 0 4px;
}
.simbolo-pesos{
       padding-top: 1.2em;
    margin-right: 4px;
    font-size: 1.2em;
}
.invidivual_marginauto{
     width: max-content;
     margin: 0 auto;
}
.margin-top50{
    margin-top: 50px
}

.fuente-mas-grande{
    font-size: 1.5em;
}

input{
    width: 200px;
    font-weight: 800;
    font-size: 2.2em;
    color: #904bd0;
    text-align: center;
    border-radius: 9px;
}
.instrucciones{
        text-align: center;
        background: #904bd0;
    color: white;
    height: 43px;
    width: 100%;
    padding-top: 30px;
    font-weight: 200;
}
</style>


<div class="contenedor">
    <div class="instrucciones">
    {@html instrucciones}
    </div>
    <div class="centrado">
    <h3>Precio actual del producto: <span class="precio-original"> ${formato_precio($producto_selecto.precio)}</span> </h3>
    </div>

    <div class="centrado row invidivual_marginauto fuente-mas-grande margin-top50">
        <div class="simbolo-pesos">$</div> 
        <input bind:this={input} type="number" min="0" on:keydown={handlekeydown} bind:value={$promocion_nueva.precio_promo} /> 
            
    </div>
    <div>
    <!-- correcto={correcto} -->
    </div>

    <div class="centrado row invidivual_marginauto fuente-mas-grande margin-top50">
        <span> es el </span>
        <span class="porcentaje">{formato_precio(corresponde_a)}</span> % de {formato_precio($producto_selecto.precio)}
    </div>

</div>