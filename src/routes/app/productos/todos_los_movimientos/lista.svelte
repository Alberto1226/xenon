<script>
    export var pagina_actual;
    import Row from "./row.svelte";
    import Row_descontar from "./row_descontar.svelte";
    import Row_sobreescribir from "./row_sobreescribir.svelte";
    import Row_inyectar from "./row_inyectar_ingresos.svelte";
    import Row_folios_borrados from "./row_borrado_de_folios.svelte";
    import { movimientos_del_producto } from "./../../../stores";
    import Visor_de_folios from "./lista_de_folios.svelte";
    var visor_de_folios_visible = false;
</script>

<Visor_de_folios bind:visible={visor_de_folios_visible} />
<div class="head">
    <div class="col3">#</div>
    <div class="col10 izquierda">Acción y Fecha</div>
    <div class="col10 centrado">Folio y Cliente</div>
    <div class="col10 centrado">Cantidad anterior</div>
    <div class="col10 centrado">Cantidad</div>
    <div class="col10 centrado">Existencias Antes</div>
    <div class="col10 centrado">Existencias Despues</div>
    <div class="col10 centrado">Apartados Antes</div>
    <div class="col10 centrado">Apartados Despues</div>
</div>
{#if $movimientos_del_producto.cargando == false}
    <!-- content here -->
    <div class="lista">
        {#each $movimientos_del_producto.lista as item, i}
            <!-- content here -->
            {#if item.accion == "1" || item.accion == "1b"}
                <!-- content here -->
                <Row_inyectar
                    bind:item
                    bind:visor_de_folios_visible
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "2"}
                <!-- content here -->
                <Row_descontar
                    bind:item
                    bind:visor_de_folios_visible
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "3"}
                <!-- else content here -->
                <Row_sobreescribir
                    bind:item
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "4a"}
                <!-- else content here -->
                <!-- Cambiar pedido nuevo -->
                <Row
                    bind:item
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "4b"}
                <!-- else content here -->
                <!-- Cambiar pedido cantidad -->
                <Row
                    bind:item
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "4c"}
                <!-- else content here -->
                <!-- Borrar de pedido -->
                <Row
                    bind:item
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "4d"}
                <!-- else content here -->
                <!-- Borrar de pedido -->
                <Row
                    bind:item
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {:else if item.accion == "5"}
                <!-- else content here -->
                <!-- Borrar de pedido -->
                <Row_folios_borrados
                    bind:item
                    bind:visor_de_folios_visible
                    indice={i}
                    {pagina_actual}
                    step={$movimientos_del_producto.step}
                />
            {/if}
        {:else}
            <div class="centrado">
                <h3>No cuenta con historial</h3>
            </div>
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
