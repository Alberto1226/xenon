<script>
    import { onMount } from "svelte";
    import { postData } from "../../stores";
    import QRCode from "qrcode";

    let clientes = [];
    let clienteSeleccionado = "";
    let clientesSeleccionados = [];
    let qrsGenerados = [];
    let mensaje = "";
    let cargando = false;
    let busqueda = "";

    // Cargar clientes
    onMount(async () => {
        cargando = true;
        const res = await postData("app/rutas/administracionRutas", { tipo: "consulta_clientes" });
        if (res.ok) {
            clientes = res.clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
        } else {
            mensaje = res.mensaje || "No se pudieron cargar los clientes";
        }
        cargando = false;
    });

    // Filtrar búsqueda
    $: clientesFiltrados = clientes.filter(
        c => c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Agregar cliente seleccionado
    function agregarCliente() {
        if (!clienteSeleccionado) {
            mensaje = "Selecciona un cliente para agregar";
            return;
        }

        const yaExiste = clientesSeleccionados.includes(clienteSeleccionado);
        if (!yaExiste) {
            clientesSeleccionados = [...clientesSeleccionados, clienteSeleccionado];
            mensaje = "";
        } else {
            mensaje = "El cliente ya fue agregado";
        }
    }

    // Eliminar cliente seleccionado
    function eliminarClienteSeleccionado(cid) {
        clientesSeleccionados = clientesSeleccionados.filter(id => id !== cid);
    }

    // Generar QRs para todos los clientes seleccionados
    async function generarQRs() {
        if (!clientesSeleccionados.length) {
            mensaje = "Agrega al menos un cliente para generar los QRs";
            return;
        }

        mensaje = "";
        let nuevosQrs = [];

        for (const cid of clientesSeleccionados) {
            const cliente = clientes.find(c => c._id === cid);
            if (cliente) {
                const dataUrl = await QRCode.toDataURL(cliente._id, { width: 200, margin: 1 });
                nuevosQrs.push({
                    ...cliente,
                    qrDataUrl: dataUrl
                });
            }
        }
        qrsGenerados = nuevosQrs;
    }

    // Imprimir todos los QRs
    function imprimirQRs() {
        if (!qrsGenerados.length) return;

        const ventana = window.open("", "_blank");
        ventana.document.write(`
            <html>
                <head>
                    <title>Imprimir QRs</title>
                    <style>
                        body {
                            font-family: sans-serif;
                            padding: 1cm;
                            display: flex;
                            flex-wrap: wrap;
                            gap: 1cm;
                        }
                        .qr-container {
                            width: 5cm;
                            height: 5cm;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            border: 1px solid #ccc;
                            padding: 0.2cm;
                            box-sizing: border-box;
                        }
                        img {
                            max-width: 100%;
                            max-height: 80%;
                        }
                        .nombre {
                            margin-top: 5px;
                            font-size: 0.9em;
                            text-align: center;
                            word-wrap: break-word;
                        }
                    </style>
                </head>
                <body>
                    ${qrsGenerados.map(qr => `
                        <div class="qr-container">
                            <img src="${qr.qrDataUrl}" />
                            <div class="nombre">${qr.nombre}</div>
                        </div>
                    `).join("")}
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        };
                    <\/script>
                </body>
            </html>
        `);
        ventana.document.close();
    }
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
/>

<div class="container py-4">
    <h2 class="mb-4">Generación e Impresión de Códigos QR de Clientes</h2>

    {#if mensaje}
        <div class="alert alert-warning">{mensaje}</div>
    {/if}

    <div class="mb-3">
        <label class="form-label">Buscar cliente</label>
        <input
            type="text"
            class="form-control mb-2"
            placeholder="Buscar por nombre"
            bind:value={busqueda}
        />

        <label class="form-label">Selecciona un cliente</label>
        <select class="form-select" bind:value={clienteSeleccionado} disabled={cargando}>
            <option value="">-- Selecciona --</option>
            {#each clientesFiltrados as cliente}
                <option value={cliente._id}>{cliente.nombre}</option>
            {/each}
        </select>

        <button class="btn btn-secondary mt-2" on:click={agregarCliente}>
            Agregar cliente
        </button>
    </div>

    {#if clientesSeleccionados.length > 0}
        <div class="mt-2">
            <strong>Seleccionados:</strong>
            {#each clientesSeleccionados as cid}
                <span class="badge bg-info text-dark me-1">
                    {clientes.find((c) => c._id === cid)
                        ? clientes.find((c) => c._id === cid).nombre
                        : ""}
                    <button
                        type="button"
                        class="btn-close btn-close-white btn-sm ms-1"
                        aria-label="Eliminar"
                        on:click={() => eliminarClienteSeleccionado(cid)}
                    ></button>
                </span>
            {/each}
        </div>
    {/if}

    <button class="btn btn-primary mb-4" on:click={generarQRs} disabled={!clientesSeleccionados.length}>
        Generar QRs
    </button>

    {#if qrsGenerados.length}
        <div class="text-center">
            <h5>Vista previa</h5>
            <div class="d-flex flex-wrap justify-content-center gap-3">
                {#each qrsGenerados as qr}
                    <div style="border:1px solid #ccc; width:5cm; height:5cm; padding:0.2cm;">
                        <img src={qr.qrDataUrl} alt="QR" style="max-width:100%; max-height:80%;" />
                        <div style="font-size:0.9em; text-align:center;">{qr.nombre}</div>
                    </div>
                {/each}
            </div>
            <button class="btn btn-success mt-4" on:click={imprimirQRs}>
                Imprimir todos los QRs
            </button>
        </div>
    {/if}
</div>
