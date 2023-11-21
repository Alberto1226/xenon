<script>
    import { Button } from "svelte-mui/src";
    import Lista from "../productos/_Lista.svelte";
    import { fade } from "svelte/transition";
    import Row from "./row_clientes.svelte";
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
    var meses = 3;
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
        postData("app/notificacion/activar_notis", {
            us: $usuario_db,
            m: meses,
        })
            .then((res) => {
                if (res.rol === "vendedor") {
                    clientesSinCompra = filtrarArregloClientes(
                        res.ids,
                        res.clientes.lista
                    );
                    console.log(clientesSinCompra, "rrrrrrrrrrrrrrrrrrrrrr");
                }

                cant = Array(
                    Math.ceil(clientesSinCompra.length / itemsPerPage)
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
    });

    function filtrarArregloClientes(arr1, arr2) {
        // Filtrar arr2: eliminar registros con el mismo id que en arr1
        const arr2Final = arr2.filter((item2) => !arr1.includes(item2._id));

        return arr2Final;
    }

    function filtrarClientesPorIds(ids, arregloClientes) {
        // Filtra los clientes que no tienen un ID coincidente en el array de IDs
        // const clientesFiltrados = arregloClientes.filter(
        //     (cliente) => !ids.includes(cliente.id)
        // );

        const clientesFiltrados = arregloClientes.filter(
            (cliente) => !ids.some((item1) => item1 === cliente._id)
        );

        // const arr2Final = arr2.filter(
        //     (item2) => !arr1Filtrado.some((item1) => item1 === item2._id)
        // );

        return clientesFiltrados;
    }

    function obtenerIdsUnicos(arreglo1, arreglo2) {
        // Función auxiliar para obtener los IDs de un arreglo
        function obtenerIds(arreglo) {
            return arreglo.map((item) => item.cliente.id);
        }

        // Combina los IDs de ambos arreglos y elimina duplicados
        const todosLosIds = [
            ...new Set([...obtenerIds(arreglo1), ...obtenerIds(arreglo2)]),
        ];

        return todosLosIds;
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
</script>

<svelte:head>
    <title>Clientes Sin Compras</title>
</svelte:head>

<div class="contenedor">
    <div class="grid-container-head">
        <div class="uno">Alias</div>
        <div class="dos centrado">Nombre</div>
        <div class="tres centrado">Teléfono</div>
        <!-- <div class="cuatro centrado">Fecha nacimiento</div> -->
        <div class="cinco centrado">Perfil</div>
        <div class="seis centrado">Región</div>
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
    .paginacion {
        width: 100%;
        position: absolute;
        bottom: 30px;
    }

    .contenedor {
        background: rgba(255, 255, 255, 0.349);
        margin: 15px 15px;
        padding: 15px;
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
