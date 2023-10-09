<script>
export var correcto =false;
export var instrucciones ="";
import {producto_selecto} from "./../../../stores";
import {get_producto,promocion_nueva} from './../storez';
import {onMount} from "svelte";
import {fly} from 'svelte/transition';
import {Button} from 'svelte-mui/src';
import Producto from './_componentes/Producto_para_minimos.svelte';
var unidades = 1;
var unidades_compuestos = 1;
var disponibles = 0;
var existencias = 0;
var apartados = 0;
var producto = {nombre:''};
var condiciones = [];
var mensaje = "1.-Selecciona un producto para condicionar la promoción";


var definiendo_reglas = false;
//var input = null;
var regla_selecta = 0;




onMount(()=>{
    var regla_selecta = 0;
    correcto = false;
    obtener_producto($producto_selecto._id);
    //console.log(condiciones);
    condiciones = $promocion_nueva.condiciones;
    console.log(condiciones);
    //input.focus();
})


function regresar_a_ver_condiciones() {
    definiendo_reglas = false;
}

function borrar_compuestos(id){
    let lista = condiciones.filter(elem=> elem.id != id);
    
    condiciones = lista;
    console.log(condiciones);
    $promocion_nueva.condiciones = condiciones;
    validar_unidades();
}


function agregar_minimos_compuestos() {
    
    if(producto.nombre=="")return;
    const encontrado = condiciones.find(elem=> elem.id == producto._id);
    //console.log(condiciones)
    if(encontrado ){
        alert("El producto ya existe en la lista")
        return;
    }
    let producto_tmp = {
        nombre: producto.nombre,
        id:producto._id,
        minimo_unidades : unidades_compuestos
    }
    condiciones.push(producto_tmp)
    condiciones = condiciones;
    $promocion_nueva.condiciones = condiciones;
    //console.log(condiciones);
     validar_unidades();
}

function cambiar_cantidad_en_simple() {
   console.log("-----inicio");
    if(producto.nombre=="")return;
    condiciones = []

    let producto_tmp = {
        nombre: producto.nombre,
        id:producto._id,
        minimo_unidades : unidades
    }
    condiciones.push(producto_tmp)
    condiciones = condiciones;
    $promocion_nueva.condiciones = condiciones;
    console.log(condiciones);
     validar_unidades();
     console.log("-----fin");
}


function handle_producto_selecto(evt) {
    setTimeout(()=>{

        console.log(producto);
    },100)
    //$producto_selecto = producto;
    //console.log($producto_selecto);
    //$promocion_nueva.precio_promo=0;
    //$promocion_nueva.producto = producto;
    //$promocion_nueva.nombre_promo =producto.nombre +" -Promoción";
    if(producto !=null){
        correcto= true;
    }
    else{
        correcto = false;
    }
}


function toggle_definiendo(){
    
    setTimeout(()=>{
        console.log({regla_selecta});
        if(regla_selecta ==1){
            condiciones = [];
            $promocion_nueva.condiciones = [];
        }
        if(regla_selecta ==2){
            producto =$producto_selecto;
            cambiar_cantidad_en_simple() ;
        }
        definiendo_reglas = !definiendo_reglas;
        $promocion_nueva.regla_selecta= regla_selecta;
        
        validar_unidades()
    },100)
}

async function obtener_producto(){
   
    const producto_db_proceso = await get_producto($producto_selecto._id);
    var producto_db= producto_db_proceso.producto;
    $producto_selecto = producto_db;
    
    existencias = producto_db.existencia.actual;
    var carritos  = producto_db.carritos;
    apartados = carritos.reduce((a, b) => +a + parseInt(b.cantidad), 0);
  
}


function validar_unidades() {
    correcto = false;
    
    
    if(regla_selecta ==1){
        correcto  =true;
        return;
    }
    if(regla_selecta ==2){
        if( isNaN(unidades))return;
        if(unidades<=0)return;
        
        correcto  =true;
        return;
    }
    if(regla_selecta ==3){
        if(condiciones.length ==0)return
        $promocion_nueva.condiciones = condiciones;
        correcto  =true;
        return;
    }
    
    
//correcto = true; 

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
   height: 82px;
    width: 100%;
    padding-top: 30px;
    font-weight: 200;
}
.row{
    display:flex;
}

.col50{
    width:50%;
    /* padding-top: 13vh; */
}
.col40{
    width:40%;
    /* padding-top: 13vh; */
}

.col10{
    width:10%;
    padding-top: 13vh;
}

input{
    
    font-weight: 800;
    font-size: 3.5em;
    text-align: center;
    border-radius: 9px;
    margin-bottom: 5px;
}
.text_inputs{

    width: 22vw;
    min-width: 150px;
}
.azulvioleta{
color: #904bd0;
}

.cantidad_en_inventario{    
    font-weight: 800;
    font-size: 4.2em;
    color: #904bd0;
    text-align: center;
    padding-top: 1vh;
}
label{
    /* color: #904bd0; */
    font-weight: 200;
    font-size: 1.4em;
        /* text-align: center; */
    /* margin-top: -3vh; */
}
label:hover{
    font-weight: 500;
    cursor: pointer;
}
.selecta{
    font-weight: 700;
}
/* .block{
    display: block;
} */

.invidivual_marginauto{
     width: max-content;
     margin: 0 auto;
}
.pdt30{
    padding-top:30px;
}
.pdt15px{
    padding-top:15px;
}

/* .input{
    width: 250px;
    font-weight: 800;
    font-size: 4.2em;
    color: #904bd0;
    text-align: center;
    border-radius: 9px;
} */
.labels{
    color: #904bd0;
    font-weight: 200;
        text-align: center;
        margin-bottom: 15px;
    /* margin-top: -3vh; */
}
.controles_1{
    border:1px solid #904bd0;
    padding: 5px;
    border-radius: 10px;
}
.lista{
    border:1px solid #904bd0;
    padding: 32px;
    border-radius: 10px;
    max-height: 27vh;
    /* overflow-y: auto; */
}
.azulvioleta{
     color:#904bd0;
}
.row_lista{
    background-color :rgb(255, 193, 7);
    /* color: rgb(0, 0, 0) 300ms ease-out; */
    transition: background-color 200ms ease-out;

}
.row_lista:hover{
    background: rgb(197, 197, 197);
}
.margen_vertical{
        margin: auto 0;
}
.icono_borrar{
    color: #adadad;
}
.icono_borrar:hover{
    color:red;
}
.columna_central_padding{
    padding: 0px 9px;
    padding-top: 120px;
}

.padding_cero{
    padding:0px;
}
.cantidad_en_lista{
    padding-left: 5px;
        /* color: #03A9F4; */
    font-size: 1.1em;
    font-weight: 800;
}
.pl2px{
    padding-left: 2px;
}
.border-r-5px{
    border-radius: 5px;
}
.padding-left10px{
   padding-left : 10px;
}
</style>


<div class="contenedor">
    <div class="instrucciones">
        {#if definiendo_reglas ==false}
             <!-- In strucciones iniciales -->
             {@html instrucciones}
             {:else}
             {#if regla_selecta==1}
                3.- Sin reglas, presiona "siguiente".
                {:else if regla_selecta==2}
              3.-Mínimo del mismo producto <br>
              Selecciona la cantidad mínima en la que se le puede dar ese precio al cliente.
              {:else if regla_selecta==3}
              3.-Mínimo de varios productos <br>
              Selecciona la cantidad mínima de cada producto, del que se dependa para poder proporcionar este descuento.
             {/if}
        {/if}
    </div>

{#if definiendo_reglas==false}
     <div class="pdt30">
        <label class:selecta={regla_selecta==1} >
            <input type=radio bind:group={regla_selecta} value={1} on:click={toggle_definiendo}>
            a)Sin condición.
        </label>
        <label class:selecta={regla_selecta==2} >
            <input type=radio bind:group={regla_selecta} value={2} on:click={toggle_definiendo}>
            b)Mínimo del mismo producto.
        </label>
        <label class:selecta={regla_selecta==3} >
            <input type=radio bind:group={regla_selecta} value={3} on:click={toggle_definiendo}>
            c)Mínimos compuestos con más productos.
        </label>
    </div>
{:else}
    {#if regla_selecta==1}
    <Button on:click={regresar_a_ver_condiciones} dense> <i class="material-icons vertical-alineado">keyboard_backspace</i> regresar</Button>
         <!-- SIN REGLAS -->
         <div class="centrado fuente_mas_grande">
         Presiona siguiente <i class="material-icons vertical-alineado">check</i>
         </div>
    {:else if  regla_selecta==2}
         <!-- MINIMO DE UN PRODUCTO -->
        <Button on:click={regresar_a_ver_condiciones} dense> <i class="material-icons vertical-alineado">keyboard_backspace</i> regresar</Button>
         <div class="display-flex invidivual_marginauto">
            <div class="col50p">
                <h2 style="margin-top: 2em;">{$producto_selecto.nombre}</h2>
            </div>
            <div class="col50p">
                <input class="text_inputs" type="number" bind:value={unidades} class:rojo={unidades<=0} class:azulvioleta={unidades>0}  min="1" step="1"  on:change={cambiar_cantidad_en_simple} >
                 <div class="labels pdt30">
            Unidades <b>mínimas</b> de <b>{$producto_selecto.nombre}</b> en pedidos para hacer válida la promo. <br>
        </div>
            </div>
         </div>
       
        
       
        <div class=" pdt30">
            Nota: Se revisará en el momento en el que se pretenda cambiar el pedido de status, a "Envío" .
            
        </div>

    {:else if regla_selecta==3}
         <!-- MINIMO DE VARIOS PRODUCTOS -->
        <Button on:click={regresar_a_ver_condiciones} dense> <i class="material-icons vertical-alineado">keyboard_backspace</i> regresar</Button>
        <div class="row pdt15px">
         
        <div class="col40 controles_1">
        <div class="pdt30 gris centrado">
                <b>Selecciona producto y unidades mínimas<br>
            </div>
            <div class="invidivual_marginauto">
            
            <Producto  bind:producto  on:producto_selecto={handle_producto_selecto} bind:mensaje={mensaje} /> <br>
            <div class="azulvioleta pdt30 izquierda">
                Unidades mínimas en pedido: <br>
            </div>
             <div class="">
                <input type="number" bind:value={unidades_compuestos} class="padding_cero text_inputs" class:rojo={unidades<=0} class:azulvioleta={unidades>0}   min="1" step="1" >
            </div>
            
        </div>
        </div>

        <div class="col20 columna_central_padding">
            <Button color="#FFC107" raised on:click={agregar_minimos_compuestos} dense>Agregar <i class="material-icons vertical-alineado">keyboard_arrow_right</i> </Button>
        </div>
        <div class="col40 lista overflow-x-hidden">
                {#if condiciones.length > 0}
                            <b>Lista de condiciones 'Mínimos':</b>
                {/if}          
                <div class="overflow-y overflow-x-hidden border-r-5px">
                {#each condiciones as item,i (item.id)}

                <div class="row row_lista no_select padding-left10px" in:fly={{x:-200 ,duration:100}} out:fly={{x:100 ,duration:100}}>
                    <div class="indice_row margen_vertical">
                    {i+1})
                    </div>
                    <div class="col50 margen_vertical pl2px" title="Nombre de productos">
                    {item.nombre} 
                    </div>
                    <div class="col40 margen_vertical cantidad_en_lista" title="Mínimo en pedidos">
                    x {item.minimo_unidades}
                    </div>
                    <div class="pointer">
                        <Button icon dense on:click={borrar_compuestos(item.id)} title="Borrar de lista 'mínimos'"> <i class="material-icons margen_vertical icono_borrar">delete</i> </Button>
                    </div>
                </div>
           {:else}
                
                <div class="centrado">
                    <h2>
                    Lista vacía
                    </h2>
                </div>
           {/each} 
        </div>
        </div>
        </div>


    {/if}
{/if}

    


</div>