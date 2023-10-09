<script>
    export var pagina_actual;
    import Row from "./row.svelte";
    import { ventas_cliente_selecto } from "./../../../stores";
</script>

<div class="head">
    <div class="col3">#</div>
    <div class="col10 izquierda">Folio</div>
    <div class="col10 centrado">Fecha</div>

    <div class="col10 centrado">Lista</div>
    <div class="col10 centrado">Descuento</div>
    <div class="col10 centrado">Precio</div>
</div>
{#if $ventas_cliente_selecto.cargando == false}
    <!-- content here -->
    <div class="lista">
        {#each $ventas_cliente_selecto.lista as item, i}
            <!-- content here -->
            <Row
                bind:item
                indice={i}
                {pagina_actual}
                step={$ventas_cliente_selecto.step}
            />
        {/each}
    </div>
{:else}
    <div class="centrado">
        <h3>cargando...</h3>
    </div>
{/if}

<style>
    .col10 {
        width: 10%;
        min-width: 80px;
    }

    .col3 {
        width: 3%;
        min-width: 23px;
    }
    .head {
        display: flex;
        background: darkgray;
        color: white;
        padding-top: 10px;
        padding-left: 16px;
        height: 27px;
    }

    .lista {
        height: 70vh;
        overflow-y: auto;
        box-shadow: 0px 4px 7px 0px darkgrey;
    }
    .izquierda {
        text-align: left;
    }
</style>
