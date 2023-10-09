<script>
import Paso1 from "./paso1.svelte";
import Paso2 from "./paso2.svelte";
import Paso3 from "./paso3.svelte";
import Paso4 from "./paso4.svelte";
import Guia_paso_actual from "./guia_paso_actual.svelte";
import {Button} from 'svelte-mui/src';
import {promocion_nueva} from './../storez';
import {onMount} from 'svelte';
import {producto_selecto} from "./../../../stores";

var paso = 1;
var max_pasos = 4;
var todo_listo = true;
let imagen = "imagenes/producto_generico.svg";
var lista_pasos=[
   {nombre:"1" , 
   correcto:false,

    descripcion:"Selecciona un producto",
    instrucciones:"1.-Selecciona el producto que deseas poner en promoción."
    },
    {nombre:"2" , 
    correcto:false,
    descripcion:"Precio fijo",
    instrucciones:"2.-A que precio se va a vender?"
    },

    {nombre:"3" , 
    correcto:false,
    descripcion:"Condiciones",
    instrucciones:`3.-Existen tres tipos de condiciones: a)Sin condición, <br> b)Mínimo del mismo producto y <br> c)Mínimos compuestos con más productos.`
    },

    {nombre:"4" , 
    correcto:false,
    descripcion:"Nombre nuevo y Confirmación",
    instrucciones:"4.-Revisa que los datos sean correctos y presiona confirmar para realizar las acciones detalladas a continuación."}
]
onMount(()=>{
     $promocion_nueva.producto= null;
     $promocion_nueva.precio_promo= 0;
     $promocion_nueva.producto= null;


  poner_imagen();
})

$: if($promocion_nueva.producto){
     poner_imagen();
}
function poner_imagen() {
      if (!$producto_selecto || $producto_selecto.nombre == "ninguno") return;
    imagen = "imagenes/producto_generico.svg";
    if ($producto_selecto.galeria_imagenes.length > 0) {
      imagen = $producto_selecto.galeria_imagenes[0];
    }
}

function siguiente() {
     if(paso ==max_pasos) return;
     paso++;
}
function anterior() {
     if(paso ==1) return;
     paso--;
}
function confirmar() {
    console.log("confirmar");
}

</script>
<style>
.row{
    display: flex;
    width: 100%;
    padding-top: 15px;
}
.centrico{
     width: max-content;
     /* margin: 0 auto; */
     padding-left: 15px;
         padding-right: 68px;
     width: 100%;
}

.contenedor{
    display:block;
}

.invidivual_marginauto{
     width: max-content;
     margin: 0 auto;
}
.titulo{
     width: fit-content;
    margin: 0 auto;
}
.nombre{
     padding-top: 35px;
    padding-right: 14px;
    font-size: 1.3em;
    font-weight: 600;
}
.imagen_row {
    grid-area: imagen_perfil;
    overflow: hidden;
    border-radius: 52px;
    padding-bottom: 0px;
    text-align: center;
    box-shadow: 0px 5px 8px 0px rgb(148, 148, 148);
    height: 80px;
    width: 80px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    border: 1px solid white;
}
</style>

<div class="row  titulo">

  <div class="centrado nombre">
    {$producto_selecto ? $producto_selecto.nombre : 'Seleccione algun producto'}
  </div>
  {#if $producto_selecto.galeria_imagenes != undefined && $producto_selecto.galeria_imagenes.length > 0}
    <!-- content here -->

    <div
      class="imagen_row"
      style="background-image:url({imagen ? imagen : ''})" />
  {/if}
</div>
<div class="row">

<Guia_paso_actual bind:lista_pasos bind:paso/>

{#if paso==1}
     <!-- content here -->
     
     <div class="centrico contenedor">
     <Paso1 bind:correcto={lista_pasos[0].correcto} bind:instrucciones={lista_pasos[0].instrucciones}/>
     <div class="invidivual_marginauto">
     <Button raised={lista_pasos[0].correcto}  disabled={!lista_pasos[0].correcto} color="primary"  on:click={siguiente}>siguiente</Button>
     </div>
     
     </div>
{/if}
{#if paso==2}
     <!-- content here -->
    
     <div class="centrico contenedor">
      <Paso2 bind:correcto={lista_pasos[1].correcto} bind:instrucciones={lista_pasos[1].instrucciones}/>
      <div class="invidivual_marginauto">
      <Button   color="primary"  on:click={anterior}>anterior</Button>
     <Button raised={lista_pasos[1].correcto}  disabled={!lista_pasos[1].correcto} color="primary"  on:click={siguiente}>siguiente</Button>
      </div>
     
     </div>
{/if}
{#if paso==3}
     <!-- content here -->
     
     <div class="centrico contenedor">
          <Paso3 bind:correcto={lista_pasos[2].correcto} bind:instrucciones={lista_pasos[2].instrucciones}/>
          <div class="invidivual_marginauto">
               <Button  color="primary" on:click={anterior}>anterior</Button>
               <Button raised={lista_pasos[2].correcto}  disabled={!lista_pasos[2].correcto} color="primary"  on:click={siguiente}>siguiente</Button>
          </div>     
     </div>
{/if}

{#if paso==4}
     <!-- content here -->     
     <div class="centrico contenedor">
          <Paso4 bind:todo_listo bind:correcto={lista_pasos[3].correcto} bind:instrucciones={lista_pasos[3].instrucciones}/>
          <div class="invidivual_marginauto">
               <Button  color="primary"  on:click={anterior}>anterior</Button>
               <!-- <Button raised={todo_listo}  color="primary" disabled={todo_listo ==false} on:click={confirmar}>confirmar</Button> -->
          </div>
     </div>
{/if}
</div>
