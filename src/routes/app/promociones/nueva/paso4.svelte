<script>
import {producto_selecto ,formato_precio ,mensajes_app} from './../../../stores';
import {promocion_nueva,guardar_promo_nueva } from './../storez';
import Producto from './_componentes/Producto.svelte';
import {fade} from 'svelte/transition';
import {onMount} from 'svelte'
import {Button} from 'svelte-mui/src';
import {goto} from '@sapper/app';
export var correcto =false;
export var instrucciones ="";
export var http_ocupado = false;
export var todo_listo  = false;
var guardado = false;
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

/*
//      PArametros que espera este serivicio
    
    const id= body.producto.id;
    const precio_promo= body.producto.precio_promo;
    const tipo_condicion= body.tipo_condicion;
    const condiciones= body.condiciones;
*/



async function guardar(){
    if(http_ocupado==true) return
    http_ocupado = true;
    const precio_promo = $promocion_nueva.precio_promo;
    const tipo_condicion = $promocion_nueva.regla_selecta;
    const condiciones = $promocion_nueva.condiciones;
    const respuesta = await guardar_promo_nueva({id:$producto_selecto._id},precio_promo,tipo_condicion,condiciones)
    .catch((err)=>{
        console.log(err)
    })
    console.log(respuesta);
    guardado = true;
    http_ocupado = false;
     if(respuesta.ok==true){
        $mensajes_app.push({ tipo:"exito"  , mensaje:"Promoción creada !"});
        $mensajes_app = $mensajes_app;
        goto("app/promociones");
    }
    else{
        $mensajes_app.push({ tipo:"error"  , mensaje:respuesta.err.mensaje});
        $mensajes_app = $mensajes_app;
    }
}

async function guardarborrar(){
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
    if(respuesta.ok==true){
        $mensajes_app.push({ tipo:"exito"  , mensaje:"Promoción creada !"});
        $mensajes_app = $mensajes_app;
        
    }
    else{
        $mensajes_app.push({ tipo:"error"  , mensaje:"La promoción no pudo ser creada"});
        $mensajes_app = $mensajes_app;
    }
    console.log(respuesta);
    guardado = true;
    http_ocupado = false;
}

</script>

<style>
.contenedor{
    height: 57vh;
}

.lista_productos{
    margin-top: 15px;
    background: white;
    padding: 15px;
    border-radius: 5px;
    max-height: 250px;
    overflow-y: auto;
}
.azulvioleta{
color: #904bd0;
}

.resumen{
    width: auto;
    margin:0 auto;
}

</style>

<div class="contenedor">
    <div class="instrucciones">
    <!-- {@html instrucciones} -->
    </div>
    <div class="resumen min-width-350px">
        <h3 class="azulvioleta">Revisa los siguientes datos:</h3>
    <div class="display-flex fuente_mas_grande">
        <div class="col30p">
            Producto 
        </div>
        <div class="col60p">
            <b>{$producto_selecto.nombre} (codigo:{$producto_selecto.codigo} , {$producto_selecto.marca!=""?"marca:"+$producto_selecto.marca:""})</b>
        </div>
    </div>
    <div class="display-flex fuente_mas_grande">
        <div class="col30p">
            Precio normal
        </div>
        <div class="col60p">
            $ {formato_precio($producto_selecto.precio)}
        </div>
    </div>


    <div class="display-flex fuente_mas_grande">
        <div class="col30p">
            Precio promo
        </div>
        <div class="col60p">
            $ <b>{formato_precio($promocion_nueva.precio_promo)}</b>
        </div>
    </div>

    <div class="display-flex fuente_mas_grande">
        <div class="col30p">
            {#if $promocion_nueva.regla_selecta == 1}
                 <!-- content here -->
                 Condición
            {:else if $promocion_nueva.regla_selecta == 2}
                 <!-- else content here -->
                Condición
            {:else if $promocion_nueva.regla_selecta == 3}
                Condiciones
            {/if}
        </div>
        <div class="col60p ">
            {#if $promocion_nueva.regla_selecta == 1}
                 <!-- content here -->
                <b>Sin condición</b>
            {:else if $promocion_nueva.regla_selecta == 2}
                 <!-- else content here -->
                Mínimo de <b> {$promocion_nueva.condiciones[0].minimo_unidades} </b> del mismo producto (<b>{$producto_selecto.nombre} </b> )
            {:else if $promocion_nueva.regla_selecta == 3}
                <b>Mínimo de varios productos :</b> 
                <div class="lista_productos">
                <div class="display-flex gris">
                    <div class="indice_row margen_vert_auto">
                    #
                    </div>
                    <div class="nombre col50p margen_vert_auto">
                    Producto
                    </div>
                    <div class="minimo_unidades_lista col30 margen_vert_auto">
                    Mínimo
                    </div>
                </div>
                {#each $promocion_nueva.condiciones as item,i}
                     <!-- content here -->
                     <div class="display-flex">
                        <div class="indice_row margen_vert_auto">
                        {i+1}.-
                        </div>
                        <div class="nombre col50p margen_vert_auto">
                        {item.nombre}
                        </div>
                        <div class="minimo_unidades_lista col30 margen_vert_auto">
                        x {item.minimo_unidades}
                        </div>
                     </div>
                {/each}
                </div>
            {/if}
        </div>
    </div>
    </div>
    
</div>


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
                 <Button raised disabled={todo_listo==false  || http_ocupado ==true} on:click={guardar}>Guardar <i class="material-icons vertical-alineado">save</i> </Button>
           {:else}
                <!-- else content here -->
                <div class="centrado">
                Guardado <i class="material-icons vertical-alineado">check</i>
                </div>
           {/if}
       {/if}
        
       </div>