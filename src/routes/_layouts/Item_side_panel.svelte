<script>
    import { goto } from "@sapper/app";

    import { ui, usuario_db } from "./../stores";
    import { Button, Ripple } from "svelte-mui/src";
    export var maximizado;

    export var menu_actual;
    export var url = "/";
    export var visible_para = ["administrador"];
    export var titulo = "Titulo generico";
    export var usa_icono = true;
    export var icono_o_imagen = "";
    export var subitems = [];

    let desplegado = false;

    function click_item() {
        if (subitems && subitems.length > 0) {
            desplegado = !desplegado;
        } else {
            $ui.ventana_visible = titulo;
            goto(url);
        }
    }
</script>

<div class="item_contenedor">
    <div
        class:centrado={!maximizado}
        class:actual={$ui.ventana_visible == titulo}
        class="item_lista"
        title={titulo}
        on:click={click_item}
    >
        <i
            class:iconos_grandes={!maximizado}
            class="material-icons vertical-alineado icono_peque centrado"
        >
            {icono_o_imagen}
        </i>
        {#if maximizado}
            <span class="titulo_texto">{titulo}</span>
            {#if subitems && subitems.length > 0}
                <i class="material-icons flecha_desplegable">{desplegado ? 'expand_less' : 'expand_more'}</i>
            {/if}
        {/if}

        <Ripple />
    </div>

    {#if subitems && subitems.length > 0 && desplegado}
        <div class="subitems_lista">
            {#each subitems as sub}
                {#if !sub.roles || sub.roles.includes($usuario_db.rol)}
                    <div
                        class="subitem_item"
                        class:actual={$ui.ventana_visible == sub.titulo}
                        on:click={() => {
                            $ui.ventana_visible = sub.titulo;
                            goto(sub.url);
                        }}
                    >
                        <i class="material-icons icono_subitem">{sub.icono}</i>
                        {#if maximizado}
                            <span>{sub.titulo}</span>
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    {/if}
</div>

<style>
    .actual {
        background-color: rgb(26, 26, 26);
    }
    .item_lista {
        display: flex;
        align-items: center;
        font-weight: 200;
        color: aliceblue;
        padding-left: 10px;
        font-size: 0.9em;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 3px;
        margin-left: 10px;
        margin-right: 10px;
        border-bottom: 1px #ffffff0d solid;
        position: relative;
    }
    .item_lista:hover {
        background-color: rgba(240, 248, 255, 0.075);
        text-shadow: 0px 0px 3px black;
    }
    .titulo_texto {
        flex-grow: 1;
        margin-left: 8px;
    }
    .flecha_desplegable {
        font-size: 1.1em;
        color: #a0aec0;
    }
    .subitems_lista {
        padding-left: 20px;
        margin-top: 2px;
        margin-bottom: 4px;
    }
    .subitem_item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #e2e8f0;
        font-size: 0.85em;
        padding: 6px 10px;
        margin: 2px 10px 2px 5px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .subitem_item:hover {
        background-color: rgba(255, 255, 255, 0.12);
        color: #ffffff;
    }
    .icono_subitem {
        font-size: 1.1em;
        color: #cbd5e0;
    }
</style>
