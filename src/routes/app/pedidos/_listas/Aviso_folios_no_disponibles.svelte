<script>
    import AvisosFolioRow from "./Avisos_folio_row.svelte";
    import { lista_detalle } from "./store_folios_que_ya_no_existen";
</script>

<!-- ESTE COMPONENTE SE MUESTRA EN DIALOG DENTRO DE INDEX PRINCIPAL -->
<div class="contenedro_lista">
    {#each $lista_detalle as item, i}
        <AvisosFolioRow
            producto={item.producto}
            folios={item.folios}
            indice={i}
        />
    {:else}
        <div class="centrado">
            Todos los folios existen <img
                src="imagenes/thumbs-up.svg"
                alt="todo bien"
            />
        </div>
    {/each}
</div>

<style>
    .contenedro_lista {
        overflow-y: auto;
        width: 100%;
        max-height: 170px;
        margin: auto;
    }
</style>
