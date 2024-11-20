<script>
    import TarjetaInyeccion from "./Tarjeta_inyeccion.svelte";
    import { Textfield, Button } from "svelte-mui/src";
    import { fade, scale } from "svelte/transition";
    import { postData, usuario_db } from "./../../../stores";
    import No_se_encontraron_resultados from "./No_se_encontraron_resultados.svelte";
    import Cargador from "./Cargando.svelte";
    import Productos from "./Productos.svelte";
    import { onMount } from "svelte";
    onMount(() => {
        buscador_virgen = true;
    });

    var visible = false;
    var lista = [];
    var folio_a_buscar = "";
    var mostrar_no_se_encontraron_resultados = false;
    var consultado = false;
    var pagina_actual = 1;
    var buscador_virgen = true; //  despues de la primer busqueda se convierte en false
    var inyeccion = {
        hay_registro: false,
        fecha: null,
        id: null,
        cantidad: null,
        inventario_antes: {
            existencias: 0,
            apartados: 0,
        },
        inventario_despues: {
            existencias: 0,
            apartados: 0,
        },
        folios: [],
    };

    var salida = {
        hay_registro: false,
        fecha: null,
        id: null,
        cantidad: null,
        inventario_antes: {
            existencias: 0,
            apartados: 0,
        },
        inventario_despues: {
            existencias: 0,
            apartados: 0,
        },
        folios: [],
    };

    var borrado_folio = {
        hay_registro: false,
        fecha: null,
        id: null,
        cantidad: null,
        inventario_antes: {
            existencias: 0,
            apartados: 0,
        },
        inventario_despues: {
            existencias: 0,
            apartados: 0,
        },
        folios: [],
    };
    var lista_productos_relacion = [];
    $: if (visible == true) {
        buscar();
    }
    function toggle() {
        visible = !visible;
    }
    function cerrar() {
        visible = false;
        folio_a_buscar = "";
    }
    async function buscar() {
        if (consultado == true) return;
        consultado = true;
        buscador_virgen = false;
        lista_productos_relacion = [];
        inyeccion.hay_registro = false;
        borrado_folio.hay_registro = false;
        salida.hay_registro = false;
        var resultado = await postData("app/productos/inyecciones_pendientes", {
            pagina_actual: pagina_actual,
        });
        console.log({ resultado });
        if (resultado.ok == true) {
            lista = resultado.lista;
        }
        //lista = resultado.lista;
        //console.log(resultado);
        //console.log({ inyeccion });
        // console.log(resultado.existe_en_la_bodega_resultado);
        setTimeout(() => {
            consultado = false;
        }, 1000);
    }
    const handleKey = (evt) => {
        if (evt.key === "Enter") buscar();
        if (evt.key === "Escape") cerrar();
    };
</script>

<!-- {#if $usuario_db.rol == "administrador"}
    <img
        src="imagenes/ver_almacen.svg"
        class="acceso-icono"
        alt=""
        on:click={toggle}
    />
{/if} -->

{#if visible == true}
    <div class="contenedor" in:fade={{ duration: 350 }}>
        <div class="boton-cerrar ">
            <Button raised color="red" icons dense on:click={cerrar}>
                <i class="material-icons"> close </i>
            </Button>
        </div>
        <div
            class:buscador-de-folios-con-resultados={buscador_virgen == false}
            class:buscador-de-folios-sin-resultados={buscador_virgen == true}
        >
            {#if consultado == true}
                <Cargador />
            {:else}
                <div out:scale={{ duration: 250 }} in:scale={{ duration: 250 }}>
                    {#if buscador_virgen == false}
                        <Productos bind:lista={lista_productos_relacion} />
                        <div class="lista">
                            {#each lista as item}
                                <TarjetaInyeccion
                                    {...item}
                                    on:cerrar={cerrar}
                                />
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
        <div>
            {#if mostrar_no_se_encontraron_resultados}
                <No_se_encontraron_resultados />
            {/if}
        </div>
    </div>
{/if}

<style>
    .acceso-icono {
        height: 42px;
        margin-right: 16px;
    }
    .lista {
        height: 100vh;
        overflow-y: auto;
        background: white;
        width: 100%;
        display: flex;
        flex-wrap: wrap;
    }
    .buscador-input {
        border-radius: 3em;
        background: white;
        font-size: 1em;
        width: 69vw;
        margin: auto;
    }

    .buscador-de-folios-con-resultados {
        transition: all 300ms ease-out;
        margin-top: 4vh;
        font-size: 3em;
    }
    .buscador-de-folios-sin-resultados {
        transition: all 300ms ease-out;
        margin-top: 40vh;
        font-size: 3em;
    }
    .boton-cerrar {
        position: absolute;
        top: 10px;
        right: 30px;
        cursor: pointer;
    }
    .id {
        font-size: 12px;
    }
    .contenedor {
        width: 100vw;
        height: 100vh;
        overflow-y: hidden;
        background: black;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 4;
    }
    img {
        cursor: pointer;
        filter: grayscale(1);
        transition: all 250 ease-out;
    }
    img:hover {
        filter: none;
    }
</style>
