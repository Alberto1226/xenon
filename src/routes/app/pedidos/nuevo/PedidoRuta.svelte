<script>
    import { goto } from "@sapper/app";
    import {
        pedidos,
        postData,
        mensajes_app,
        usuario_db,
        formato_precio,
        clientes,
        lista_productos_en_pedido_en_edicion,
        editar_store,
    } from "./../../../stores";
    import { onMount } from "svelte";

    let agentes = [];
    let agenteSeleccionado = null;
    let buscando = "";
    let pagina_actual = 1;
    let total_paginas = 1;
    let total_registros = 0;
    const limite = 10;

    onMount(() => {
        getAgentes();
    });

    async function getAgentes() {
        const res = await postData("app/usuarios/lista_de_usuarios", {
            tipo: "pedido",
            buscando,
            pagina_actual,
            solo_activos: true,
        });
        if (res.ok) {
            agentes = res.lista;
            total_registros = res.numero_total || 0;
            total_paginas = Math.max(1, Math.ceil(total_registros / limite));
        } else {
            agentes = [];
            total_paginas = 1;
            total_registros = 0;
            $mensajes_app.push({
                tipo: "error",
                mensaje: res.mensaje || "Error al obtener los agentes.",
            });
            $mensajes_app = $mensajes_app;
        }
    }

    function buscarAgentes() {
        pagina_actual = 1;
        getAgentes();
    }

    function cambiarPagina(nuevaPagina) {
        if (nuevaPagina >= 1 && nuevaPagina <= total_paginas) {
            pagina_actual = nuevaPagina;
            getAgentes();
        }
    }

    function seleccionarAgente(agente) {
        agenteSeleccionado = agente;
    }

    function crearPedidoRuta() {
        if (!agenteSeleccionado) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "Selecciona un agente para crear el pedido de ruta.",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        // console.log(agenteSeleccionado);
        postData("app/pedidos/nuevo/crear_pedido_ruta", {
            agente: agenteSeleccionado,
        }).then((res) => {
            if (res.ok) {
                console.log(res);
                $mensajes_app.push({
                    tipo: "exito",
                    mensaje: "pedido creado !",
                });
                $mensajes_app = $mensajes_app;

                $editar_store.pedido = res.carrito_creado.doc_nuevo;

                $lista_productos_en_pedido_en_edicion = [];
                $lista_productos_en_pedido_en_edicion =
                    $lista_productos_en_pedido_en_edicion;

                //dispatch("ver_lista");
                console.log(res.carrito_creado.doc_nuevo._id);
                $editar_store.pedido._id = res.carrito_creado.doc_nuevo._id;
                goto("/app/pedidos/editor_wrap", {
                    replaceState: true,
                });
            } else {
                $mensajes_app.push({
                    tipo: "error",
                    mensaje: res.mensaje || "Error al crear el pedido de ruta.",
                });
                $mensajes_app = $mensajes_app;
            }
        });
    }
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
    crossorigin="anonymous"
/>

<div class="container mt-4">
    <h1>Crear Pedido de Ruta</h1>
    <p>Seleccione un agente para crear un pedido de ruta.</p>

    <div class="mb-3 row">
        <div class="col-md-6">
            <input
                type="text"
                class="form-control"
                placeholder="Buscar agente por nombre"
                bind:value={buscando}
                on:keyup={(e) => {
                    if (e.key === "Enter") buscarAgentes();
                }}
            />
        </div>
        <div class="col-md-2">
            <button class="btn btn-primary w-100" on:click={buscarAgentes}>
                Buscar
            </button>
        </div>
    </div>

    {#if agentes.length > 0}
        <ul class="list-group mb-3">
            {#each agentes as agente}
                <li
                    class="list-group-item d-flex justify-content-between align-items-center {agenteSeleccionado &&
                    agenteSeleccionado._id === agente._id
                        ? 'active'
                        : ''}"
                    style="cursor:pointer"
                    on:click={() => seleccionarAgente(agente)}
                >
                    <span>{agente.nombre}</span>
                    {#if agenteSeleccionado && agenteSeleccionado._id === agente._id}
                        <span class="badge bg-success">Seleccionado</span>
                    {/if}
                </li>
            {/each}
        </ul>

        <!-- Paginación -->
        <nav>
            <ul class="pagination justify-content-center">
                <li class="page-item {pagina_actual === 1 ? 'disabled' : ''}">
                    <button
                        class="page-link"
                        on:click={() => cambiarPagina(pagina_actual - 1)}
                        >Anterior</button
                    >
                </li>
                {#each Array(total_paginas) as _, i}
                    <li
                        class="page-item {pagina_actual === i + 1
                            ? 'active'
                            : ''}"
                    >
                        <button
                            class="page-link"
                            on:click={() => cambiarPagina(i + 1)}
                            >{i + 1}</button
                        >
                    </li>
                {/each}
                <li
                    class="page-item {pagina_actual === total_paginas
                        ? 'disabled'
                        : ''}"
                >
                    <button
                        class="page-link"
                        on:click={() => cambiarPagina(pagina_actual + 1)}
                        >Siguiente</button
                    >
                </li>
            </ul>
        </nav>
    {:else}
        <div class="alert alert-warning mt-3">
            No hay agentes disponibles para crear pedidos de ruta.
        </div>
    {/if}

    <div class="mt-4">
        <button
            class="btn btn-success"
            disabled={!agenteSeleccionado}
            on:click={crearPedidoRuta}
        >
            Crear Pedido de Ruta
        </button>
        {#if agenteSeleccionado}
            <div class="mt-2">
                <strong>Agente seleccionado:</strong>
                {agenteSeleccionado.nombre}
            </div>
        {/if}
    </div>
</div>
