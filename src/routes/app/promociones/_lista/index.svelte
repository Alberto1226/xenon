<script>
import {mensajes_app} from './../../../stores';
import {get_productos_con_promo,lista_productos_con_promo,recargar_lista} from './../storez';
import {onMount} from 'svelte';
import Row from './row.svelte';
import Paginacion from './paginacion.svelte';
import Head from './head.svelte';
var http_ocupado = false;
var buscar = "";
var pagina_actual=1;
var paginas =0;
var coinsidencias =0;

onMount(()=>{
    obtener_lista_de_productos_con_promo();
})

$: if($recargar_lista){
    $recargar_lista  =false;
    obtener_lista_de_productos_con_promo()
}

async function obtener_lista_de_productos_con_promo() {
    if(http_ocupado==true) return;
    http_ocupado=true;

    const respuesta = await get_productos_con_promo(buscar,pagina_actual,true);
    if(respuesta.ok==true){
        $lista_productos_con_promo =respuesta.lista ;
        paginas= respuesta.paginas;
        coinsidencias= respuesta.numero_total;
    }
    
    http_ocupado=false;
}

</script>

<style>
.pequeno_margen{
    margin:0 3px;
}
.lista{
    height: calc(100vh - 263px);
    overflow-y: auto;
    background: white;
    margin: 0 25px;
}
</style>

<div class="width-auto-centrado-horizontal display-flex">
    <Paginacion bind:paginas bind:pagina_actual /> de  <b class="pequeno_margen">{paginas}</b>  página{paginas>1?"s":""}, {coinsidencias} resultados
</div>

<div class="lista">
<Head/>
{#each $lista_productos_con_promo as item,i (item._id)}
     <!-- content here -->
    <Row bind:item indice={i} />
{:else}
     <!-- empty list -->
     <div class="centrado">
     <h3>No existen productos con promociones activas</h3>
     </div>
{/each}
</div>
