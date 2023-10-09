<script>
//      Modulo de lista de de importarse no es url

import Row from './row.svelte';
import {obtener_lista,buscando,lista,recargar_lista} from './store';
import {onMount} from 'svelte';


var lista_local=[];
onMount(()=>{
    solicitar_lista();
})

$: if($lista){
    lista_local = $lista;
}

$: if($recargar_lista==true){
    $recargar_lista =false;
    solicitar_lista();
}

async function solicitar_lista() {
    const lista_proceso = await obtener_lista({buscando:$buscando,activo:true});
    console.log(lista_proceso);
    if(lista_proceso.ok ==true)  $lista = lista_proceso.lista;
}

</script>

<style>

    .lista{
        width: calc(100% - 4vw);
    height: 76vh;
    margin:15px 2vw 0 2vw;
    overflow-y: auto;
    background: white;
    padding: 10px;
    border-radius: 5px;
    }

    .titulo{
        font-size: 1.4em;
        padding-top: 30px;
    padding-bottom: 30px;
    }

    .centrado-full{
        margin: 0 auto;
        margin-top: 34vh;
    }
</style>

<div class="titulo centrado">
Solicitudes para distribución

</div>
<div class="lista">
    {#if lista_local.length>0}
        {#each lista_local as item,indice (item._id)}
        <!-- content here -->
        <Row bind:item {indice} />
        {/each}
        {:else}

        <h2 class="centrado-full centrado">No existen registros</h2>
    {/if}


</div>
