<script>
    import { fly, scale, fade } from "svelte/transition";
    export var visible;
    import { evento_selecto } from "./store";
    import { Button } from "svelte-mui/src";

    function cerrar(params) {
        visible = false;
    }
</script>

{#if visible == true}
    <div
        class="contenedor"
        in:scale={{ duration: 200 }}
        out:scale={{ duration: 100 }}
    >
        <div
            class="relativo"
            in:fly={{ x: 400, duration: 200 }}
            out:fade={{ duration: 100 }}
        >
            <div class="fecha">{$evento_selecto.fecha}</div>
            <div class="boton-cerrar">
                <Button raised icon dense on:click={cerrar}>
                    <i class="material-icons">close</i>
                </Button>
            </div>
            <div class="nombre">
                {$evento_selecto.usuario}
            </div>
            <div class="id">
                {$evento_selecto.id}
            </div>
            <div class="lista">
                {#each $evento_selecto.folios as item, i}
                    <div class="item">{i + 1}){item}</div>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .relativo {
        position: relative;
    }
    .fecha {
        position: absolute;
        right: 20px;
    }
    .boton-cerrar {
        position: absolute;
        top: -33px;
        right: -32px;
    }
    .id {
        font-size: 12px;
    }
    .item {
        padding: 5px;
        border-bottom: gray solid 1px;
    }
    .contenedor {
        position: absolute;
        width: 36vw;
        height: 72vh;
        left: 25vw;
        background: #a9a9a9;
        border-radius: 5px;
        border: 1px solid gray;
        top: 49px;
        z-index: 2;
        padding: 40px;
    }
    .lista {
        background: white;
        height: 66vh;
        overflow-y: auto;
        padding: 10px;
        border-radius: 4px;
        box-shadow: 0 0 10px grey inset;
    }
</style>
