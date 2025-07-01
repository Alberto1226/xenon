<script>
    import { onMount } from "svelte";
    import { postData, mensajes_app } from "../../stores";
    import QRCode from "qrcode";

    let clientes = [];
    let clienteSeleccionado = "";
    let qrDataUrl = "";
    let mensaje = "";
    let cargando = false;
    let busqueda = "";

    // Cargar clientes al iniciar
    onMount(async () => {
        cargando = true;
        const res = await postData("app/rutas/administracionRutas", { tipo: "consulta_clientes" });
        if (res.ok) {
            // Ordenar clientes por nombre alfabéticamente
            clientes = res.clientes.sort((a, b) =>
                a.nombre.localeCompare(b.nombre)
            );
        } else {
            mensaje = res.mensaje || "No se pudieron cargar los clientes";
        }
        cargando = false;
    });

    // Filtrar clientes por búsqueda
    $: clientesFiltrados = clientes.filter(
        c => c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Generar QR
    async function generarQR() {
        if (!clienteSeleccionado) {
            mensaje = "Selecciona un cliente";
            return;
        }
        mensaje = "";
        qrDataUrl = await QRCode.toDataURL(clienteSeleccionado, { width: 200, margin: 1 });
    }

    // Imprimir QR
    function imprimirQR() {
        if (!qrDataUrl) return;
        const ventana = window.open("", "_blank");
        ventana.document.write(
            '<html>' +
            '<head>' +
                '<title>Imprimir QR</title>' +
                '<style>' +
                    '@media print {' +
                        'body { margin: 0; }' +
                        '.qr-container {' +
                            'width: 5cm;' +
                            'height: 4cm;' +
                            'display: flex;' +
                            'align-items: center;' +
                            'justify-content: center;' +
                        '}' +
                    '}' +
                    '.qr-container {' +
                        'width: 5cm;' +
                        'height: 4cm;' +
                        'display: flex;' +
                        'align-items: center;' +
                        'justify-content: center;' +
                        'border: 1px solid #ccc;' +
                        'margin: 0 auto;' +
                    '}' +
                '</style>' +
            '</head>' +
            '<body>' +
                '<div class="qr-container">' +
                    '<img src="' + qrDataUrl + '" style="max-width:90%;max-height:90%;" />' +
                '</div>' +
                '<script>' +
                    'window.onload = function() { window.print(); window.close(); }' +
                '<\/script>' +
            '</body>' +
            '</html>'
        );
        ventana.document.close();
    }
</script>

<link
    href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
    rel="stylesheet"
    integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
    crossorigin="anonymous"
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
            <option value="" disabled selected>Selecciona un cliente</option>
            {#each clientesFiltrados as cliente}
                <option value={cliente._id}>{cliente.nombre}</option>
            {/each}
        </select>
    </div>
    <button class="btn btn-primary mb-3" on:click={generarQR} disabled={!clienteSeleccionado || cargando}>
        Generar QR
    </button>

    {#if qrDataUrl}
        <div class="my-4 text-center">
            <div style="display:inline-block; border:1px solid #ccc; width:5cm; height:4cm; padding:0.5cm; background:#fff;">
                <img src={qrDataUrl} alt="QR" style="max-width:100%; max-height:100%;" />
            </div>
            <div class="mt-3">
                <button class="btn btn-success" on:click={imprimirQR}>
                    Imprimir QR (5x4 cm)
                </button>
            </div>
        </div>
    {/if}
</div>

<!-- Instala qrcode con: npm install qrcode -->