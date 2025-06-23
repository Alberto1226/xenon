<script>
    import { postData, mensajes_app } from "./../../stores";

    let fechaInicio = "";
    let fechaFin = "";
    let cliente = "";
    let producto = "";
    let usuario = "";

    let clientes = [];
    let productos = [];
    let usuarios = [];

    let resultadosOriginales = [];
    let resultadosFiltrados = [];

    let topClientes = [];
    let topProductos = [];
    let topAgentes = [];

    let mostrarTopClientes = false;
    let mostrarTopProductos = false;
    let mostrarTopAgentes = false;

    const porPagina = 20;
    const top = 5;
    let pagina = 1;

    let mensaje = "";
    let cargando = false;

    let datosModalEspecifico = null;
    let mostrarModalEspecifico = false;

    $: totalPaginas = Math.ceil(resultadosFiltrados.length / porPagina);
    $: resultadosPaginados = resultadosFiltrados.slice(
        (pagina - 1) * porPagina,
        pagina * porPagina,
    );

    async function DatosEspesificos(tipo, id) {
        const body = { tipo, id };

        const res = await postData("app/reporteGral/datosReporteGral", body);

        if (res && res.ok && res.resultados && res.resultados.length > 0) {
            datosModalEspecifico = res.resultados[0];
            mostrarModalEspecifico = true;
        } else {
            datosModalEspecifico = null;
            mostrarModalEspecifico = false;
            // alert("No se encontraron detalles.");
            $mensajes_app.push({
                tipo: "error",
                mensaje: "No se encontraron detalles para el producto seleccionado.",
            });
            $mensajes_app = $mensajes_app;
        }
    }

    async function obtenerDatosDesdeBD() {
        if (!fechaInicio || !fechaFin) {
            mensaje = "Selecciona ambas fechas para obtener los datos.";
            return;
        }

        mensaje = "";
        cargando = true;

        const body = {
            tipo: "consulta",
            fechaInicio,
            fechaFin,
        };

        const res = await postData("app/reporteGral/datosReporteGral", body);
        cargando = false;

        if (res && res.resultados && res.resultados.length) {
            resultadosOriginales = res.resultados.map((r) => ({
                fecha: r.fecha,
                folio: r.folio,
                cliente: r.cliente,
                producto: r.producto,
                productoId: r.producto_id,
                cantidad: r.cantidad,
                precioUnitario: r.precio_unitario,
                total: r.total,
                usuario: r.usuario,
            }));

            // Actualiza filtros únicos
            clientes = [...new Set(resultadosOriginales.map((r) => r.cliente))];
            productos = [
                ...new Set(resultadosOriginales.map((r) => r.producto)),
            ];
            usuarios = [...new Set(resultadosOriginales.map((r) => r.usuario))];

            resultadosFiltrados = [...resultadosOriginales];
            calcularTop3();
            pagina = 1;
        } else {
            resultadosOriginales = [];
            resultadosFiltrados = [];
            topClientes = [];
            topProductos = [];
            topAgentes = [];
            mensaje = "No se encontraron resultados para el rango de fechas.";
        }
    }

    function aplicarFiltros() {
        resultadosFiltrados = resultadosOriginales.filter((r) => {
            const cumpleFechaInicio = !fechaInicio || r.fecha >= fechaInicio;
            const cumpleFechaFin = !fechaFin || r.fecha <= fechaFin;
            const cumpleCliente = !cliente || r.cliente === cliente;
            const cumpleProducto = !producto || r.producto === producto;
            const cumpleUsuario = !usuario || r.usuario === usuario;

            return (
                cumpleFechaInicio &&
                cumpleFechaFin &&
                cumpleCliente &&
                cumpleProducto &&
                cumpleUsuario
            );
        });
        pagina = 1;
    }

    function calcularTop3() {
        const foliosUnicos = new Set();
        const comprasPorCliente = {};
        const ventasPorProducto = {};
        const ventasPorAgente = {};

        for (const r of resultadosOriginales) {
            // Clientes (ventas únicas por folio)
            const clave = `${r.cliente}-${r.folio}`;
            if (!foliosUnicos.has(clave)) {
                foliosUnicos.add(clave);
                comprasPorCliente[r.cliente] =
                    (comprasPorCliente[r.cliente] || 0) + 1;
            }

            // Productos (por cantidad)
            ventasPorProducto[r.producto] =
                (ventasPorProducto[r.producto] || 0) + r.cantidad;

            // Agentes (ventas únicas por folio)
            const claveAgente = `${r.usuario}-${r.folio}`;
            if (!foliosUnicos.has(claveAgente)) {
                foliosUnicos.add(claveAgente);
                ventasPorAgente[r.usuario] =
                    (ventasPorAgente[r.usuario] || 0) + 1;
            }
        }

        topClientes = Object.entries(comprasPorCliente)
            .sort((a, b) => b[1] - a[1])
            .slice(0, top);

        topProductos = Object.entries(ventasPorProducto)
            .sort((a, b) => b[1] - a[1])
            .slice(0, top);

        topAgentes = Object.entries(ventasPorAgente)
            .sort((a, b) => b[1] - a[1])
            .slice(0, top);
    }

    function siguientePagina() {
        if (pagina < totalPaginas) pagina++;
    }

    function anteriorPagina() {
        if (pagina > 1) pagina--;
    }
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
    crossorigin="anonymous"
/>

<!-- Bootstrap ya está importado en tu <link> -->

<section class="filtros card p-4 mb-4">
    <!-- <h2 class="h4 mb-3">Filtros</h2> -->
    <form class="row g-3" on:submit|preventDefault={aplicarFiltros}>
        <div class="col-md-3">
            <label class="form-label">Fecha Inicio:</label>
            <input type="date" class="form-control" bind:value={fechaInicio} />
        </div>
        <div class="col-md-3">
            <label class="form-label">Fecha Fin:</label>
            <input type="date" class="form-control" bind:value={fechaFin} />
        </div>
        <div class="col-md-2 d-flex align-items-end">
            <button
                type="button"
                class="btn btn-primary w-100"
                on:click={obtenerDatosDesdeBD}
            >
                Obtener Datos
            </button>
        </div>
        <div class="col-md-4 d-flex align-items-end mx-auto">
            <button type="submit" class="btn btn-success"
                >Aplicar Filtros</button
            >
        </div>
        <div class="col-md-4">
            <label class="form-label">Cliente:</label>
            <select class="form-select" bind:value={cliente}>
                <option value="">Todos</option>
                {#each [...clientes].sort((a, b) => a.localeCompare(b)) as c}
                    <option value={c}>{c}</option>
                {/each}
            </select>
        </div>
        <div class="col-md-4">
            <label class="form-label">Producto:</label>
            <select class="form-select" bind:value={producto}>
                <option value="">Todos</option>
                {#each [...productos].sort((a, b) => a.localeCompare(b)) as p}
                    <option value={p}>{p}</option>
                {/each}
            </select>
        </div>
        <div class="col-md-4">
            <label class="form-label">Agente:</label>
            <select class="form-select" bind:value={usuario}>
                <option value="">Todos</option>
                {#each [...usuarios].sort((a, b) => a.localeCompare(b)) as u}
                    <option value={u}>{u}</option>
                {/each}
            </select>
        </div>
    </form>
</section>

{#if resultadosOriginales.length > 0}
    <section class="top3 card p-3 mb-4 text-center">
        <h3 class="h5 mb-3">Top {top}</h3>
        <div class="d-flex justify-content-center gap-3">
            <button
                class="btn btn-outline-primary"
                on:click={() => (mostrarTopClientes = true)}
            >
                Top Clientes
            </button>
            <button
                class="btn btn-outline-info"
                on:click={() => (mostrarTopProductos = true)}
            >
                Top Productos
            </button>
            <button
                class="btn btn-outline-success"
                on:click={() => (mostrarTopAgentes = true)}
            >
                Top Agentes
            </button>
        </div>
    </section>
{/if}

<section class="resultados card p-4 mb-4">
    <h2 class="h4 mb-3">Resultados</h2>

    {#if mensaje}
        <div class="alert alert-warning">{mensaje}</div>
    {/if}

    {#if cargando}
        <div class="text-center">Cargando datos...</div>
    {:else if resultadosFiltrados.length > 0}
        <div class="table-responsive">
            <table class="table table-bordered table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Fecha</th>
                        <th>Folio</th>
                        <th>Cliente</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th>Total</th>
                        <th>Agente</th>
                    </tr>
                </thead>
                <tbody>
                    {#each resultadosPaginados as r}
                        <tr>
                            <td
                                >{new Date(r.fecha).toLocaleDateString(
                                    "es-MX",
                                )}</td
                            >
                            <td>{r.folio}</td>
                            <td>{r.cliente}</td>
                            <td>
                                <a
                                    href="#"
                                    on:click|preventDefault={() =>
                                        DatosEspesificos(
                                            "producto",
                                            r.productoId,
                                        )}
                                >
                                    {r.producto}
                                </a>
                            </td>
                            <td>{r.cantidad}</td>
                            <td>${r.precioUnitario}</td>
                            <td>${r.total}</td>
                            <td>{r.usuario}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div
            class="paginacion d-flex justify-content-between align-items-center mt-3"
        >
            <button
                class="btn btn-secondary"
                on:click={anteriorPagina}
                disabled={pagina === 1}
            >
                Anterior
            </button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button
                class="btn btn-secondary"
                on:click={siguientePagina}
                disabled={pagina === totalPaginas}
            >
                Siguiente
            </button>
        </div>
    {:else}
        <div class="alert alert-info">No hay datos para mostrar.</div>
    {/if}
</section>

<!-- MODALES -->
{#if mostrarTopClientes}
    <div class="modal show d-block" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Top {top} Clientes</h5>
                    <button
                        type="button"
                        class="btn-close"
                        on:click={() => (mostrarTopClientes = false)}
                    ></button>
                </div>
                <div class="modal-body">
                    <ul class="list-group">
                        {#each topClientes as [cliente, cantidad]}
                            <li class="list-group-item">
                                {cliente}: {cantidad} compras
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        </div>
    </div>
{/if}

{#if mostrarTopProductos}
    <div class="modal show d-block" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Top {top} Productos</h5>
                    <button
                        type="button"
                        class="btn-close"
                        on:click={() => (mostrarTopProductos = false)}
                    ></button>
                </div>
                <div class="modal-body">
                    <ul class="list-group">
                        {#each topProductos as [producto, totalCantidad]}
                            <li class="list-group-item">
                                {producto}: {totalCantidad} unidades vendidas
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        </div>
    </div>
{/if}

{#if mostrarTopAgentes}
    <div class="modal show d-block" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Top {top} Agentes</h5>
                    <button
                        type="button"
                        class="btn-close"
                        on:click={() => (mostrarTopAgentes = false)}
                    ></button>
                </div>
                <div class="modal-body">
                    <ul class="list-group">
                        {#each topAgentes as [usuario, cantidad]}
                            <li class="list-group-item">
                                {usuario}: {cantidad} ventas
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        </div>
    </div>
{/if}

{#if mostrarModalEspecifico && datosModalEspecifico}
    <div class="modal show d-block" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        Detalle del {datosModalEspecifico.tipo}
                    </h5>
                    <button
                        type="button"
                        class="btn-close"
                        on:click={() => (mostrarModalEspecifico = false)}
                    ></button>
                </div>
                <div class="modal-body">
                    <ul class="list-group">
                        {#each Object.entries(datosModalEspecifico) as [key, value]}
                            <li class="list-group-item">
                                <strong>{key}:</strong>
                                {value}
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .filtros,
    .resultados,
    .top3 {
        margin-bottom: 2rem;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
    }

    .filtros-form {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: flex-end;
    }

    .filtro {
        display: flex;
        flex-direction: column;
        min-width: 150px;
    }

    .filtro label {
        font-weight: bold;
        margin-bottom: 0.3rem;
    }

    .botones {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .top3 {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        border: 1px solid #ccc;
        padding: 0.5rem;
        text-align: left;
    }

    th {
        background: #f5f5f5;
    }

    .paginacion {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
    }

    .paginacion button {
        padding: 0.4rem 0.8rem;
        font-size: 1rem;
    }

    /* Modal */
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        width: 300px;
        text-align: center;
    }

    .modal-content h4 {
        margin-bottom: 1rem;
    }

    .modal-content ul {
        list-style: none;
        padding: 0;
    }

    .modal-content li {
        margin-bottom: 0.5rem;
    }
</style>
