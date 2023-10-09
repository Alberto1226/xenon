<script>
    //      ROW De lista publica de solicitudes
import Indice from './_row/indice.svelte';
import Primero from './_row/primero.svelte';
import Segundo from './_row/segundo.svelte';
import Tercero from './_row/tercero.svelte';
import Cuarto from './_row/cuarto.svelte';
import {onMount} from 'svelte';
export var indice ;
export var item ;

var es_par= false;

onMount(()=>{
    es_par = isOdd(indice+1)==0;
  })

  function isOdd(num) { return num % 2;}

</script>
<style>

    .hilera{
        padding: 10px 11px;
        border: 1px solid #e4e4e4;
    border-radius: 9px;
    }

.hilera:hover{
    background: rgb(218, 218, 218);
}
.back_par {
    background: #e6e6e6;
}
</style>

<div class="display-flex hilera"  class:back_par={es_par} id={item._id} > 

    <Indice {indice}/>
    <Primero bind:nombre={item.nombre} bind:createdAt={item.createdAt}/>
<Segundo bind:correo={item.correo} bind:telefono={item.telefono} bind:fecha_nacimiento={item.fecha_nacimiento}/>
<Tercero bind:direcciones_asociadas={item.direcciones_asociadas}/>
<Cuarto bind:solicitud={item} />
</div>