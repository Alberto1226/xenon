<script>
    import { fly, scale, fade } from "svelte/transition";
    export var visible;
    export var folios;
    export var producto;
    export var id_registro;
    export var id_carrito;
    export var cantidad;
    export var cantidad_total;
    export var cantidad_selecta = 0;
    export var selectos = [];

    export var ProdIndividual = false;
    export var BoxProd = false;
    export var InserFolio = "";
    export var foliosMaster = [];
    export var desactivar = false;
    export var CantidadArreglo = 10;

    export var foliosRepetidos = [];

    var buscando = "";
    var actualizado = false;
    var lista_filtrada = [];
    var filtrar_selectos = false;
    var guardando_folios = false;

    import { usuario_db, mensajes_app, postData } from "./../../../stores";
    import { Button } from "svelte-mui/src";
    import { createEventDispatcher, onMount } from "svelte";
    import { each } from "svelte/internal";

    const dispatch = createEventDispatcher();

    onMount(() => {});
    $: if (visible == true) {
        // console.log({ selectos });
        seleccionar_las_que_ya_estaban_selectas();
    }

    function cambiar_folios() {
        if (foliosMaster.length > cantidad) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "La cantidad de folios es mayor a la cantidad de productos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        if (foliosMaster.length === 0) {
            $mensajes_app.push({
                tipo: "error",
                mensaje: "No hay folios en la lista",
            });
            $mensajes_app = $mensajes_app;
            return;
        }

        if (foliosMaster.length < cantidad) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "La cantidad de folios es menor a la cantidad de productos",
            });
            $mensajes_app = $mensajes_app;
            return;
        }
        if (guardando_folios == true) return;
        guardando_folios = true;
        // var folios_puros = selectos.map((elem) => elem.folio);
        let registro = {
            id_registro,
            producto_id: producto._id,
            cantidad,
            folios: foliosMaster,
        };
        //console.log(registro);
        postData("/app/pedidos/editar/cambiar_lista_de_folios_Master", {
            registro,
            id_carrito,
        })
            .then((respuesta) => {
                guardando_folios = false;
                // console.log(respuesta);
                if (respuesta.ok) {
                    $mensajes_app.push({
                        tipo: "exito",
                        mensaje: "Folios actualizados",
                    });
                    $mensajes_app = $mensajes_app;
                    actualizado = true;
                    setTimeout(() => {
                        actualizado = false;

                        dispatch("se_actualizaron_folios");
                    }, 5500);
                }
                if (!respuesta.ok) {
                    $mensajes_app.push({
                        tipo: "error",
                        mensaje: respuesta.error,
                    });
                    foliosRepetidos = respuesta.foliosRepetidos;
                }
            })
            .catch((err) => {
                console.log(err);
                guardando_folios = false;
                $mensajes_app.push({
                    tipo: "error",
                    mensaje:
                        "los Folios no se pudieron actualizar , intenta mas tarde",
                });
                $mensajes_app = $mensajes_app;
            });
    }

    async function seleccionar_las_que_ya_estaban_selectas() {
        for (let i = 0; i < selectos.length; i++) {
            const element = selectos[i];
            let encontrar_folio = folios.find(
                (elem) => elem.folio == element.folio,
            );
            if (encontrar_folio) {
                encontrar_folio.selecto = true;
            }
            if (i + 1 == selectos.length) {
                folios = folios;
                // console.log({ folios });
            }
        }
    }

    function cerrar(params) {
        foliosMaster = [];
        visible = false;
        DesactivarInput();
        // dispatch("actualizar_folios");
    }

    async function seleccionar_uno(folio_a_agregar) {
        var registro = folios.find(
            (elem) => elem.folio == folio_a_agregar.folio,
        );
        let cantidad_selectos;
        // console.log({ registro });
        // console.log({ folio_a_agregar });
        if (registro.selecto == false) {
            cantidad_selectos = await cuantos_selectos();

            if (cantidad_total > cantidad_selectos) {
                registro.selecto = true;
            }
        } else {
            registro.selecto = false;
        }
        cuantos_selectos();
        // console.log({ cantidad_total });
        // console.log({ cantidad_selectos });
        let tmpfolios = folios;

        folios = tmpfolios;
    }

    function cuantos_selectos() {
        selectos = folios.filter((elem) => elem.selecto == true);
        let cantidad_selecta = 0;
        if (selectos == undefined || selectos == null) {
            cantidad_selecta = 0;
        } else {
            cantidad_selecta = selectos.length;
        }

        return cantidad_selecta;
    }

    function filtra_con_texto() {
        let buscando_upper = buscando.toUpperCase();

        lista_filtrada = folios.filter(
            (elem) => elem.folio.toUpperCase().indexOf(buscando_upper) > -1,
        );
        // console.log(lista_filtrada.length);
    }

    function AgregarFolio(dato) {
        let dato2 = dato.toUpperCase().replace(/\s+/g, "");
        if (!foliosMaster.includes(dato2)) {
            foliosMaster = [...foliosMaster, dato2];
            // console.log("Arreglo de folios actualizado:", foliosMaster);
        } else {
            // console.log("El folio ya existe en la lista");
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "El folio ya existe en la lista, por favor ingresa otro",
            });
            $mensajes_app = $mensajes_app;
        }
    }

    function GenerarFolios(dato) {
        let dato2 = dato.toUpperCase().replace(/\s+/g, "");

        let resultado_ya_existia = checar_que_sea_unico(dato2);
        if (resultado_ya_existia) {
            $mensajes_app.push({
                tipo: "error",
                mensaje:
                    "El folio ya existe en la lista, por favor ingresa otro",
            });
            return;
        }

        let parteInicial = dato2; // Iniciamos con el folio completo
        let ultimosCuatro = dato2.slice(-4); // Últimos 4 caracteres
        let lista = [];
        let numeroBase = null;
        let letrasFinales = ""; // Letras después del número

        // Comprobamos si los últimos 4 caracteres tienen letras
        let tieneLetras = /[A-Z]/.test(ultimosCuatro);
        let tieneNumeros = /^\d+$/.test(ultimosCuatro);

        if (tieneLetras) {
            // Recorremos los últimos caracteres para encontrar el número base
            for (let i = ultimosCuatro.length - 1; i >= 0; i--) {
                if (isNaN(ultimosCuatro[ultimosCuatro.length - 1])) {
                    parteInicial = dato2.slice(0, -ultimosCuatro.length + i);
                    numeroBase = 0;
                    break;
                }

                if (!isNaN(ultimosCuatro[i])) {
                    numeroBase = parseInt(ultimosCuatro.slice(i));
                    parteInicial = dato2.slice(0, -ultimosCuatro.length + i);
                    // break;
                }
            }
        }
        if (tieneNumeros) {
            console.log("todosnumeros", ultimosCuatro);
            numeroBase = parseInt(ultimosCuatro);
        }

        // Si no se encontró un número, comenzamos la iteración desde 0
        // if (numeroBase === null) {
        //     numeroBase = 0;
        //     parteInicial = dato2; // Usamos todo el folio como parte inicial
        // }

        // Generamos los folios incrementando el número base, respetando las letras finales
        for (let i = 0; i < CantidadArreglo; i++) {
            let nuevoNumero = (numeroBase + i).toString();
            // let folioGenerado = `${parteInicial}${nuevoNumero}${letrasFinales}`;
            let folioGenerado = `${parteInicial}${nuevoNumero}`;
            lista.push(folioGenerado);
        }

        // Agregar los folios generados al arreglo maestro, si no existen
        for (let index = 0; index < lista.length; index++) {
            const element = lista[index];
            if (!foliosMaster.includes(element)) {
                foliosMaster = [...foliosMaster, element];
            }
        }

        console.log("Lista generada:", foliosMaster);
    }

    function checar_que_sea_unico(folio) {
        var encontrado = foliosMaster.find((elem) => elem.includes(folio));
        return encontrado;
    }

    function quitarFolio(folio) {
        //teniendo en cuenta que los folios deben de ser unicos esta funcion quitara todos los folios que coincidan
        foliosMaster = foliosMaster.filter((elem) => elem != folio);
        DesactivarInput();
    }

    function DesactivarInput() {
        if (foliosMaster.length >= cantidad) {
            desactivar = true;
        }
        if (foliosMaster.length <= cantidad) {
            desactivar = false;
        }
    }

    function SoloActivo(donde) {
        if (donde == "ProdIndividual") {
            ProdIndividual = true;
            BoxProd = false;
        }
        if (donde == "BoxProd") {
            ProdIndividual = false;
            BoxProd = true;
        }
    }
</script>

{#if visible == true}
    <div
        class="contenedor"
        in:scale={{ duration: 200 }}
        out:scale={{ duration: 100 }}
    >
        <div class="flex">
            <!-- <input
                placeholder="buscador"
                bind:value={buscando}
                type="text"
                on:keyup={filtra_con_texto}
            /> -->

            <!-- <button
                class="altura-boton-guardar"
                on:click={() => {
                    filtrar_selectos = !filtrar_selectos;
                }}
            >
                {#if filtrar_selectos == true}
                    <i class="material-icons">visibility</i> Viendo solo selectos
                {:else}
                    <i class="material-icons">visibility</i> Viendo todos
                {/if}
            </button> -->
            {#if guardando_folios == false}
                <Button color="#2b78fe" raised dense on:click={cambiar_folios}>
                    <i class="material-icons">save</i> Guardar
                </Button>
            {:else}
                Guardando
            {/if}
        </div>
        <div>Cantidad total de productos: <b>{cantidad} </b></div>
        <div>Cantidad selecta de folios: <b>{foliosMaster.length}</b></div>
        <!-- barcode_scanner -->
        <!-- box_add -->
        <div class="botones">
            <button
                class="BtnFolio"
                color="#2b78fe"
                on:click={() => {
                    SoloActivo("ProdIndividual");
                }}
            >
                <i class="material-icons">shopping_basket</i>
            </button>
            <button
                class="BtnFolio"
                on:click={() => {
                    SoloActivo("BoxProd");
                }}
            >
                <i class="material-icons">shopping_bag</i>
            </button>

            {#if actualizado == true}
                <div class="guardando">
                    Actualizado <i class="material-icons check-color">check</i>
                </div>
            {/if}
        </div>
        <div
            class="relativo"
            in:fly={{ x: 400, duration: 200 }}
            out:fade={{ duration: 100 }}
        >
            <div class="boton-cerrar">
                <div>
                    <Button raised icon dense on:click={cerrar}>
                        <i class="material-icons">close</i>
                    </Button>
                </div>
            </div>

            {#if ProdIndividual}
                <div class="ProdIndividual">
                    <!-- <p>asfdaqwedf</p> -->
                    <input
                        class="InputFolios"
                        placeholder="Folio"
                        bind:value={InserFolio}
                        type="text"
                        disabled={desactivar}
                        on:keyup={(event) => {
                            if (event.key === "Enter") {
                                // if (
                                //     InserFolio.trim().length > 0 &&
                                //     !foliosMaster.includes(InserFolio)
                                // ) {
                                AgregarFolio(InserFolio);
                                InserFolio = ""; // Limpiar el input después de agregar el folio
                                DesactivarInput();
                                // }
                            }
                        }}
                    />
                </div>
            {/if}

            {#if BoxProd}
                <div class="BoxProd">
                    <input
                        class="InputFolios"
                        placeholder="Cantidad"
                        bind:value={CantidadArreglo}
                        type="number"
                        disabled={desactivar}
                    />
                    <input
                        class="InputFolios"
                        placeholder="Folio"
                        bind:value={InserFolio}
                        type="text"
                        disabled={desactivar}
                        on:keyup={(event) => {
                            if (event.key === "Enter") {
                                // if (
                                //     InserFolio.trim().length > 0 &&
                                //     !foliosMaster.includes(InserFolio)
                                // ) {
                                GenerarFolios(InserFolio);
                                InserFolio = ""; // Limpiar el input después de agregar el folio
                                DesactivarInput();
                                // }
                            }
                        }}
                    />
                </div>
            {/if}
            {#if foliosMaster.length > 0}
                <div class="lista">
                    {#each foliosMaster as item, i}
                        <!-- {console.log(item)} -->
                        <div
                            class="item"
                            class:repetido={foliosRepetidos.includes(item)}
                        >
                            <span class="indices">{i + 1})</span>
                            {item}
                            <button
                                class="removerFolio"
                                on:click={() => {
                                    quitarFolio(item);
                                    // foliosMaster.splice(i, 1);
                                    // console.log("Folio eliminado:", item);
                                    // console.log(foliosMaster);
                                }}
                            >
                                <i class="material-icons">delete_forever</i>
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- <div class="lista">
                {#if buscando.length == 0}
                    {#if filtrar_selectos == true}
                        {#each folios as item, i}
                            {#if item.selecto == true}
                                <div
                                    class="item"
                                    class:selecto={item.selecto}
                                    on:click={() => seleccionar_uno(item)}
                                >
                                    <span class="indices">{i + 1} )</span
                                    >{item.folio}
                                </div>
                            {/if}
                        {:else}
                            No has seleccionado folios
                        {/each}
                    {:else}
                        {#each folios as item, i}
                            <div
                                class="item"
                                class:selecto={item.selecto}
                                on:click={() => seleccionar_uno(item)}
                            >
                                <span class="indices">{i + 1} )</span
                                >{item.folio}
                            </div>
                        {:else}
                            No se encotraron folios relacionados al producto
                        {/each}
                    {/if}
                {:else}
                    {#if filtrar_selectos == true}
                        {#each lista_filtrada as item, i}
                            {#if item.selecto == true}
                                <div
                                    class="item"
                                    class:selecto={item.selecto}
                                    on:click={() => seleccionar_uno(item)}
                                >
                                    <span class="indices">{i + 1} )</span
                                    >{item.folio}
                                </div>
                            {/if}
                        {:else}
                            No has seleccionado folios
                        {/each}
                    {:else}
                        {#each lista_filtrada as item, i}
                            <div
                                class="item"
                                class:selecto={item.selecto}
                                on:click={() => seleccionar_uno(item)}
                            >
                                <span class="indices">{i + 1} )</span
                                >{item.folio}
                            </div>
                        {:else}
                            No se encotraron folios relacionados al producto y <b
                                >{buscando}</b
                            >
                        {/each}
                    {/if}
                {/if}
            </div> -->
        </div>
    </div>
{/if}

<style>
    .item.repetido {
        background-color: #b19cd9; /* Un tono de morado claro */
        color: white; /* Texto blanco para mayor contraste */
        border-radius: 5px;
        padding: 5px;
    }

    .indices {
        font-size: 10px;
        color: gray;
    }
    .check-color {
        color: rgb(43, 120, 254);
    }
    .guardando {
        padding-right: 23px;
        padding-top: 23px;
    }
    button {
        cursor: pointer;
    }
    input {
        border-radius: 10px 0px 0px 10px;
    }
    .flex {
        display: flex;
        justify-content: center;
    }
    .altura-boton-guardar {
        height: 32px;
    }
    .selecto {
        font-weight: 800;
        text-decoration: underline;
        color: #40f;
    }
    .relativo {
        position: relative;
    }
    .fecha {
        position: absolute;
        right: 20px;
    }
    .boton-cerrar {
        position: absolute;
        top: -101px;
        text-align: right;
        right: -32px;
    }
    .id {
        font-size: 12px;
    }
    .item {
        cursor: pointer;
        padding: 5px;
        border-bottom: gray solid 1px;
    }
    .item:hover {
        background: gray;
        color: white;
    }
    .contenedor {
        position: absolute;
        width: 36vw;
        /* height: 72vh; */
        left: 25vw;
        background: #a9a9a9;
        border-radius: 5px;
        border: 1px solid gray;
        top: 49px;
        z-index: 2;
        padding: 15px;
    }
    .lista {
        -webkit-user-select: none; /* Safari */
        -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* IE10+/Edge */
        user-select: none; /* Standard */
        background: white;
        height: 18rem;
        overflow-y: auto;
        padding: 10px;
        border-radius: 4px;
        box-shadow: 0 0 10px grey inset;
    }
    .botones {
        display: flex;
        justify-content: space-around;
    }
    .BtnFolio {
        border-radius: 0.5rem;
        padding: 0.4rem 5rem;
    }
    .InputFolios {
        border-radius: 0.5rem;
        padding: 0.4rem 1rem;
    }
    .BoxProd {
        display: flex;
        justify-content: space-evenly;
    }
    .ProdIndividual {
        display: flex;
        justify-content: center;
    }
    .removerFolio {
        background: red;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 5px;
        cursor: pointer;
    }
</style>
