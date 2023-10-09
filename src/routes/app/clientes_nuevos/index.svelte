<script>
    import {viendo_lista_solicitudes,viendo_detalles_de_solicitud} from './_lista/store';
import Lista from './_lista/index.svelte';
import Detalles from './_detalle_selecto/index.svelte';
</script>
{#if $viendo_lista_solicitudes ==true}
    <Lista/>
{/if}

{#if $viendo_detalles_de_solicitud ==true}
    <Detalles/>
{/if}