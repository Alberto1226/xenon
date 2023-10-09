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
</script>

<div
    class:centrado={!maximizado}
    class:actual={$ui.ventana_visible == titulo}
    class="item_lista"
    title="Pedidos públicos"
    on:click={() => {
        $ui.ventana_visible = titulo;
        goto(url);

        //   devolver_menu_actual();
    }}
>
    <i
        class:iconos_grandes={!maximizado}
        class="material-icons vertical-alineado icono_peque centrado"
    >
        {icono_o_imagen}
    </i>
    {#if maximizado}
        {titulo}
    {/if}

    <Ripple />
</div>

<style>
    .actual {
        background-color: rgb(26, 26, 26);
    }
    .item_lista {
        font-weight: 200;
        color: aliceblue;
        padding-left: 10px;
        font-size: 0.9em;
        cursor: pointer;
        padding: 5px;
        border-radius: 3px;
        margin-left: 10px;
        margin-right: 10px;
        border-bottom: 1px #ffffff0d solid;
    }
    .item_lista:hover {
        background-color: rgba(240, 248, 255, 0.075);
        text-shadow: 0px 0px 3px black;
    }
</style>
