<script>
    import { onMount } from "svelte";
    import { postData, mensajes_app } from "../../stores";
    let rutas = [];
    let clientes = [];
    let showModalRuta = false;
    let showModalCliente = false;

    // Formulario de nueva ruta
    let nombre = "";
    let descripcion = "";
    let clientesSeleccionados = [];

    // Para edición
    let editando = false;
    let rutaEditando = null;

    // Cliente a agregar
    let clienteAAgregar = "";

    // Mensaje de error o éxito
    let mensaje = "";

    // Paginación
    let registrosPorPagina = 10;
    let paginaActual = 1;

    $: totalPaginas = Math.ceil(rutas.length / registrosPorPagina);
    $: rutasPaginadas = rutas.slice(
        (paginaActual - 1) * registrosPorPagina,
        paginaActual * registrosPorPagina
    );

    function cambiarPagina(nuevaPagina) {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            paginaActual = nuevaPagina;
        }
    }

    onMount(() => {
        console.log("Cargando rutas y clientes...");
        cargarRutas();
        cargarClientes();
    });

    function abrirModalRuta(ruta = null) {
        showModalRuta = true;
        mensaje = "";
        if (ruta) {
            editando = true;
            rutaEditando = ruta;
            nombre = ruta.nombre_ruta;
            descripcion = ruta.descripcion;
            clientesSeleccionados = ruta.clientes.map((c) => c.id);
        } else {
            editando = false;
            rutaEditando = null;
            nombre = "";
            descripcion = "";
            clientesSeleccionados = [];
        }
    }

    function cerrarModalRuta() {
        showModalRuta = false;
        nombre = "";
        descripcion = "";
        clientesSeleccionados = [];
        editando = false;
        rutaEditando = null;
        mensaje = "";
    }

    function abrirModalCliente() {
        clienteAAgregar = "";
        showModalCliente = true;
    }

    function cerrarModalCliente() {
        showModalCliente = false;
        clienteAAgregar = "";
    }

    function agregarClienteSeleccionado() {
        if (
            clienteAAgregar &&
            !clientesSeleccionados.includes(clienteAAgregar)
        ) {
            clientesSeleccionados = [...clientesSeleccionados, clienteAAgregar];
        }
        cerrarModalCliente();
    }

    function eliminarClienteSeleccionado(id) {
        clientesSeleccionados = clientesSeleccionados.filter((c) => c !== id);
    }

    async function cargarRutas() {
        const body = { tipo: "consulta_rutas" };

        const res = await postData("app/rutas/administracionRutas", body);
        if (res.ok) {
            rutas = res.rutas;
            // Obtener todos los clientes únicos de todas las rutas
            const idsClientes = [
                ...new Set(
                    res.rutas.flatMap((ruta) => ruta.clientes.map((c) => c.id)),
                ),
            ];
            // Consultar los nombres de todos los clientes (si no están ya en la lista)
            // Aquí asumimos que la API ya devuelve los nombres, pero si necesitas cargar todos los clientes:
            // const resClientes = await postData("app/reporteGral/datosReporteGral", { tipo: "consulta_clientes" });
            // clientes = resClientes.ok ? resClientes.clientes : [];
            // Pero si solo quieres los de las rutas:
            // clientes = idsClientes.map((id) => {
            //     // Buscar el nombre en las rutas
            //     for (const ruta of res.rutas) {
            //         const cliente = ruta.clientes.find((c) => c.id === id);
            //         if (cliente) return { id, nombre: cliente.nombre };
            //     }
            //     return { id, nombre: "Desconocido" };
            // });
        } else {
            $mensajes_app.push({
                tipo: "error",
                mensaje: res.mensaje || "Error al cargar las rutas",
            });
            $mensajes_app = $mensajes_app;
        }
    }

    async function cargarClientes() {
        const body = { tipo: "consulta_clientes" };
        const res = await postData("app/rutas/administracionRutas", body);
        if (res.ok) {
            clientes = res.clientes.sort((a, b) =>
                a.nombre.localeCompare(b.nombre),
            );
        } else {
            $mensajes_app.push({
                tipo: "error",
                mensaje: res.mensaje || "Error al cargar los clientes",
            });
            $mensajes_app = $mensajes_app;
        }
    }

    async function guardarRuta() {
        // Validar campos
        if (!nombre.trim()) {
            mensaje = "El nombre de la ruta es requerido";
            return;
        }
        if (!descripcion.trim()) {
            mensaje = "La descripción de la ruta es requerida";
            return;
        }
        if (
            !Array.isArray(clientesSeleccionados) ||
            clientesSeleccionados.length === 0
        ) {
            mensaje = "Debe seleccionar al menos un cliente para la ruta";
            return;
        }

        let body;
        if (editando && rutaEditando) {
            // Editar ruta
            body = {
                tipo: "editar_ruta",
                id: rutaEditando._id || rutaEditando.id,
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                clientes: clientesSeleccionados,
            };
        } else {
            // Agregar nueva ruta
            body = {
                tipo: "crear_ruta",
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                clientes: clientesSeleccionados,
            };
        }

        const res = await postData("app/rutas/administracionRutas", body);

        if (res.ok) {
            mensaje = "";
            await cargarRutas();
            cerrarModalRuta();
        } else {
            mensaje = res.mensaje || "Error al guardar la ruta";
        }
    }

    async function eliminarRuta(id) {
        if (!confirm("¿Estás seguro de que deseas eliminar esta ruta?")) {
            return;
        }
        const body = { tipo: "eliminar_ruta", id };
        const res = await postData("app/rutas/administracionRutas", body);
        if (res.ok) {
            await cargarRutas();
            mensaje = "";
        } else {
            mensaje = res.mensaje || "Error al eliminar la ruta";
        }
    }

    let busquedaCliente = "";

    $: clientesFiltrados = clientes.filter(
        c =>
            !clientesSeleccionados.includes(c._id) &&
            c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
    );
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
    crossorigin="anonymous"
/>

<div class="container py-4">
    <h2 class="mb-4">Administración de Rutas</h2>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <button class="btn btn-primary" on:click={() => abrirModalRuta()}>
            Agregar Ruta
        </button>
        <div>
            <label class="me-2">Registros por página:</label>
            <select class="form-select d-inline-block w-auto" bind:value={registrosPorPagina} on:change={() => { paginaActual = 1; }}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
            </select>
        </div>
    </div>

    {#if mensaje}
        <div class="alert alert-warning">{mensaje}</div>
    {/if}

    <!-- Tabla de rutas -->
    <div class="table-responsive">
        <table class="table table-bordered align-middle">
            <thead class="table-light">
                <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Clientes asignados</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {#each rutasPaginadas as ruta}
                    <tr>
                        <td>{ruta.nombre_ruta}</td>
                        <td>{ruta.descripcion}</td>
                        <td>
                            {#each ruta.clientes as cliente}
                                <span class="badge bg-secondary me-1">
                                    {cliente.nombre}
                                </span>
                            {/each}
                        </td>
                        <td>
                            <button
                                class="btn btn-sm btn-warning me-2"
                                on:click={() => abrirModalRuta(ruta)}
                            >
                                Editar
                            </button>
                            <button
                                class="btn btn-sm btn-danger"
                                on:click={() => eliminarRuta(ruta._id)}
                            >
                                Eliminar
                            </button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- Paginación -->
    <nav>
        <ul class="pagination justify-content-center">
            <li class="page-item {paginaActual === 1 ? 'disabled' : ''}">
                <button class="page-link" on:click={() => cambiarPagina(paginaActual - 1)}>Anterior</button>
            </li>
            {#each Array(totalPaginas) as _, i}
                <li class="page-item {paginaActual === i + 1 ? 'active' : ''}">
                    <button class="page-link" on:click={() => cambiarPagina(i + 1)}>{i + 1}</button>
                </li>
            {/each}
            <li class="page-item {paginaActual === totalPaginas ? 'disabled' : ''}">
                <button class="page-link" on:click={() => cambiarPagina(paginaActual + 1)}>Siguiente</button>
            </li>
        </ul>
    </nav>
</div>

<!-- Modal Ruta -->
{#if showModalRuta}
    <div
        class="modal fade show d-block"
        tabindex="-1"
        style="background:rgba(0,0,0,0.5)"
    >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        {editando ? "Editar Ruta" : "Agregar Ruta"}
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        on:click={cerrarModalRuta}
                    ></button>
                </div>
                <div class="modal-body">
                    {#if mensaje}
                        <div class="alert alert-danger">{mensaje}</div>
                    {/if}
                    <div class="mb-3">
                        <label class="form-label">Nombre</label>
                        <input class="form-control" bind:value={nombre} />
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Descripción</label>
                        <textarea class="form-control" bind:value={descripcion}
                        ></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Clientes asignados</label>
                        <div>
                            <button
                                class="btn btn-outline-primary btn-sm mb-2"
                                type="button"
                                on:click={abrirModalCliente}
                            >
                                Agregar Cliente
                            </button>
                        </div>
                        {#if clientesSeleccionados.length > 0}
                            <div class="mt-2">
                                <strong>Seleccionados:</strong>
                                {#each clientesSeleccionados as cid}
                                    <span class="badge bg-info text-dark me-1">
                                        {clientes.find((c) => c._id === cid)
                                            ? clientes.find(
                                                  (c) => c._id === cid,
                                              ).nombre
                                            : ""}
                                        <button
                                            type="button"
                                            class="btn-close btn-close-white btn-sm ms-1"
                                            aria-label="Eliminar"
                                            on:click={() =>
                                                eliminarClienteSeleccionado(
                                                    cid,
                                                )}
                                        ></button>
                                    </span>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" on:click={cerrarModalRuta}
                        >Cancelar</button
                    >
                    <button class="btn btn-primary" on:click={guardarRuta}>
                        {editando ? "Guardar Cambios" : "Agregar Ruta"}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Modal Cliente -->
{#if showModalCliente}
    <div
        class="modal fade show d-block"
        tabindex="-1"
        style="background:rgba(0,0,0,0.5)"
    >
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Agregar Cliente a la Ruta</h5>
                    <button
                        type="button"
                        class="btn-close"
                        on:click={cerrarModalCliente}
                    ></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Buscar cliente</label>
                        <input
                            type="text"
                            class="form-control mb-2"
                            placeholder="Buscar por nombre"
                            bind:value={busquedaCliente}
                        />
                        <label class="form-label">Selecciona un cliente</label>
                        <select
                            class="form-select"
                            bind:value={clienteAAgregar}
                        >
                            <option value="" disabled selected>
                                Selecciona un cliente
                            </option>
                            {#each clientesFiltrados as cliente}
                                <option value={cliente._id}>
                                    {cliente.nombre}
                                </option>
                            {/each}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button
                        class="btn btn-secondary"
                        on:click={cerrarModalCliente}
                    >Cancelar</button>
                    <button
                        class="btn btn-primary"
                        on:click={agregarClienteSeleccionado}
                        disabled={!clienteAAgregar}
                    >
                        Agregar
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .btn-close-white {
        filter: invert(1);
        margin-left: 5px;
        font-size: 0.7em;
    }
</style>
