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

    var buscando = "";
    var actualizado = false;
    var lista_filtrada = [];
    var filtrar_selectos = false;
    var guardando_folios = false;

    import { usuario_db, mensajes_app, postData } from "./../../../stores";
    import { Button } from "svelte-mui/src";
    import { createEventDispatcher, onMount } from "svelte";

    const dispatch = createEventDispatcher();

    onMount(() => {});
    $: if (visible == true) {
        console.log({ selectos });
        seleccionar_las_que_ya_estaban_selectas();
    }

    function cambiar_folios() {
        if (guardando_folios == true) return;
        guardando_folios = true;
        var folios_puros = selectos.map((elem) => elem.folio);
        let registro = {
            id_registro,
            producto_id: producto._id,
            cantidad,
            folios: folios_puros,
        };
        //console.log(registro);
        postData("/app/pedidos/editar/cambiar_lista_de_folios", {
            registro,
            id_carrito,
        })
            .then((respuesta) => {
                guardando_folios = false;
                console.log(respuesta);
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
                (elem) => elem.folio == element.folio
            );
            if (encontrar_folio) {
                encontrar_folio.selecto = true;
            }
            if (i + 1 == selectos.length) {
                folios = folios;
                console.log({ folios });
            }
        }
    }

    function cerrar(params) {
        visible = false;
        // dispatch("actualizar_folios");
    }

    async function seleccionar_uno(folio_a_agregar) {
        var registro = folios.find(
            (elem) => elem.folio == folio_a_agregar.folio
        );
        let cantidad_selectos;
        console.log({ registro });
        console.log({ folio_a_agregar });
        if (registro.selecto == false) {
            cantidad_selectos = await cuantos_selectos();

            if (cantidad_total > cantidad_selectos) {
                registro.selecto = true;
            }
        } else {
            registro.selecto = false;
        }
        cuantos_selectos();
        console.log({ cantidad_total });
        console.log({ cantidad_selectos });
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
            (elem) => elem.folio.toUpperCase().indexOf(buscando_upper) > -1
        );
        console.log(lista_filtrada.length);
    }
</script>

{#if visible == true}
    <div
        class="contenedor"
        in:scale={{ duration: 200 }}
        out:scale={{ duration: 100 }}
    >
        <div class="flex">
            <input
                placeholder="buscador"
                bind:value={buscando}
                type="text"
                on:keyup={filtra_con_texto}
            />

            <button
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
            </button>
            {#if guardando_folios == false}
                <Button color="#2b78fe" raised dense on:click={cambiar_folios}>
                    <i class="material-icons">save</i> Guardar
                </Button>
            {:else}
                Guardando
            {/if}
        </div>
        <div>Cantidad total: <b>{folios.length} </b></div>
        <div>Cantidad selecta: <b>{selectos.length}</b></div>
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
                <div class="guardando">
                    {#if actualizado == true}
                        Actualizado <i class="material-icons check-color "
                            >check</i
                        >
                    {/if}
                </div>
            </div>

            <div class="lista">
                {#if buscando.length == 0}
                    <!-- SIN TEXTO DE BUSQUEDA -->
                    {#if filtrar_selectos == true}
                        <!-- Filtrar con boton de selectos -->
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
                        <!-- No Filtrar con boton de selectos -->
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
                    <!-- CON TEXTO DE BUSQUEDA -->
                    {#if filtrar_selectos == true}
                        <!-- /// Filtrar con boton de selectos -->
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
                        <!-- /// No Filtrar con boton de selectos -->
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
            </div>
        </div>
    </div>
{/if}

<style>
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
        height: 72vh;
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
        height: 62vh;
        overflow-y: auto;
        padding: 10px;
        border-radius: 4px;
        box-shadow: 0 0 10px grey inset;
    }
</style>
