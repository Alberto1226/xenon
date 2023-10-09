<script>
import {onMount} from 'svelte'
export var paso=0;
export var lista_pasos=[
    {nombre:"1" , 
    descripcion:"Selecciona un producto"},
    {nombre:"2" , 
    descripcion:"Precio fijo"},

    {nombre:"3" , 
    descripcion:"Separar existencias"},

    {nombre:"4" , 
    descripcion:"Confirma"}
]


onMount(()=>{

})
</script>

<style>
.contenedor{
    display: block;
}
.nombre{
    border-radius: 55px;
    border: 1px solid blueviolet;
    height: 50px;
    width: 50px;
    font-size: 1.5em;
    font-weight: 700;
    color: blueviolet;
    margin-left: 99px;
    /* margin-top: 7px; */
    margin-right: 99px;
}
.actual{
    background-color: blueviolet;
    border:1px solid white;
    color: white;
    animation: fadeIt 450ms ease-in-out; 
}
.descripcion{
    font-size: .8em;
    color:gray;
    font-weight: 200;
    text-align: center;
}
.descripcion-selecta{
    
    color:blueviolet;
}
.interno_circulo{
        margin: 13px 0;
}

.linea-vertical{
    border-left:1px solid blueviolet;
    height: 25px;
    width: 2px;
    margin: 0 auto;
}

@keyframes fadeIt {
  0%   { background-color: white; }
  50%  { background-color: white }
  100% { background-color: blueviolet; }
}

</style>

<div class="contenedor">


{#each lista_pasos as item,i}
     <!-- content here -->
     <div class="nombre no_select" class:actual={i+1==paso}>
     <div class="centrado interno_circulo no_select" >
        {item.nombre}
     </div>     
     </div>

     <div class="descripcion no_select">
        {item.descripcion}
     </div>
     <div class="linea-vertical"></div>
{/each}

</div>
