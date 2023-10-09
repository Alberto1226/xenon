
<script>

export var correcto =false;
export var instrucciones ="";
export var todo_listo  = false;

import {producto_selecto ,formato_precio} from "./../../../stores";
import {get_producto,promocion_nueva,guardar_promo_nueva} from './../storez';
import {onMount} from 'svelte';
import {Button} from 'svelte-mui/src';
let imagen = "imagenes/producto_generico.svg";
var disponibles = 0;
var existencias = 0;
var apartados = 0;
var disponibles_despues = 0;
var existencias_despues = 0;
var input = null;
var http_ocupado = false;
var guardado = false;
var nombre_correcto = false;

onMount(()=>{
    poner_imagen();
    
    existencias = $producto_selecto.existencia.actual;
    var carritos  = $producto_selecto.carritos;
    apartados = carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
    disponibles = existencias - apartados;
    disponibles_despues = disponibles - $promocion_nueva.unidades;
    existencias_despues = existencias - $promocion_nueva.unidades;
    console.log( {disponibles ,cant: $promocion_nueva.unidades});
    console.log({existencias,apartados,disponibles})
    input.focus();
})

$: if($promocion_nueva.nombre_promo ){
    nombre_correcto = $promocion_nueva.nombre_promo != $promocion_nueva.producto.nombre
}

function poner_imagen() {
      if (!$producto_selecto || $producto_selecto.nombre == "ninguno") return;
    imagen = "imagenes/producto_generico.svg";
    if ($producto_selecto.galeria_imagenes.length > 0) {
      imagen = $producto_selecto.galeria_imagenes[0];
    }
}


async function guardar(){
    if(http_ocupado==true) return
    http_ocupado = true;
    const producto = $promocion_nueva.producto;
    const precio_promo = $promocion_nueva.precio_promo;
    const nombre_promo = $promocion_nueva.nombre_promo;
    const unidades = $promocion_nueva.unidades;
    const respuesta = await guardar_promo_nueva(producto , precio_promo ,nombre_promo , unidades)
    .catch((err)=>{
        console.log(err)
    })
    console.log(respuesta);
    guardado = true;
    http_ocupado = false;
}

</script>
<style>
.contenedor{
    height: 57vh;
}
.instrucciones{
        text-align: center;
        background: #904bd0;
    color: white;
    height: 50px;
    width: 100%;
    padding-top: 30px;
    font-weight: 200;
}

.dato_sobresaliente{
    font-weight: 700;
    font-size: 1.1em;
    color:#904bd0;
    margin: 0 4px;
}
input{
    width: 100%;
    font-weight: 800;
    font-size: 2.2em;
    color: #904bd0;
    text-align: center;
    border-radius: 9px;
}
.info{
    padding-top: 20px;
    margin: 0 auto;
        padding-left: 22px;
}

.label{
        text-align: center;
        color: #904bd0;
   font-size: 1.1em;
    width: 100%;
    padding-bottom: 30px;
    font-weight: 200;
}

.pl10{
    padding-left:10px;
}
.indice_row{
    color: gray;
    font-weight: 300;
    font-size: .8em;
}
.titulo{
        color: gray;
    font-weight: 200;
    font-size: .9em;
}
</style>


<div class="contenedor">
    <div class="instrucciones">
        {@html instrucciones}
    </div>
    <input disabled={guardado==true || http_ocupado==true} bind:this={input} type="text" bind:value={$promocion_nueva.nombre_promo} >
    <div class="centrado label">
        Nombre del producto nuevo.
    </div>
    <br>
    <div class="info">
<div class="titulo centrado">
    Resumen
</div>

        Del producto <span class="dato_sobresaliente">{$promocion_nueva.producto.nombre}</span> con <b>{disponibles}</b> unidades disponibles y <b>{existencias}</b> existentes.<br>
        Se van a restar <span class="dato_sobresaliente">{$promocion_nueva.unidades}</span> <br>
        Resultara en: <br>
        1.-Producto: <b>{$promocion_nueva.producto.nombre}</b> <br>
        <span class="indice_row pl10">a)</span> Las unidades <b>disponibles</b> serán de <span  class="dato_sobresaliente">{disponibles_despues}</span> <br>
        <span class="indice_row pl10">b)</span> Las <b>existencias</b> de <b>{$promocion_nueva.producto.nombre}</b>  serán de <span  class="dato_sobresaliente">{existencias_despues}</span> unidades. <br>
        2.-Nuevo Producto a crear 
        
        {#if $promocion_nueva.nombre_promo == $promocion_nueva.producto.nombre}
             <!-- content here -->
             <span class="rojo">
             {$promocion_nueva.nombre_promo}
             </span>

             <br>
             <div class="rojo">
             El producto nuevo no puede tener el mismo nombre.
             </div>
        {:else}
             <!-- else content here -->
             <span class="dato_sobresaliente">
             {$promocion_nueva.nombre_promo}
             </span>
        {/if}
         <br>
        <span class="indice_row pl10">a)</span> <b>Existencias</b> serán de <span class="dato_sobresaliente">{$promocion_nueva.unidades}</span> unidades. <br>
        <span class="indice_row pl10">b)</span> <b>Precio</b> será de  <span class="dato_sobresaliente">${formato_precio($promocion_nueva.precio_promo)}</span> 
        
        {#if $promocion_nueva.unidades ==1}
            <!-- content here -->
            unidad.
        {:else}
            <!-- else content here -->
            unidades.
        {/if}
        <br>
       <div class="centrado">
       {#if http_ocupado ==true}
            <!-- content here -->
            <div class="centrado">
            Guardando...
            </div>
       {:else}
            <!-- else content here -->
           {#if guardado == false}
                <!-- content here -->
                 <Button raised disabled={todo_listo==false || nombre_correcto ==false || http_ocupado ==true} on:click={guardar}>Guardar <i class="material-icons vertical-alineado">save</i> </Button>
           {:else}
                <!-- else content here -->
                <div class="centrado">
                Guardado <i class="material-icons vertical-alineado">check</i>
                </div>
           {/if}
       {/if}
        
       </div>
    </div>
      <br>
   
<!-- correcto={correcto} -->
</div>