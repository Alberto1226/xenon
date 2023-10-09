<script>
    import { onMount } from "svelte";

    import {
        postData,
        mensaje_bueno,
        mensaje_error,
        convertir_a_fecha_humana,
    } from "./../../../stores";
    var pagina_actual = 0;
    var resultados_listos = false;
    var resultados = [];

    onMount(() => {
        solicitar_pendientes();
    });

    async function solicitar_pendientes() {
        try {
            let respuesta = await postData(
                "app/productos/inyecciones_pendientes",
                { pagina_actual: 0 }
            );
            console.log(respuesta);
            if ((respuesta.ok = true)) {
                resultados = respuesta.lista;
            }
        } catch (err) {
            console.log(err);
            mensaje_error("No se pudo descargar la lista de pendientes");
        }
    }
</script>

{#if resultados_listos}
    <div class="lista">
        {#each items as item}
            <!-- content here -->
        {:else}
            <!-- empty list -->
        {/each}
    </div>
{/if}
