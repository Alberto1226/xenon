<script>
    import { postData } from "./../../stores";

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

    $: totalPaginas = Math.ceil(resultadosFiltrados.length / porPagina);
    $: resultadosPaginados = resultadosFiltrados.slice(
        (pagina - 1) * porPagina,
        pagina * porPagina,
    );

    async function obtenerDatosDesdeBD() {
        // if (!fechaInicio || !fechaFin) {
        //     mensaje = "Selecciona ambas fechas para obtener los datos.";
        //     return;
        // }

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

<section class="filtros">
    <h2>Filtros</h2>
    <form class="filtros-form" on:submit|preventDefault={aplicarFiltros}>
        <div class="filtro">
            <label>Fecha Inicio:</label>
            <input type="date" bind:value={fechaInicio} />
        </div>
        <div class="filtro">
            <label>Fecha Fin:</label>
            <input type="date" bind:value={fechaFin} />
        </div>
        <div class="filtro botones">
            <button type="button" on:click={obtenerDatosDesdeBD}>
                Obtener Datos
            </button>
        </div>
        <div class="filtro">
            <label>Cliente:</label>
            <select bind:value={cliente}>
                <option value="">Todos</option>
                {#each [...clientes].sort((a, b) => a.localeCompare(b)) as c}
                    <option value={c}>{c}</option>
                {/each}
            </select>
        </div>
        <div class="filtro">
            <label>Producto:</label>
            <select bind:value={producto}>
                <option value="">Todos</option>
                {#each [...productos].sort((a, b) => a.localeCompare(b)) as p}
                    <option value={p}>{p}</option>
                {/each}
            </select>
        </div>
        <div class="filtro">
            <label>Usuario:</label>
            <select bind:value={usuario}>
                <option value="">Todos</option>
                {#each [...usuarios].sort((a, b) => a.localeCompare(b)) as u}
                    <option value={u}>{u}</option>
                {/each}
            </select>
        </div>
        <div class="filtro botones">
            <button type="submit"> Aplicar Filtros </button>
        </div>
    </form>
</section>

<!-- BOTONES DE TOP 3 -->
{#if resultadosOriginales.length > 0}
    <section class="top3">
        <h3>Top {top}</h3>
        <button on:click={() => (mostrarTopClientes = true)}
            >Top Clientes</button
        >
        <button on:click={() => (mostrarTopProductos = true)}
            >Top Productos</button
        >
        <button on:click={() => (mostrarTopAgentes = true)}>Top Agentes</button>
    </section>
{/if}

<section class="resultados">
    <h2>Resultados</h2>

    {#if mensaje}
        <p style="color: red;">{mensaje}</p>
    {/if}

    {#if cargando}
        <p>Cargando datos...</p>
    {:else if resultadosFiltrados.length > 0}
        <table>
            <thead>
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
                        <td>{new Date(r.fecha).toLocaleDateString("es-MX")}</td>
                        <td>{r.folio}</td>
                        <td>{r.cliente}</td>
                        <td>{r.producto}</td>
                        <td>{r.cantidad}</td>
                        <td>${r.precioUnitario}</td>
                        <td>${r.total}</td>
                        <td>{r.usuario}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <div class="paginacion">
            <button on:click={anteriorPagina} disabled={pagina === 1}>
                Anterior
            </button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button
                on:click={siguientePagina}
                disabled={pagina === totalPaginas}
            >
                Siguiente
            </button>
        </div>
    {:else}
        <p>No hay datos para mostrar.</p>
    {/if}
</section>

<!-- MODALES -->
{#if mostrarTopClientes}
    <div class="modal">
        <div class="modal-content">
            <h4>Top {top} Clientes</h4>
            <ul>
                {#each topClientes as [cliente, cantidad]}
                    <li>{cliente}: {cantidad} compras</li>
                {/each}
            </ul>
            <button on:click={() => (mostrarTopClientes = false)}>Cerrar</button
            >
        </div>
    </div>
{/if}

{#if mostrarTopProductos}
    <div class="modal">
        <div class="modal-content">
            <h4>Top {top} Productos</h4>
            <ul>
                {#each topProductos as [producto, totalCantidad]}
                    <li>{producto}: {totalCantidad} unidades vendidas</li>
                {/each}
            </ul>
            <button on:click={() => (mostrarTopProductos = false)}
                >Cerrar</button
            >
        </div>
    </div>
{/if}

{#if mostrarTopAgentes}
    <div class="modal">
        <div class="modal-content">
            <h4>Top {top} Agentes</h4>
            <ul>
                {#each topAgentes as [usuario, cantidad]}
                    <li>{usuario}: {cantidad} ventas</li>
                {/each}
            </ul>
            <button on:click={() => (mostrarTopAgentes = false)}>Cerrar</button>
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
