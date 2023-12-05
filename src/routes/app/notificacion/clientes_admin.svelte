<script>
    import { Button, Menuitem, Menu } from "svelte-mui/src";
    import Lista from "../productos/_Lista.svelte";
    import { fade } from "svelte/transition";
    import Row from "./row_clientes_admin.svelte";
    import Paginacion from "./pagina.svelte";
    import {
        formato_precio,
        producto_selecto,
        mensajes_app,
        productos,
        usuario_db,
        postData,
        editar_store,
        paginas_actuales,
        mensaje_bueno,
        mensaje_error,
        ui,
        buscadores,
        cargando_mensajes_app,
        version,
    } from "../../../routes/stores";
    import { goto } from "@sapper/app";
    import Login from "../../login/index.svelte";
    import { onMount } from "svelte";
    //export let segment;
    let mes = 3;
    var meses = [1, 2, 3];
    var pagina_actual = 1;
    var client,
        clientesSinCompra = [];
    var clientpag = [];
    var cant = [];
    const itemsPerPage = 10;
    var ha_cambiado_pagina_actual = false;
    var total_paginas2 = 50;
    var http_ocupado = true;

    onMount(() => {
        pagina_actual = $paginas_actuales.productos;
        //console.log($usuario_db);
        datos();
    });

    function datos() {
        // Este bloque se ejecutará cada vez que 'mes' cambie
        http_ocupado = true; // Puedes agregar esto para mostrar "Cargando..." mientras se obtienen los datos
        postData("app/notificacion/activar_notis", {
            us: $usuario_db,
            m: mes,
            donde: "clientesAdmin",
        })
            .then((res) => {
                if (res.rol === "administrador") {
                    clientesSinCompra = res.clientes;
                }

                cant = Array(
                    Math.ceil(clientesSinCompra.length / itemsPerPage),
                ).fill();
                clientpag = getPageItems();
                console.log(cant.length, "array", clientpag);
                total_paginas2 = cant.length;

                return "hecho";
            })
            .catch((err) => {
                console.log(err);
                //http_ocupado = false;
                return "error";
            });
    }

    function getPageItems() {
        const startIndex = (pagina_actual - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        clientpag = clientesSinCompra.slice(startIndex, endIndex);
        http_ocupado = false;
        return clientpag;
    }

    $: if (ha_cambiado_pagina_actual == true) {
        ha_cambiado_pagina_actual = false;
        console.log(pagina_actual, "pagina");
        clientpag = getPageItems();
        console.log(clientpag, "productos por pagina");
        //cargar_pagina();
    }

    $: if (mes !== undefined) {
        datos();
    }
</script>

<svelte:head>
    <title>Clientes Sin Compras</title>
</svelte:head>

<div class="filtro">
    <div>
        <Menu origin="top left" style="width:250px;">
            <div slot="activator">
                <Button
                    color={mes == "" ? "red" : "primary"}
                    raised
                    ripple={false}
                    style="padding-right: 4px;width:100%;"
                >
                    <span> {mes == "" ? "Meses" : mes}</span>
                    <i class="material-icons vertical-alineado icono_peque">
                        arrow_drop_down
                    </i>
                </Button>
                <br />
                <span class="indice_row">Meses a Buscar</span>
            </div>

            <div class="scrollable">
                {#each meses as item}
                    <!-- content here -->

                    <Menuitem
                        on:click={() => {
                            mes = item;
                            // isSelected = true; // Actualizar la variable booleana al seleccionar una opción
                        }}
                    >
                        {`${item} ${item === 1 ? "mes" : "meses"}`}
                    </Menuitem>
                {/each}
            </div>
        </Menu>
    </div>
</div>

<div class="contenedor">
    <div
        class="titulo"
        style="display: flex;
            flex-direction: row;
            justify-content: center;"
    >
        <h4>Clientes Sin Compras</h4>
    </div>
    <div class="grid-container-head">
        <div class="uno">Alias</div>
        <div class="dos centrado">Nombre</div>
        <div class="tres centrado">Teléfono</div>
        <!-- <div class="cuatro centrado">Fecha nacimiento</div> -->
        <div class="cinco centrado">Perfil</div>
        <div class="seis centrado">Agente</div>
        <!-- <div class="siete centrado">Plataforma</div> -->
        <!-- <div class="ocho centrado">Acciones</div> -->
    </div>
    <!-- Resto del código... -->
    {#if http_ocupado}
        <!-- HTTP OCUPADO -->
        <div class="centrado">Cargando...</div>
    {:else}
        <div>
            <div>
                {#each clientpag as cliente, i}
                    <Row indice={i} {cliente} />
                {/each}
            </div>
        </div>
    {/if}

    <!-- Resto del código... -->

    <!-- <div class="pagination">
        {#each Array(Math.ceil(Prod.length / itemsPerPage)).fill() as _, i}
            <button on:click={() => changePage(i + 1)}>{i + 1}</button>
        {/each}
    </div> -->
</div>
<div>
    <div class="centrado paginacion">
        <!--- FLECHAS -->

        <Paginacion
            bind:total_paginas={total_paginas2}
            bind:ha_cambiado_pagina_actual
            bind:pagina_actual
        />
    </div>
</div>

<style>
    .filtro {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    .scrollable {
        overflow-y: auto;
        height: 150px;
        width: 350px;
    }

    .paginacion {
        width: 100%;
        position: absolute;
        bottom: 30px;
    }

    .contenedor {
        background: rgba(255, 255, 255, 0.349);
        /* margin: 15px 15px; */
        padding: 0px 15px;
        border-radius: 5px;
        border: 1px solid #d8d8d8;
        max-height: calc(110vh - 230px);
        overflow-y: auto;
    }

    .grid-container-head {
        border-bottom: 1px solid #c1b9b9;
        padding-bottom: 7px;
        font-weight: 600;
        color: #8a8a8a;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
        grid-template-rows: 1fr;
        grid-template-areas: "uno dos tres cinco seis";
    }

    .uno {
        grid-area: uno;
    }

    .dos {
        grid-area: dos;

        width: 13vw;
    }

    .tres {
        grid-area: tres;
    }

    .cinco {
        grid-area: cinco;
    }

    .seis {
        grid-area: seis;
    }
</style>
