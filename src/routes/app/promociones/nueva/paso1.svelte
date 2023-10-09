<script>
import {producto_selecto} from './../../../stores';
import {promocion_nueva} from './../storez';
import Producto from './_componentes/Producto.svelte';
import {fade} from 'svelte/transition';
import {onMount} from 'svelte'
export var correcto =false;
export var instrucciones ="";
var producto = {nombre:''};
var producto_tiene_carrito = false;

onMount(()=>{
    producto =$producto_selecto ;
})

function handle_producto_selecto(evt) {
    $producto_selecto = producto;
    console.log($producto_selecto);
    $promocion_nueva.precio_promo=0;
    $promocion_nueva.producto = producto;
    //$promocion_nueva.nombre_promo =producto.nombre +" -Promoción";
    if(producto !=null){
        correcto= true;
    }
    else{
        correcto = false;
    }
}

</script>

<style>
.contenedor{
    height: 57vh;
}
.invidivual_marginauto{
     /* width: max-content; */
     margin:auto auto;
         margin-top: 11vh;
         display: flex;
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
.fuente_grande{
    font-size: xx-large;
}

.check_div{
    z-index: 2;
    
}
.check_div_div{
    z-index: 2;
    text-align: right;
    width: fit-content;
}
</style>


<div class="contenedor">
<div class="instrucciones no_select">
    {@html instrucciones}
    </div>

<div class="invidivual_marginauto">
<div class="col50p">
    <Producto  bind:producto  on:producto_selecto={handle_producto_selecto} {producto_tiene_carrito}/> 
</div>
<div class="col50p margen_vert_auto check_div">
    {#if correcto==true}
     <!-- content here -->

        <div in:fade={{duration:300}} class="check_div_div">
        <i class="material-icons verde fuente_grande " >
        check
        </i>
        </div>       
    {:else}
 <!-- content here -->

        <div in:fade={{duration:300}} class="check_div_div" title="Pendiente seleccionar un ">
        <i class="material-icons naranja fuente_grande " >
        timer
        </i>
        </div>
    {/if}
</div>

</div>

<!-- correcto={correcto} -->
</div>

