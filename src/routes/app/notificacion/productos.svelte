<script>
    import { Button } from "svelte-mui/src";
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
    var meses = 3;
    var pagina_actual = 1;
    var Prod = [];
    var Prodpag = [];
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
                //console.log(res);
                Prod = res.productos;
                //console.log(Prod);
                // const startIndex = (currentPage - 1) * itemsPerPage;
                // const endIndex = startIndex + itemsPerPage;
                // Prodpag = Prod.slice(startIndex, endIndex);
                cant = Array(Math.ceil(Prod.length / itemsPerPage)).fill();
                Prodpag = getPageItems();
                console.log(Prod, "todos los productos");
                console.log(cant.length, "array");
                total_paginas2 = cant.length;

                return "hecho";
            })
            .catch((err) => {
                console.log(err);
                //http_ocupado = false;
                return "error";
            });
    });

    function filtrarArreglos(arr1, arr2) {
        // Filtrar arr1: eliminar registros con cantidad menor a 10
        const arr1Filtrado = arr1.filter((item) => item.cantidad >= 10);

        // Filtrar arr2: eliminar registros con el mismo id que en arr1Filtrado
        const arr2Final = arr2.filter(
            (item2) => !arr1Filtrado.some((item1) => item1._id === item2._id)
        );

        return arr2Final;
    }

    function combinarArreglosConCantidad(arreglo1, arreglo2) {
        const idsObj = {};

        // Función auxiliar para procesar un arreglo y actualizar el objeto idsObj
        function procesarArreglo(arreglo) {
            for (let i = 0; i < arreglo.length; i++) {
                // Verifica que el elemento actual sea un arreglo
                if (Array.isArray(arreglo[i].lista)) {
                    // Bucle interno para recorrer los subarreglos
                    for (let j = 0; j < arreglo[i].lista.length; j++) {
                        // Verifica que el elemento interno sea un objeto y tiene la propiedad '_id' y 'cantidad'
                        if (
                            typeof arreglo[i].lista[j] === "object" &&
                            arreglo[i].lista[j].hasOwnProperty("_id") &&
                            arreglo[i].lista[j].hasOwnProperty("cantidad")
                        ) {
                            const id = arreglo[i].lista[j].producto._id;
                            const cantidad = arreglo[i].lista[j].cantidad;

                            // Verifica si el id ya está en el objeto
                            if (idsObj.hasOwnProperty(id)) {
                                // Si existe, suma la cantidad
                                idsObj[id] += cantidad;
                            } else {
                                // Si no existe, agrega el id con su cantidad
                                idsObj[id] = cantidad;
                            }
                        }
                    }
                }
            }
        }

        // Procesa cada arreglo
        procesarArreglo(arreglo1);
        procesarArreglo(arreglo2);

        // Convierte el objeto a un arreglo antes de devolverlo
        const resultado = Object.keys(idsObj).map((id) => ({
            _id: id,
            cantidad: idsObj[id],
        }));
        return resultado;
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
        console.log(pagina_actual, "pagina");
        Prodpag = getPageItems();
        console.log(Prodpag, "productos por pagina");
        //cargar_pagina();
    }
</script>

<svelte:head>
    <title>Productos Sin Vender</title>
</svelte:head>

<div class="contenedor">
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
</style>
