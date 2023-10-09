<script>
export var item =null;
 var previa ={
    nombre:"",
    existencia_previa :-9999
}

 var existencia_nueva =-9999;
 var id ="";

import {onMount} from 'svelte';
var body = null;
onMount(()=>{
    
    const body = JSON.parse(item.body);
    console.log(body);
    if(body.previa)previa = body.previa;

    console.log(previa);
    if(body.existencia_nueva)existencia_nueva = body.existencia_nueva;
    if(body.id)id = body.id;
})
</script>

<style>
.nombre{
     font-size: 1.5em;
    font-weight: 800;
}
.id{
    color:gray;
    font-size: .8em;
    font-weight: 200;
}
.row{
    display:flex;
}
.col30{
    width: 30%;
    min-width: 100px;
    padding: 5px 10px;
}
.marcos{
    border:1px solid gray;
}
</style>

<div class="nombre">{previa.nombre}</div>
<div class="id">
{id}
</div>

<div class="row">
<div class="col30 centrado ">
        Existencia previa
</div>
<div class="col30 centrado ">
    Existencia nueva
</div>
</div>

<div class="row">
<div class="col30 centrado marcos">
        {previa.existencia_previa}
</div>
<div class="col30 centrado marcos">
        {existencia_nueva}
</div>
</div>
