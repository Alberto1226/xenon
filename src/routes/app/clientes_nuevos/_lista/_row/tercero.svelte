<script>
    import {Dialog, Button} from 'svelte-mui/src'
import {onMount} from 'svelte';
import Direccion_detalle from './direccion_detalle.svelte';
export var direcciones_asociadas;
var visible =false
var direccion_texto ="";
var direccion_single ={}
onMount(()=>{
    direccion_single = direcciones_asociadas[0];
    direccion_texto = arreglar_direccion(direcciones_asociadas[0])
})


function toggle() {
    visible = !visible;
}

function arreglar_direccion(direccion_param) {
    let direccion = "";
    direccion = direccion_param.calle;
    direccion += ", #" + direccion_param.numero_exterior;
    direccion +=
      direccion_param.numero_interior == ""
        ? ""
        : ", Interior: " + direccion_param.numero_interior;
    direccion += ", Colonia :" + direccion_param.colonia;
    direccion += ", CP: " + direccion_param.cp;
    direccion += ", Localidad: " + direccion_param.localidad;
    direccion += ", Municipio: " + direccion_param.municipio;
    direccion += ", Estado: " + direccion_param.estado;
    return direccion;
  }
</script>

<style>
    .direccion_corta{
        overflow: hidden;
        margin: auto 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
    }

    .direccion_corta:hover{
        font-weight: 700;
    }

</style>


<Dialog width="400" bind:visible>
    <div slot="title"> Dirección </div>
<Direccion_detalle direccion={direccion_single}/>
</Dialog>
<div class="display-flex pointer col30p">

<div class="direccion_corta "  on:click={toggle} title="Ver dirección completa" >
    {direccion_texto}
</div>

<!--     
<Button icon dense on:click={toggle}>
<i class="material-icons">
visibility
</i>    
</Button> -->

</div>