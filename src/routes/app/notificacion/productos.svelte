<script>
    import { Button, Menuitem, Menu } from "svelte-mui/src";
    import Lista from "../productos/_Lista.svelte";
    import { fade } from "svelte/transition";
    import Row from "./row_productos.svelte";
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
    let mes = 3; // variable reactiva
    let pagina_actual = 1;
    let Prod = [];
    let Prodpag = [];
    let cant = [];
    const itemsPerPage = 10;
    let ha_cambiado_pagina_actual = false;
    var total_paginas2 = 50;
    var http_ocupado = true;
    var activar = false;
    var meses = [1, 2, 3];

    onMount(() => {
        pagina_actual = $paginas_actuales.productos;
        datos();
    });

    function datos() {
        // Este bloque se ejecutará cada vez que 'mes' cambie
        http_ocupado = true; // Puedes agregar esto para mostrar "Cargando..." mientras se obtienen los datos
        postData("app/notificacion/activar_notis", {
            us: $usuario_db,
            m: mes,
            donde: "productos",
        })
            .then((res) => {
                Prod = res.productos;
                activar = res.btn;
                cant = Array(Math.ceil(Prod.length / itemsPerPage)).fill();
                Prodpag = getPageItems();
                total_paginas2 = cant.length;
                http_ocupado = false; // Puedes quitar esto si agregas el bloque de 'Cargando...' en el markup
                return "hecho";
            })
            .catch((err) => {
                console.log(err);
                http_ocupado = false;
                return "error";
            });
    }

    $: if (mes !== undefined) {
        datos();
    }

    function getPageItems() {
        const startIndex = (pagina_actual - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        Prodpag = Prod.slice(startIndex, endIndex);
        http_ocupado = false;
        return Prodpag;
    }

    $: if (ha_cambiado_pagina_actual == true) {
        ha_cambiado_pagina_actual = false;
        // console.log(pagina_actual, "pagina");
        Prodpag = getPageItems();
        // console.log(Prodpag, "productos por pagina");
        //cargar_pagina();
    }
</script>

<svelte:head>
    <title>Productos Sin Vender</title>
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
    {#if activar}
        <div class="btn">
            <Button
                on:click={() => {
                    if ($usuario_db.rol == "administrador") {
                        goto(`app/notificacion/clientes_admin`);
                    }
                }}
            >
                <i class="material-icons" id="person">person</i>
            </Button>
        </div>
    {/if}
</div>

<div class="contenedor">
    <div
        class="titulo"
        style="display: flex;
            flex-direction: row;
            justify-content: center;"
    >
        <h4>Productos sin Ventas</h4>
    </div>
    <div class="grid-container">
        <div class="uno">#</div>
        <div class="dos">Código</div>
        <div class="tres">Nombre</div>
        <div class="cuatro">Marca</div>
        <div class="cinco">Precio</div>
        <div class="seis">Categoría</div>
        <div class="siete">Existencia <br />Reservado <br /> Disponible</div>
        <!-- <div class="seis">Descripcion</div> -->
    </div>
    <!-- Resto del código... -->
    {#if http_ocupado}
        <!-- HTTP OCUPADO -->
        <div class="centrado">Cargando...</div>
    {:else}
        <div>
            <div>
                {#each Prodpag as producto, i}
                    <Row indice={i} {producto} />
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

    .grid-container {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 10px;
        font-weight: bold;

        border-bottom: 1px solid #c1b9b9;
        padding-bottom: 7px;
        font-weight: 600;
        color: #8a8a8a;
        grid-template-rows: 1fr;
        grid-template-areas: "uno dos tres cuatro cinco seis siete";
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

    .cuatro {
        grid-area: cuatro;
    }

    .cinco {
        grid-area: cinco;
    }

    .seis {
        grid-area: seis;
    }

    .siete {
        grid-area: siete;
    }
    #person {
        color: rebeccapurple;
    }
    .btn {
        display: flex;
        justify-content: center;
        /* margin: 1px; */
    }
</style>
