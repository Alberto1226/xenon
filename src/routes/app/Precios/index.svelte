<script>
    import { onMount } from "svelte";
    import { postData, mensajes_app } from "../../stores";
    // import { mensajes_app } from "../../stores";

    let lista = [];

    let lista_cargar = [];

    let todo_correcto = false;

    let loading = false;

    let datosError = false;

    onMount(() => {
        getProductos()
            .then((res) => {
                // console.log(res);
            })
            .catch((err) => {
                // console.error(err);
            });
    });

    function getProductos() {
        return new Promise((resolve, reject) => {
            postData("app/Precios/Productos_precios")
                .then((res) => {
                    // console.log(res);
                    if (res.ok) {
                        lista = res.lista;
                    }

                    resolve(res);
                })
                .catch((err) => {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: "Error al cargar los productos",
                    });
                    $mensajes_app = $mensajes_app;
                    reject(err);
                });
        });
    }

    async function Crear_Documento_CSV() {
        try {
            // console.log("Crear_Documento_CSV");
            let rows = await Preparar_Datos_CSV();
            datosError = false;
            let csvContent =
                "data:text/csv;charset=utf-8," +
                rows.map((e) => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "data.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error(error);
        }
    }

    async function Preparar_Datos_CSV() {
        // console.log("Preparar_Datos_CSV");
        return new Promise((resolve, reject) => {
            let rows = [
                ["ID", "Codigo", "Nombre", "Precio", "Precio_Anterior"],
            ];
            if (lista.length == 0) {
                // console.log("rej");
                reject();
            }
            try {
                if (!datosError) {
                    // console.log("false", datosError);
                    lista.forEach((element) => {
                        rows.push([
                            element._id,
                            element.codigo,
                            element.nombre,
                            null,
                            element.precio,
                        ]);
                    });
                }
                if (datosError) {
                    // console.log("true", datosError);
                    lista.forEach((element) => {
                        rows.push([
                            element.ID,
                            element.Codigo,
                            element.Nombre,
                            element.Precio,
                            element.Precio_Anterior,
                        ]);
                    });
                }
                // lista.forEach((element) => {
                //     rows.push([
                //         element._id,
                //         element.codigo,
                //         element.nombre,
                //         null,
                //         element.precio,
                //     ]);
                // });
                resolve(rows);
            } catch (error) {
                reject(error);
            }
        });
    }

    let activeTab = "download";

    function handleFileUpload(event) {
        try {
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = function (e) {
                const text = e.target.result;
                // console.log(text);
                const lines = text.split("\n");
                const result = [];
                const headers = lines[0].split(",");

                for (let i = 1; i < lines.length - 1; i++) {
                    const obj = {};
                    const currentline = lines[i].replace(/\r/, "").split(",");

                    // console.log("C=>", currentline);

                    for (let j = 0; j < headers.length; j++) {
                        // console.log("H=>", headers[j]);
                        obj[headers[j]] = currentline[j];
                    }
                    // console.log("===>", obj);
                    result.push(obj);
                }

                lista_cargar = result;
                // console.log(lista_cargar);
                todo_correcto = true;
            };

            reader.readAsText(file);
        } catch (error) {
            console.error(error);
            todo_correcto = false;
        }
    }

    function cargarDatos() {
        loading = true;
        // console.log("cargarDatos");
        return new Promise((resolve, reject) => {
            postData("app/Precios/Actualizar_precios_productos", {
                lista: lista_cargar,
            })
                .then((res) => {
                    // console.log(res);
                    if (res.ok) {
                        // console.log(res.mensaje);
                        $mensajes_app.push({
                            tipo: "exito",
                            mensaje: res.mensaje,
                        });
                        $mensajes_app = $mensajes_app;
                    }

                    if (!res.ok) {
                        // console.log(res.mensaje);
                        $mensajes_app.push({
                            tipo: "error",
                            mensaje: res.mensaje,
                        });
                        $mensajes_app = $mensajes_app;
                        if (res.datos.length > 0) {
                            lista = res.datos;
                            datosError = true;
                            Crear_Documento_CSV();
                        }
                    }
                    resolve(res);
                })
                .catch((err) => {
                    reject(err);
                })
                .finally(() => {
                    loading = false; // Ocultar el loader después de la respuesta
                });
        });
    }

    function pruebaMensaje() {
        $mensajes_app.push({
            tipo: "exito",
            mensaje: "Mensaje de prueba",
        });
        $mensajes_app = $mensajes_app;
    }
</script>

<div class="menu">
    <div
        class="tab {activeTab === 'download' ? 'active' : ''}"
        on:click={() => (activeTab = "download")}
    >
        Descargar Información
    </div>
    <div
        class="tab {activeTab === 'upload' ? 'active' : ''}"
        on:click={() => (activeTab = "upload")}
    >
        Cargar Información
    </div>
</div>

<!-- Overlay y Loader -->
{#if loading}
    <div class="overlay"></div>
    <div class="loader"></div>
{/if}

<!-- Contenido principal -->
<div class:class:no-interaction={loading}>
    <div class="content">
        {#if activeTab === "download"}
            <div class="section">
                <button class="btn btn-primary" on:click={Crear_Documento_CSV}>
                    Descargar CSV
                </button>
                <!-- <button on:click={pruebaMensaje}>Mensaje</button> -->
            </div>
        {:else if activeTab === "upload"}
            <div class="section">
                <input
                    type="file"
                    class="input-file"
                    accept=".csv"
                    on:change={handleFileUpload}
                />
            </div>

            {#if todo_correcto}
                <button class="btn btn-success" on:click={cargarDatos}
                    >Cargar Datos</button
                >
            {/if}
        {/if}
        <div class="progress">
            <!-- <div
                id="progressBar"
                class="progress-bar"
                role="progressbar"
                style="width: 0%;"
            ></div> -->
        </div>
    </div>
</div>

<style>
    .menu {
        /* display: flex;
        justify-content: space-around;
        background-color: #f8f8f8;
        padding: 10px; */
        display: flex;
        justify-content: center;
        gap: 20px;
        padding: 10px;
        background-color: #f1f1f1;
        border-bottom: 2px solid #ddd;
    }

    .tab {
        /* cursor: pointer;
        padding: 10px; */
        padding: 10px 20px;
        cursor: pointer;
        color: #333;
        border-radius: 5px;
        transition:
            background-color 0.3s,
            color 0.3s;
    }

    .tab:hover {
        background-color: #ddd;
        color: #000;
    }

    .tab.active {
        /* font-weight: bold;
        border-bottom: 2px solid #000; */
        background-color: #007bff;
        color: white;
        font-weight: bold;
    }

    button.btn {
        display: inline-block;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        transition:
            background-color 0.3s,
            color 0.3s;
    }

    button.btn-primary {
        background-color: #007bff;
        color: white;
    }

    button.btn-primary:hover {
        background-color: #0056b3;
    }

    button.btn-success {
        background-color: #28a745;
        color: white;
    }

    button.btn-success:hover {
        background-color: #218838;
    }

    input[type="file"] {
        margin: 10px 0;
    }

    .section {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #f9f9f9;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .section + .section {
        margin-top: 30px;
    }

    .btn {
        display: inline-block;
        font-size: 16px;
        font-weight: 600;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        text-align: center;
        transition: background-color 0.3s ease;
    }

    .btn-primary {
        background-color: #007bff;
        color: #fff;
    }

    .btn-primary:hover {
        background-color: #0056b3;
    }

    .btn-success {
        background-color: #28a745;
        color: #fff;
    }

    .btn-success:hover {
        background-color: #218838;
    }

    .input-file {
        display: block;
        margin-bottom: 15px;
        font-size: 16px;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background-color: #fff;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .input-file:focus {
        border-color: #007bff;
        outline: none;
        box-shadow: 0 0 3px rgba(0, 123, 255, 0.5);
    }

    .content {
        padding: 20px;
    }
    .progress {
        width: 100%;
        background-color: #e9ecef;
        border-radius: 5px;
        overflow: hidden;
    }

    .progress-bar {
        width: 0;
        height: 20px;
        background-color: #007bff;
        transition: width 0.5s;
    }

    .loader {
        border: 16px solid #f3f3f3;
        border-radius: 50%;
        border-top: 16px solid #3498db;
        width: 120px;
        height: 120px;
        animation: spin 2s linear infinite;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .hidden {
        display: none;
    }

    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }

    .no-interaction {
        pointer-events: none;
    }
</style>
