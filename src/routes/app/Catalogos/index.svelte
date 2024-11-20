<script>
    import { Textfield, Button } from "svelte-mui/src";
    import { postData, mensajes_app } from "./../../stores";
    import { onMount } from "svelte";

    let activeTab = "Marcas"; // La pestaña activa por defecto
    let mostrarModal = false;
    let nameCatalogo = "";
    let dato = "";

    let nuevaMarca = "";
    let nuevaUnidad = "";
    let nuevaCuenta = "";

    let idRegistro = "";
    let marcas = [];
    let unidades = [];
    let cuentas = [];

    onMount(() => {
        getColeccion();
    });

    function Clean() {
        nuevaMarca = "";
        nuevaUnidad = "";
        nuevaCuenta = "";
    }

    function getColeccion() {
        return new Promise((resolve, reject) => {
            postData("app/productos/catalogoConsulta", {
                tipo: "consulta",
            }).then((res) => {
                if (res.ok && res.catalogos.length != 0) {
                    idRegistro = res.catalogos._id;
                    if (res.catalogos.Marcas.length != 0) {
                        marcas = res.catalogos.Marcas.sort((a, b) =>
                            a.localeCompare(b),
                        );
                    }
                    if (res.catalogos.Unidades.length != 0) {
                        unidades = res.catalogos.Unidades.sort((a, b) =>
                            a.localeCompare(b),
                        );
                    }
                    if (res.catalogos.Cuentas.length != 0) {
                        cuentas = res.catalogos.Cuentas;
                    }
                    resolve(res.ok);
                }
                if (res.ok && res.catalogos.length == 0) {
                    idRegistro = "SinDatos";
                    resolve(res.ok);
                }
            });
        });
    }

    function ConfirmarGuardado(nameCat, dato1) {
        if (!dato1) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "El dato no puede estar vacío",
            });
            return;
        }
        nameCatalogo = nameCat;
        dato = dato1;
        mostrarModal = true;
    }

    function guardarCatalogo() {
        return new Promise((resolve, reject) => {
            postData("app/productos/catalogoConsulta", {
                tipo: "guardar",
                id: idRegistro,
                catalogo: nameCatalogo,
                dato: dato,
            }).then((res) => {
                if (res.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Guardado Correctamente",
                    });
                    mostrarModal = false;
                    getColeccion();
                    Clean();
                    resolve(res.ok);
                } else {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: res.mensaje || "Error al guardar el catálogo",
                    });
                    resolve(res.ok);
                }
            });
        });
    }

    // Función para dividir los datos en columnas de 15 elementos
    function dividirEnColumnas(lista, maxItemsPorColumna = 15) {
        let columnas = [];
        for (let i = 0; i < lista.length; i += maxItemsPorColumna) {
            columnas.push(lista.slice(i, i + maxItemsPorColumna));
        }
        return columnas;
    }
</script>

<main>
    <h1>Catálogos</h1>
    <!-- Nav Tabs -->
    <div class="nav-tabs">
        <div
            class="nav-item {activeTab === 'Marcas' ? 'active' : ''}"
            on:click={() => (activeTab = "Marcas")}
        >
            Marcas
        </div>
        <div
            class="nav-item {activeTab === 'Unidades' ? 'active' : ''}"
            on:click={() => (activeTab = "Unidades")}
        >
            Unidades
        </div>
        <!-- <div
            class="nav-item {activeTab === 'Cuentas' ? 'active' : ''}"
            on:click={() => (activeTab = "Cuentas")}
        >
            Cuentas
        </div> -->
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
        {#if activeTab === "Marcas"}
            <div>
                <h2>Marcas</h2>
                <Textfield
                    outlined
                    id="marca_input"
                    bind:value={nuevaMarca}
                    placeholder="Nueva Marca"
                    message="Nueva Marca"
                    type="text"
                />
                <button
                    on:click={() => ConfirmarGuardado("Marcas", nuevaMarca)}
                >
                    Agregar Marca
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(marcas) as columna}
                            <ul>
                                {#each columna as marca}
                                    <li>{marca}</li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if activeTab === "Unidades"}
            <div>
                <h2>Unidades</h2>
                <Textfield
                    outlined
                    id="unidad_input"
                    bind:value={nuevaUnidad}
                    placeholder="Nueva Unidad"
                    message="Nueva Unidad"
                    type="text"
                />
                <button
                    on:click={() => ConfirmarGuardado("Unidades", nuevaUnidad)}
                >
                    Agregar Unidad
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(unidades) as columna}
                            <ul>
                                {#each columna as unidad}
                                    <li>{unidad}</li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        {#if activeTab === "Cuentas"}
            <div>
                <h2>Cuentas</h2>
                <Textfield
                    outlined
                    id="cuenta_input"
                    bind:value={nuevaCuenta}
                    placeholder="Nueva Cuenta"
                    message="Nueva Cuenta"
                    type="text"
                />
                <button
                    on:click={() => ConfirmarGuardado("Cuentas", nuevaCuenta)}
                >
                    Agregar Cuenta
                </button>
                <div class="lista-scroll">
                    <div class="columnas">
                        {#each dividirEnColumnas(cuentas) as columna}
                            <ul>
                                {#each columna as cuenta}
                                    <li>{cuenta}</li>
                                {/each}
                            </ul>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Modal -->
    {#if mostrarModal}
        <div class="modal">
            <div class="modal-content">
                <p>
                    ¿Confirma el guardado de {dato} en el catálogo "{nameCatalogo}"?
                </p>
                <button on:click={guardarCatalogo}>Confirmar</button>
                <button
                    on:click={() => {
                        Clean();
                        mostrarModal = false;
                    }}>Cancelar</button
                >
            </div>
        </div>
    {/if}
</main>

<style>
    .nav-tabs {
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;
    }
    .nav-item {
        margin: 0 0.5rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        border: 1px solid transparent;
        border-radius: 5px 5px 0 0;
        background-color: #f8f9fa;
    }
    .nav-item.active {
        border-color: #ddd;
        background-color: #fff;
        border-bottom-color: transparent;
        font-weight: bold;
    }
    .tab-content {
        padding: 1rem;
        border: 1px solid #ddd;
        border-top: none;
        background-color: #fff;
    }
    main {
        padding: 2rem;
        font-family: Arial, sans-serif;
    }

    h1 {
        color: #333;
    }

    button {
        padding: 0.5rem 1rem;
        background-color: #007bff;
        color: white;
        border: none;
        cursor: pointer;
    }

    button:hover {
        background-color: #0056b3;
    }

    .lista-scroll {
        overflow-x: auto;
        white-space: nowrap;
    }

    .columnas {
        display: flex;
        flex-wrap: nowrap;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0 1rem;
    }

    li {
        padding: 0.5rem;
        border-bottom: 1px solid #ddd;
    }

    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .modal-content {
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        max-width: 500px;
        width: 100%;
    }
</style>
