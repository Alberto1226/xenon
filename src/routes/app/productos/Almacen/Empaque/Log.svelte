<script>
    import { acciones } from "./store";
</script>

<div class="contenedor">
    <div class=" titulo-folios-selectos  no_select">Acciones recientes</div>
    {#each $acciones as item, i}
        {#if item.accion == "borrar"}
            <div class="row">
                <div class="adorno">
                    <!-- adorno -->
                </div>
                <div class="adorno-izquierda-indice">
                    {i + 1})
                </div>
                <div class="accion">Borraste</div>
                <div class="data">
                    {#each item.folios as folio}
                        <span class="folio">{folio}</span>

                        {#if i + 1 < item.folios.length}
                            ,
                        {/if}
                    {/each}
                </div>
                <div class="fecha">
                    {item.fecha}
                </div>
            </div>
        {:else if item.accion == "agregar"}
            <div class="row">
                <div class="adorno">
                    <!-- adorno -->
                </div>
                <div class="adorno-izquierda-indice">
                    {i + 1}.-
                </div>
                <div class="accion">Agregaste</div>
                <div class="data">
                    <span class="folio">{item.folio}</span>
                </div>
                <div class="fecha">
                    {item.fecha}
                </div>
            </div>
        {/if}
    {:else}
        Sin acciones recientes;
    {/each}
</div>

<style>
    .data {
        width: 30%;
    }
    .folio {
        color: #0065ff;
    }
    .titulo-folios-selectos {
        text-decoration: underline;
        font-weight: 400;
        color: white;
        background: #888888;
        font-size: 0.8em;
        padding-left: 34px;
    }
    .contenedor {
        border: 1px #7cb0ff solid;
        height: 113px;
        overflow-y: auto;
        margin-bottom: 10px;

        width: calc(100% - 35px);
    }
    .row {
        display: flex;
        width: 100%;

        align-content: center;
        height: 20px;
    }
    .row:hover {
        background: rgba(128, 128, 128, 0.164);
    }
    .adorno {
        width: 10px;
        background: #888888;
    }
    .adorno-izquierda-indice {
        width: 20px;
        color: rgb(51 51 51 / 77%);
        background: #73737383;
        display: grid;
        align-content: center;
        padding-left: 2px;
    }
    .accion {
        width: 10%;
        min-width: 100px;
    }
    .rojo {
        color: red;
    }
    .azul {
        color: #0065ff;
    }
</style>
